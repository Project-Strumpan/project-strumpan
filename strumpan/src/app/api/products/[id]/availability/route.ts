/*
 * GET endpoint for checking availability of a product
 * Author: Alan Tokarev
 * Date: 2026-10-04
 * Dependencies: next/server, @/lib/db -> mariadb, .env.local
 * 
 * Template request:
 * const response = await fetch("/api/products/${product_id}/availability");
 *  if (!response.ok) {
 *    throw new Error("Could not fetch availability");
 *  }
 * 
 * const products = await response.json();
 * 
*/

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { demoOnly } from "@/lib/demo-only";

type AvailabilityRow = {
    inventory_id: number;
    variant_id: number;
    quantity: number | string;
    last_updated: Date | string | null;
}

type ProductIdRow = {
    product_id: number;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }>}) {
    const disabled = demoOnly();
    if (disabled) return disabled;

    const { id } = await params;
    const product_id = Number(id);

    if (!Number.isSafeInteger(product_id) || product_id < 1) {
        return NextResponse.json( { error: "Invalid product_id", }, { status: 400, } );
    }

    let connection;

    try {
        connection = await pool.getConnection();

        const productRows = await connection.query<ProductIdRow[]>(
            `
            SELECT product_id
            FROM Products
            WHERE product_id = ?
            `,
            [product_id]
        );

        if (productRows.length === 0) {
            return NextResponse.json( { error: "Product not found", }, { status: 404, } );
        }

        const availability = await connection.query<AvailabilityRow[]>(
            `
            SELECT
                i.inventory_id,
                i.variant_id,
                i.quantity,
                i.last_updated
            FROM Inventory AS i
            INNER JOIN Product_variants AS pv
                ON pv.variant_id = i.variant_id
            WHERE pv.product_id = ?
            ORDER BY i.variant_id ASC
            `,
            [product_id]
        );

        return NextResponse.json(
            availability.map((item) => ({
                    inventory_id: item.inventory_id,
                    variant_id: item.variant_id,
                    quantity: Number(item.quantity),
                    last_updated: item.last_updated,
                }),
            ),
            { status: 200, }
        );
    } catch (error) {
        // console.error("Failed to fetch product availability: ", error);

        // return NextResponse.json( { error: "Failed to fetch product availability", }, { status: 500, } );

        // TODO: This is a test response. Above is whenever true db connection is added.

        const availability = {
            inventory_id: product_id,
            variant_id: 1,
            quantity: 8,
            last_updated: "2026-09-30T12:00:00.000Z",
        };

        return NextResponse.json(availability);

    } finally {
        connection?.release();
    }
}