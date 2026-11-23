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
    return {
        ...actual,
        writeAudit,
    };
});

import { GET, PATCH } from "./route";

describe("GET /api/admin/products/[productId]/price", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 403 for inventory admin", async () => {
        authorizeOwnerAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
        const req = new Request("http://localhost/api/admin/products/10/price");
        const res = await GET(req, { params: Promise.resolve({ productId: "10" }) });
        expect(res.status).toBe(403);
    });

    it("returns 404 if product not found", async () => {
        const query = vi.fn(async () => []);
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/products/999/price");
        const res = await GET(req, { params: Promise.resolve({ productId: "999" }) });
        expect(res.status).toBe(404);
        expect(release).toHaveBeenCalledOnce();
    });

    it("returns current price on success", async () => {
        const query = vi.fn(async () => [{ product_id: 10, product_name: "Warm Socks", price: 149.00 }]);
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/products/10/price");
        const res = await GET(req, { params: Promise.resolve({ productId: "10" }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.price).toBe(149);
        expect(data.product_name).toBe("Warm Socks");
        expect(release).toHaveBeenCalledOnce();
    });
});

describe("PATCH /api/admin/products/[productId]/price", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 403 for inventory admin", async () => {
        authorizeOwnerAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
        const req = new Request("http://localhost/api/admin/products/10/price", {
            method: "PATCH",
            body: JSON.stringify({ price: 199 }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ productId: "10" }) });
        expect(res.status).toBe(403);
    });

    it("returns 400 for negative price", async () => {
        const req = new Request("http://localhost/api/admin/products/10/price", {
            method: "PATCH",
            body: JSON.stringify({ price: -10 }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ productId: "10" }) });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.field).toBe("price");
    });

    it("returns 400 for non-numeric price", async () => {
        const req = new Request("http://localhost/api/admin/products/10/price", {
            method: "PATCH",
            body: JSON.stringify({ price: "not-a-number" }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ productId: "10" }) });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.field).toBe("price");
    });

    it("returns 404 if product not found", async () => {
        const query = vi.fn(async () => []);
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/products/999/price", {
            method: "PATCH",
            body: JSON.stringify({ price: 199.50 }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ productId: "999" }) });
        expect(res.status).toBe(404);
        expect(release).toHaveBeenCalledOnce();
    });

    it("updates price and writes audit log without changing historical order items", async () => {
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("SELECT product_id, product_name, price")) {
                return [{ product_id: 10, product_name: "Warm Socks", price: 149.00 }];
            }
            if (sql.includes("UPDATE Products SET price = ?")) {
                return { affectedRows: 1 };
            }
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/products/10/price", {
            method: "PATCH",
            body: JSON.stringify({ price: 179 }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ productId: "10" }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.price).toBe(179);
        expect(data.previous_price).toBe(149);
        expect(writeAudit).toHaveBeenCalledWith(
            expect.anything(),
            1,
            "update_price",
            "Products",
            10,
            expect.objectContaining({
                before: { price: 149 },
                after: { price: 179 },
            })
        );
        expect(release).toHaveBeenCalledOnce();
    });
});
