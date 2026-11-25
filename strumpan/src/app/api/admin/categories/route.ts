/*
 * Category management API for Main Admin (PRO-81 / PRO-89)
 * GET: Lists all categories with hierarchical display names and item counts.
 * POST: Creates a new category (Owner only).
 */

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeInventoryAccess, authorizeOwnerAccess } from "@/lib/inventory/access";
import { fieldError, isText, writeAudit } from "@/lib/inventory/helpers";

export type CategoryRecord = {
    category_id: number;
    parent_id: number;
    category_name: string;
    category_description: string | null;
    display_name?: string;
    product_count?: number;
    subcategory_count?: number;
};

export function buildCategoryHierarchy(categories: CategoryRecord[]): CategoryRecord[] {
    const byId = new Map<number, CategoryRecord>();
    for (const cat of categories) {
        byId.set(cat.category_id, cat);
    }

    return categories.map((cat) => {
        const isTopLevel = cat.parent_id === null || cat.parent_id === cat.category_id;
        if (isTopLevel) {
            return { ...cat, display_name: cat.category_name };
        }

        const parent = byId.get(cat.parent_id);
        const parentName = parent ? parent.category_name : "";
        const displayName = parentName ? `${parentName} > ${cat.category_name}` : cat.category_name;

        return { ...cat, display_name: displayName };
    });
}

export async function GET() {
    // Both inventory staff and owner can read categories to populate forms and views
    const access = await authorizeInventoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const rows = await connection.query<CategoryRecord[]>(`
            SELECT 
                c.category_id,
                c.parent_id,
                c.category_name,
                c.category_description,
                (SELECT COUNT(*) FROM Products p WHERE p.category_id = c.category_id) AS product_count,
                (SELECT COUNT(*) FROM Categories sub WHERE sub.parent_id = c.category_id AND sub.category_id != c.category_id) AS subcategory_count
            FROM Categories c
            ORDER BY c.category_name ASC
        `);

        const normalized = rows.map((row) => ({
            ...row,
            category_id: Number(row.category_id),
            parent_id: Number(row.parent_id),
            product_count: Number(row.product_count ?? 0),
            subcategory_count: Number(row.subcategory_count ?? 0),
        }));

        const formatted = buildCategoryHierarchy(normalized);
        return NextResponse.json(formatted, { status: 200 });
    } catch (error) {
        console.error("Failed to list categories", error);
        return NextResponse.json({ error: "Failed to list categories" }, { status: 500 });
    } finally {
        connection?.release();
    }
}

export async function POST(request: Request) {
    // Only Main Admin (Owner) can create categories
    const access = await authorizeOwnerAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const name = typeof body?.name === "string" ? body.name.trim() : "";
    if (!name || name.length > 255) {
        return fieldError("name", "Category name is required and cannot exceed 255 characters");
    }

    const description = typeof body?.description === "string" ? body.description.trim() : null;
    const parentId = body?.parentId !== undefined && body?.parentId !== null ? Number(body.parentId) : null;

    if (parentId !== null && (!Number.isSafeInteger(parentId) || parentId <= 0)) {
        return fieldError("parentId", "Invalid parent category");
    }

    let connection;
    try {
        connection = await pool.getConnection();

        // If parentId provided, verify that the parent category exists
        if (parentId !== null) {
            const parentRows = await connection.query<Array<{ category_id: number }>>(
                "SELECT category_id FROM Categories WHERE category_id = ?",
                [parentId]
            );
            if (parentRows.length === 0) {
                return fieldError("parentId", "Parent category does not exist");
            }
        }

        // Validate uniqueness among siblings
        // If top-level, siblings are categories where parent_id = category_id OR parent_id IS NULL
        const siblingQuery = parentId !== null
            ? "SELECT category_id FROM Categories WHERE parent_id = ? AND category_name = ?"
            : "SELECT category_id FROM Categories WHERE (parent_id = category_id OR parent_id IS NULL) AND category_name = ?";
        const siblingParams = parentId !== null ? [parentId, name] : [name];

        const existingSiblings = await connection.query<any[]>(siblingQuery, siblingParams);
        if (existingSiblings.length > 0) {
            return fieldError("name", "Category name must be unique among siblings");
        }

        // Insert new category
        // In the existing schema, parent_id is NOT NULL with self-reference for top level
        let newCategoryId: number;

        if (parentId !== null) {
            const result = await connection.query(
                "INSERT INTO Categories (parent_id, category_name, category_description) VALUES (?, ?, ?)",
                [parentId, name, description]
            );
            newCategoryId = Number(result.insertId ?? result.insert_id);
        } else {
            // For top-level with NOT NULL self-reference, use a temporary dummy parent or update after insert
            // Since foreign key references Categories(category_id), insert with 1 then update to own ID
            // or query an existing top level row first
            const existingRow = await connection.query<Array<{ category_id: number }>>(
                "SELECT category_id FROM Categories LIMIT 1"
            );
            const tempParent = existingRow.length > 0 ? existingRow[0].category_id : 1;

            const result = await connection.query(
                "INSERT INTO Categories (parent_id, category_name, category_description) VALUES (?, ?, ?)",
                [tempParent, name, description]
            );
            newCategoryId = Number(result.insertId ?? result.insert_id);
            await connection.query(
                "UPDATE Categories SET parent_id = ? WHERE category_id = ?",
                [newCategoryId, newCategoryId]
            );
        }

        // Record change in Audit_log (PRO-48 / PRO-75 / PRO-81)
        await writeAudit(
            connection,
            access.adminId,
            "create",
            "Categories",
            newCategoryId,
            { name, description, parentId }
        );

        return NextResponse.json({
            category_id: newCategoryId,
            parent_id: parentId ?? newCategoryId,
            category_name: name,
            category_description: description,
        }, { status: 201 });
    } catch (error) {
        console.error("Failed to create category", error);
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    } finally {
        connection?.release();
    }
}
