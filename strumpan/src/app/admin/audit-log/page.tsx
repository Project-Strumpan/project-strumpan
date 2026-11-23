"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type AuditEntry = {
    log_id: number;
    time_stamp: string;
    handling: string;
    table_name: string;
    record_id: number;
    admin: {
        admin_id: number;
        name: string;
        email: string;
    };
    details: any;
};

export default function AdminAuditLogPage() {
    const [logs, setLogs] = useState<AuditEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tableFilter, setTableFilter] = useState("all");
    const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

    async function loadLogs(filter = tableFilter) {
        setLoading(true);
        setError(null);
        try {
            const url = new URL("/api/admin/audit-log", window.location.origin);
            if (filter && filter !== "all") {
                url.searchParams.set("table", filter);
            }
            url.searchParams.set("limit", "100");

            const res = await fetch(url.toString());
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to fetch audit log");
            }
            setLogs(data.logs || []);
        } catch (e: any) {
            setError(e.message || "Failed to load audit logs");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadLogs(tableFilter);
    }, [tableFilter]);

    function formatDate(iso: string) {
        if (!iso) return "-";
        return new Date(iso).toLocaleString("sv-SE", {
            dateStyle: "short",
            timeStyle: "medium",
        });
    }

    function toggleDetails(logId: number) {
        setExpandedLogId(prev => (prev === logId ? null : logId));
    }

    return (
        <main className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Database Audit Log
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        View recorded administrative actions and before/after state changes across categories, prices, and inventory.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void loadLogs(tableFilter)}
                    disabled={loading}
                    className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
                >
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
            </div>

            {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <p className="font-semibold">Access restricted or error encountered</p>
                    <p>{error}</p>
                </div>
            )}

            {/* Filter */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <label className="text-sm font-medium text-gray-700">Filter by Target Table:</label>
                <select
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                    <option value="all">All Tables</option>
                    <option value="Categories">Categories</option>
                    <option value="Products">Products</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Variants">Variants</option>
                </select>
                <span className="text-xs text-gray-500">
                    Showing latest entries (up to 100)
                </span>
            </div>

            {/* Audit Log Table */}
            {loading && logs.length === 0 ? (
                <p className="text-sm text-gray-500">Loading audit log...</p>
            ) : logs.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500">
                    No recorded administrative audit logs found for the selected filter.
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    <table className="w-full text-left text-sm text-gray-700">
                        <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-600">
                            <tr>
                                <th scope="col" className="px-4 py-3">Timestamp</th>
                                <th scope="col" className="px-4 py-3">Admin</th>
                                <th scope="col" className="px-4 py-3">Action</th>
                                <th scope="col" className="px-4 py-3">Target</th>
                                <th scope="col" className="px-4 py-3">Record ID</th>
                                <th scope="col" className="px-4 py-3 text-right">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.map((log) => {
                                const isExpanded = expandedLogId === log.log_id;
                                const hasDetails = log.details && Object.keys(log.details).length > 0;

                                return (
                                    <tr key={log.log_id} className="hover:bg-gray-50">
                                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-600">
                                            {formatDate(log.time_stamp)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{log.admin.name}</div>
                                            <div className="text-xs text-gray-500">{log.admin.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                                                {log.handling}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                            {log.table_name}
                                        </td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                                            #{log.record_id}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {hasDetails ? (
                                                <button
                                                    type="button"
                                                    onClick={() => toggleDetails(log.log_id)}
                                                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                                                >
                                                    {isExpanded ? "Hide Details" : "View Details"}
                                                </button>
                                            ) : (
                                                <span className="text-xs text-gray-400">None</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Expanded JSON details modal or drawer */}
            {expandedLogId !== null && (
                (() => {
                    const log = logs.find(l => l.log_id === expandedLogId);
                    if (!log) return null;

                    return (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                            <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
                                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Audit Log #{log.log_id} — {log.handling}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setExpandedLogId(null)}
                                        className="rounded text-gray-400 hover:text-gray-600 focus-visible:outline-2 focus-visible:outline-indigo-600"
                                        aria-label="Close modal"
                                    >
                                        ✕
                                    </button>
                                </div>

                                <div className="mt-4 space-y-3 text-sm text-gray-700">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div><span className="text-gray-500">Table:</span> <span className="font-semibold">{log.table_name}</span></div>
                                        <div><span className="text-gray-500">Record ID:</span> <span className="font-semibold">#{log.record_id}</span></div>
                                        <div><span className="text-gray-500">Admin:</span> {log.admin.name} ({log.admin.email})</div>
                                        <div><span className="text-gray-500">Timestamp:</span> {formatDate(log.time_stamp)}</div>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-semibold uppercase text-gray-500">Details & State Changes:</h4>
                                        <pre className="mt-1 overflow-x-auto rounded bg-gray-900 p-3 font-mono text-xs text-green-400">
                                            {JSON.stringify(log.details, null, 2)}
                                        </pre>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedLogId(null)}
                                        className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-indigo-600"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            )}
        </main>
    );
}
