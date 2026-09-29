import type { Order } from "@/types/order";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }>}) {

    const { id } = await params;
    const order_id = Number(id);

    if (!Number.isSafeInteger(order_id) || order_id < 1) {
        return Response.json(
            { error: "Invalid order ID"},
            { status: 400 }
        )
    }

    // TODO: Add input checks

    // TODO: Add db lookup

    // TODO: This is a test response of retrieving an order
    const order: Order = {
        order_id: order_id,
        customer_id: 1,
        shipping_address_id: 1,
        billing_address_id: 1,
        order_date: new Date(Date.now()),
        status: "shipped",
        total_price: 26000
    }
    return Response.json(order);
}