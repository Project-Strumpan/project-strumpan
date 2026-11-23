/*
 * Admin order summary API (PRO-86 / PRO-87 / PRO-89)
 * Supports rolling 24-hour ("Last 24 hours") and 7-day periods.
 * Strictly Owner-only.
 */

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeOwnerAccess } from "@/lib/inventory/access";

export async function GET(request: Request) {
    const access = await authorizeOwnerAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period"); // '24h' or '7d'

    const is24h = period === "24h";
    const intervalClause = is24h ? "INTERVAL 24 HOUR" : "INTERVAL 7 DAY";
    const label = is24h ? "Last 24 hours" : "Last 7 days";

    let connection;
    try {
        connection = await pool.getConnection();

        // 1. Calculate precise rolling window bounds
        const [bounds] = await connection.query<Array<{ start_time: Date | string; end_time: Date | string }>>(`
            SELECT 
                (CURRENT_TIMESTAMP - ${intervalClause}) AS start_time,
                CURRENT_TIMESTAMP AS end_time
        `);

        // 2. Fetch aggregated ordered items and quantities per product and variant
        const items = await connection.query<any[]>(`
            SELECT 
                p.product_id,
                p.product_name,
                pv.variant_id,
                pv.product_variant_size AS size,
                pv.color,
                pv.sku,
                SUM(oi.quantity) AS total_quantity,
                SUM(oi.quantity * oi.unit_price) AS total_revenue,
                COUNT(DISTINCT o.order_id) AS orders_count
            FROM Orders o
            JOIN Order_items oi ON oi.order_id = o.order_id
            JOIN Product_variants pv ON pv.variant_id = oi.variant_id
            JOIN Products p ON p.product_id = pv.product_id
            WHERE o.order_date >= (CURRENT_TIMESTAMP - ${intervalClause})
            GROUP BY p.product_id, p.product_name, pv.variant_id, pv.product_variant_size, pv.color, pv.sku
            ORDER BY total_quantity DESC, p.product_name ASC
        `);

        // 3. Overall period totals
        const [overall] = await connection.query<Array<{ total_orders: number | string; total_items_sold: number | string; total_sales: number | string }>>(`
            SELECT 
                COUNT(DISTINCT o.order_id) AS total_orders,
                COALESCE(SUM(oi.quantity), 0) AS total_items_sold,
                COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_sales
            FROM Orders o
            LEFT JOIN Order_items oi ON oi.order_id = o.order_id
            WHERE o.order_date >= (CURRENT_TIMESTAMP - ${intervalClause})
        `);

        return NextResponse.json({
            period: is24h ? "24h" : "7d",
            label,
            period_start: bounds.start_time,
            period_end: bounds.end_time,
            total_orders: Number(overall?.total_orders || 0),
            total_items_sold: Number(overall?.total_items_sold || 0),
            total_sales: Number(overall?.total_sales || 0),
            items: items.map((row) => ({
                product_id: Number(row.product_id),
                product_name: row.product_name,
                variant_id: Number(row.variant_id),
                size: row.size,
                color: row.color,
                sku: row.sku,
                total_quantity: Number(row.total_quantity),
                total_revenue: Number(row.total_revenue),
                orders_count: Number(row.orders_count),
            })),
        }, { status: 200 });
    } catch (error) {
        console.error("Failed to generate order summary", error);
        return NextResponse.json({ error: "Failed to generate order summary" }, { status: 500 });
    } finally {
        connection?.release();
    }
}
