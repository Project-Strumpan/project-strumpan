/*
 * GET categories for the inventory product form (PRO-73)
 * Reads the Categories table. Requires inventory access.
*/

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeInventoryAccess } from "@/lib/inventory/access";

type CategoryRow = { category_id: number; category_name: string };

export async function GET() {
    const access = await authorizeInventoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const rows = await connection.query<CategoryRow[]>(
            "SELECT category_id, category_name FROM Categories ORDER BY category_name ASC"
        );
        return NextResponse.json(rows, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch categories", error);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    } finally {
        connection?.release();
    }
}
