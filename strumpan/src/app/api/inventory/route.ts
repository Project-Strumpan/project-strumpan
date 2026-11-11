/*
 * GET endpoint for inventory overview (PRO-76)
 * Query: search, color, size, availability (in_stock | low_stock | out_of_stock)
 * Dependencies: next/server, @/lib/db -> mariadb, @/lib/inventory/access, @/types/inventory-api
*/

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeInventoryAccess } from "@/lib/inventory/access";
import {
    LOW_STOCK_THRESHOLD,
    getAvailability,
    isInventoryAvailability,
} from "@/types/inventory-api";
import type {
    InventoryApiItem,
    InventoryApiResponse,
} from "@/types/inventory-api";

type InventoryRow = {
    product_id: number;
    variant_id: number;
    name: string;
    sku: string;
    color: string | null;
    size: string;
    quantity: number | string;
    last_updated: Date | string | null;
};

export async function GET(request: Request) {
    const access = await authorizeInventoryAccess();
    if (!access.ok) {
        return NextResponse.json(
            { error: access.error },
            { status: access.status }
        );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const color = searchParams.get("color")?.trim() ?? "";
    const size = searchParams.get("size")?.trim() ?? "";
    const availability = searchParams.get("availability") ?? "";

    if (availability !== "" && !isInventoryAvailability(availability)) {
        return NextResponse.json(
            { error: "Invalid availability filter" },
            { status: 400 }
        );
    }

    const conditions: string[] = [];
    const params: Array<string | number> = [];

    if (search !== "") {
        conditions.push("(p.product_name LIKE ? OR pv.sku LIKE ?)");
        params.push(`%${search}%`, `%${search}%`);
    }
    if (color !== "") {
        conditions.push("pv.color = ?");
        params.push(color);
    }
    if (size !== "") {
        conditions.push("pv.product_variant_size = ?");
        params.push(size);
    }
    if (availability === "out_of_stock") {
        conditions.push("COALESCE(i.quantity, 0) <= 0");
    } else if (availability === "low_stock") {
        conditions.push("COALESCE(i.quantity, 0) > 0 AND COALESCE(i.quantity, 0) <= ?");
        params.push(LOW_STOCK_THRESHOLD);
    } else if (availability === "in_stock") {
        conditions.push("COALESCE(i.quantity, 0) > ?");
        params.push(LOW_STOCK_THRESHOLD);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    let connection;

    try {
        connection = await pool.getConnection();

        const rows = await connection.query<InventoryRow[]>(
            `
            SELECT
                p.product_id,
                pv.variant_id,
                p.product_name AS name,
                pv.sku,
                pv.color,
                pv.product_variant_size AS size,
                COALESCE(i.quantity, 0) AS quantity,
                i.last_updated
            FROM Product_variants AS pv
            JOIN Products AS p
                ON p.product_id = pv.product_id
            LEFT JOIN Inventory AS i
                ON i.variant_id = pv.variant_id
            ${where}
            ORDER BY p.product_name ASC, pv.variant_id ASC
            `,
            params
        );

        const items: InventoryApiItem[] = rows.map((row) => {
            const quantity = Number(row.quantity);
            return {
                product_id: row.product_id,
                variant_id: row.variant_id,
                name: row.name,
                sku: row.sku,
                color: row.color,
                size: row.size,
                quantity,
                last_updated: row.last_updated
                    ? new Date(row.last_updated).toISOString()
                    : null,
                availability: getAvailability(quantity),
            };
        });

        const body: InventoryApiResponse = { items, total: items.length };
        return NextResponse.json(body, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch inventory", error);
        return NextResponse.json(
            { error: "Failed to fetch inventory" },
            { status: 500 }
        );
    } finally {
        connection?.release();
    }
}