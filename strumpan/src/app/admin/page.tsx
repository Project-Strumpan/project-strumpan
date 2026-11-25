"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type SummaryProduct = {
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

type CountryStat = {
    country: string;
    orders_count: number;
    total_sales: number;
};

type SummaryData = {
    period: "24h" | "7d";
    total_orders: number;
    total_items_sold: number;
    total_sales: number;
    top_product: SummaryProduct | null;
    top_country: CountryStat | null;
    top_countries: CountryStat[];
    items: SummaryProduct[];
};

const navCards = [
    {
        href: "/admin/inventory",
        title: "Inventory & Products",
        description: "Manage products, variants, stock levels, prices, images, and review drafts.",
    },
    {
        href: "/admin/categories",
        title: "Categories",
        description: "Create and organize product categories and parent/child hierarchies.",
    },
    {
        href: "/admin/orders",
        title: "Orders & Summaries",
        description: "Search orders, update order status, view customer details, and check 24h/7d reports.",
    },
    {
        href: "/admin/admins",
        title: "Admins & Roles",
        description: "Add new administrators and assign superadmin or inventory_manager roles.",
    },
    {
        href: "/admin/audit-log",
        title: "Database Audit Log",
        description: "Inspect recorded administrative changes and before/after state snapshots.",
    },
];

export default function AdminDashboardPage() {
    const [summary24h, setSummary24h] = useState<SummaryData | null>(null);
    const [summary7d, setSummary7d] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [forbidden, setForbidden] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function loadDashboard() {
            try {
                const [res24, res7] = await Promise.all([
                    fetch("/api/admin/orders/summary?period=24h"),
                    fetch("/api/admin/orders/summary?period=7d"),
                ]);

                if (res24.status === 403 || res7.status === 403) {
                    if (!cancelled) setForbidden(true);
                    return;
                }

                const [data24, data7] = await Promise.all([res24.json(), res7.json()]);
                if (!res24.ok) throw new Error(data24.error || "Failed to load 24h statistics");
                if (!res7.ok) throw new Error(data7.error || "Failed to load 7d statistics");

                if (!cancelled) {
                    setSummary24h(data24);
                    setSummary7d(data7);
                }
            } catch (e: any) {
                if (!cancelled) setError(e.message || "Failed to load dashboard statistics");
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        void loadDashboard();
        return () => { cancelled = true; };
    }, []);

    return (
        <main className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                    Super Admin Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                    Store overview, order statistics, and quick navigation across all administrative tools.
                </p>
            </div>

            {/* Quick View Switcher */}
            <section aria-labelledby="views-heading">
                <h2 id="views-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
                    Admin Views
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {navCards.map((card) => (
                        <Link
                            key={card.href}
                            href={card.href}
                            className="group rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:border-indigo-400 hover:shadow"
                        >
                            <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-600">
                                {card.title} →
                            </h3>
                            <p className="mt-1 text-sm text-gray-600">{card.description}</p>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Statistics Section */}
            {forbidden ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                    <p className="font-semibold">Limited Access (Inventory Role)</p>
                    <p className="mt-1">
                        Order statistics, pricing, and role management are restricted to Super Admin. Use{" "}
                        <Link href="/admin/inventory" className="font-semibold underline">
                            Inventory &amp; Products
                        </Link>{" "}
                        to manage products and stock.
                    </p>
                </div>
            ) : error ? (
                <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {error}
                </div>
            ) : loading ? (
                <p className="text-sm text-gray-500">Loading store statistics…</p>
            ) : summary24h && summary7d ? (
                <section aria-labelledby="stats-heading" className="space-y-6">
                    <h2 id="stats-heading" className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                        Store Statistics
                    </h2>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <p className="text-xs font-semibold uppercase text-gray-500">Orders (Last 24 Hours)</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">{summary24h.total_orders}</p>
                            <p className="mt-1 text-xs text-gray-600">
                                {summary24h.total_sales.toFixed(2)} kr revenue · {summary24h.total_items_sold} items
                            </p>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <p className="text-xs font-semibold uppercase text-gray-500">Orders (Last 7 Days)</p>
                            <p className="mt-2 text-3xl font-bold text-gray-900">{summary7d.total_orders}</p>
                            <p className="mt-1 text-xs text-gray-600">
                                {summary7d.total_sales.toFixed(2)} kr revenue · {summary7d.total_items_sold} items
                            </p>
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <p className="text-xs font-semibold uppercase text-gray-500">Most Ordered Product (7d)</p>
                            {summary7d.top_product ? (
                                <>
                                    <p className="mt-2 text-lg font-bold text-gray-900 truncate" title={summary7d.top_product.product_name}>
                                        {summary7d.top_product.product_name}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-600">
                                        {summary7d.top_product.total_quantity} sold ({summary7d.top_product.size})
                                    </p>
                                </>
                            ) : (
                                <p className="mt-2 text-sm text-gray-500">No orders yet</p>
                            )}
                        </div>

                        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                            <p className="text-xs font-semibold uppercase text-gray-500">Top Country (7d)</p>
                            {summary7d.top_country ? (
                                <>
                                    <p className="mt-2 text-2xl font-bold text-gray-900">
                                        {summary7d.top_country.country}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-600">
                                        {summary7d.top_country.orders_count} orders · {summary7d.top_country.total_sales.toFixed(2)} kr
                                    </p>
                                </>
                            ) : (
                                <p className="mt-2 text-sm text-gray-500">No orders yet</p>
                            )}
                        </div>
                    </div>

                    {/* Detailed breakdowns */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
                                <h3 className="text-sm font-semibold text-gray-900">Top Products (Last 7 Days)</h3>
                            </div>
                            {summary7d.items.length === 0 ? (
                                <p className="p-5 text-sm text-gray-500">No products ordered in the last 7 days.</p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                                        <tr>
                                            <th className="px-5 py-2.5">Product</th>
                                            <th className="px-5 py-2.5 text-right">Qty</th>
                                            <th className="px-5 py-2.5 text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {summary7d.items.slice(0, 5).map((item) => (
                                            <tr key={item.variant_id}>
                                                <td className="px-5 py-2.5 font-medium text-gray-900">
                                                    {item.product_name}{" "}
                                                    <span className="text-xs font-normal text-gray-500">
                                                        ({item.size}{item.color ? `, ${item.color}` : ""})
                                                    </span>
                                                </td>
                                                <td className="px-5 py-2.5 text-right font-semibold">{item.total_quantity}</td>
                                                <td className="px-5 py-2.5 text-right text-gray-700">{item.total_revenue.toFixed(2)} kr</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                            <div className="border-b border-gray-200 bg-gray-50 px-5 py-3">
                                <h3 className="text-sm font-semibold text-gray-900">Orders by Country (Last 7 Days)</h3>
                            </div>
                            {summary7d.top_countries.length === 0 ? (
                                <p className="p-5 text-sm text-gray-500">No country data available for the last 7 days.</p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                                        <tr>
                                            <th className="px-5 py-2.5">Country</th>
                                            <th className="px-5 py-2.5 text-right">Orders</th>
                                            <th className="px-5 py-2.5 text-right">Total Sales</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {summary7d.top_countries.map((c) => (
                                            <tr key={c.country}>
                                                <td className="px-5 py-2.5 font-medium text-gray-900">{c.country}</td>
                                                <td className="px-5 py-2.5 text-right font-semibold">{c.orders_count}</td>
                                                <td className="px-5 py-2.5 text-right text-gray-700">{c.total_sales.toFixed(2)} kr</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </section>
            ) : null}
        </main>
    );
}
