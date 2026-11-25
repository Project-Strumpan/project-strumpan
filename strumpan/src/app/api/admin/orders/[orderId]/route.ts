/*
 * Admin single order details API (PRO-21 / PRO-89)
 * Returns order details including customer, addresses, ordered items and payment.
 * Strictly Owner-only.
 */

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeOwnerAccess } from "@/lib/inventory/access";
import { fieldError, parseId, writeAudit } from "@/lib/inventory/helpers";

const VALID_ORDER_STATUSES = [
    "created",
    "paid",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
] as const;

type Context = { params: Promise<{ orderId: string }> };

export async function GET(_request: Request, { params }: Context) {
    const access = await authorizeOwnerAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const orderId = parseId((await params).orderId);
    if (!orderId) {
        return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    let connection;
    try {
        connection = await pool.getConnection();

        // 1. Fetch main order and customer info
        const [order] = await connection.query<any[]>(`
            SELECT 
                o.order_id,
                o.order_date,
                o.order_status,
                o.total_cost,
                c.customer_id,
                c.name AS customer_name,
                c.email AS customer_email,
                c.phone_nbr AS customer_phone,
                o.delivery_address_id,
                o.invoice_address_id
            FROM Orders o
            JOIN Customers c ON c.customer_id = o.customer_id
            WHERE o.order_id = ?
        `, [orderId]);

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // 2. Fetch delivery address
        const [deliveryAddress] = await connection.query<any[]>(`
            SELECT street, postal_code, city, country, type
            FROM Addresses
            WHERE address_id = ?
        `, [order.delivery_address_id]);

        // 3. Fetch invoice address if different
        let invoiceAddress = deliveryAddress;
        if (order.invoice_address_id && order.invoice_address_id !== order.delivery_address_id) {
            const [inv] = await connection.query<any[]>(`
                SELECT street, postal_code, city, country, type
                FROM Addresses
                WHERE address_id = ?
            `, [order.invoice_address_id]);
            if (inv) invoiceAddress = inv;
        }

        // 4. Fetch ordered items with variant and product details
        const items = await connection.query<any[]>(`
            SELECT 
                oi.order_item_id,
                oi.variant_id,
                oi.quantity,
                oi.unit_price,
                (oi.quantity * oi.unit_price) AS line_total,
                p.product_id,
                p.product_name,
                pv.product_variant_size AS size,
                pv.color,
                pv.sku
            FROM Order_items oi
            JOIN Product_variants pv ON pv.variant_id = oi.variant_id
            JOIN Products p ON p.product_id = pv.product_id
            WHERE oi.order_id = ?
            ORDER BY oi.order_item_id ASC
        `, [orderId]);

        // 5. Fetch payment details
        const [payment] = await connection.query<any[]>(`
            SELECT payment_id, payment_method, total_amount, payment_status, transaction_id, payment_date
            FROM Payments
            WHERE order_id = ?
        `, [orderId]);

        return NextResponse.json({
            order_id: Number(order.order_id),
            order_date: order.order_date,
            order_status: order.order_status,
            total_cost: Number(order.total_cost),
            customer: {
                customer_id: Number(order.customer_id),
                name: order.customer_name,
                email: order.customer_email,
                phone: order.customer_phone,
            },
            delivery_address: deliveryAddress ? {
                street: deliveryAddress.street,
                postal_code: deliveryAddress.postal_code,
                city: deliveryAddress.city,
                country: deliveryAddress.country,
            } : null,
            invoice_address: invoiceAddress ? {
                street: invoiceAddress.street,
                postal_code: invoiceAddress.postal_code,
                city: invoiceAddress.city,
                country: invoiceAddress.country,
            } : null,
            items: items.map((item) => ({
                order_item_id: Number(item.order_item_id),
                variant_id: Number(item.variant_id),
                product_id: Number(item.product_id),
                product_name: item.product_name,
                size: item.size,
                color: item.color,
                sku: item.sku,
                quantity: Number(item.quantity),
                unit_price: Number(item.unit_price),
                line_total: item.line_total != null ? Number(item.line_total) : (Number(item.quantity) * Number(item.unit_price)),
            })),
            payment: payment ? {
                payment_id: Number(payment.payment_id),
                payment_method: payment.payment_method,
                total_amount: Number(payment.total_amount),
                payment_status: payment.payment_status,
                transaction_id: payment.transaction_id,
                payment_date: payment.payment_date,
            } : null,
        }, { status: 200 });
    } catch (error) {
        console.error("Failed to fetch order details", error);
        return NextResponse.json({ error: "Failed to fetch order details" }, { status: 500 });
    } finally {
        connection?.release();
    }
}

export async function PATCH(request: Request, { params }: Context) {
    const access = await authorizeOwnerAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const orderId = parseId((await params).orderId);
    if (!orderId) {
        return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const nextStatus = typeof body?.order_status === "string" ? body.order_status.trim() : "";
    if (!VALID_ORDER_STATUSES.includes(nextStatus as any)) {
        return fieldError("order_status", "Invalid order status");
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [existing] = await connection.query<Array<{ order_id: number; order_status: string }>>(
            "SELECT order_id, order_status FROM Orders WHERE order_id = ? FOR UPDATE",
            [orderId]
        );
        if (!existing) {
            await connection.rollback();
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const previousStatus = existing.order_status;
        if (previousStatus === nextStatus) {
            await connection.commit();
            return NextResponse.json({ order_id: orderId, order_status: nextStatus }, { status: 200 });
        }

        await connection.query(
            "UPDATE Orders SET order_status = ? WHERE order_id = ?",
            [nextStatus, orderId]
        );

        let stockRestored = false;
        if (nextStatus === "cancelled" && previousStatus !== "cancelled" && previousStatus !== "returned") {
            const items = await connection.query<Array<{ variant_id: number; quantity: number }>>(
                "SELECT variant_id, quantity FROM Order_items WHERE order_id = ?",
                [orderId]
            );
            for (const item of items) {
                await connection.query(
                    "UPDATE Inventory SET quantity = quantity + ? WHERE variant_id = ?",
                    [Number(item.quantity), Number(item.variant_id)]
                );
            }
            stockRestored = items.length > 0;
        }

        await writeAudit(
            connection,
            access.adminId,
            "update_order_status",
            "Orders",
            orderId,
            {
                before: { order_status: previousStatus },
                after: { order_status: nextStatus },
                stock_restored: stockRestored,
            }
        );

        await connection.commit();
        return NextResponse.json({
            order_id: orderId,
            order_status: nextStatus,
            previous_status: previousStatus,
            stock_restored: stockRestored,
        }, { status: 200 });
    } catch (error) {
        try { await connection?.rollback(); } catch { /* ignore */ }
        console.error("Failed to update order status", error);
        return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
    } finally {
        connection?.release();
    }
}
