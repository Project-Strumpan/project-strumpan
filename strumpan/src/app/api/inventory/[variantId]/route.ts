/*
 * PATCH endpoint for updating stock quantity (PRO-71)
 * Body: { quantity, expectedQuantity } (non-negative integers)
 * Strategy: transaction + SELECT ... FOR UPDATE + expectedQuantity check -> 409 on conflict
*/

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeInventoryAccess } from "@/lib/inventory/access";
import { parseId, writeAudit } from "@/lib/inventory/helpers";

type Context = { params: Promise<{ variantId: string }> };

const isQuantity = (v: unknown): v is number =>
    typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= 2147483647;

export async function PATCH(request: Request, { params }: Context) {
    const access = await authorizeInventoryAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const variantId = parseId((await params).variantId);
    if (!variantId) {
        return NextResponse.json({ error: "Invalid variant ID" }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { quantity, expectedQuantity } = body ?? {};
    if (!isQuantity(quantity) || !isQuantity(expectedQuantity)) {
        return NextResponse.json(
            { error: "quantity and expectedQuantity must be non-negative integers" },
            { status: 400 }
        );
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const rows = await connection.query<
            Array<{ inventory_id: number; quantity: number | string }>
        >(
            "SELECT inventory_id, quantity FROM Inventory WHERE variant_id = ? FOR UPDATE",
            [variantId]
        );

        if (rows.length === 0) {
            await connection.rollback();
            return NextResponse.json({ error: "Variant not found" }, { status: 404 });
        }

        const { inventory_id } = rows[0];
        const currentQuantity = Number(rows[0].quantity);

        if (currentQuantity !== expectedQuantity) {
            await connection.rollback();
            return NextResponse.json(
                { error: "Stock was changed by someone else", currentQuantity },
                { status: 409 }
            );
        }

        await connection.query(
            "UPDATE Inventory SET quantity = ? WHERE inventory_id = ?",
            [quantity, inventory_id]
        );

        await writeAudit(connection, access.adminId, "update_stock_quantity", "Inventory", inventory_id, {
            variant_id: variantId,
            old_quantity: currentQuantity,
            new_quantity: quantity,
        });

        const updated = await connection.query<Array<{ last_updated: Date | string }>>(
            "SELECT last_updated FROM Inventory WHERE inventory_id = ?",
            [inventory_id]
        );

        await connection.commit();

        return NextResponse.json(
            {
                variant_id: variantId,
                quantity,
                last_updated: new Date(updated[0].last_updated).toISOString(),
            },
            { status: 200 }
        );
    } catch (error) {
        try { await connection?.rollback(); } catch { /* ignore */ }
        console.error("Failed to update stock", error);
        return NextResponse.json({ error: "Failed to update stock" }, { status: 500 });
    } finally {
        connection?.release();
    }
}