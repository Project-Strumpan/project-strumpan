import type { PoolConnection } from "mariadb";
import { NextResponse } from "next/server";

export function parseId(raw: string): number | null {
    const id = Number(raw);
    return Number.isSafeInteger(id) && id >= 1 ? id : null;
}

export async function writeAudit(
    connection: PoolConnection,
    adminId: number | undefined,
    handling: string,
    tableName: string,
    recordId: number,
    details: object
) {
    if (adminId === undefined) {
        console.warn("Skipping audit log because no local admin record exists.");
        return;
    }

    await connection.query(
        `INSERT INTO Audit_log (admin_id, handling, table_name, record_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [adminId, handling, tableName, recordId, JSON.stringify(details)]
    );
}

export function dbErrorResponse(error: unknown, fallback: string) {
    const code = (error as { code?: string }).code;
    if (code === "ER_DUP_ENTRY") {
        return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
    }
    if (code === "ER_NO_REFERENCED_ROW_2") {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    console.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}