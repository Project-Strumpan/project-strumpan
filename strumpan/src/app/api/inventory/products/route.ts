/*
 * POST create product with variants + inventory rows (PRO-73)
 * Body: { productName, categoryId, price, variants: [{ sku, color, size, quantity }] }
*/

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeInventoryAccess } from "@/lib/inventory/access";
import { dbErrorResponse, writeAudit } from "@/lib/inventory/helpers";

type VariantInput = {
    sku: string;
    color: string | null;
    size: string;
    quantity: number;
};

const isText = (v: unknown, max: number): v is string =>
    typeof v === "string" && v.trim() !== "" && v.length <= max;

const isQty = (v: unknown): v is number =>
    typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= 2147483647;

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

    const { productName, categoryId, price, variants } = body ?? {};

    if (
        !isText(productName, 255) ||
        typeof categoryId !== "number" ||
        !Number.isSafeInteger(categoryId) ||
        categoryId < 1 ||
        typeof price !== "number" ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Array.isArray(variants) ||
        variants.length === 0
    ) {
        return NextResponse.json({ error: "Invalid product data" }, { status: 400 });
    }

    const parsed: VariantInput[] = [];
    for (const raw of variants as Record<string, unknown>[]) {
        const color = raw.color === null || raw.color === "" ? null : raw.color;
        if (
            !isText(raw.sku, 100) ||
            !isText(raw.size, 50) ||
            (color !== null && !isText(color, 100)) ||
            !isQty(raw.quantity)
        ) {
            return NextResponse.json({ error: "Invalid variant data" }, { status: 400 });
        }
        parsed.push({
            sku: raw.sku.trim(),
            size: raw.size.trim(),
            color: color === null ? null : (color as string).trim(),
            quantity: raw.quantity,
        });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const product = await connection.query(
            "INSERT INTO Products (category_id, product_name, price) VALUES (?, ?, ?)",
            [categoryId, productName.trim(), price]
        );
        const productId = Number(product.insertId);

        const variantIds: number[] = [];
        for (const v of parsed) {
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
        return dbErrorResponse(error, "Failed to create product");
    } finally {
        connection?.release();
    }
}