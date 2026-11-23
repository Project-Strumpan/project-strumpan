import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, authorizeInventoryAccess, authorizeOwnerAccess, writeAudit } = vi.hoisted(() => ({
    getConnection: vi.fn(),
    authorizeInventoryAccess: vi.fn(),
    authorizeOwnerAccess: vi.fn(),
    writeAudit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ pool: { getConnection } }));
vi.mock("@/lib/inventory/access", () => ({ authorizeInventoryAccess, authorizeOwnerAccess }));
vi.mock("@/lib/inventory/helpers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/inventory/helpers")>();
    return {
        ...actual,
        writeAudit,
    };
});

import { GET, POST } from "./route";

describe("GET /api/admin/categories", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeInventoryAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 403 when not authorized", async () => {
        authorizeInventoryAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
        const res = await GET();
        expect(res.status).toBe(403);
        expect(getConnection).not.toHaveBeenCalled();
    });

    it("returns categories with formatted hierarchy display names and item counts", async () => {
        const rows = [
            { category_id: 1, parent_id: 1, category_name: "Socks", category_description: "All socks", product_count: 5, subcategory_count: 1 },
            { category_id: 2, parent_id: 1, category_name: "Wool Socks", category_description: "Warm socks", product_count: 2, subcategory_count: 0 },
        ];
        const release = vi.fn();
        getConnection.mockResolvedValue({ query: vi.fn(async () => rows), release });

        const res = await GET();
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toHaveLength(2);
        expect(data[0].display_name).toBe("Socks");
        expect(data[1].display_name).toBe("Socks > Wool Socks");
        expect(release).toHaveBeenCalledOnce();
    });
});

describe("POST /api/admin/categories", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 403 for inventory admin without manage_admins", async () => {
        authorizeOwnerAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
        const req = new Request("http://localhost/api/admin/categories", {
            method: "POST",
            body: JSON.stringify({ name: "Ankle Socks" }),
        });
        const res = await POST(req);
        expect(res.status).toBe(403);
    });

    it("returns 400 when category name is missing", async () => {
        const req = new Request("http://localhost/api/admin/categories", {
            method: "POST",
            body: JSON.stringify({ name: "   " }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.field).toBe("name");
    });

    it("returns 400 when category name is too long (> 255 chars)", async () => {
        const req = new Request("http://localhost/api/admin/categories", {
            method: "POST",
            body: JSON.stringify({ name: "a".repeat(256) }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.field).toBe("name");
    });

    it("returns 400 when parent category does not exist", async () => {
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("SELECT category_id FROM Categories WHERE category_id = ?")) {
                return [];
            }
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/categories", {
            method: "POST",
            body: JSON.stringify({ name: "Kids Socks", parentId: 999 }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.field).toBe("parentId");
        expect(release).toHaveBeenCalledOnce();
    });

    it("returns 400 when sibling category name is duplicated", async () => {
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("SELECT category_id FROM Categories WHERE category_id = ?")) {
                return [{ category_id: 1 }];
            }
            if (sql.includes("category_name = ?")) {
                return [{ category_id: 2 }];
            }
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/categories", {
            method: "POST",
            body: JSON.stringify({ name: "Existing Name", parentId: 1 }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.field).toBe("name");
        expect(data.error).toContain("unique among siblings");
    });

    it("creates top-level category, updates self parent_id, and writes audit log", async () => {
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("category_name = ?")) {
                return [];
            }
            if (sql.includes("LIMIT 1")) {
                return [{ category_id: 1 }];
            }
            if (sql.includes("INSERT INTO Categories")) {
                return { insertId: 10 };
            }
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/categories", {
            method: "POST",
            body: JSON.stringify({ name: "Sport", description: "Sport collection" }),
        });
        const res = await POST(req);
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.category_id).toBe(10);
        expect(data.parent_id).toBe(10);
        expect(data.category_name).toBe("Sport");
        expect(writeAudit).toHaveBeenCalledWith(
            expect.anything(),
            1,
            "create",
            "Categories",
            10,
            expect.objectContaining({ name: "Sport", parentId: null })
        );
        expect(release).toHaveBeenCalledOnce();
    });
});
