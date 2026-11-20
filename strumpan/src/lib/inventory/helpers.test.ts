import { describe, expect, it, vi } from "vitest";
import type { PoolConnection } from "mariadb";
import { writeAudit } from "./helpers";

function fakeConnection() {
    const query = vi.fn().mockResolvedValue({ affectedRows: 1 });
    return { connection: { query } as unknown as PoolConnection, query };
}

describe("writeAudit", () => {
    it("inserts an audit row with the admin, action, target and JSON details", async () => {
        const { connection, query } = fakeConnection();

        await writeAudit(connection, 2, "update_product", "Products", 5, {
            before: { productName: "A" },
            after: { productName: "B" },
        });

        expect(query).toHaveBeenCalledOnce();
        expect(query).toHaveBeenCalledWith(
            expect.stringContaining("INSERT INTO Audit_log"),
            [
                2,
                "update_product",
                "Products",
                5,
                JSON.stringify({ before: { productName: "A" }, after: { productName: "B" } }),
            ]
        );
    });

    it("throws and writes nothing when there is no local admin record", async () => {
        const { connection, query } = fakeConnection();

        await expect(
            writeAudit(connection, undefined, "delete_product", "Products", 5, {})
        ).rejects.toThrow("no local admin record");
        expect(query).not.toHaveBeenCalled();
    });
});