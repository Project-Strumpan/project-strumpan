/*
 * GET endpoint for products
 * Author: Alan Tokarev
 * Date: 2026-10-04
 * Dependencies: next/server, /lib/db -> mariadb, .env.local
 * 
 * Template endpoint request, where id is the product_id:
    const response = await fetch("/api/products/[id]");
    if (!response.ok) {
        throw new Error("Could not fetch product");
    }

    const products = await response.json();
 * 
*/

import { NextRequest, NextResponse } from "next/server";
import type { ProductVariant, ProductWithVariants } from "@/types/product";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {

    const { id } = await params;
    const product_id = Number(id);

    if (!Number.isSafeInteger(product_id) || product_id < 1) {
        return NextResponse.json(
            { error: "Invalid order ID"},
            { status: 400 }
        )
    }

    // TODO: Add input checks

    // TODO: Add db lookup

    // TODO: This is a test response.

    const variant : ProductVariant = {
        variant_id: 1,
        size: "46",
        color: "black",
        sku: "1",
        availableQuantity: 1
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
}