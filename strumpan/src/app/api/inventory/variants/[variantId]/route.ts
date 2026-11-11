import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeInventoryAccess } from "@/lib/inventory/access";
import { dbErrorResponse, parseId, writeAudit } from "@/lib/inventory/helpers";

type Context = { params: Promise<{ variantId: string }> };

const COLUMNS: Record<string, string> = {
    sku: "sku",
    color: "color",
    size: "product_variant_size",
};

export async function PATCH(request: Request, { params }: Context) {
    const access = await authorizeInventoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const variantId = parseId((await params).variantId);
    if (!variantId) return NextResponse.json({ error: "Invalid variant ID" }, { status: 400 });

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const keys = Object.keys(body ?? {});
    if (keys.length === 0 || keys.some((k) => !(k in COLUMNS))) {
        return NextResponse.json({ error: "Field not allowed" }, { status: 400 });
    }

    const sets: string[] = [];
    const values: Array<string | null | number> = [];
    for (const key of keys) {
        const value = body[key];
        if (key === "color" && (value === null || value === "")) {
            sets.push(`${COLUMNS[key]} = ?`);
            values.push(null);
            continue;
        }
        if (typeof value !== "string" || value.trim() === "" || value.length > 100) {
            return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 });
        }
        sets.push(`${COLUMNS[key]} = ?`);
        values.push(value.trim());
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const result = await connection.query(
            `UPDATE Product_variants SET ${sets.join(", ")} WHERE variant_id = ?`,
            [...values, variantId]
        );
        if (result.affectedRows === 0) {
            await connection.rollback();
            return NextResponse.json({ error: "Variant not found" }, { status: 404 });
        }
        await writeAudit(connection, access.adminId, "update_variant", "Product_variants", variantId, body);
        await connection.commit();
        return NextResponse.json({ variant_id: variantId });
    } catch (error) {
        try { await connection?.rollback(); } catch { /* ignore */ }
        return dbErrorResponse(error, "Failed to update variant");
    } finally {
        connection?.release();
    }
}

export async function DELETE(_request: Request, { params }: Context) {
    const access = await authorizeInventoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const variantId = parseId((await params).variantId);
    if (!variantId) return NextResponse.json({ error: "Invalid variant ID" }, { status: 400 });

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const used = await connection.query(
            "SELECT COUNT(*) AS n FROM Order_items WHERE variant_id = ?",
            [variantId]
        );
        if (Number(used[0].n) > 0) {
            await connection.rollback();
            return NextResponse.json(
                { error: "Variant has orders and cannot be deleted" },
                { status: 409 }
            );
        }

        const result = await connection.query(
            "DELETE FROM Product_variants WHERE variant_id = ?",
            [variantId]
        );
        if (result.affectedRows === 0) {
            await connection.rollback();
            return NextResponse.json({ error: "Variant not found" }, { status: 404 });
        }
        await writeAudit(connection, access.adminId, "delete_variant", "Product_variants", variantId, {});
        await connection.commit();
        return NextResponse.json({ variant_id: variantId, deleted: true });
    } catch (error) {
        try { await connection?.rollback(); } catch { /* ignore */ }
        return dbErrorResponse(error, "Failed to delete variant");
    } finally {
        connection?.release();
    }
}