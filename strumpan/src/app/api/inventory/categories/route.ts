/*
 * GET categories for the inventory product form (PRO-73)
 * Reads the Categories table. Requires inventory access.
*/

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeInventoryAccess } from "@/lib/inventory/access";
import { buildCategoryHierarchy, CategoryRecord } from "@/app/api/admin/categories/route";

type CategoryRow = { category_id: number; category_name: string };

export async function GET() {
    const access = await authorizeInventoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const rows = await connection.query<CategoryRecord[]>(
            "SELECT category_id, parent_id, category_name, category_description FROM Categories ORDER BY category_name ASC"
        );
        const hierarchical = buildCategoryHierarchy(rows).map((c) => ({
            category_id: c.category_id,
            category_name: c.display_name ?? c.category_name,
        }));
        return NextResponse.json(hierarchical, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch categories", error);
        return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
    } finally {
        connection?.release();
    }
}
