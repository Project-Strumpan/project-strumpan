/*
 * Admin order list API (PRO-21 / PRO-89)
 * Lists orders from MariaDB with optional status and date range filtering.
 * Strictly Owner-only (403 for inventory admin).
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
    const statusFilter = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    let connection;
    try {
        connection = await pool.getConnection();

        let sql = `
            SELECT 
                o.order_id,
                o.order_date,
                o.order_status,
                o.total_cost,
                c.customer_id,
                c.name AS customer_name,
                c.email AS customer_email,
                p.payment_method,
                p.payment_status,
                p.transaction_id,
                (SELECT SUM(quantity) FROM Order_items oi WHERE oi.order_id = o.order_id) AS total_items
            FROM Orders o
            JOIN Customers c ON c.customer_id = o.customer_id
            LEFT JOIN Payments p ON p.order_id = o.order_id
            WHERE 1=1
        `;

        const params: any[] = [];

        if (statusFilter && statusFilter.trim() !== "" && statusFilter !== "all") {
            sql += " AND o.order_status = ?";
            params.push(statusFilter.trim());
        }

        if (startDate && startDate.trim() !== "") {
            sql += " AND o.order_date >= ?";
            params.push(new Date(startDate).toISOString().slice(0, 19).replace("T", " "));
        }

        if (endDate && endDate.trim() !== "") {
            sql += " AND o.order_date <= ?";
            params.push(new Date(endDate).toISOString().slice(0, 19).replace("T", " "));
        }

        if (search && search.trim() !== "") {
            const term = `%${search.trim()}%`;
            sql += " AND (CAST(o.order_id AS CHAR) LIKE ? OR c.name LIKE ? OR c.email LIKE ?)";
            params.push(term, term, term);
        }

        sql += " ORDER BY o.order_date DESC, o.order_id DESC";

        const orders = await connection.query<any[]>(sql, params);

        return NextResponse.json({
            orders: orders.map((o) => ({
                order_id: Number(o.order_id),
                order_date: o.order_date,
                order_status: o.order_status,
                total_cost: Number(o.total_cost),
                total_items: Number(o.total_items || 0),
                customer: {
                    customer_id: Number(o.customer_id),
                    name: o.customer_name,
                    email: o.customer_email,
                },
                payment: o.payment_method ? {
                    payment_method: o.payment_method,
                    payment_status: o.payment_status,
                    transaction_id: o.transaction_id,
                } : null,
            })),
        }, { status: 200 });
    } catch (error) {
        console.error("Failed to list orders for admin", error);
        return NextResponse.json({ error: "Failed to list orders" }, { status: 500 });
    } finally {
        connection?.release();
    }
}
