import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, authorizeInventoryAccess } = vi.hoisted(() => ({
    getConnection: vi.fn(),
    authorizeInventoryAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
    pool: { getConnection },
}));

vi.mock("@/lib/inventory/access", () => ({
    authorizeInventoryAccess,
}));

import { PATCH } from "./route";

const LAST_UPDATED = "2026-11-18T12:00:00.000Z";

type Options = {
    rows?: Array<{ inventory_id: number; quantity: number | string }>;
    auditError?: Error;
};

function mockConnection({ rows = [{ inventory_id: 7, quantity: 5 }], auditError }: Options = {}) {
    const query = vi.fn(async (sql: string) => {
        if (sql.includes("FOR UPDATE")) return rows;
        if (sql.includes("INSERT INTO Audit_log")) {
            if (auditError) throw auditError;
            return { affectedRows: 1 };
        }
        if (sql.startsWith("UPDATE Inventory")) return { affectedRows: 1 };
        if (sql.includes("SELECT last_updated")) return [{ last_updated: new Date(LAST_UPDATED) }];
        throw new Error(`Unexpected SQL: ${sql}`);
    });
    const connection = {
        beginTransaction: vi.fn().mockResolvedValue(undefined),
        query,
        commit: vi.fn().mockResolvedValue(undefined),
        rollback: vi.fn().mockResolvedValue(undefined),
        release: vi.fn(),
    };
    getConnection.mockResolvedValue(connection);
    return connection;
}

function patch(body: unknown, variantId = "10") {
    const request = new Request(`http://localhost/api/inventory/${variantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
    });
    return PATCH(request, { params: Promise.resolve({ variantId }) });
}

describe("PATCH /api/inventory/[variantId]", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "error").mockImplementation(() => { });
        authorizeInventoryAccess.mockResolvedValue({ ok: true, adminId: 3 });
    });

    it.each([
        [401, "Unauthorized"],
        [403, "Forbidden"],
    ])("returns %i and does not touch the database when access is denied", async (status, error) => {
        authorizeInventoryAccess.mockResolvedValue({ ok: false, status, error });

        const response = await patch({ quantity: 8, expectedQuantity: 5 });

        expect(response.status).toBe(status);
        expect(await response.json()).toEqual({ error });
        expect(getConnection).not.toHaveBeenCalled();
    });

    it.each(["abc", "0", "-1", "1.5"])("rejects invalid variant id %s", async (id) => {
        const response = await patch({ quantity: 8, expectedQuantity: 5 }, id);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Invalid variant ID" });
        expect(getConnection).not.toHaveBeenCalled();
    });

    it("rejects an invalid JSON body", async () => {
        const response = await patch("{not json");

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ error: "Invalid JSON body" });
        expect(getConnection).not.toHaveBeenCalled();
    });

    it.each([
        ["negative quantity", { quantity: -1, expectedQuantity: 5 }],
        ["decimal quantity", { quantity: 1.5, expectedQuantity: 5 }],
        ["string quantity", { quantity: "8", expectedQuantity: 5 }],
        ["quantity above INT max", { quantity: 2147483648, expectedQuantity: 5 }],
        ["missing quantity", { expectedQuantity: 5 }],
        ["missing expectedQuantity", { quantity: 8 }],
        ["null body", null],
    ])("rejects %s without querying the database", async (_name, body) => {
        const response = await patch(body);

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({
            error: "quantity and expectedQuantity must be non-negative integers",
        });
        expect(getConnection).not.toHaveBeenCalled();
    });

    it("returns 404 and rolls back when the variant has no inventory row", async () => {
        const connection = mockConnection({ rows: [] });

        const response = await patch({ quantity: 8, expectedQuantity: 5 });

        expect(response.status).toBe(404);
        expect(await response.json()).toEqual({ error: "Variant not found" });
        expect(connection.rollback).toHaveBeenCalledOnce();
        expect(connection.commit).not.toHaveBeenCalled();
        expect(connection.release).toHaveBeenCalledOnce();
    });

    it("returns 409 with the current quantity and does not update on conflict", async () => {
        const connection = mockConnection({ rows: [{ inventory_id: 7, quantity: 9 }] });

        const response = await patch({ quantity: 8, expectedQuantity: 5 });

        expect(response.status).toBe(409);
        expect(await response.json()).toEqual({
            error: "Stock was changed by someone else",
            currentQuantity: 9,
        });
        expect(connection.query).not.toHaveBeenCalledWith(
            expect.stringContaining("UPDATE Inventory"),
            expect.anything()
        );
        expect(connection.rollback).toHaveBeenCalledOnce();
        expect(connection.commit).not.toHaveBeenCalled();
        expect(connection.release).toHaveBeenCalledOnce();
    });

    it("treats a string quantity from MariaDB as a number when comparing", async () => {
        mockConnection({ rows: [{ inventory_id: 7, quantity: "5" }] });

        const response = await patch({ quantity: 8, expectedQuantity: 5 });

        expect(response.status).toBe(200);
    });

    it("updates stock, writes the audit entry and commits in one transaction", async () => {
        const connection = mockConnection();

        const response = await patch({ quantity: 8, expectedQuantity: 5 });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            variant_id: 10,
            quantity: 8,
            last_updated: LAST_UPDATED,
        });
        expect(connection.beginTransaction).toHaveBeenCalledOnce();
        expect(connection.query).toHaveBeenCalledWith(
            expect.stringContaining("UPDATE Inventory SET quantity = ?"),
            [8, 7]
        );
        expect(connection.query).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO Audit_log"),
            [
                3,
                "update_stock_quantity",
                "Inventory",
                7,
                JSON.stringify({ variant_id: 10, old_quantity: 5, new_quantity: 8 }),
            ]
        );
        expect(connection.commit).toHaveBeenCalledOnce();
        expect(connection.rollback).not.toHaveBeenCalled();
        expect(connection.release).toHaveBeenCalledOnce();
    });

    it("rolls back and returns 500 when there is no local admin record", async () => {
        authorizeInventoryAccess.mockResolvedValue({ ok: true });
        const connection = mockConnection();

        const response = await patch({ quantity: 8, expectedQuantity: 5 });

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Failed to update stock" });
        expect(connection.query).not.toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO Audit_log"),
            expect.anything()
        );
        expect(connection.rollback).toHaveBeenCalledOnce();
        expect(connection.commit).not.toHaveBeenCalled();
        expect(connection.release).toHaveBeenCalledOnce();
    });


    it("rolls back and returns 500 when the audit insert fails", async () => {
        const connection = mockConnection({ auditError: new Error("audit failed") });

        const response = await patch({ quantity: 8, expectedQuantity: 5 });

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Failed to update stock" });
        expect(connection.rollback).toHaveBeenCalledOnce();
        expect(connection.commit).not.toHaveBeenCalled();
        expect(connection.release).toHaveBeenCalledOnce();
    });

    it("returns 500 when no database connection can be obtained", async () => {
        getConnection.mockRejectedValue(new Error("pool exhausted"));

        const response = await patch({ quantity: 8, expectedQuantity: 5 });

        expect(response.status).toBe(500);
        expect(await response.json()).toEqual({ error: "Failed to update stock" });
    });
});
