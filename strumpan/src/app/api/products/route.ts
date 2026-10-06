<<<<<<< HEAD
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

export async function GET() {
    let connection;

    try {
        connection = await pool.getConnection();

        const products = await connection.query<CatalogueProduct[]>(
            `
            SELECT 
                product_id,
                category_id,
                product_name AS name,
                product_description AS description,
                price,
                picture_url AS image_url
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
=======
import { NextResponse } from "next/server";
import type { Product } from "../../types/product";

export const mockProducts: Product[] = [
  {
    product_id: 1,
    category_id: 1,
    product_name: "Vita bomullsstrumpor",
    product_description: "Mjuka och sköna strumpor tillverkade i 100% ekologisk bomull.",
    price: 99,
    picture_url: null,
    origin: "Sverige",
    material: "Bomull",
    environmental_labels: "GOTS-certifierad",
    sizes: ["S", "M", "L"],
    stock: 20,
  },
  {
    product_id: 2,
    category_id: 2,
    product_name: "Svarta sportstrumpor",
    product_description: "Funktionsstrumpor med god andningsförmåga för träning och löpning.",
    price: 149,
    picture_url: null,
    origin: "Portugal",
    material: "Syntet",
    environmental_labels: "OEKO-TEX",
    sizes: ["M", "L", "XL"],
    stock: 12,
  },
  {
    product_id: 3,
    category_id: 1,
    product_name: "Värmande ullstrumpor",
    product_description: "Tjocka och varma strumpor i merinoull för kalla vinterdagar.",
    price: 199,
    picture_url: null,
    origin: "Norge",
    material: "Merinoull",
    environmental_labels: "Svanenmärkt",
    sizes: ["S", "M", "L", "XL"],
    stock: 0, 
  },
];

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 200));

  return NextResponse.json(mockProducts);
>>>>>>> b056c38 (Fixat produktkatalog med mockdata för att se att de funkar)
}