/*
 * Category update and delete API for Main Admin (PRO-81 / PRO-89)
 * PATCH: Edit category name and description (Owner only).
 * DELETE: Delete category only if empty (Owner only, 409 if products or subcategories exist).
 */

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeOwnerAccess } from "@/lib/inventory/access";
import { fieldError, parseId, writeAudit } from "@/lib/inventory/helpers";

type Context = { params: Promise<{ categoryId: string }> };

export async function PATCH(request: Request, { params }: Context) {
    const access = await authorizeOwnerAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const categoryId = parseId((await params).categoryId);
    if (!categoryId) {
        return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        // Check if category exists and get before-snapshot
        const [existing] = await connection.query<any[]>(
            "SELECT category_id, parent_id, category_name, category_description FROM Categories WHERE category_id = ?",
            [categoryId]
        );
        if (!existing) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        const newName = body?.name !== undefined ? (typeof body.name === "string" ? body.name.trim() : "") : existing.category_name;
        if (!newName || newName.length > 255) {
            return fieldError("name", "Category name is required and cannot exceed 255 characters");
        }

        const newDescription = body?.description !== undefined
            ? (typeof body.description === "string" ? body.description.trim() : null)
            : existing.category_description;

        // Check sibling uniqueness if name changed
        if (newName !== existing.category_name) {
            const isTopLevel = existing.parent_id === null || existing.parent_id === existing.category_id;
            const duplicateQuery = isTopLevel
                ? "SELECT category_id FROM Categories WHERE (parent_id = category_id OR parent_id IS NULL) AND category_name = ? AND category_id != ?"
                : "SELECT category_id FROM Categories WHERE parent_id = ? AND category_name = ? AND category_id != ?";
            const duplicateParams = isTopLevel ? [newName, categoryId] : [existing.parent_id, newName, categoryId];

            const duplicates = await connection.query<any[]>(duplicateQuery, duplicateParams);
            if (duplicates.length > 0) {
                return fieldError("name", "Category name must be unique among siblings");
            }
        }

        // Update category
        await connection.query(
            "UPDATE Categories SET category_name = ?, category_description = ? WHERE category_id = ?",
            [newName, newDescription, categoryId]
        );

        // Audit log with before/after
        await writeAudit(
            connection,
            access.adminId,
            "update",
            "Categories",
            categoryId,
            {
                before: {
                    name: existing.category_name,
                    description: existing.category_description,
                },
                after: {
                    name: newName,
                    description: newDescription,
                },
            }
        );

        return NextResponse.json({
            category_id: categoryId,
            parent_id: existing.parent_id,
            category_name: newName,
            category_description: newDescription,
        }, { status: 200 });
    } catch (error) {
        console.error("Failed to update category", error);
        return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
    } finally {
        connection?.release();
    }
}

export async function DELETE(_request: Request, { params }: Context) {
    const access = await authorizeOwnerAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const categoryId = parseId((await params).categoryId);
    if (!categoryId) {
        return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        // 1. Fetch category
        const [existing] = await connection.query<any[]>(
            "SELECT category_id, parent_id, category_name, category_description FROM Categories WHERE category_id = ?",
            [categoryId]
        );
        if (!existing) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        // 2. Safeguard: Check if category has products
        const [prodRow] = await connection.query<Array<{ count: number | string }>>(
            "SELECT COUNT(*) AS count FROM Products WHERE category_id = ?",
            [categoryId]
        );
        if (Number(prodRow.count) > 0) {
            return NextResponse.json(
                { error: "Cannot delete category that has products" },
                { status: 409 }
            );
        }

        // 3. Safeguard: Check if category has subcategories
        const [subRow] = await connection.query<Array<{ count: number | string }>>(
            "SELECT COUNT(*) AS count FROM Categories WHERE parent_id = ? AND category_id != ?",
            [categoryId, categoryId]
        );
        if (Number(subRow.count) > 0) {
            return NextResponse.json(
                { error: "Cannot delete category that has subcategories" },
                { status: 409 }
            );
        }

        // 4. Delete category
        await connection.query("DELETE FROM Categories WHERE category_id = ?", [categoryId]);

        // 5. Record audit log
        await writeAudit(
            connection,
            access.adminId,
            "delete",
            "Categories",
            categoryId,
            {
                before: {
                    name: existing.category_name,
                    parentId: existing.parent_id,
                    description: existing.category_description,
                },
            }
        );

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error("Failed to delete category", error);
        return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
    } finally {
        connection?.release();
    }
}
