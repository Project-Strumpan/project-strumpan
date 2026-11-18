/*
 * POST add a variant (and its inventory row) to an existing product (PRO-73)
 * Body: { sku, color, size, quantity }
 * Errors: { error, field } where field names the invalid input.
*/

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeInventoryAccess } from "@/lib/inventory/access";
import {
    dbErrorResponse,
    fieldError,
    parseId,
    parseVariant,
    writeAudit,
} from "@/lib/inventory/helpers";

type Context = { params: Promise<{ productId: string }> };

export async function POST(request: Request, { params }: Context) {
    const access = await authorizeInventoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const productId = parseId((await params).productId);
    if (!productId) {
        return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const result = parseVariant(body, "");
    if (!result.ok) {
        return fieldError(result.field, result.error);
    }
    const variant = result.value;

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const products = await connection.query<Array<{ product_id: number }>>(
            "SELECT product_id FROM Products WHERE product_id = ?",
            [productId]
        );
        if (products.length === 0) {
            await connection.rollback();
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const inserted = await connection.query(
            `INSERT INTO Product_variants (product_id, product_variant_size, color, sku)
             VALUES (?, ?, ?, ?)`,
            [productId, variant.size, variant.color, variant.sku]
        );
        const variantId = Number(inserted.insertId);

        await connection.query(
            "INSERT INTO Inventory (variant_id, quantity) VALUES (?, ?)",
            [variantId, variant.quantity]
        );

        await writeAudit(connection, access.adminId, "create_variant", "Product_variants", variantId, {
            product_id: productId,
            ...variant,
        });

        await connection.commit();
        return NextResponse.json({ variant_id: variantId }, { status: 201 });
    } catch (error) {
        try { await connection?.rollback(); } catch { /* ignore */ }
        if ((error as { code?: string }).code === "ER_NO_REFERENCED_ROW_2") {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }
        return dbErrorResponse(error, "Failed to add variant");
    } finally {

        connection?.release();
    }
}
