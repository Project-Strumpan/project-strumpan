import type { Product } from "@/types/product";

export async function GET(_request: Request, { params }: { params: Promise<{ id: number }> }) {

    const { id } = await params;
    const product_id = Number(id);

    if (!Number.isSafeInteger(product_id) || product_id < 1) {
        return Response.json(
            { error: "Invalid order ID"},
            { status: 400 }
        )
    }

    // TODO: Add input checks

    // TODO: Add db lookup

    // TODO: This is a test response.
    const product : Product = {
        product_id: product_id,
        category_id: 1,
        name: "Everyday Socks",
        description: "Everyday socks, for everyday needs",
        price: 12900,
        image_url: "",
        created_at: new Date(Date.now()) // TODO check if this is needed
    };
    return Response.json(product);
}