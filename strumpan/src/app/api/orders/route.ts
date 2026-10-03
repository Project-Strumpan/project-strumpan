import { NextRequest, NextResponse } from "next/server";
import type { Order } from "@/types/order";
import { demoOnly } from "@/lib/demo-only";

export async function GET() {
  const disabled = demoOnly();
  if (disabled) return disabled;

  // Demo only: not filtered by a real authenticated customer.
  const orders = [
    {
      order_id: 1001,
      customer_id: 1,
      delivery_address_id: 10,
      invoice_address_id: 11,
      order_date: "2026-09-30T14:30:00.000Z",
      order_status: "created",
      total_cost: "258.00",
    },
    {
      order_id: 1002,
      customer_id: 1,
      delivery_address_id: 10,
      invoice_address_id: 11,
      order_date: "2026-09-29T10:00:00.000Z",
      order_status: "shipped",
      total_cost: "129.00",
    },
  ];

  return NextResponse.json(orders);
}

export async function POST(request: NextRequest) {
    const disabled = demoOnly();
    if (disabled) return disabled;

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

    return NextResponse.json(
        { message: "Test order recieved", order },
        { status: 200 }
    )
}
