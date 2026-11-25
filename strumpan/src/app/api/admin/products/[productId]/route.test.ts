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

describe("GET /api/admin/products/[productId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 403 for non-owner", async () => {
        authorizeOwnerAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
        const req = new Request("http://localhost/api/admin/products/10");
        const res = await GET(req, { params: Promise.resolve({ productId: "10" }) });
        expect(res.status).toBe(403);
    });

    it("returns product details including published status, category, and image", async () => {
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("FROM Products p")) {
                return [{
                    product_id: 10,
                    product_name: "Draft Sock",
                    category_id: 2,
                    category_name: "Sports",
                    price: "0.00",
                    picture_url: null,
                    product_description: null,
                }];
            }
            if (sql.includes("FROM Product_variants pv")) {
                return [{ variant_id: 1, sku: "SKU-1", color: "Blue", size: "40-42", quantity: 10 }];
            }
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/products/10");
        const res = await GET(req, { params: Promise.resolve({ productId: "10" }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.published).toBe(false);
        expect(data.category_id).toBe(2);
        expect(data.variants).toHaveLength(1);
        expect(release).toHaveBeenCalledOnce();
    });
});

describe("PATCH /api/admin/products/[productId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 403 for inventory admin", async () => {
        authorizeOwnerAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
        const req = new Request("http://localhost/api/admin/products/10", {
            method: "PATCH",
            body: JSON.stringify({ picture_url: "/img.png" }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ productId: "10" }) });
        expect(res.status).toBe(403);
    });

    it("updates category_id and picture_url and records audit log", async () => {
        const beginTransaction = vi.fn();
        const commit = vi.fn();
        const rollback = vi.fn();
        const release = vi.fn();
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("FOR UPDATE")) {
                return [{ product_id: 10, category_id: 1, picture_url: null }];
            }
            if (sql.includes("FROM Categories WHERE category_id = ?")) {
                return [{ category_id: 3 }];
            }
            return { affectedRows: 1 };
        });
        getConnection.mockResolvedValue({ query, beginTransaction, commit, rollback, release });

        const req = new Request("http://localhost/api/admin/products/10", {
            method: "PATCH",
            body: JSON.stringify({ category_id: 3, picture_url: "/images/sock.jpg" }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ productId: "10" }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.category_id).toBe(3);
        expect(data.picture_url).toBe("/images/sock.jpg");
        expect(writeAudit).toHaveBeenCalledWith(
            expect.anything(),
            1,
            "update_product_details",
            "Products",
            10,
            expect.objectContaining({
                before: { category_id: 1, picture_url: null },
                after: { category_id: 3, picture_url: "/images/sock.jpg" },
            })
        );
        expect(commit).toHaveBeenCalledOnce();
        expect(release).toHaveBeenCalledOnce();
    });
});
