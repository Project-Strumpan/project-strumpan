import { pool } from "@/lib/db";
import type { CreatePaidOrderInput, CreatePaidOrderResult } from "@/types/order";

export class OrderCreationError extends Error {
  constructor(message: string, public readonly statusCode: number = 400) {
    super(message);
    this.name = "OrderCreationError";
  }
}

/**
 * Skapar en betald order i MariaDB först när betalningen har godkänts (t.ex. av Klarna).
 * Flödet körs inom en atomär databastransaktion och garanterar:
 * 1. Inga obetalda ordrar skapas i databasen.
 * 2. Idempotens: Samma transaction_id skapar aldrig dubbla ordrar.
 * 3. Kund- och leveransdata sparas.
 * 4. Orderrader och Payments-post med payment_method 'klarna' och status 'paid' registreras.
 * 5. Lagersaldot i Inventory uppdateras.
 */
export async function createPaidOrder(
  input: CreatePaidOrderInput
): Promise<CreatePaidOrderResult> {
  // Validera att betalningen faktiskt har lyckats
  const isPaid =
    input.paymentStatus === "paid" ||
    input.paymentStatus === "succeeded" ||
    input.paymentStatus === "authorized";

  if (!isPaid) {
    throw new OrderCreationError(
      `Order kan inte sparas eftersom betalningen inte är godkänd (status: ${input.paymentStatus}).`,
      400
    );
  }

  if (!input.transactionId || input.transactionId.trim() === "") {
    throw new OrderCreationError("Ett giltigt transaktions-ID från betalväxeln krävs.", 400);
  }

  if (!input.items || input.items.length === 0) {
    throw new OrderCreationError("Ordern måste innehålla minst en artikel.", 400);
  }

  if (!input.customer?.email || !input.customer?.name) {
    throw new OrderCreationError("Kunduppgifter (namn och e-post) saknas.", 400);
  }

  if (!input.address?.street || !input.address?.postalCode || !input.address?.city) {
    throw new OrderCreationError("Leveransadress saknas eller är ofullständig.", 400);
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Idempotenskontroll: Har vi redan hanterat detta transaktions-ID?
    const existingPaymentRows = await connection.query<any[]>(
      `
      SELECT 
        p.payment_id,
        p.order_id,
        p.payment_method,
        p.payment_status,
        p.total_amount,
        p.transaction_id,
        p.payment_date,
        o.customer_id,
        o.order_status,
        o.total_cost,
        o.order_date
      FROM Payments AS p
      INNER JOIN Orders AS o
        ON o.order_id = p.order_id
      WHERE p.transaction_id = ?
      LIMIT 1
      `,
      [input.transactionId]
    );

    if (existingPaymentRows && existingPaymentRows.length > 0) {
      const existing = existingPaymentRows[0];
      const existingItems = await connection.query<any[]>(
        `
        SELECT order_item_id, variant_id, quantity, unit_price
        FROM Order_items
        WHERE order_id = ?
        `,
        [existing.order_id]
      );

      await connection.commit();

      return {
        order_id: Number(existing.order_id),
        customer_id: Number(existing.customer_id),
        order_status: "paid",
        total_cost: Number(existing.total_cost),
        order_date: new Date(existing.order_date).toISOString(),
        payment: {
          payment_id: Number(existing.payment_id),
          payment_method: existing.payment_method,
          payment_status: "paid",
          transaction_id: existing.transaction_id,
          total_amount: Number(existing.total_amount),
          payment_date: new Date(existing.payment_date).toISOString(),
        },
        items: (existingItems || []).map((it) => ({
          order_item_id: Number(it.order_item_id),
          variant_id: Number(it.variant_id),
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
        })),
        alreadyExists: true,
      };
    }

    // 2. Hitta eller skapa kund
    let customerId: number;
    const customerRows = await connection.query<any[]>(
      `
      SELECT customer_id
      FROM Customers
      WHERE email = ?
      LIMIT 1
      `,
      [input.customer.email]
    );

    if (customerRows && customerRows.length > 0) {
      customerId = Number(customerRows[0].customer_id);
    } else {
      // Skapa ny kund med säkert genererat platshållar-hash för gästkunder
      const guestPasswordHash = `$2b$12$guest_${Math.random().toString(36).substring(2)}${Date.now()}`;
      const customerResult = await connection.query<any>(
        `
        INSERT INTO Customers (name, email, phone_nbr, password_hash, created_date)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        [
          input.customer.name,
          input.customer.email,
          input.customer.phone || null,
          guestPasswordHash,
        ]
      );
      customerId = Number(customerResult.insertId ?? customerResult.insert_id);
    }

    // 3. Spara leveransadress i Addresses
    const addressResult = await connection.query<any>(
      `
      INSERT INTO Addresses (customer_id, street, postal_code, city, country, type)
      VALUES (?, ?, ?, ?, ?, 'delivery')
      `,
      [
        customerId,
        input.address.street,
        input.address.postalCode,
        input.address.city,
        input.address.country || "Sverige",
      ]
    );
    const addressId = Number(addressResult.insertId ?? addressResult.insert_id);

    // 4. Skapa Order med status 'paid' och order_date = CURRENT_TIMESTAMP
    const orderResult = await connection.query<any>(
      `
      INSERT INTO Orders (customer_id, delivery_address_id, invoice_address_id, order_status, total_cost, order_date)
      VALUES (?, ?, ?, 'paid', ?, CURRENT_TIMESTAMP)
      `,
      [customerId, addressId, addressId, input.totalCost]
    );
    const orderId = Number(orderResult.insertId ?? orderResult.insert_id);

    // 5. Skapa orderrader i Order_items och uppdatera Inventory
    const createdItems: CreatePaidOrderResult["items"] = [];

    for (const item of input.items) {
      const itemResult = await connection.query<any>(
        `
        INSERT INTO Order_items (order_id, variant_id, quantity, unit_price)
        VALUES (?, ?, ?, ?)
        `,
        [orderId, item.variantId, item.quantity, item.unitPrice]
      );

      // Uppdatera lagersaldo (minska med beställd kvantitet)
      await connection.query(
        `
        UPDATE Inventory
        SET quantity = GREATEST(0, quantity - ?), last_updated = CURRENT_TIMESTAMP
        WHERE variant_id = ?
        `,
        [item.quantity, item.variantId]
      );

      createdItems.push({
        order_item_id: Number(itemResult.insertId ?? itemResult.insert_id),
        variant_id: item.variantId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      });
    }

    // 6. Skapa post i Payments med status 'paid' och vald metod (t.ex. 'klarna')
    const paymentResult = await connection.query<any>(
      `
      INSERT INTO Payments (order_id, payment_method, total_amount, payment_status, transaction_id, payment_date)
      VALUES (?, ?, ?, 'paid', ?, CURRENT_TIMESTAMP)
      `,
      [
        orderId,
        input.paymentMethod,
        input.totalCost,
        input.transactionId,
      ]
    );
    const paymentId = Number(paymentResult.insertId ?? paymentResult.insert_id);

    // 7. Genomför transaktionen
    await connection.commit();

    return {
      order_id: orderId,
      customer_id: customerId,
      order_status: "paid",
      total_cost: input.totalCost,
      order_date: new Date().toISOString(),
      payment: {
        payment_id: paymentId,
        payment_method: input.paymentMethod,
        payment_status: "paid",
        transaction_id: input.transactionId,
        total_amount: input.totalCost,
        payment_date: new Date().toISOString(),
      },
      items: createdItems,
      alreadyExists: false,
    };
  } catch (err: unknown) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error("Fel vid rollback av order-transaktion:", rollbackErr);
      }
    }
    throw err;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
