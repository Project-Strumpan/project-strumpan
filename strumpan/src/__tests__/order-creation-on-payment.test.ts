import { describe, it, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../lib/db";
import { createPaidOrder, OrderCreationError } from "../lib/order-service";
import { setStripeServerInstance } from "../lib/stripe-server";
import { POST as handlePostPaymentOrder } from "../app/api/orders/from-payment/route";
import type { CreatePaidOrderInput } from "../types/order";
import { NextRequest } from "next/server";

const validKlarnaPaymentInput: CreatePaidOrderInput = {
  transactionId: "klarna_tx_test_12345",
  paymentMethod: "klarna",
  paymentStatus: "paid",
  customer: {
    name: "Erik Johansson",
    email: "erik.johansson@example.se",
    phone: "+46701234567",
  },
  address: {
    street: "Drottninggatan 10",
    postalCode: "111 51",
    city: "Stockholm",
    country: "Sverige",
  },
  items: [
    { variantId: 1, quantity: 2, unitPrice: 89.0 },
    { variantId: 2, quantity: 1, unitPrice: 129.0 },
  ],
  totalCost: 307.0,
};

describe("PRO-13: Order creation on payment success (MariaDB & Klarna)", () => {
  let mockConnection: any;
  let queryCalls: Array<{ sql: string; params?: any[] }>;

  beforeEach(() => {
    queryCalls = [];
    mockConnection = {
      beginTransaction: async () => {},
      commit: async () => {},
      rollback: async () => {},
      release: async () => {},
      query: async (sql: string, params?: any[]) => {
        queryCalls.push({ sql, params });
        return [];
      },
    };

    // Ersätt pool.getConnection med vår mock
    (pool as any).getConnection = async () => mockConnection;
  });

  after(async () => {
    try {
      await pool.end();
    } catch {}
  });

  describe("createPaidOrder - Kärnlogik för MariaDB", () => {
    it("ska skapa order, artiklar, kunddata och tidsstämplar i MariaDB vid godkänd Klarna-betalning", async () => {
      let queryCount = 0;
      mockConnection.query = async (sql: string, params?: any[]) => {
        queryCalls.push({ sql, params });
        queryCount++;

        // 1. Idempotenskontroll
        if (queryCount === 1) return [];
        // 2. Sök befintlig kund
        if (queryCount === 2) return [];
        // 3. Insert kund
        if (queryCount === 3) return { insert_id: 42, affected_rows: 1 };
        // 4. Insert adress
        if (queryCount === 4) return { insert_id: 101, affected_rows: 1 };
        // 5. Insert order
        if (queryCount === 5) return { insert_id: 555, affected_rows: 1 };
        // 6. Insert item 1
        if (queryCount === 6) return { insert_id: 1001, affected_rows: 1 };
        // 7. Update inventory 1
        if (queryCount === 7) return { affected_rows: 1 };
        // 8. Insert item 2
        if (queryCount === 8) return { insert_id: 1002, affected_rows: 1 };
        // 9. Update inventory 2
        if (queryCount === 9) return { affected_rows: 1 };
        // 10. Insert payment
        if (queryCount === 10) return { insert_id: 999, affected_rows: 1 };

        return [];
      };

      let committed = false;
      mockConnection.commit = async () => {
        committed = true;
      };

      const result = await createPaidOrder(validKlarnaPaymentInput);

      assert.equal(committed, true);
      assert.equal(result.order_id, 555);
      assert.equal(result.customer_id, 42);
      assert.equal(result.order_status, "paid");
      assert.equal(result.total_cost, 307.0);
      assert.equal(result.items.length, 2);

      // Verifiera betalningsposten
      assert.equal(result.payment.payment_method, "klarna");
      assert.equal(result.payment.payment_status, "paid");
      assert.equal(result.payment.transaction_id, "klarna_tx_test_12345");
      assert.equal(result.payment.total_amount, 307.0);

      // Verifiera att ordern sparades som 'paid' med CURRENT_TIMESTAMP
      const orderInsert = queryCalls.find((c) => c.sql.includes("INSERT INTO Orders"));
      assert.ok(orderInsert, "INSERT INTO Orders måste anropas");
      assert.ok(orderInsert.sql.includes("'paid'"), "Order status måste vara 'paid'");
      assert.ok(orderInsert.sql.includes("CURRENT_TIMESTAMP"), "Tidsstämpel måste registreras");

      // Verifiera att betalningen registrerades med metod 'klarna' och status 'paid'
      const paymentInsert = queryCalls.find((c) => c.sql.includes("INSERT INTO Payments"));
      assert.ok(paymentInsert, "INSERT INTO Payments måste anropas");
      assert.ok(paymentInsert.params?.includes("klarna"), "Betalningsmetod måste vara 'klarna'");
    });

    it("ska avvisa och INTE skapa någon order om betalningen misslyckats eller avbrutits (inga obetalda ordrar)", async () => {
      let connectionRequested = false;
      (pool as any).getConnection = async () => {
        connectionRequested = true;
        return mockConnection;
      };

      const failedPaymentInput: CreatePaidOrderInput = {
        ...validKlarnaPaymentInput,
        paymentStatus: "failed",
      };

      await assert.rejects(
        async () => {
          await createPaidOrder(failedPaymentInput);
        },
        (err: any) => {
          assert.ok(err instanceof OrderCreationError);
          assert.match(err.message, /Order kan inte sparas eftersom betalningen inte är godkänd/);
          return true;
        }
      );

      // Säkerställ att vi inte ens kontaktade databasen för att spara en preliminär obetald order
      assert.equal(connectionRequested, false);
    });

    it("ska avvisa och INTE skapa order om betalningsstatus är pending", async () => {
      let connectionRequested = false;
      (pool as any).getConnection = async () => {
        connectionRequested = true;
        return mockConnection;
      };

      const pendingPaymentInput: CreatePaidOrderInput = {
        ...validKlarnaPaymentInput,
        paymentStatus: "pending",
      };

      await assert.rejects(
        async () => {
          await createPaidOrder(pendingPaymentInput);
        },
        /Order kan inte sparas eftersom betalningen inte är godkänd/
      );

      assert.equal(connectionRequested, false);
    });

    it("ska vara idempotent och returnera befintlig order om samma transaktion anropas igen", async () => {
      let queryCount = 0;
      mockConnection.query = async (sql: string, params?: any[]) => {
        queryCalls.push({ sql, params });
        queryCount++;

        // 1. Idempotenskontroll: Hittar befintlig betalning och order
        if (queryCount === 1) {
          return [
            {
              payment_id: 999,
              order_id: 555,
              payment_method: "klarna",
              payment_status: "paid",
              total_amount: 307.0,
              transaction_id: "klarna_tx_test_12345",
              payment_date: new Date("2026-11-17T12:00:00Z"),
              customer_id: 42,
              order_status: "paid",
              total_cost: 307.0,
              order_date: new Date("2026-11-17T12:00:00Z"),
            },
          ];
        }

        // 2. Hämtar befintliga items
        if (queryCount === 2) {
          return [
            { order_item_id: 1001, variant_id: 1, quantity: 2, unit_price: 89.0 },
            { order_item_id: 1002, variant_id: 2, quantity: 1, unit_price: 129.0 },
          ];
        }

        return [];
      };

      const result = await createPaidOrder(validKlarnaPaymentInput);

      assert.equal(result.order_id, 555);
      assert.equal(result.alreadyExists, true);

      // Verifiera att inga nya INSERTs kördes
      const insertCalls = queryCalls.filter((c) => c.sql.includes("INSERT INTO"));
      assert.equal(insertCalls.length, 0);
    });

    it("ska göra rollback om ett fel uppstår under transaktionen", async () => {
      mockConnection.query = async (sql: string) => {
        if (sql.includes("SELECT") && sql.includes("Payments")) return [];
        throw new Error("Databasfel vid anslutning");
      };

      let rolledBack = false;
      mockConnection.rollback = async () => {
        rolledBack = true;
      };

      await assert.rejects(
        async () => {
          await createPaidOrder(validKlarnaPaymentInput);
        },
        /Databasfel vid anslutning/
      );

      assert.equal(rolledBack, true);
    });
  });

  describe("API Endpoint POST /api/orders/from-payment", () => {
    it("ska returnera HTTP 201 och skapad order vid godkänd Klarna-betalning", async () => {
      let queryCount = 0;
      mockConnection.query = async (sql: string, params?: any[]) => {
        queryCalls.push({ sql, params });
        queryCount++;

        if (queryCount === 1) return []; // Idempotens
        if (queryCount === 2) return []; // Kundfinns ej
        if (queryCount === 3) return { insert_id: 10 }; // Kund insert
        if (queryCount === 4) return { insert_id: 20 }; // Adress insert
        if (queryCount === 5) return { insert_id: 30 }; // Order insert
        if (queryCount === 6) return { insert_id: 40 }; // Item 1 insert
        if (queryCount === 7) return { affected_rows: 1 }; // Inventory 1 update
        if (queryCount === 8) return { insert_id: 41 }; // Item 2 insert
        if (queryCount === 9) return { affected_rows: 1 }; // Inventory 2 update
        if (queryCount === 10) return { insert_id: 50 }; // Payment insert
        return [];
      };

      const request = new NextRequest("http://localhost:3000/api/orders/from-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validKlarnaPaymentInput),
      });

      const response = await handlePostPaymentOrder(request);
      assert.equal(response.status, 201);

      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.order.order_id, 30);
      assert.equal(json.order.order_status, "paid");
      assert.equal(json.order.payment.payment_method, "klarna");
    });

    it("ska returnera HTTP 400 och neka att spara order om betalningen inte är godkänd", async () => {
      const request = new NextRequest("http://localhost:3000/api/orders/from-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validKlarnaPaymentInput,
          paymentStatus: "failed",
        }),
      });

      const response = await handlePostPaymentOrder(request);
      assert.equal(response.status, 400);

      const json = await response.json();
      assert.equal(json.error, "PAYMENT_NOT_COMPLETED");
      assert.match(json.message, /Inga obetalda ordrar sparas/);
    });

    it("ska returnera HTTP 400 vid ogiltig JSON", async () => {
      const request = new NextRequest("http://localhost:3000/api/orders/from-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "ogiltig-json-string",
      });

      const response = await handlePostPaymentOrder(request);
      assert.equal(response.status, 400);

      const json = await response.json();
      assert.equal(json.error, "INVALID_JSON");
    });

    it("ska verifiera med Stripe och neka order om Stripe rapporterar att betalningen inte är godkänd ('requires_payment_method')", async () => {
      // Mocka Stripe server instance som returnerar en obetald intent
      setStripeServerInstance({
        paymentIntents: {
          retrieve: async (id: string) => ({
            id,
            status: "requires_payment_method",
            amount: 30700,
            currency: "sek",
            payment_method_types: ["klarna"],
          }),
        },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/orders/from-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validKlarnaPaymentInput,
          transactionId: "pi_real_looking_intent_123",
          paymentStatus: "paid", // Klienten påstår felaktigt att betalning är klar
        }),
      });

      const response = await handlePostPaymentOrder(request);
      assert.equal(response.status, 400);

      const json = await response.json();
      assert.equal(json.error, "STRIPE_PAYMENT_NOT_SUCCEEDED");
      assert.match(json.message, /requires_payment_method/);
    });

    it("ska verifiera med Stripe och spara order med Klarna när Stripe bekräftar 'succeeded'", async () => {
      // Mocka Stripe server instance som bekräftar lyckad Klarna-betalning
      setStripeServerInstance({
        paymentIntents: {
          retrieve: async (id: string) => ({
            id,
            status: "succeeded",
            amount: 30700,
            currency: "sek",
            payment_method_types: ["klarna"],
          }),
        },
      } as any);

      let queryCount = 0;
      mockConnection.query = async (sql: string, params?: any[]) => {
        queryCalls.push({ sql, params });
        queryCount++;

        if (queryCount === 1) return []; // Idempotens
        if (queryCount === 2) return []; // Kundfinns ej
        if (queryCount === 3) return { insert_id: 10 }; // Kund insert
        if (queryCount === 4) return { insert_id: 20 }; // Adress insert
        if (queryCount === 5) return { insert_id: 30 }; // Order insert
        if (queryCount === 6) return { insert_id: 40 }; // Item 1 insert
        if (queryCount === 7) return { affected_rows: 1 }; // Inventory 1 update
        if (queryCount === 8) return { insert_id: 41 }; // Item 2 insert
        if (queryCount === 9) return { affected_rows: 1 }; // Inventory 2 update
        if (queryCount === 10) return { insert_id: 50 }; // Payment insert
        return [];
      };

      const request = new NextRequest("http://localhost:3000/api/orders/from-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validKlarnaPaymentInput,
          transactionId: "pi_verified_klarna_succeeded_999",
          paymentStatus: "succeeded",
        }),
      });

      const response = await handlePostPaymentOrder(request);
      assert.equal(response.status, 201);

      const json = await response.json();
      assert.equal(json.success, true);
      assert.equal(json.order.order_status, "paid");
      assert.equal(json.order.payment.payment_method, "klarna");
      assert.equal(json.order.payment.payment_status, "paid");
    });
  });
});
