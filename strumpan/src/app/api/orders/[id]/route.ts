import { NextRequest, NextResponse } from "next/server";
import type { Order } from "@/types/order";
import { demoOnly } from "@/lib/demo-only";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }>}) {

    const disabled = demoOnly();
    if (disabled) return disabled;

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
    return NextResponse.json({
        order_id: 1,
        customer_id: 1,
        delivery_address_id: 1,
        invoice_address_id: 1,
        order_date: new Date(Date.now()),
        order_status: "created",
        total_cost: 25800,
        items: [
          {
            order_item_id: 1,
            order_id: 1,
            variant_id: 1,
            quantity: 2,
            unit_price: "129.00",
          },
        ],
    });
}