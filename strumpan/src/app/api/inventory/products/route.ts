/*
 * POST create product with variants + inventory rows (PRO-73)
 * Body: { productName, categoryId, variants: [{ sku, color, size, quantity }] }
 * Price is not accepted: inventory staff may not set prices. New products get
 * price 0 and must stay hidden from shoppers until the owner sets a price.
 * Errors: { error, field } where field names the invalid input.
 * A duplicate SKU is reported as variants.<index>.sku.
*/

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeInventoryAccess } from "@/lib/inventory/access";
import {
    dbErrorResponse,
    fieldError,
    isText,
    parseVariant,
    writeAudit,
} from "@/lib/inventory/helpers";
import type { VariantInput } from "@/lib/inventory/helpers";

const ALLOWED_KEYS = ["productName", "categoryId", "variants"];

export async function POST(request: Request) {
    const access = await authorizeInventoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const forbidden = Object.keys(body).find((k) => !ALLOWED_KEYS.includes(k));
    if (forbidden) {
        return fieldError(forbidden, "Field not allowed");
    }

    const { productName, categoryId, variants } = body;

    if (!isText(productName, 255)) {
        return fieldError("productName", "Product name is required (max 255 characters)");
    }
    if (typeof categoryId !== "number" || !Number.isSafeInteger(categoryId) || categoryId < 1) {
        return fieldError("categoryId", "Choose a category");
    }
    if (!Array.isArray(variants) || variants.length === 0) {
        return fieldError("variants", "Add at least one variant");
    }

    const parsed: VariantInput[] = [];
    for (let i = 0; i < variants.length; i++) {
        const result = parseVariant(variants[i], `variants.${i}`);
        if (!result.ok) {
            return fieldError(result.field, result.error);
        }
        parsed.push(result.value);
    }

    let connection;
    let variantIndex = -1;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const product = await connection.query(
            "INSERT INTO Products (category_id, product_name, price) VALUES (?, ?, 0)",
            [categoryId, productName.trim()]
        );
        const productId = Number(product.insertId);

        const variantIds: number[] = [];
        for (let i = 0; i < parsed.length; i++) {
            const v = parsed[i];
            variantIndex = i;
            const variant = await connection.query(
                `INSERT INTO Product_variants (product_id, product_variant_size, color, sku)
                 VALUES (?, ?, ?, ?)`,
                [productId, v.size, v.color, v.sku]
            );
            const variantId = Number(variant.insertId);
            variantIds.push(variantId);
            await connection.query(
                "INSERT INTO Inventory (variant_id, quantity) VALUES (?, ?)",
                [variantId, v.quantity]
            );
        }

        await writeAudit(connection, access.adminId, "create_product", "Products", productId, {
            productName: productName.trim(),
            variants: parsed,
        });

        await connection.commit();
        return NextResponse.json(
            { product_id: productId, variant_ids: variantIds },
            { status: 201 }
        );
    } catch (error) {
        try { await connection?.rollback(); } catch { /* ignore */ }
        if ((error as { code?: string }).code === "ER_DUP_ENTRY" && variantIndex >= 0) {
            return fieldError(`variants.${variantIndex}.sku`, "SKU already exists", 409);
        }
        return dbErrorResponse(error, "Failed to create product");
    } finally {
        connection?.release();
    }
}
