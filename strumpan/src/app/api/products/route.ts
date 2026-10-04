/*
 * GET endpoint for products
 * Author: Alan Tokarev
 * Date: 2026-10-04
 * Dependencies: next/server, /lib/db -> mariadb, .env.local
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
import { demoOnly } from "@/lib/demo-only"; // TODO: delete after review and in prod

import type { CatalogueProduct } from "@/types/product";

export async function GET() {
    const disabled = demoOnly();
    if (disabled) return disabled;
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
        // TODO: This is the correct response if the database request fails
        // console.error("Failed to fetch products: ", error);

        // return NextResponse.json( { error: "Failed to fetch products", }, { status: 500, });

        // TODO: This is a test response if the database is not yet setup
        const products = [
            {
                product_id: 1,
                category_id: 1,
                name: "Everyday Socks",
                description: "Everyday socks, for everyday needs",
                price: 12900,
                image_url: "",
            },
            {
                product_id: 2,
                category_id: 2,
                name: "Not Everyday Socks",
                description: "Not Everyday socks, for not everyday needs",
                price: 69690,
                image_url: "",
            }
        ];
        return NextResponse.json(products);
    } finally {
        if (connection) {
            connection.release();
        }
    }
}