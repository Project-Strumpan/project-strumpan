/*
 * GET endpoint for products
 * Author: Alan Tokarev
 * Date: 2026-10-04
 * Dependencies: next/server, @/lib/db -> mariadb, .env.local, @/types/product
 * 
 * Template endpoint request:
    const response = await fetch("/api/products");
    if (!response.ok) {
        throw new Error("Could not fetch products");
    }

    const products = await response.json();
 * 
*/

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

import type { CatalogueProduct } from "@/types/product";

import type { CatalogueProduct } from "@/types/product";

export async function GET() {
    let connection;

    try {
        connection = await pool.getConnection();

        const products = await connection.query<CatalogueProduct[]>(
            `
            SELECT 
                product_id,
                category_id,
                name,
                description,
                price,
                image_url
            FROM Products
            ORDER BY product_id ASC
            `
        );

        return NextResponse.json(products, { status: 200, });
    } catch (error) {
        console.error("Failed to fetch products", error);
        return NextResponse.json(
            { error: "Failed to fetch products" },
            { status: 500 }
        );
    } finally {
        connection?.release();
    }
}