import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { requireUser } from "@/lib/auth";

import type { CreateOrderRequest, CreateOrderResponse } from "@/types/order";

type VariantRow = {
    variant_id: number;
    quantity: number | string;
    price: number | string;
};

type AddressRow = {
    address_id: number;

};

type InsertResult = {
    affected_rows: number;
    insert_id: number;
};

type InsertedOrderItemRow = {
    order_item_id: number;
};

export async function POST( _request: NextRequest ) {
    let body: CreateOrderRequest;

    try {
        body = await _request.json();
    } catch {
        return NextResponse.json( { error: "Request body must be valid JSON", }, { status: 400, } );
    }

    if (!isCreateOrderRequest(body)) {
        return NextResponse.json( { error: "Invalid checkout request", }, { status: 400, } );
    }

    let user;

    try {
        user = await requireUser();
    } catch {
        return NextResponse.json( { error: "Authentication required", }, { status: 401, } );
    }

    let connection;

    try {
        connection = await pool.getConnection();

        await connection.beginTransaction();
        const addressRows = await connection.query<AddressRow[]>(
            `
            SELECT address_id
            FROM Addresses
            WHERE address_id IN (?, ?)
                AND customer_id = ?
            `,
            [body.delivery_address_id, body.invoice_address_id, user.customer_id]
        );

        const addressIds = new Set( addressRows.map( (address) => address.address_id ) );

        if (!addressIds.has(body.delivery_address_id) || !addressIds.has(body.invoice_address_id)) {
            await connection.rollback;
            return NextResponse.json( { error: "One or more addresses are invalid", }, { status: 400, } );
        }

        const variantIds = body.items.map( (item) => item.variant_id );

        const placeholders = variantIds.map(() => "?").join(", ");

        const variantRows = await connection.query<VariantRow[]>(
            `
            SELECT
                pv.variant_id,
                i.quantity,
                p.price
            FROM Product_variants AS pv
            INNER JOIN Products AS p
                ON p.product_id = pv.product_id
            INNER JOIN Inventory AS i
                ON i.variant_id = pv.variant_id
            WHERE pv.variant_id IN (${placeholders})
            FOR UPDATE
            `,
            variantIds
        )

        if (variantRows.length !== body.items.length) {
            await connection.rollback();

            return NextResponse.json( { error: "One or more variants are invalid", }, { status: 400, } );
        }

        const variantMap = new Map( variantRows.map( (variant) => [
                variant.variant_id,
                variant,
            ])
        );

        let total_cost = 0;
        for (const item of body.items) {
            const variant = variantMap.get(item.variant_id);

            if (!variant) {
                await connection.rollback();

                return NextResponse.json( { error: "Variant not found", }, { status: 400, } );
            }

            const availableQuantity = Number(variant.quantity);

            if (availableQuantity < item.quantity) {
                await connection.rollback();

                return NextResponse.json( { error: `Insufficient stock for variant ${item.variant_id}`, }, { status: 409, } );
            }

            total_cost += Number(variant.price) * item.quantity;
        }

        const orderResult = await connection.query<InsertResult>(
            `
            INSERT INTO Orders (
                customer_id,
                delivery_address_id,
                invoice_address_id,
                order_status,
                total_cost
            )
            VALUES (?, ?, ?, 'created', ?)
            `,
            [user.customer_id, body.delivery_address_id, body.invoice_address_id, total_cost]
        );

        const order_id = Number(orderResult.insert_id);
        const created_items: CreateOrderResponse["items"] = [];

        for (const item of body.items) {
            const variant = variantMap.get(item.variant_id);

            if (!variant) {
                throw new Error("Variant dissapeared unexpectedly");
            }

            const itemResult = await connection.query<InsertResult>(
                `
                INSERT INTO Order_items (
                    order_id,
                    variant_id,
                    quantity,
                    unit_price
                )
                VALUES (?, ?, ?, ?)
                `,
                [order_id, item.variant_id, item.quantity, Number(variant.price)]
            );

            created_items.push({
                order_item_id: Number(itemResult.insert_id),
                variant_id: item.variant_id,
                quantity: item.quantity,
                unit_price: Number(variant.price),
            });
        }

        await connection.commit();

        const response: CreateOrderResponse = {
            order_id: order_id,
            order_status: "created",
            total_cost: total_cost,
            items: created_items,
        };

        return NextResponse.json( response, { status: 201, } );
    } catch (error) {
        await connection?.rollback();

        console.error( "Failed to create order", error );

        return NextResponse.json( { error: "Could not create order", }, { status: 500, } );
    } finally {
        connection?.release();
    }
}

function isCreateOrderRequest( value: unknown ): value is CreateOrderRequest {
    if (!value || typeof value !== "object") {
        return false;
    }

    const request = value as Partial<CreateOrderRequest>;

    if (typeof request.delivery_address_id !== "number" || !Number.isSafeInteger(request.delivery_address_id) || request.delivery_address_id < 1) { return false; }

    if (typeof request.invoice_address_id !== "number" || !Number.isSafeInteger(request.invoice_address_id) || request.invoice_address_id < 1) { return false; }

    if (!Array.isArray(request.items) || request.items.length === 0) { return false; }

    const seenVariantsIds = new Set<number>();

    return request.items.every((item) => {
        if (!item || typeof item !== "object") { return false; }

        const typed_item = item as {
            variant_id?: unknown;
            quantity?: unknown;
        };

        if (typeof typed_item.variant_id !== "number" || !Number.isSafeInteger(typed_item.variant_id) || typed_item.variant_id < 1) { return false; }

        if (typeof typed_item.quantity !== "number" || !Number.isSafeInteger(typed_item.quantity) || typed_item.quantity < 1) { return false; }

        const variant_id = Number(typed_item.variant_id);

        if (seenVariantsIds.has(variant_id)) { return false; }
        seenVariantsIds.add(variant_id);

        return true;
    })
}