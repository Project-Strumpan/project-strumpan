import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, authorizeOwnerAccess } = vi.hoisted(() => ({
    getConnection: vi.fn(),
    authorizeOwnerAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ pool: { getConnection } }));
vi.mock("@/lib/inventory/access", () => ({ authorizeOwnerAccess }));

import { GET } from "./route";

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
