import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../lib/db";
import { createPaidOrder } from "../lib/order-service";
import { POST as handlePostOrder } from "../app/api/orders/from-payment/route";
import { NextRequest } from "next/server";

describe("MariaDB Live Integration: Databasvalidering av sparade ordrar och varor", () => {
  let createdOrderIds: number[] = [];
  let testCustomerEmails: string[] = [];
  let originalStockLevels: { variant_id: number; quantity: number }[] = [];

  // Verifiera att databasen är tillgänglig och säkra lagersaldo för testet
  before(async () => {
    try {
      const conn = await pool.getConnection();
      const [row] = await conn.query<any[]>("SELECT DATABASE() AS db");
      assert.ok(row.db, "MariaDB-databasen måste vara vald och ansluten.");

      // Spara nuvarande lagersaldo för varianterna 1–6
      const rows = await conn.query<any[]>(
        "SELECT variant_id, quantity FROM Inventory WHERE variant_id BETWEEN 1 AND 6"
      );
      originalStockLevels = rows.map((r) => ({
        variant_id: Number(r.variant_id),
        quantity: Number(r.quantity),
      }));

      // Sätt saldot till minst 10 så att testerna aldrig slår i 0
      await conn.query(
        "UPDATE Inventory SET quantity = GREATEST(quantity, 10) WHERE variant_id BETWEEN 1 AND 6"
      );

      conn.release();
    } catch (err) {
      console.error("Kunde inte ansluta till MariaDB i integrationstest:", err);
      throw err;
    }
  });

  // Städa upp eventuella testordrar, återställ lagersaldon och avsluta anslutningen
  after(async () => {
    try {
      const conn = await pool.getConnection();

      // Återställ sparade lagersaldon så att testerna är icke-destruktiva
      for (const item of originalStockLevels) {
        await conn.query(
          "UPDATE Inventory SET quantity = ? WHERE variant_id = ?",
          [item.quantity, item.variant_id]
        );
      }

      for (const orderId of createdOrderIds) {
        await conn.query("DELETE FROM Orders WHERE order_id = ?", [orderId]);
      }
      for (const email of testCustomerEmails) {
        await conn.query("DELETE FROM Customers WHERE email = ?", [email]);
      }
      conn.release();
    } catch (cleanupErr) {
      console.warn("Varning vid städning av testdata:", cleanupErr);
    } finally {
      await pool.end();
    }
  });

  it("ska hämta befintliga produkter/varianter från databasen och validera att de finns i lager", async () => {
    const conn = await pool.getConnection();
    const variants = await conn.query<any[]>(`
      SELECT 
        p.product_id,
        p.product_name,
        p.price,
        pv.variant_id,
        pv.product_variant_size,
        pv.color,
        pv.sku,
        i.quantity AS stock_quantity
      FROM Products p
      JOIN Product_variants pv ON pv.product_id = p.product_id
      JOIN Inventory i ON i.variant_id = pv.variant_id
      ORDER BY pv.variant_id ASC
    `);
    conn.release();

    assert.ok(variants.length >= 1, "Det måste finnas minst 1 produktvariant i databasen.");
    
    // Verifiera att de kända strumporna existerar i tabellerna
    const cottonSock = variants.find((v) => Number(v.variant_id) === 1);
    assert.ok(cottonSock, "Variant 1 (Classic Cotton Sock) ska finnas i databasen.");
    assert.equal(Number(cottonSock.price), 89.0);
    assert.ok(Number(cottonSock.stock_quantity) > 0, "Lagersaldo för variant 1 ska vara > 0.");
  });

  it("ska spara en komplett Klarna-order i MariaDB och minska lagersaldot för köpta varianter", async () => {
    const conn = await pool.getConnection();

    // 1. Läs lagersaldo före köpet för variant 1 och variant 2
    const [inv1Before] = await conn.query<any[]>(
      "SELECT quantity FROM Inventory WHERE variant_id = 1"
    );
    const [inv2Before] = await conn.query<any[]>(
      "SELECT quantity FROM Inventory WHERE variant_id = 2"
    );
    const initialQty1 = Number(inv1Before.quantity);
    const initialQty2 = Number(inv2Before.quantity);
    conn.release();

    const testTxId = `klarna_test_tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const testEmail = `test.kund.${Date.now()}@strumpan.test`;
    testCustomerEmails.push(testEmail);

    // 2. Skapa betald order via vår order-service
    const orderResult = await createPaidOrder({
      transactionId: testTxId,
      paymentMethod: "klarna",
      paymentStatus: "paid",
      customer: {
        name: "Test Person",
        email: testEmail,
        phone: "+46701234567",
      },
      address: {
        street: "Strumpgatan 42",
        postalCode: "111 22",
        city: "Stockholm",
        country: "Sverige",
      },
      items: [
        { variantId: 1, quantity: 2, unitPrice: 89.0 },
        { variantId: 2, quantity: 1, unitPrice: 89.0 },
      ],
      totalCost: 267.0,
    });

    createdOrderIds.push(orderResult.order_id);

    // 3. Validera att ordern faktiskt finns sparad i tabellen Orders i MariaDB
    const verifyConn = await pool.getConnection();
    const [orderRow] = await verifyConn.query<any[]>(
      "SELECT * FROM Orders WHERE order_id = ?",
      [orderResult.order_id]
    );

    assert.ok(orderRow, "Ordern måste finnas i tabellen Orders.");
    assert.equal(orderRow.order_status, "paid", "Orderstatus i MariaDB måste vara 'paid'.");
    assert.equal(Number(orderRow.total_cost), 267.0, "Totalbeloppet ska matcha 267.00.");
    assert.ok(orderRow.order_date, "order_date måste ha registrerats med en tidsstämpel.");

    // 4. Validera att orderraderna sparades i Order_items
    const orderItems = await verifyConn.query<any[]>(
      "SELECT * FROM Order_items WHERE order_id = ? ORDER BY variant_id ASC",
      [orderResult.order_id]
    );
    assert.equal(orderItems.length, 2, "Det ska finnas exakt 2 rader i Order_items.");
    assert.equal(Number(orderItems[0].variant_id), 1);
    assert.equal(Number(orderItems[0].quantity), 2);
    assert.equal(Number(orderItems[0].unit_price), 89.0);

    assert.equal(Number(orderItems[1].variant_id), 2);
    assert.equal(Number(orderItems[1].quantity), 1);

    // 5. Validera att betalningen sparades i Payments med metod 'klarna' och status 'paid'
    const [paymentRow] = await verifyConn.query<any[]>(
      "SELECT * FROM Payments WHERE order_id = ?",
      [orderResult.order_id]
    );
    assert.ok(paymentRow, "Betalningspost måste finnas i Payments.");
    assert.equal(paymentRow.payment_method, "klarna");
    assert.equal(paymentRow.payment_status, "paid");
    assert.equal(paymentRow.transaction_id, testTxId);
    assert.equal(Number(paymentRow.total_amount), 267.0);

    // 6. Validera att lagersaldot i Inventory har minskat korrekt i MariaDB
    const [inv1After] = await verifyConn.query<any[]>(
      "SELECT quantity FROM Inventory WHERE variant_id = 1"
    );
    const [inv2After] = await verifyConn.query<any[]>(
      "SELECT quantity FROM Inventory WHERE variant_id = 2"
    );
    verifyConn.release();

    assert.equal(
      Number(inv1After.quantity),
      initialQty1 - 2,
      "Lagersaldo för variant 1 ska ha minskat med 2."
    );
    assert.equal(
      Number(inv2After.quantity),
      initialQty2 - 1,
      "Lagersaldo för variant 2 ska ha minskat med 1."
    );
  });

  it("ska avvisa order om en variant INTE finns i databasen och inte lämna några spår (Rollback)", async () => {
    const invalidVariantId = 999999; // Finns inte i Product_variants
    const testTxId = `fail_tx_${Date.now()}`;
    const testEmail = `fail.test.${Date.now()}@strumpan.test`;

    await assert.rejects(
      async () => {
        await createPaidOrder({
          transactionId: testTxId,
          paymentMethod: "klarna",
          paymentStatus: "paid",
          customer: {
            name: "Fail Tester",
            email: testEmail,
          },
          address: {
            street: "Testgatan 1",
            postalCode: "111 22",
            city: "Stockholm",
            country: "Sverige",
          },
          items: [{ variantId: invalidVariantId, quantity: 1, unitPrice: 99 }],
          totalCost: 99,
        });
      },
      (err: any) => {
        // Kontrollera att MariaDB fångade Foreign Key-felet
        assert.ok(
          err.code === "ER_NO_REFERENCED_ROW_2" ||
          err.errno === 1452 ||
          err.message.includes("foreign key") ||
          err.message.includes("Cannot add or update a child row"),
          `Förväntade foreign key fel från MariaDB, fick: ${err.message}`
        );
        return true;
      }
    );

    // Validera att ingen order eller betalning sparades på grund av rollback
    const conn = await pool.getConnection();
    const payments = await conn.query<any[]>(
      "SELECT * FROM Payments WHERE transaction_id = ?",
      [testTxId]
    );
    conn.release();

    assert.equal(payments.length, 0, "Ingen betalning ska finnas sparad efter rollback.");
  });

  it("ska återanvända befintlig kund i Customers vid återkommande köp", async () => {
    const testEmail = `recurring.customer.${Date.now()}@strumpan.test`;
    testCustomerEmails.push(testEmail);

    // Första köpet skapar kunden
    const order1 = await createPaidOrder({
      transactionId: `tx_recur_1_${Date.now()}`,
      paymentMethod: "klarna",
      paymentStatus: "paid",
      customer: {
        name: "Återkommande Kund",
        email: testEmail,
      },
      address: {
        street: "Gatan 1",
        postalCode: "111 22",
        city: "Stockholm",
        country: "Sverige",
      },
      items: [{ variantId: 3, quantity: 1, unitPrice: 89.0 }],
      totalCost: 89.0,
    });
    createdOrderIds.push(order1.order_id);

    // Andra köpet med samma e-post
    const order2 = await createPaidOrder({
      transactionId: `tx_recur_2_${Date.now()}`,
      paymentMethod: "klarna",
      paymentStatus: "paid",
      customer: {
        name: "Återkommande Kund",
        email: testEmail,
      },
      address: {
        street: "Gatan 1",
        postalCode: "111 22",
        city: "Stockholm",
        country: "Sverige",
      },
      items: [{ variantId: 4, quantity: 1, unitPrice: 149.0 }],
      totalCost: 149.0,
    });
    createdOrderIds.push(order2.order_id);

    // Båda ordrarna måste tillhöra samma customer_id
    assert.equal(
      order1.customer_id,
      order2.customer_id,
      "Återkommande köp ska återanvända samma customer_id i databasen."
    );
  });

  it("ska hantera idempotens i databasen så att upprepade anrop inte drar lager flera gånger", async () => {
    const conn = await pool.getConnection();
    const [invBefore] = await conn.query<any[]>(
      "SELECT quantity FROM Inventory WHERE variant_id = 5"
    );
    const initialQty = Number(invBefore.quantity);
    conn.release();

    const identicalTxId = `idempotent_tx_${Date.now()}`;
    const testEmail = `idempotent.${Date.now()}@strumpan.test`;
    testCustomerEmails.push(testEmail);

    const orderPayload = {
      transactionId: identicalTxId,
      paymentMethod: "klarna" as const,
      paymentStatus: "paid",
      customer: {
        name: "Idempotens Test",
        email: testEmail,
      },
      address: {
        street: "Samma gata 10",
        postalCode: "111 22",
        city: "Stockholm",
        country: "Sverige",
      },
      items: [{ variantId: 5, quantity: 1, unitPrice: 149.0 }],
      totalCost: 149.0,
    };

    // Första anropet
    const firstCall = await createPaidOrder(orderPayload);
    createdOrderIds.push(firstCall.order_id);
    assert.equal(firstCall.alreadyExists, false);

    // Andra anropet med samma transaktions-ID
    const secondCall = await createPaidOrder(orderPayload);
    assert.equal(secondCall.alreadyExists, true);
    assert.equal(secondCall.order_id, firstCall.order_id, "Samma order_id ska returneras.");

    // Kontrollera att lagersaldot i MariaDB bara minskade med 1, INTE 2!
    const verifyConn = await pool.getConnection();
    const [invAfter] = await verifyConn.query<any[]>(
      "SELECT quantity FROM Inventory WHERE variant_id = 5"
    );
    verifyConn.release();

    assert.equal(
      Number(invAfter.quantity),
      initialQty - 1,
      "Lagersaldot ska endast ha minskat 1 gång trots dubbla anrop."
    );
  });

  it("ska validera API endpoint POST /api/orders/from-payment direkt mot MariaDB", async () => {
    const testTxId = `api_klarna_tx_${Date.now()}`;
    const testEmail = `api.test.${Date.now()}@strumpan.test`;
    testCustomerEmails.push(testEmail);

    const request = new NextRequest("http://localhost:3000/api/orders/from-payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId: testTxId,
        paymentMethod: "klarna",
        paymentStatus: "paid",
        customer: {
          name: "API Testare",
          email: testEmail,
          phone: "0701112233",
        },
        address: {
          street: "API Gatan 5",
          postalCode: "111 22",
          city: "Stockholm",
          country: "Sverige",
        },
        items: [{ variantId: 6, quantity: 1, unitPrice: 109.0 }],
        totalCost: 109.0,
      }),
    });

    const response = await handlePostOrder(request);
    assert.equal(response.status, 201);

    const data = await response.json();
    assert.equal(data.success, true);
    assert.ok(data.order.order_id > 0);
    createdOrderIds.push(data.order.order_id);

    // Dubbelkolla med SQL att API:et skapade posten i MariaDB
    const conn = await pool.getConnection();
    const [dbOrder] = await conn.query<any[]>(
      "SELECT * FROM Orders WHERE order_id = ?",
      [data.order.order_id]
    );
    conn.release();

    assert.ok(dbOrder, "Ordern som skapades via API:et måste finnas i tabellen Orders.");
    assert.equal(dbOrder.order_status, "paid");
  });
});
