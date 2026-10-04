/*
 * GET endpoint for a an order
 * Author: Alan Tokarev
 * Date: 2026-10-04
 * Dependencies: next/server, @/lib/db -> mariadb, .env.local, @/types/order
 *
 * Template request:
 * const response = await fetch("/api/orders/${order_id}");
 *  if (!response.ok) {
 *    throw new Error("Could not fetch order");
 *  }
 *
 * const order = await response.json();
 *
*/

import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
// import { requireUser } from "@lib/auth"; /* TODO: To be added during authentication implementation */

import type { Order, OrderItem } from "@/types/order";

type OrderRow = {
    order_id: number;
    customer_id: number;
    delivery_address_id: number;
    invoice_address_id: number;
    order_date: Date | string;
    order_status: 
        | "created"
        | "paid"
        | "packed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "returned";
    total_cost: number | string;
};

type OrderItemRow = {
    order_item_id: number;
    variant_id: number;
    product_id: number;
    product_name: string;
    product_variant_size: string;
    color: string | null;
    sku: string;
    quantity: number;
    unit_price: number | string;
};

type AddressRow = {
    address_id: number;
    street: string;
    postal_code: string;
    city: string;
    country: string;
    type: "delivery" | "invoice";
};

type ShipmentRow = {
    shipment_id: number;
    carrier: string | null;
    tracking_number: string | null;
    shipment_status: 
        | "pending"
        | "packed"
        | "shipped"
        | "delivered"
        | "returned";
    shipped_date: Date | string | null;
    delivered_date: Date | string | null;
};

export async function GET( _request: NextRequest, { params }: { params: Promise<{ id: string }> } ) {
    const { id } = await params;
    const order_id = Number(id);

    if (!Number.isSafeInteger(order_id) || order_id < 1) {
        return NextResponse.json( { error: "Invalid order id", }, { status: 400 } );
    }

    /*
     * TODO: Add authentication later.
     *
     * Example:
     * const user = await requireUser();
     * const customerId = user.customer_id;
     */

    const customer_id: number | null = null;

    let connection;

    try {
        connection = await pool.getConnection();

        const orderRows = await pool.query<OrderRow[]>(
            `
            SELECT
                o.order_id,
                o.customer_id,
                o.delivery_address_id,
                o.invoice_address_id,
                o.order_date,
                o.status,
                o.total_cost
            FROM Orders AS o
            WHERE o.order_id = ?
            ${customer_id !== null ? "AND o.customer_id = ?" : ""}
            `,
            customer_id !== null ? [order_id, customer_id] : [order_id]
        );

        if (orderRows.length === 0) {
            return NextResponse.json( { error: "Order not found", }, { status: 404, } );
        }

        const orderRow = orderRows[0];

        const itemRows = await connection.query<OrderItemRow[]>(
            `
            SELECT
                oi.order_item_id,
                oi.variant_id,
                pv.product_id,
                p.product_name,
                pv.product_variant_size,
                pv.color,
                pv.sku,
                oi.quantity,
                oi.unit_price
            FROM Order_items AS oi
            INNER JOIN Product_variants AS pv
                ON pv.variant_id = oi.variant_id
            INNER JOIN Products AS p
                ON p.product_id = pv.product_id
            WHERE oi.order_id = ?
            ORDER BY oi.order_item_id ASC
            `,
            [order_id]
        );

        const addressRows = await connection.query<AddressRow[]>(
            `
            SELECT
                a.address_id,
                a.street,
                a.postal_code,
                a.city,
                a.country,
                a.type
            FROM Addresses AS a
            WHERE a.address_id IN (?, ?)
            `,
            [orderRow.delivery_address_id, orderRow.invoice_address_id]
        );

        const shipmentRows = await connection.query<ShipmentRow[]>(
            `
            SELECT
                s.shipment_id,
                s.carrier,
                s.tracking_number,
                s.shipment_status,
                s.shipped_date,
                s.delivered_date
            FROM Shipments AS s
            WHERE s.order_id = ?
            ORDER BY s.shipment_id ASC
            `,
            [order_id]
        );

        const deliveryAddress = addressRows.find((address) => (
            address.address_id === orderRow.invoice_address_id
        ));

        const invoiceAddress = addressRows.find((address) => (
            address.address_id === orderRow.delivery_address_id
        ));

        const order = {
            order_id: orderRow.order_id,
            order_status: orderRow.order_status,
            order_date: orderRow.order_date,
            total_cost: Number(orderRow.total_cost),

            delivery_address: deliveryAddress ?? null,
            invoice_address: invoiceAddress ?? null,
            
            items: itemRows.map((item) => ({
                order_item_id: item.order_item_id,
                variant_id: item.variant_id,
                product_id: item.product_id,
                product_name: item.product_name,
                product_variant_size: item.product_variant_size,
                color: item.color,
                sku: item.sku,
                quantity: item.quantity,
                unit_price: Number(item.unit_price),
            })),

            shipments: shipmentRows,
        }

        return NextResponse.json( order, { status: 200, } );
    } catch (error) {
        // console.error( "Failed to fetch order", error );

        // return NextResponse.json( {error: "Failed to fetch order", }, { status: 500, } );

        // TODO: This is a test response of creating an order

        const orderItem: OrderItem = {
            order_item_id: 1,
            variant_id: 1,
            product_id: 1,
            product_name: "Everyday socks",
            product_variant_size: "46",
            color: "black",
            sku: "1",
            quantity: 1,
            unit_price: 12900
        };

        const shipment = {
            shipment_id: 1,
            carrier: "PostNord",
            tracking_number: 1,
            shipment_status: "delivered",
            shipped_date: new Date(Date.now()),
            delivered_date: new Date(Date.now())
        };

        const order: Order = {
            order_id: 1,
            order_status: "delivered",
            order_date: new Date(Date.now()),
            total_cost: 26000,

            delivery_address: "Klas Anshelms väg 323 Malmö 21335",
            invoice_address: "Klas Anshelms väg 323 Malmö 21335",
            
            items: [orderItem, orderItem],

            shipments: shipment
        }
    } finally {
        connection?.release();
    }
}