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

import { GET, POST } from "./route";

describe("GET /api/admin/admins", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 403 for non-owner", async () => {
        authorizeOwnerAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
        const res = await GET();
        expect(res.status).toBe(403);
    });

    it("lists admins and available roles", async () => {
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("FROM Admins a")) {
                return [{ admin_id: 1, admin_name: "Owner", email: "owner@test.se", role_id: 1, role_name: "superadmin" }];
            }
            if (sql.includes("FROM Roles")) {
                return [
                    { role_id: 1, role_name: "superadmin", roles_description: "Full access" },
                    { role_id: 2, role_name: "inventory_manager", roles_description: "Inventory" },
                ];
            }
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const res = await GET();
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.admins).toHaveLength(1);
        expect(data.roles).toHaveLength(2);
        expect(release).toHaveBeenCalledOnce();
    });
});

describe("POST /api/admin/admins", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 409 when email already exists", async () => {
        const beginTransaction = vi.fn();
        const rollback = vi.fn();
        const release = vi.fn();
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("FROM Roles")) return [{ role_id: 2, role_name: "inventory_manager" }];
            if (sql.includes("FROM Admins WHERE email = ?")) return [{ admin_id: 5 }];
            return [];
        });
        getConnection.mockResolvedValue({ query, beginTransaction, rollback, release });

        const req = new Request("http://localhost/api/admin/admins", {
            method: "POST",
            body: JSON.stringify({ admin_name: "Dup", email: "dup@test.se", role_id: 2 }),
        });
        const res = await POST(req);
        expect(res.status).toBe(409);
        expect(rollback).toHaveBeenCalledOnce();
        expect(release).toHaveBeenCalledOnce();
    });

    it("creates a new admin with assigned role and writes audit log", async () => {
        const beginTransaction = vi.fn();
        const commit = vi.fn();
        const rollback = vi.fn();
        const release = vi.fn();
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("FROM Roles")) return [{ role_id: 2, role_name: "inventory_manager" }];
            if (sql.includes("FROM Admins WHERE email = ?")) return [];
            if (sql.includes("INSERT INTO Admins")) return { insertId: 9 };
            return [];
        });
        getConnection.mockResolvedValue({ query, beginTransaction, commit, rollback, release });

        const req = new Request("http://localhost/api/admin/admins", {
            method: "POST",
            body: JSON.stringify({ admin_name: "New Inv", email: "Inv@Test.se", role_id: 2 }),
        });
        const res = await POST(req);
        expect(res.status).toBe(201);
        const data = await res.json();
        expect(data.admin_id).toBe(9);
        expect(data.email).toBe("inv@test.se");
        expect(data.role_name).toBe("inventory_manager");
        expect(writeAudit).toHaveBeenCalledWith(
            expect.anything(),
            1,
            "create_admin",
            "Admins",
            9,
            expect.objectContaining({ email: "inv@test.se", role_id: 2 })
        );
        expect(commit).toHaveBeenCalledOnce();
        expect(release).toHaveBeenCalledOnce();
    });
});
