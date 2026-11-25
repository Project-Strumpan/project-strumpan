import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, authorizeOwnerAccess, writeAudit } = vi.hoisted(() => ({
    getConnection: vi.fn(),
    authorizeOwnerAccess: vi.fn(),
    writeAudit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ pool: { getConnection } }));
vi.mock("@/lib/inventory/access", () => ({ authorizeOwnerAccess }));
vi.mock("@/lib/inventory/helpers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/inventory/helpers")>();
    return { ...actual, writeAudit };
});

import { GET, PATCH } from "./route";

describe("GET /api/admin/orders/[orderId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 403 for non-owner", async () => {
        authorizeOwnerAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
        const req = new Request("http://localhost/api/admin/orders/101");
        const res = await GET(req, { params: Promise.resolve({ orderId: "101" }) });
        expect(res.status).toBe(403);
    });

    it("returns 404 if order not found", async () => {
        const query = vi.fn(async () => []);
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/orders/999");
        const res = await GET(req, { params: Promise.resolve({ orderId: "999" }) });
        expect(res.status).toBe(404);
        expect(release).toHaveBeenCalledOnce();
    });

    it("returns complete order details including addresses and items", async () => {
        const orderRow = {
            order_id: 101,
            order_date: new Date("2026-03-01T10:00:00Z"),
            order_status: "paid",
            total_cost: "199.00",
            customer_id: 42,
            customer_name: "John Doe",
            customer_email: "john@example.com",
            customer_phone: "0701234567",
            delivery_address_id: 11,
            invoice_address_id: 11,
        };

        const addressRow = {
            street: "Gatan 1",
            postal_code: "12345",
            city: "Stad",
            country: "Sverige",
            type: "delivery",
        };

        const paymentRow = {
            payment_id: 50,
            payment_method: "klarna",
            total_amount: "199.00",
            payment_status: "succeeded",
            transaction_id: "pi_stripe_123",
            payment_date: new Date("2026-03-01T10:01:00Z"),
        };

        const itemsRows = [
            {
                order_item_id: 1,
                variant_id: 10,
                quantity: 2,
                unit_price: "99.50",
                line_total: "199.00",
                product_id: 5,
                product_name: "Cozy Socks",
                size: "40-42",
                color: "Red",
                sku: "SKU-COZY-4042",
            },
        ];

        const query = vi.fn(async (sql: string) => {
            if (sql.includes("FROM Orders o")) return [orderRow];
            if (sql.includes("FROM Addresses")) return [addressRow];
            if (sql.includes("FROM Order_items oi")) return itemsRows;
            if (sql.includes("FROM Payments")) return [paymentRow];
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/orders/101");
        const res = await GET(req, { params: Promise.resolve({ orderId: "101" }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.order_id).toBe(101);
        expect(data.customer.name).toBe("John Doe");
        expect(data.delivery_address.street).toBe("Gatan 1");
        expect(data.payment.transaction_id).toBe("pi_stripe_123");
        expect(data.items).toHaveLength(1);
        expect(data.items[0].product_name).toBe("Cozy Socks");
        expect(data.items[0].line_total).toBe(199);
        expect(release).toHaveBeenCalledOnce();
    });
});

describe("PATCH /api/admin/orders/[orderId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("rejects invalid order_status with 400", async () => {
        const req = new Request("http://localhost/api/admin/orders/101", {
            method: "PATCH",
            body: JSON.stringify({ order_status: "invalid_status" }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ orderId: "101" }) });
        expect(res.status).toBe(400);
    });

    it("updates status to cancelled, restores stock, and writes audit log", async () => {
        const beginTransaction = vi.fn();
        const commit = vi.fn();
        const rollback = vi.fn();
        const release = vi.fn();
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("FOR UPDATE")) return [{ order_id: 101, order_status: "paid" }];
            if (sql.includes("FROM Order_items")) return [{ variant_id: 10, quantity: 2 }];
            return { affectedRows: 1 };
        });
        getConnection.mockResolvedValue({ query, beginTransaction, commit, rollback, release });

        const req = new Request("http://localhost/api/admin/orders/101", {
            method: "PATCH",
            body: JSON.stringify({ order_status: "cancelled" }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ orderId: "101" }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.order_status).toBe("cancelled");
        expect(data.stock_restored).toBe(true);
        expect(writeAudit).toHaveBeenCalledWith(
            expect.anything(),
            1,
            "update_order_status",
            "Orders",
            101,
            expect.objectContaining({
                before: { order_status: "paid" },
                after: { order_status: "cancelled" },
                stock_restored: true,
            })
        );
        expect(commit).toHaveBeenCalledOnce();
        expect(release).toHaveBeenCalledOnce();
    });
});
