/*
 * Product pricing management API for Main Admin (PRO-88 / PRO-89)
 * PATCH: Updates a product's price. Strictly Owner-only (403 for inventory admin).
 * GET: Retrieves the authoritative current price for a product.
 */

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeOwnerAccess } from "@/lib/inventory/access";
import { fieldError, parseId, writeAudit } from "@/lib/inventory/helpers";

type Context = { params: Promise<{ productId: string }> };

export async function GET(_request: Request, { params }: Context) {
    const access = await authorizeOwnerAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const productId = parseId((await params).productId);
    if (!productId) {
        return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const [product] = await connection.query<any[]>(
            "SELECT product_id, product_name, price FROM Products WHERE product_id = ?",
            [productId]
        );
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        return NextResponse.json({
            product_id: product.product_id,
            product_name: product.product_name,
            price: Number(product.price),
        }, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch product price", error);
        return NextResponse.json({ error: "Failed to fetch product price" }, { status: 500 });
    } finally {
        connection?.release();
    }
}

export async function PATCH(request: Request, { params }: Context) {
    const access = await authorizeOwnerAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const productId = parseId((await params).productId);
    if (!productId) {
        return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const rawPrice = body?.price;
    const price = typeof rawPrice === "number" ? rawPrice : parseFloat(rawPrice);

    if (isNaN(price) || !isFinite(price) || price < 0 || price > 9999999.99) {
        return fieldError("price", "Price must be a valid non-negative number");
    }

    const formattedPrice = Math.round(price * 100) / 100;

    let connection;
    try {
        connection = await pool.getConnection();

        // Check existing product
        const [existing] = await connection.query<any[]>(
            "SELECT product_id, product_name, price FROM Products WHERE product_id = ?",
            [productId]
        );
        if (!existing) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const oldPrice = Number(existing.price);

        // Update product price (does not affect existing order items as they preserve historical unit_price)
        await connection.query(
            "UPDATE Products SET price = ? WHERE product_id = ?",
            [formattedPrice, productId]
        );

        // Audit log
        await writeAudit(
            connection,
            access.adminId,
            "update_price",
            "Products",
            productId,
            {
                before: { price: oldPrice },
                after: { price: formattedPrice },
            }
        );

        return NextResponse.json({
            product_id: productId,
            product_name: existing.product_name,
            price: formattedPrice,
            previous_price: oldPrice,
        }, { status: 200 });
    } catch (error) {
        console.error("Failed to update product price", error);
        return NextResponse.json({ error: "Failed to update product price" }, { status: 500 });
    } finally {
        connection?.release();
    }
}
