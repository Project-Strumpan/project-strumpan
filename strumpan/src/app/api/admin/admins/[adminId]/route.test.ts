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

import { DELETE, PATCH } from "./route";

describe("PATCH /api/admin/admins/[adminId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("prevents owner from changing their own role", async () => {
        const beginTransaction = vi.fn();
        const rollback = vi.fn();
        const release = vi.fn();
        const query = vi.fn(async () => [{ admin_id: 1, admin_name: "Owner", email: "o@t.se", role_id: 1 }]);
        getConnection.mockResolvedValue({ query, beginTransaction, rollback, release });

        const req = new Request("http://localhost/api/admin/admins/1", {
            method: "PATCH",
            body: JSON.stringify({ role_id: 2 }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ adminId: "1" }) });
        expect(res.status).toBe(400);
        expect(rollback).toHaveBeenCalledOnce();
    });

    it("updates another admin's role and records audit log", async () => {
        const beginTransaction = vi.fn();
        const commit = vi.fn();
        const rollback = vi.fn();
        const release = vi.fn();
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("FOR UPDATE")) return [{ admin_id: 2, admin_name: "Staff", email: "s@t.se", role_id: 2 }];
            if (sql.includes("FROM Roles")) return [{ role_id: 1, role_name: "superadmin" }];
            return { affectedRows: 1 };
        });
        getConnection.mockResolvedValue({ query, beginTransaction, commit, rollback, release });

        const req = new Request("http://localhost/api/admin/admins/2", {
            method: "PATCH",
            body: JSON.stringify({ role_id: 1 }),
        });
        const res = await PATCH(req, { params: Promise.resolve({ adminId: "2" }) });
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.role_id).toBe(1);
        expect(data.role_name).toBe("superadmin");
        expect(writeAudit).toHaveBeenCalledWith(
            expect.anything(),
            1,
            "update_admin_role",
            "Admins",
            2,
            expect.objectContaining({
                before: { admin_name: "Staff", role_id: 2 },
                after: { admin_name: "Staff", role_id: 1 },
            })
        );
        expect(commit).toHaveBeenCalledOnce();
    });
});

describe("DELETE /api/admin/admins/[adminId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("prevents owner from deleting themselves", async () => {
        const req = new Request("http://localhost/api/admin/admins/1", { method: "DELETE" });
        const res = await DELETE(req, { params: Promise.resolve({ adminId: "1" }) });
        expect(res.status).toBe(400);
    });

    it("deletes another admin and writes audit log", async () => {
        const beginTransaction = vi.fn();
        const commit = vi.fn();
        const rollback = vi.fn();
        const release = vi.fn();
        const query = vi.fn(async (sql: string) => {
            if (sql.includes("FOR UPDATE")) return [{ admin_id: 3, admin_name: "Old Staff", email: "old@t.se", role_id: 2 }];
            return { affectedRows: 1 };
        });
        getConnection.mockResolvedValue({ query, beginTransaction, commit, rollback, release });

        const req = new Request("http://localhost/api/admin/admins/3", { method: "DELETE" });
        const res = await DELETE(req, { params: Promise.resolve({ adminId: "3" }) });
        expect(res.status).toBe(200);
        expect(writeAudit).toHaveBeenCalledWith(
            expect.anything(),
            1,
            "delete_admin",
            "Admins",
            3,
            expect.anything()
        );
        expect(commit).toHaveBeenCalledOnce();
        expect(release).toHaveBeenCalledOnce();
    });
});
