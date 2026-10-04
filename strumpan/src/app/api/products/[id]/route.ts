/*
 * GET endpoint for a product
 * Author: Alan Tokarev
 * Date: 2026-10-04
 * Dependencies: next/server, @/lib/db -> mariadb, .env.local, @/types/product
 * 
 * Template request:
 * const response = await fetch("/api/products/${product_id}");
 *  if (!response.ok) {
 *    throw new Error("Could not fetch product");
 *  }
 * 
 * const products = await response.json();
 * 
*/

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { ProductVariant, ProductWithVariants, CatalogueProduct } from "@/types/product";

type ProductRow = {
    product_id: number;
    category_id: number;
    name: string;
    description: string | null;
    price: number | string;
    image_url: string | null;
};

type VariantRow = {
    variant_id: number;
    size: string;
    color: string | null;
    sku: string;
    available_quantity: number | string;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {

    const { id } = await params;
    const product_id = Number(id);

    if (!Number.isSafeInteger(product_id) || product_id < 1) {
        return NextResponse.json(
            { error: "Invalid order ID"},
            { status: 400 }
        )
    }

    let connection;

    try {
        connection = await pool.getConnection();

        const productRows = await connection.query<ProductRow[]>(
            `
            SELECT 
                product_id,
                category_id,
                name,
                description,
                price,
                image_url
            FROM Products
            WHERE product_id = ?
            `,
            [product_id]
        );

        if (productRows.length === 0) {
            return NextResponse.json( {error: "Product not found", }, { status: 404 });
        }

        const variantRows = await connection.query<VariantRow[]>(
            `
            SELECT
                pv.variant_id,
                pv.size,
                pv.color,
                pv.sku,
                COALESCE(i.quantity, 0)
                    AS available_quantity
                FROM Product_variants AS pv
                LEFT JOIN Inventory as i
                    ON i.variant_id = pv.variant_id
                WHERE pv.product_id = ?
                ORDER BY pv.variant_id ASC
            `,
            [product_id]
        );

        const productRow = productRows[0];

        const variants: ProductVariant[] = variantRows.map(
            (variant) => ({
                variant_id: variant.variant_id,
                size: variant.size,
                color: variant.color,
                sku: variant.sku,
                available_quantity: Number(variant.available_quantity),
            })
        );
        
        const product: ProductWithVariants = {
            product_id: productRow.product_id,
            category_id: productRow.category_id,
            name: productRow.name,
            description: productRow.description,
            price: Number(productRow.price),
            image_url: productRow.image_url,
            variants,
        };

        return NextResponse.json(product, { status: 200, })
    } catch(error) {
        // console.error("Failed to fetch product: ", error);

        // return NextResponse.json( { error: "Failed to fetch product", }, { status: 500, } );

        // TODO: This is a test response. Above is whenever true db connection is added.

        const variant : ProductVariant = {
            variant_id: 1,
            size: "46",
            color: "black",
            sku: "1",
            available_quantity: 1
        }

        const product : ProductWithVariants = {
            product_id: product_id,
            category_id: 1,
            name: "Everyday Socks",
            description: "Everyday socks, for everyday needs",
            price: 12900,
            image_url: "",
            variants: [variant, variant]
        };
        return NextResponse.json(product);
    } finally {
        connection?.release
    }

    
}