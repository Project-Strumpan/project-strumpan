"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmDialog from "@/components/inventory/ConfirmDialog";

type AdminUser = {
    admin_id: number;
    admin_name: string;
    email: string;
    role_id: number;
    role_name: string;
    roles_description: string | null;
};

type RoleOption = {
    role_id: number;
    role_name: string;
    roles_description: string | null;
};

const inputClass = (invalid: boolean) =>
    `w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
        invalid ? "border-red-500" : "border-gray-300"
    }`;

export default function AdminRolesPage() {
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [roles, setRoles] = useState<RoleOption[]>([]);
    const [currentAdminId, setCurrentAdminId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Create form
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [roleId, setRoleId] = useState<string>("");
    const [fieldErrors, setFieldErrors] = useState<{ admin_name?: string; email?: string; role_id?: string }>({});
    const [creating, setCreating] = useState(false);

    // Delete dialog
    const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    async function loadData() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/admin/admins");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load admins");
            setAdmins(data.admins || []);
            setRoles(data.roles || []);
            setCurrentAdminId(data.currentAdminId ?? null);
            if (!roleId && data.roles?.length > 0) {
                const invRole = data.roles.find((r: RoleOption) => r.role_name === "inventory_manager");
                setRoleId(String(invRole ? invRole.role_id : data.roles[0].role_id));
            }
        } catch (e: any) {
            setError(e.message || "Could not load admin accounts");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setFieldErrors({});
        setMessage(null);
        setError(null);

        if (!name.trim()) {
            setFieldErrors({ admin_name: "Name is required" });
            return;
        }
        if (!email.trim() || !email.includes("@")) {
            setFieldErrors({ email: "Valid email is required" });
            return;
        }
        if (!roleId) {
            setFieldErrors({ role_id: "Role is required" });
            return;
        }

        setCreating(true);
        try {
            const res = await fetch("/api/admin/admins", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    admin_name: name.trim(),
                    email: email.trim(),
                    role_id: Number(roleId),
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.field) {
                    setFieldErrors({ [data.field]: data.error });
                } else {
                    setError(data.error || "Failed to create admin");
                }
                return;
            }
            setName("");
            setEmail("");
            setMessage(`Admin "${data.admin_name}" (${data.role_name}) added to database.`);
            await loadData();
        } catch (e: any) {
            setError(e.message || "Failed to create admin");
        } finally {
            setCreating(false);
        }
    }

    async function handleRoleChange(admin: AdminUser, newRoleId: string) {
        setUpdatingId(admin.admin_id);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/admins/${admin.admin_id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role_id: Number(newRoleId) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update role");
            setMessage(`Updated role for ${admin.admin_name}.`);
            await loadData();
        } catch (e: any) {
            setError(e.message || "Failed to update role");
        } finally {
            setUpdatingId(null);
        }
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        setError(null);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/admins/${deleteTarget.admin_id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete admin");
            setMessage(`Removed admin "${deleteTarget.admin_name}".`);
            setDeleteTarget(null);
            await loadData();
        } catch (e: any) {
            setError(e.message || "Failed to delete admin");
            setDeleteTarget(null);
        } finally {
            setDeleting(false);
        }
    }

    return (
        <main className="space-y-8">
            <div>
                <Link href="/admin" className="text-sm text-indigo-600 hover:underline">
                    ← Back to dashboard
                </Link>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                    Admins &amp; Role Management
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                    Assign roles (`superadmin`, `inventory_manager`, `customer_service`) in MariaDB. Access requires both a matching record here and the `admin:access` permission in Auth0.
                </p>
            </div>

            {error && (
                <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {error}
                </div>
            )}

            {message && (
                <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    {message}
                </div>
            )}

            {/* Add new admin form */}
            <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Add New Admin</h2>
                <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-4 items-start">
                    <div>
                        <label htmlFor="admin-name" className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                            Name
                        </label>
                        <input
                            id="admin-name"
                            type="text"
                            placeholder="e.g. Anna Andersson"
                            className={inputClass(Boolean(fieldErrors.admin_name))}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={creating}
                        />
                        {fieldErrors.admin_name && (
                            <p className="mt-1 text-xs text-red-600">{fieldErrors.admin_name}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="admin-email" className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                            Email (must match Auth0)
                        </label>
                        <input
                            id="admin-email"
                            type="email"
                            placeholder="anna@example.com"
                            className={inputClass(Boolean(fieldErrors.email))}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={creating}
                        />
                        {fieldErrors.email && (
                            <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="admin-role" className="block text-xs font-semibold uppercase text-gray-600 mb-1">
                            Role
                        </label>
                        <select
                            id="admin-role"
                            className={inputClass(Boolean(fieldErrors.role_id))}
                            value={roleId}
                            onChange={(e) => setRoleId(e.target.value)}
                            disabled={creating}
                        >
                            {roles.map((r) => (
                                <option key={r.role_id} value={r.role_id}>
                                    {r.role_name}
                                </option>
                            ))}
                        </select>
                        {fieldErrors.role_id && (
                            <p className="mt-1 text-xs text-red-600">{fieldErrors.role_id}</p>
                        )}
                    </div>

                    <div className="pt-5">
                        <button
                            type="submit"
                            disabled={creating}
                            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {creating ? "Adding…" : "Add Admin"}
                        </button>
                    </div>
                </form>
            </section>

            {/* Existing admins table */}
            <section className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                    <h2 className="text-base font-semibold text-gray-900">Registered Administrators</h2>
                </div>
                {loading ? (
                    <p className="p-6 text-sm text-gray-500">Loading administrators…</p>
                ) : admins.length === 0 ? (
                    <p className="p-6 text-sm text-gray-500">No administrators found in database.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-700">
                            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase text-gray-600">
                                <tr>
                                    <th className="px-6 py-3">Name</th>
                                    <th className="px-6 py-3">Email</th>
                                    <th className="px-6 py-3">Assigned Role</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {admins.map((admin) => {
                                    const isSelf = currentAdminId === admin.admin_id;
                                    return (
                                        <tr key={admin.admin_id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-medium text-gray-900">
                                                {admin.admin_name}
                                                {isSelf && (
                                                    <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                                                        You
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{admin.email}</td>
                                            <td className="px-6 py-4">
                                                <select
                                                    aria-label={`Role for ${admin.admin_name}`}
                                                    value={admin.role_id}
                                                    disabled={isSelf || updatingId === admin.admin_id}
                                                    onChange={(e) => void handleRoleChange(admin, e.target.value)}
                                                    className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                                                >
                                                    {roles.map((r) => (
                                                        <option key={r.role_id} value={r.role_id}>
                                                            {r.role_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    disabled={isSelf}
                                                    onClick={() => setDeleteTarget(admin)}
                                                    className="rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    Remove
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Remove administrator?"
                message={deleteTarget ? `Remove ${deleteTarget.admin_name} (${deleteTarget.email}) from the Admins table? They will immediately lose admin access.` : ""}
                confirmLabel="Remove admin"
                busy={deleting}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </main>
    );
}
