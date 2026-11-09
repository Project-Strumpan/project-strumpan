import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeInventoryAccess } from "@/lib/inventory/access";
import { dbErrorResponse, parseId, writeAudit } from "@/lib/inventory/helpers";

type Context = { params: Promise<{ productId: string }> };

const ALLOWED = ["productName"];

type Row = {
    product_id: number;
    product_name: string;
    category_id: number;
    variant_id: number | null;
    sku: string | null;
    color: string | null;
    size: string | null;
    quantity: number | string;
};

export async function GET(_request: Request, { params }: Context) {
    const access = await authorizeInventoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const productId = parseId((await params).productId);
    if (!productId) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });

    let connection;
    try {
        connection = await pool.getConnection();
        const rows = await connection.query<Row[]>(
            `SELECT p.product_id, p.product_name, p.category_id,
                    pv.variant_id, pv.sku, pv.color, pv.product_variant_size AS size,
                    COALESCE(i.quantity, 0) AS quantity
             FROM Products p
             LEFT JOIN Product_variants pv ON pv.product_id = p.product_id
             LEFT JOIN Inventory i ON i.variant_id = pv.variant_id
             WHERE p.product_id = ?
             ORDER BY pv.variant_id ASC`,
            [productId]
        );
        if (rows.length === 0) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }
        return NextResponse.json({
            product_id: rows[0].product_id,
            product_name: rows[0].product_name,
            category_id: rows[0].category_id,
            variants: rows
                .filter((r) => r.variant_id !== null)
                .map((r) => ({
                    variant_id: r.variant_id,
                    sku: r.sku,
                    color: r.color,
                    size: r.size,
                    quantity: Number(r.quantity),
                })),
        });
    } catch (error) {
        return dbErrorResponse(error, "Failed to fetch product");
    } finally {
        connection?.release();
    }
}

export async function PATCH(request: Request, { params }: Context) {
    const access = await authorizeInventoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const productId = parseId((await params).productId);
    if (!productId) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const keys = Object.keys(body ?? {});
    if (keys.length === 0 || keys.some((k) => !ALLOWED.includes(k))) {
        return NextResponse.json({ error: "Field not allowed" }, { status: 400 });
    }
    const name = body.productName;
    if (typeof name !== "string" || name.trim() === "" || name.length > 255) {
        return NextResponse.json({ error: "Invalid product name" }, { status: 400 });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const result = await connection.query(
            "UPDATE Products SET product_name = ? WHERE product_id = ?",
            [name.trim(), productId]
        );
        if (result.affectedRows === 0) {
            await connection.rollback();
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }
        await writeAudit(connection, access.adminId, "update_product", "Products", productId, {
            productName: name.trim(),
        });
        await connection.commit();
        return NextResponse.json({ product_id: productId, productName: name.trim() });
    } catch (error) {
        try { await connection?.rollback(); } catch { /* ignore */ }
        return dbErrorResponse(error, "Failed to update product");
    } finally {
        connection?.release();
    }
}

export async function DELETE(_request: Request, { params }: Context) {
    const access = await authorizeInventoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const productId = parseId((await params).productId);
    if (!productId) return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const used = await connection.query(
            `SELECT COUNT(*) AS n FROM Order_items oi
             JOIN Product_variants pv ON pv.variant_id = oi.variant_id
             WHERE pv.product_id = ?`,
            [productId]
        );
        if (Number(used[0].n) > 0) {
            await connection.rollback();
            return NextResponse.json(
                { error: "Product has orders and cannot be deleted" },
                { status: 409 }
            );
        }

        const result = await connection.query(
            "DELETE FROM Products WHERE product_id = ?",
            [productId]
        );
        if (result.affectedRows === 0) {
            await connection.rollback();
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }
        await writeAudit(connection, access.adminId, "delete_product", "Products", productId, {});
        await connection.commit();
        return NextResponse.json({ product_id: productId, deleted: true });
    } catch (error) {
        try { await connection?.rollback(); } catch { /* ignore */ }
        return dbErrorResponse(error, "Failed to delete product");
    } finally {
        connection?.release();
    }
}