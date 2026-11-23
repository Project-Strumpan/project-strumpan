import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, authorizeOwnerAccess } = vi.hoisted(() => ({
    getConnection: vi.fn(),
    authorizeOwnerAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ pool: { getConnection } }));
vi.mock("@/lib/inventory/access", () => ({ authorizeOwnerAccess }));

import { GET } from "./route";

describe("GET /api/admin/orders", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 403 for non-owner", async () => {
        authorizeOwnerAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
        const req = new Request("http://localhost/api/admin/orders");
        const res = await GET(req);
        expect(res.status).toBe(403);
    });

    it("returns orders formatted with customer and payment details", async () => {
        const rows = [
            {
                order_id: 101,
                order_date: new Date("2026-03-01T10:00:00Z"),
                order_status: "paid",
                total_cost: "299.00",
                customer_id: 42,
                customer_name: "Test Customer",
                customer_email: "test@example.com",
                payment_method: "klarna",
                payment_status: "succeeded",
                transaction_id: "pi_12345",
                total_items: "3",
            },
        ];
        const release = vi.fn();
        getConnection.mockResolvedValue({ query: vi.fn(async () => rows), release });

        const req = new Request("http://localhost/api/admin/orders?status=paid");
        const res = await GET(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.orders).toHaveLength(1);
        expect(data.orders[0].order_id).toBe(101);
        expect(data.orders[0].order_status).toBe("paid");
        expect(data.orders[0].total_cost).toBe(299);
        expect(data.orders[0].customer.email).toBe("test@example.com");
        expect(data.orders[0].payment.payment_method).toBe("klarna");
        expect(data.orders[0].total_items).toBe(3);
        expect(release).toHaveBeenCalledOnce();
    });

    it("handles database errors gracefully with status 500", async () => {
        const release = vi.fn();
        getConnection.mockResolvedValue({
            query: vi.fn(async () => {
                throw new Error("db failure");
            }),
            release,
        });

        const req = new Request("http://localhost/api/admin/orders");
        const res = await GET(req);
        expect(res.status).toBe(500);
        expect(release).toHaveBeenCalledOnce();
    });
});
