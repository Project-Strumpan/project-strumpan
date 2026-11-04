import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type OrderRow = {
    order_id: number;
    customer_id: number;
    delivery_address_id: number;
    invoice_address_id: number;
    order_date: Date | string;
    order_status: "created" | "paid" | "packed" | "shipped" | "delivered" | "cancelled" | "returned";
    total_cost: number | string;
};

type OrderItemRow = {
    order_item_id: number;
    order_id: number;
    variant_id: number;
    quantity: number | string;
    unit_price: number | string;
};

type OrderDetailResponse = {
    order_id: number;
    customer_id: number;
    delivery_address_id: number;
    invoice_address_id: number;
    order_date: Date | string;
    order_status: OrderRow["order_status"];
    total_cost: number;
    items: {
        order_item_id: number;
        order_id: number;
        variant_id: number;
        quantity: number;
        unit_price: number;
    }[];
};

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const order_id = Number(id);

    if (!Number.isSafeInteger(order_id) || order_id < 1) {
        return NextResponse.json(
            { error: "Invalid order ID" },
            { status: 400 }
        );
    }

    let user;

    try {
        user = await requireUser();
    } catch {
        return NextResponse.json(
            { error: "Authentication required" },
            { status: 401 }
        );
    }

    let connection;

    try {
        connection = await pool.getConnection();
        const orderRows = await connection.query<OrderRow[]>(
            `SELECT o.order_id, o.customer_id, o.delivery_address_id,
                    o.invoice_address_id, o.order_date,
                    o.order_status, o.total_cost
             FROM Orders AS o
             WHERE o.order_id = ? AND o.customer_id = ?`,
            [order_id, user.customer_id]
        );

        if (orderRows.length === 0) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const itemRows = await connection.query<OrderItemRow[]>(
            `SELECT oi.order_item_id, oi.order_id, oi.variant_id,
                    oi.quantity, oi.unit_price
             FROM Order_items AS oi
             WHERE oi.order_id = ?
             ORDER BY oi.order_item_id ASC`,
            [order_id]
        );

        const orderRow = orderRows[0];
        const response: OrderDetailResponse = {
            order_id: orderRow.order_id,
            customer_id: orderRow.customer_id,
            delivery_address_id: orderRow.delivery_address_id,
            invoice_address_id: orderRow.invoice_address_id,
            order_date: orderRow.order_date,
            order_status: orderRow.order_status,
            total_cost: Number(orderRow.total_cost),
            items: itemRows.map((item) => ({
                order_item_id: item.order_item_id,
                order_id: item.order_id,
                variant_id: item.variant_id,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
            })),
        };

        return NextResponse.json(response, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch order", error);
        return NextResponse.json(
            { error: "Failed to fetch order" },
            { status: 500 }
        );
    } finally {
        connection?.release();
    }
}