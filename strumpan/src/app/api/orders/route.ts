import type { Order } from "@/types/order";

export async function POST(request: Request) {

    // TODO: This is a test response of creating an order
    const order: Order = {
        order_id: 1,
        customer_id: 1,
        shipping_address_id: 1,
        billing_address_id: 1,
        order_date: new Date(Date.now()),
        status: "shipped",
        total_price: 26000
    }

    return Response.json(
        { message: "Test order recieved", order },
        { status: 200 }
    )
}
