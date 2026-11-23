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

import { DELETE, PATCH } from "./route";

describe("PATCH /api/admin/categories/[categoryId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 403 for non-owner", async () => {
        authorizeOwnerAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
        const req = new Request("http://localhost/api/admin/categories/1", {
            method: "PATCH",
            body: JSON.stringify({ name: "Updated" }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ categoryId: "1" }) });
        expect(res.status).toBe(403);
    });

    it("returns 404 if category does not exist", async () => {
        const query = vi.fn(async () => []);
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/categories/999", {
            method: "PATCH",
            body: JSON.stringify({ name: "Updated" }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ categoryId: "999" }) });
        expect(res.status).toBe(404);
        expect(release).toHaveBeenCalledOnce();
    });

    it("returns 400 if updated name duplicates an existing sibling", async () => {
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("SELECT category_id, parent_id, category_name")) {
                return [{ category_id: 2, parent_id: 1, category_name: "Old Name", category_description: null }];
            }
            if (sql.includes("AND category_id != ?")) {
                return [{ category_id: 3 }];
            }
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/categories/2", {
            method: "PATCH",
            body: JSON.stringify({ name: "Duplicate Sibling" }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ categoryId: "2" }) });
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.field).toBe("name");
        expect(data.error).toContain("unique among siblings");
    });

    it("successfully updates category and records audit log", async () => {
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("SELECT category_id, parent_id, category_name")) {
                return [{ category_id: 2, parent_id: 1, category_name: "Old Name", category_description: "Old desc" }];
            }
            if (sql.includes("AND category_id != ?")) {
                return [];
            }
            if (sql.includes("UPDATE Categories")) {
                return { affectedRows: 1 };
            }
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/categories/2", {
            method: "PATCH",
            body: JSON.stringify({ name: "New Name", description: "New desc" }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ categoryId: "2" }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.category_name).toBe("New Name");
        expect(data.category_description).toBe("New desc");
        expect(writeAudit).toHaveBeenCalledWith(
            expect.anything(),
            1,
            "update",
            "Categories",
            2,
            expect.objectContaining({
                before: { name: "Old Name", description: "Old desc" },
                after: { name: "New Name", description: "New desc" },
            })
        );
        expect(release).toHaveBeenCalledOnce();
    });
});

describe("DELETE /api/admin/categories/[categoryId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 404 if category does not exist", async () => {
        const query = vi.fn(async () => []);
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/categories/999", { method: "DELETE" });
        const res = await DELETE(req, { params: Promise.resolve({ categoryId: "999" }) });
        expect(res.status).toBe(404);
        expect(release).toHaveBeenCalledOnce();
    });

    it("returns 409 conflict if products exist in category", async () => {
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("SELECT category_id, parent_id")) {
                return [{ category_id: 2, parent_id: 1, category_name: "With Products", category_description: null }];
            }
            if (sql.includes("FROM Products WHERE category_id = ?")) {
                return [{ count: 3 }];
            }
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/categories/2", { method: "DELETE" });
        const res = await DELETE(req, { params: Promise.resolve({ categoryId: "2" }) });
        expect(res.status).toBe(409);
        const data = await res.json();
        expect(data.error).toContain("has products");
        expect(release).toHaveBeenCalledOnce();
    });

    it("returns 409 conflict if subcategories exist under category", async () => {
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("SELECT category_id, parent_id")) {
                return [{ category_id: 1, parent_id: 1, category_name: "Parent Cat", category_description: null }];
            }
            if (sql.includes("FROM Products WHERE category_id = ?")) {
                return [{ count: 0 }];
            }
            if (sql.includes("FROM Categories WHERE parent_id = ? AND category_id != ?")) {
                return [{ count: 2 }];
            }
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/categories/1", { method: "DELETE" });
        const res = await DELETE(req, { params: Promise.resolve({ categoryId: "1" }) });
        expect(res.status).toBe(409);
        const data = await res.json();
        expect(data.error).toContain("has subcategories");
        expect(release).toHaveBeenCalledOnce();
    });

    it("successfully deletes empty category and records audit log", async () => {
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("SELECT category_id, parent_id")) {
                return [{ category_id: 5, parent_id: 1, category_name: "Empty Sub", category_description: "Empty" }];
            }
            if (sql.includes("FROM Products WHERE category_id = ?")) {
                return [{ count: 0 }];
            }
            if (sql.includes("FROM Categories WHERE parent_id = ? AND category_id != ?")) {
                return [{ count: 0 }];
            }
            if (sql.includes("DELETE FROM Categories")) {
                return { affectedRows: 1 };
            }
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/categories/5", { method: "DELETE" });
        const res = await DELETE(req, { params: Promise.resolve({ categoryId: "5" }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.success).toBe(true);
        expect(writeAudit).toHaveBeenCalledWith(
            expect.anything(),
            1,
            "delete",
            "Categories",
            5,
            expect.objectContaining({
                before: { name: "Empty Sub", parentId: 1, description: "Empty" },
            })
        );
        expect(release).toHaveBeenCalledOnce();
    });
});
