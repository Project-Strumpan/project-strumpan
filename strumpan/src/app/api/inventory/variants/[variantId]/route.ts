/*
 * PATCH update variant sku/colour/size, DELETE variant without orders (PRO-73)
 * Editable fields (allowlist): sku, color, size.
 * Stock quantity is changed via /api/inventory/[variantId] (PRO-71).
 * Price, product_id and marketing fields are not editable by inventory staff.
 * Errors: { error, field } where field names the invalid input.
 * Audit (PRO-75): PATCH logs { before, after } for the changed fields only;
 * DELETE logs a { before } snapshot of the removed variant.
*/

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeInventoryAccess } from "@/lib/inventory/access";
import { dbErrorResponse, fieldError, parseId, writeAudit } from "@/lib/inventory/helpers";

type Context = { params: Promise<{ variantId: string }> };

const COLUMNS: Record<string, string> = {
    sku: "sku",
    color: "color",
    size: "product_variant_size",
};

type VariantBefore = {
    sku: string;
    color: string | null;
    product_variant_size: string;
};

type VariantSnapshot = {
    product_id: number;
    sku: string;
    color: string | null;
    size: string;
    quantity: number | string | null;
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
    if (keys.length === 0 || keys.some((k) => !Object.prototype.hasOwnProperty.call(COLUMNS, k))) {
        return NextResponse.json({ error: "Field not allowed" }, { status: 400 });
    }

    const sets: string[] = [];
    const values: Array<string | null | number> = [];
    const afterValues: Record<string, string | null> = {};
    for (const key of keys) {
        const value = body[key];
        if (key === "color" && (value === null || value === "")) {
            sets.push(`${COLUMNS[key]} = ?`);
            values.push(null);
            afterValues[key] = null;
            continue;
        }
        if (typeof value !== "string" || value.trim() === "" || value.length > 100) {
            return fieldError(key, `Invalid ${key}`);
        }
        sets.push(`${COLUMNS[key]} = ?`);
        values.push(value.trim());
        afterValues[key] = value.trim();
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const before = await connection.query<VariantBefore[]>(
            "SELECT sku, color, product_variant_size FROM Product_variants WHERE variant_id = ? FOR UPDATE",
            [variantId]
        );
        if (before.length === 0) {
            await connection.rollback();
            return NextResponse.json({ error: "Variant not found" }, { status: 404 });
        }

        const beforeValues: Record<string, string | null> = {};
        for (const key of keys) {
            beforeValues[key] = (before[0] as Record<string, string | null>)[COLUMNS[key]];
        }

        await connection.query(
            `UPDATE Product_variants SET ${sets.join(", ")} WHERE variant_id = ?`,
            [...values, variantId]
        );
        await writeAudit(connection, access.adminId, "update_variant", "Product_variants", variantId, {
            before: beforeValues,
            after: afterValues,
        });
        await connection.commit();
        return NextResponse.json({ variant_id: variantId });
    } catch (error) {
        try {
            await connection?.rollback();
        } catch {
            /* ignore */
        }
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

        const snapshot = await connection.query<VariantSnapshot[]>(
            `SELECT pv.product_id, pv.sku, pv.color, pv.product_variant_size AS size, i.quantity
             FROM Product_variants pv
             LEFT JOIN Inventory i ON i.variant_id = pv.variant_id
             WHERE pv.variant_id = ?
             FOR UPDATE`,
            [variantId]
        );
        if (snapshot.length === 0) {
            await connection.rollback();
            return NextResponse.json({ error: "Variant not found" }, { status: 404 });
        }

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

        await connection.query("DELETE FROM Product_variants WHERE variant_id = ?", [variantId]);
        await writeAudit(connection, access.adminId, "delete_variant", "Product_variants", variantId, {
            before: {
                productId: snapshot[0].product_id,
                sku: snapshot[0].sku,
                color: snapshot[0].color,
                size: snapshot[0].size,
                quantity: Number(snapshot[0].quantity ?? 0),
            },
        });
        await connection.commit();
        return NextResponse.json({ variant_id: variantId, deleted: true });
    } catch (error) {
        try {
            await connection?.rollback();
        } catch {
            /* ignore */
        }
        return dbErrorResponse(error, "Failed to delete variant");
    } finally {
        connection?.release();
    }
}