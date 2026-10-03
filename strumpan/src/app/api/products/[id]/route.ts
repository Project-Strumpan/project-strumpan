import { NextRequest, NextResponse } from "next/server";
import type { ProductVariant, Product } from "@/types/product";

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

    const product : Product = {
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