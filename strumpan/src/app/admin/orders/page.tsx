"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderItemSummary = {
    order_item_id: number;
    variant_id: number;
    product_id: number;
    product_name: string;
    size: string;
    color: string | null;
    sku: string;
    quantity: number;
    unit_price: number;
    line_total: number;
};

type OrderDetail = {
    order_id: number;
    order_date: string;
    order_status: string;
    total_cost: number;
    customer: {
        customer_id: number;
        name: string;
        email: string;
        phone: string | null;
    };
    delivery_address: {
        street: string;
        postal_code: string;
        city: string;
        country: string;
    } | null;
    invoice_address: {
        street: string;
        postal_code: string;
        city: string;
        country: string;
    } | null;
    items: OrderItemSummary[];
    payment: {
        payment_id: number;
        payment_method: string;
        total_amount: number;
        payment_status: string;
        transaction_id: string | null;
        payment_date: string;
    } | null;
};

type OrderListItem = {
    order_id: number;
    order_date: string;
    order_status: string;
    total_cost: number;
    total_items: number;
    customer: {
        customer_id: number;
        name: string;
        email: string;
    };
    payment: {
        payment_method: string;
        payment_status: string;
        transaction_id: string | null;
    } | null;
};

type SummaryItem = {
    product_id: number;
    product_name: string;
    variant_id: number;
    size: string;
    color: string | null;
    sku: string;
    total_quantity: number;
    total_revenue: number;
    orders_count: number;
};

type SummaryResponse = {
    period: "24h" | "7d";
    label: string;
    period_start: string;
    period_end: string;
    total_orders: number;
    total_items_sold: number;
    total_sales: number;
    items: SummaryItem[];
};

export default function AdminOrdersPage() {
    const [tab, setTab] = useState<"orders" | "24h" | "7d">("orders");

    // Orders tab state
    const [orders, setOrders] = useState<OrderListItem[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    // Selected order details modal
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [orderDetail, setOrderDetail] = useState<OrderDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Summary tab state (24h or 7d)
    const [summary, setSummary] = useState<SummaryResponse | null>(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    // Fetch order list
    async function loadOrders() {
        setLoadingOrders(true);
        setOrdersError(null);
        try {
            const params = new URLSearchParams();
            if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
            if (startDate) params.set("startDate", startDate);
            if (endDate) params.set("endDate", endDate);

            const res = await fetch(`/api/admin/orders?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load orders");
            setOrders(data.orders || []);
        } catch (e: any) {
            setOrdersError(e.message || "Failed to load orders");
        } finally {
            setLoadingOrders(false);
        }
    }

    // Fetch single order details
    async function loadOrderDetail(id: number) {
        setSelectedOrderId(id);
        setLoadingDetail(true);
        setOrderDetail(null);
        try {
            const res = await fetch(`/api/admin/orders/${id}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load order details");
            setOrderDetail(data);
        } catch (e: any) {
            alert(e.message || "Could not load order details");
        } finally {
            setLoadingDetail(false);
        }
    }

    // Fetch summary for 24h or 7d
    async function loadSummary(period: "24h" | "7d") {
        setLoadingSummary(true);
        setSummaryError(null);
        try {
            const res = await fetch(`/api/admin/orders/summary?period=${period}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load summary");
            setSummary(data);
        } catch (e: any) {
            setSummaryError(e.message || "Failed to load summary");
        } finally {
            setLoadingSummary(false);
        }
    }

    useEffect(() => {
        if (tab === "orders") {
            void loadOrders();
        } else {
            void loadSummary(tab);
        }
    }, [tab, statusFilter, startDate, endDate]);

    return (
        <main className="space-y-6">
            <div>
                <Link href="/admin/inventory" className="text-sm text-indigo-600 hover:underline">
                    ← Back to inventory
                </Link>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                    Orders & Summaries
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                    Review customer orders, view detailed items and customer data, and check rolling 24-hour and 7-day order summaries.
                </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    type="button"
                    onClick={() => setTab("orders")}
                    className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                        tab === "orders"
                            ? "border-indigo-600 text-indigo-600 font-semibold"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                    All Orders (PRO-21)
                </button>
                <button
                    type="button"
                    onClick={() => setTab("24h")}
                    className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                        tab === "24h"
                            ? "border-indigo-600 text-indigo-600 font-semibold"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                    Last 24 hours (PRO-87)
                </button>
                <button
                    type="button"
                    onClick={() => setTab("7d")}
                    className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                        tab === "7d"
                            ? "border-indigo-600 text-indigo-600 font-semibold"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                    Last 7 days (PRO-86)
                </button>
            </div>

            {/* TAB 1: ALL ORDERS */}
            {tab === "orders" && (
                <section className="space-y-4">
                    {/* Filter controls */}
                    <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-4 shadow-sm">
                        <div>
                            <label htmlFor="filter-status" className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                                Status
                            </label>
                            <select
                                id="filter-status"
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All statuses</option>
                                <option value="paid">Paid</option>
                                <option value="created">Created</option>
                                <option value="packed">Packed</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                                <option value="returned">Returned</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="filter-start" className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                                From Date
                            </label>
                            <input
                                id="filter-start"
                                type="date"
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="filter-end" className="block text-xs font-semibold uppercase tracking-wider text-gray-600">
                                To Date
                            </label>
                            <input
                                id="filter-end"
                                type="date"
                                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setStatusFilter("all");
                                    setStartDate("");
                                    setEndDate("");
                                }}
                                className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
                            >
                                Reset filters
                            </button>
                        </div>
                    </div>

                    {ordersError && (
                        <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-800 border border-red-200">
                            {ordersError}
                        </div>
                    )}

                    {loadingOrders ? (
                        <p className="py-8 text-center text-gray-500">Loading orders…</p>
                    ) : orders.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
                            No orders found matching the selected criteria.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                <thead className="bg-gray-50 font-medium text-gray-700">
                                    <tr>
                                        <th className="px-4 py-3">Order ID</th>
                                        <th className="px-4 py-3">Date & Time</th>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Items</th>
                                        <th className="px-4 py-3">Total Cost</th>
                                        <th className="px-4 py-3">Payment</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {orders.map((o) => (
                                        <tr key={o.order_id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-semibold text-gray-900">
                                                #{o.order_id}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {new Date(o.order_date).toLocaleString("sv-SE")}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{o.customer.name}</div>
                                                <div className="text-xs text-gray-500">{o.customer.email}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                    o.order_status === "paid" ? "bg-emerald-100 text-emerald-800" :
                                                    o.order_status === "shipped" ? "bg-blue-100 text-blue-800" :
                                                    o.order_status === "delivered" ? "bg-purple-100 text-purple-800" :
                                                    "bg-gray-100 text-gray-800"
                                                }`}>
                                                    {o.order_status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                {o.total_items} pcs
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-gray-900">
                                                {o.total_cost.toFixed(2)} kr
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-600">
                                                {o.payment ? (
                                                    <span>{o.payment.payment_method.toUpperCase()} ({o.payment.payment_status})</span>
                                                ) : "—"}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => loadOrderDetail(o.order_id)}
                                                    className="rounded border border-indigo-600 px-3 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                                                >
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            )}

            {/* TAB 2 & 3: SUMMARIES (24H & 7D) */}
            {(tab === "24h" || tab === "7d") && (
                <section className="space-y-6">
                    {summaryError && (
                        <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-800 border border-red-200">
                            {summaryError}
                        </div>
                    )}

                    {loadingSummary ? (
                        <p className="py-12 text-center text-gray-500">Calculating order summary…</p>
                    ) : summary ? (
                        <>
                            {/* Header & Window info */}
                            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div>
                                        <span className="inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800 uppercase tracking-wider">
                                            {summary.label}
                                        </span>
                                        <h2 className="mt-2 text-2xl font-bold text-gray-900">
                                            {tab === "24h" ? "Last 24 Hours Summary" : "Last 7 Days Summary"}
                                        </h2>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Rolling window: {new Date(summary.period_start).toLocaleString("sv-SE")} — {new Date(summary.period_end).toLocaleString("sv-SE")}
                                        </p>
                                    </div>
                                    <div className="flex gap-6 text-right">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Orders</p>
                                            <p className="text-2xl font-bold text-gray-900">{summary.total_orders}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Items Sold</p>
                                            <p className="text-2xl font-bold text-gray-900">{summary.total_items_sold}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase">Sales</p>
                                            <p className="text-2xl font-bold text-emerald-600">{summary.total_sales.toFixed(2)} kr</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Aggregated Items list */}
                            {summary.items.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
                                    <p className="text-base font-medium">No orders recorded in this period.</p>
                                    <p className="mt-1 text-sm text-gray-400">
                                        {tab === "24h"
                                            ? "No items have been ordered in the last 24 hours."
                                            : "No items have been ordered in the last 7 days."}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                        <thead className="bg-gray-50 font-medium text-gray-700">
                                            <tr>
                                                <th className="px-4 py-3">Product Name</th>
                                                <th className="px-4 py-3">Variant (Size / Color)</th>
                                                <th className="px-4 py-3">SKU</th>
                                                <th className="px-4 py-3">Orders</th>
                                                <th className="px-4 py-3">Quantity Sold</th>
                                                <th className="px-4 py-3 text-right">Total Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {summary.items.map((item) => (
                                                <tr key={item.variant_id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-semibold text-gray-900">
                                                        {item.product_name}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600">
                                                        {item.size} {item.color ? `(${item.color})` : ""}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                                        {item.sku}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-700">
                                                        {item.orders_count}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-gray-900">
                                                        {item.total_quantity} pcs
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                                                        {item.total_revenue.toFixed(2)} kr
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : null}
                </section>
            )}

            {/* ORDER DETAILS MODAL (PRO-21) */}
            {selectedOrderId && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-order-title"
                >
                    <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl space-y-6">
                        <div className="flex items-center justify-between border-b pb-4">
                            <h2 id="modal-order-title" className="text-xl font-bold text-gray-900">
                                Order Details #{selectedOrderId}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setSelectedOrderId(null)}
                                className="rounded p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                                ✕
                            </button>
                        </div>

                        {loadingDetail ? (
                            <p className="py-12 text-center text-gray-500">Loading order details…</p>
                        ) : orderDetail ? (
                            <div className="space-y-6 text-sm">
                                {/* Top metadata */}
                                <div className="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-4">
                                    <div>
                                        <p className="text-xs text-gray-500">Order Date</p>
                                        <p className="font-semibold text-gray-800">
                                            {new Date(orderDetail.order_date).toLocaleString("sv-SE")}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Status</p>
                                        <span className="font-semibold text-emerald-700 uppercase">
                                            {orderDetail.order_status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Total Amount</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {orderDetail.total_cost.toFixed(2)} kr
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Payment Method</p>
                                        <p className="font-semibold text-gray-800">
                                            {orderDetail.payment?.payment_method.toUpperCase() || "N/A"}
                                        </p>
                                    </div>
                                </div>

                                {/* Customer & Shipping Info */}
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <h3 className="font-semibold text-gray-900 mb-2">Customer Information</h3>
                                        <p className="text-gray-800 font-medium">{orderDetail.customer.name}</p>
                                        <p className="text-gray-600">{orderDetail.customer.email}</p>
                                        {orderDetail.customer.phone && (
                                            <p className="text-gray-600">Tel: {orderDetail.customer.phone}</p>
                                        )}
                                    </div>
                                    <div className="rounded-lg border border-gray-200 p-4">
                                        <h3 className="font-semibold text-gray-900 mb-2">Delivery Address</h3>
                                        {orderDetail.delivery_address ? (
                                            <div className="text-gray-700">
                                                <p>{orderDetail.delivery_address.street}</p>
                                                <p>{orderDetail.delivery_address.postal_code} {orderDetail.delivery_address.city}</p>
                                                <p>{orderDetail.delivery_address.country}</p>
                                            </div>
                                        ) : (
                                            <p className="text-gray-400">No address recorded</p>
                                        )}
                                    </div>
                                </div>

                                {/* Order Items Table */}
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-3">Purchased Items ({orderDetail.items.length})</h3>
                                    <table className="min-w-full divide-y divide-gray-200 border text-left text-xs">
                                        <thead className="bg-gray-50 text-gray-700">
                                            <tr>
                                                <th className="px-3 py-2">Product</th>
                                                <th className="px-3 py-2">Variant / SKU</th>
                                                <th className="px-3 py-2">Qty</th>
                                                <th className="px-3 py-2">Unit Price</th>
                                                <th className="px-3 py-2 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {orderDetail.items.map((item) => (
                                                <tr key={item.order_item_id}>
                                                    <td className="px-3 py-2 font-medium text-gray-900">
                                                        {item.product_name}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-600">
                                                        {item.size} {item.color ? `(${item.color})` : ""} - {item.sku}
                                                    </td>
                                                    <td className="px-3 py-2 font-bold text-gray-800">
                                                        {item.quantity}
                                                    </td>
                                                    <td className="px-3 py-2 text-gray-600">
                                                        {item.unit_price.toFixed(2)} kr
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-semibold text-gray-900">
                                                        {item.line_total.toFixed(2)} kr
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Payment transaction */}
                                {orderDetail.payment && (
                                    <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                                        <p><span className="font-semibold">Transaction ID:</span> {orderDetail.payment.transaction_id || "—"}</p>
                                        <p><span className="font-semibold">Payment Status:</span> {orderDetail.payment.payment_status}</p>
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedOrderId(null)}
                                        className="rounded border border-gray-400 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </main>
    );
}
