/*
 * Super Admin product review & details API (PRO-89)
 * GET: Fetch full product details including category, price, picture_url, and variants.
 * PATCH: Update category_id and/or picture_url (Owner only).
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
            `SELECT p.product_id, p.product_name, p.category_id, p.price, p.picture_url, p.product_description,
                    c.category_name
             FROM Products p
             LEFT JOIN Categories c ON c.category_id = p.category_id
             WHERE p.product_id = ?`,
            [productId]
        );
        if (!product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        const variants = await connection.query<any[]>(
            `SELECT pv.variant_id, pv.sku, pv.color, pv.product_variant_size AS size,
                    COALESCE(i.quantity, 0) AS quantity
             FROM Product_variants pv
             LEFT JOIN Inventory i ON i.variant_id = pv.variant_id
             WHERE pv.product_id = ?
             ORDER BY pv.variant_id ASC`,
            [productId]
        );

        const price = Number(product.price);
        return NextResponse.json({
            product_id: Number(product.product_id),
            product_name: product.product_name,
            category_id: Number(product.category_id),
            category_name: product.category_name ?? null,
            price,
            published: price > 0,
            picture_url: product.picture_url ?? null,
            product_description: product.product_description ?? null,
            variants: variants.map((v) => ({
                variant_id: Number(v.variant_id),
                sku: v.sku,
                color: v.color,
                size: v.size,
                quantity: Number(v.quantity),
            })),
        }, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch admin product details", error);
        return NextResponse.json({ error: "Failed to fetch product details" }, { status: 500 });
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

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const hasCategory = body.category_id !== undefined;
    const hasPicture = body.picture_url !== undefined;
    if (!hasCategory && !hasPicture) {
        return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    let nextCategoryId: number | undefined;
    if (hasCategory) {
        const parsedCat = parseId(String(body.category_id));
        if (!parsedCat) {
            return fieldError("category_id", "Invalid category ID");
        }
        nextCategoryId = parsedCat;
    }

    let nextPictureUrl: string | null | undefined;
    if (hasPicture) {
        if (body.picture_url === null) {
            nextPictureUrl = null;
        } else if (typeof body.picture_url === "string") {
            const trimmed = body.picture_url.trim();
            if (trimmed.length > 500) {
                return fieldError("picture_url", "Image URL cannot exceed 500 characters");
            }
            nextPictureUrl = trimmed === "" ? null : trimmed;
        } else {
            return fieldError("picture_url", "Invalid image URL");
        }
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [existing] = await connection.query<any[]>(
            "SELECT product_id, category_id, picture_url FROM Products WHERE product_id = ? FOR UPDATE",
            [productId]
        );
        if (!existing) {
            await connection.rollback();
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        if (nextCategoryId !== undefined) {
            const catRows = await connection.query<any[]>(
                "SELECT category_id FROM Categories WHERE category_id = ?",
                [nextCategoryId]
            );
            if (catRows.length === 0) {
                await connection.rollback();
                return fieldError("category_id", "Category does not exist");
            }
        }

        const finalCategoryId = nextCategoryId !== undefined ? nextCategoryId : Number(existing.category_id);
        const finalPictureUrl = nextPictureUrl !== undefined ? nextPictureUrl : existing.picture_url;

        await connection.query(
            "UPDATE Products SET category_id = ?, picture_url = ? WHERE product_id = ?",
            [finalCategoryId, finalPictureUrl, productId]
        );

        await writeAudit(
            connection,
            access.adminId,
            "update_product_details",
            "Products",
            productId,
            {
                before: {
                    category_id: Number(existing.category_id),
                    picture_url: existing.picture_url ?? null,
                },
                after: {
                    category_id: finalCategoryId,
                    picture_url: finalPictureUrl ?? null,
                },
            }
        );

        await connection.commit();
        return NextResponse.json({
            product_id: productId,
            category_id: finalCategoryId,
            picture_url: finalPictureUrl ?? null,
        }, { status: 200 });
    } catch (error) {
        try { await connection?.rollback(); } catch { /* ignore */ }
        console.error("Failed to update product details", error);
        return NextResponse.json({ error: "Failed to update product details" }, { status: 500 });
    } finally {
        connection?.release();
    }
}
