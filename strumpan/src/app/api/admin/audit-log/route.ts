/*
 * Admin audit log viewing API (PRO-90 / PRO-89)
 * Read-only view of recorded administrative actions.
 * Strictly Owner-only.
 */

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeOwnerAccess } from "@/lib/inventory/access";

function sanitizeDetails(details: any): any {
    if (!details || typeof details !== "object") return details;
    const clean = Array.isArray(details) ? [...details] : { ...details };
    const sensitiveKeys = ["password", "password_hash", "token", "secret", "cvv"];
    
    for (const key of Object.keys(clean)) {
        if (sensitiveKeys.includes(key.toLowerCase())) {
            clean[key] = "[REDACTED]";
        } else if (clean[key] && typeof clean[key] === "object") {
            clean[key] = sanitizeDetails(clean[key]);
        }
    }
    return clean;
}

export async function GET(request: Request) {
    const access = await authorizeOwnerAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const tableFilter = searchParams.get("table");
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 200);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

    let connection;
    try {
        connection = await pool.getConnection();

        let sql = `
            SELECT 
                al.log_id,
                al.admin_id,
                al.handling,
                al.table_name,
                al.record_id,
                al.time_stamp,
                al.details,
                a.admin_name,
                a.email AS admin_email
            FROM Audit_log al
            LEFT JOIN Admins a ON a.admin_id = al.admin_id
            WHERE 1=1
        `;

        const params: any[] = [];
        if (tableFilter && tableFilter.trim() !== "" && tableFilter !== "all") {
            sql += " AND al.table_name = ?";
            params.push(tableFilter.trim());
        }

        sql += " ORDER BY al.time_stamp DESC, al.log_id DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const rows = await connection.query<any[]>(sql, params);

        const logs = rows.map((row) => {
            let parsedDetails = null;
            if (row.details) {
                try {
                    parsedDetails = typeof row.details === "string" ? JSON.parse(row.details) : row.details;
                } catch {
                    parsedDetails = row.details;
                }
            }

            return {
                log_id: Number(row.log_id),
                time_stamp: row.time_stamp,
                handling: row.handling,
                table_name: row.table_name,
                record_id: Number(row.record_id),
                admin: {
                    admin_id: Number(row.admin_id),
                    name: row.admin_name || `Admin #${row.admin_id}`,
                    email: row.admin_email || "System/Unknown",
                },
                details: sanitizeDetails(parsedDetails),
            };
        });

        return NextResponse.json({ logs }, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch audit log", error);
        return NextResponse.json({ error: "Failed to fetch audit log" }, { status: 500 });
    } finally {
        connection?.release();
    }
}
