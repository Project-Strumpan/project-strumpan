"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmDialog from "@/components/inventory/ConfirmDialog";

type CategoryItem = {
    category_id: number;
    parent_id: number;
    category_name: string;
    category_description: string | null;
    display_name?: string;
    product_count: number;
    subcategory_count: number;
};

const inputClass = (invalid: boolean) =>
    `w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${
        invalid ? "border-red-500" : "border-gray-300"
    }`;

const btn =
    "rounded border border-gray-400 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50";

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<CategoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // New Category Form State
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [parentId, setParentId] = useState<string>("");
    const [fieldErrors, setFieldErrors] = useState<{ name?: string; parentId?: string }>({});
    const [creating, setCreating] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [editError, setEditError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    // Delete State
    const [deleteTarget, setDeleteTarget] = useState<CategoryItem | null>(null);
    const [deleting, setDeleting] = useState(false);

    async function loadCategories() {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/categories");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load categories");
            setCategories(data);
            setError(null);
        } catch (e: any) {
            setError(e.message || "Could not load categories");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadCategories();
    }, []);

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setFieldErrors({});
        setMessage(null);

        if (!name.trim()) {
            setFieldErrors({ name: "Category name is required" });
            return;
        }

        setCreating(true);
        try {
            const res = await fetch("/api/admin/categories", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || null,
                    parentId: parentId ? Number(parentId) : null,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                if (data.field) {
                    setFieldErrors({ [data.field]: data.error });
                } else {
                    throw new Error(data.error || "Failed to create category");
                }
                return;
            }

            setName("");
            setDescription("");
            setParentId("");
            setMessage(`Category "${data.category_name}" created successfully.`);
            await loadCategories();
        } catch (e: any) {
            setMessage(e.message || "Failed to create category");
        } finally {
            setCreating(false);
        }
    }

    function startEdit(cat: CategoryItem) {
        setEditingId(cat.category_id);
        setEditName(cat.category_name);
        setEditDesc(cat.category_description || "");
        setEditError(null);
    }

    async function handleSaveEdit(catId: number) {
        setEditError(null);
        if (!editName.trim()) {
            setEditError("Name is required");
            return;
        }

        setUpdating(true);
        try {
            const res = await fetch(`/api/admin/categories/${catId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: editName.trim(),
                    description: editDesc.trim() || null,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to update category");

            setEditingId(null);
            setMessage("Category updated.");
            await loadCategories();
        } catch (e: any) {
            setEditError(e.message || "Failed to update");
        } finally {
            setUpdating(false);
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;
        setDeleting(true);
        setMessage(null);
        try {
            const res = await fetch(`/api/admin/categories/${deleteTarget.category_id}`, {
                method: "DELETE",
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to delete category");
            }
            setMessage(`Category "${deleteTarget.category_name}" deleted.`);
            setDeleteTarget(null);
            await loadCategories();
        } catch (e: any) {
            setMessage(e.message || "Could not delete category");
        } finally {
            setDeleting(false);
        }
    }

    return (
        <main className="space-y-8">
            <div>
                <Link href="/admin/inventory" className="text-sm text-indigo-600 hover:underline">
                    ← Back to inventory
                </Link>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                    Category Management
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                    Create, edit and organize product categories. Deletion is blocked for categories that have products or subcategories.
                </p>
            </div>

            {message && (
                <div role="status" className="rounded-md bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200">
                    {message}
                </div>
            )}

            {error && (
                <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-800 border border-red-200">
                    {error}
                </div>
            )}

            {/* Create Category Form */}
            <section aria-labelledby="create-heading" className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h2 id="create-heading" className="text-lg font-semibold text-gray-900">
                    Add New Category
                </h2>
                <form onSubmit={handleCreate} className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                        <label htmlFor="cat-name" className="block text-sm font-medium text-gray-700">
                            Category Name *
                        </label>
                        <input
                            id="cat-name"
                            type="text"
                            className={inputClass(Boolean(fieldErrors.name))}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            aria-invalid={Boolean(fieldErrors.name)}
                            aria-describedby={fieldErrors.name ? "cat-name-err" : undefined}
                            placeholder="e.g. Socks, Underwear"
                        />
                        {fieldErrors.name && (
                            <p id="cat-name-err" className="mt-1 text-xs text-red-600">
                                {fieldErrors.name}
                            </p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="cat-parent" className="block text-sm font-medium text-gray-700">
                            Parent Category (Optional)
                        </label>
                        <select
                            id="cat-parent"
                            className={inputClass(false)}
                            value={parentId}
                            onChange={(e) => setParentId(e.target.value)}
                        >
                            <option value="">None (Top Level)</option>
                            {categories.map((c) => (
                                <option key={c.category_id} value={c.category_id}>
                                    {c.display_name ?? c.category_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="cat-desc" className="block text-sm font-medium text-gray-700">
                            Description (Optional)
                        </label>
                        <input
                            id="cat-desc"
                            type="text"
                            className={inputClass(false)}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description"
                        />
                    </div>

                    <div className="sm:col-span-3 flex justify-end">
                        <button type="submit" className={`${btn} bg-indigo-600 text-white hover:bg-indigo-700 border-transparent`} disabled={creating}>
                            {creating ? "Creating…" : "Create Category"}
                        </button>
                    </div>
                </form>
            </section>

            {/* Category List Table */}
            <section aria-labelledby="list-heading" className="space-y-4">
                <h2 id="list-heading" className="text-xl font-semibold text-gray-900">
                    Existing Categories ({categories.length})
                </h2>

                {loading ? (
                    <p className="py-6 text-sm text-gray-500">Loading categories…</p>
                ) : categories.length === 0 ? (
                    <p className="py-6 text-sm text-gray-500">No categories found in the database.</p>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                            <thead className="bg-gray-50 font-medium text-gray-700">
                                <tr>
                                    <th className="px-4 py-3">Hierarchy / Name</th>
                                    <th className="px-4 py-3">Description</th>
                                    <th className="px-4 py-3">Products</th>
                                    <th className="px-4 py-3">Subcategories</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {categories.map((cat) => {
                                    const isEditing = editingId === cat.category_id;
                                    const hasProducts = Number(cat.product_count) > 0;
                                    const hasSub = Number(cat.subcategory_count) > 0;
                                    const canDelete = !hasProducts && !hasSub;

                                    return (
                                        <tr key={cat.category_id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {isEditing ? (
                                                    <div>
                                                        <input
                                                            type="text"
                                                            className={inputClass(Boolean(editError))}
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                        />
                                                        {editError && <p className="mt-1 text-xs text-red-600">{editError}</p>}
                                                    </div>
                                                ) : (
                                                    <span>{cat.display_name ?? cat.category_name}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {isEditing ? (
                                                    <input
                                                        type="text"
                                                        className={inputClass(false)}
                                                        value={editDesc}
                                                        onChange={(e) => setEditDesc(e.target.value)}
                                                        placeholder="Description"
                                                    />
                                                ) : (
                                                    <span>{cat.category_description || "—"}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    hasProducts ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                                                }`}>
                                                    {cat.product_count} products
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-700">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                                    hasSub ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-600"
                                                }`}>
                                                    {cat.subcategory_count} subcategories
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {isEditing ? (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
                                                            onClick={() => handleSaveEdit(cat.category_id)}
                                                            disabled={updating}
                                                        >
                                                            {updating ? "Saving…" : "Save"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={btn}
                                                            onClick={() => setEditingId(null)}
                                                            disabled={updating}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            className={btn}
                                                            onClick={() => startEdit(cat)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`${btn} text-red-600 hover:bg-red-50 ${!canDelete ? "opacity-40 cursor-not-allowed" : ""}`}
                                                            onClick={() => setDeleteTarget(cat)}
                                                            disabled={!canDelete}
                                                            title={!canDelete ? "Cannot delete category that has products or subcategories (PRO-81 safeguard)" : "Delete category"}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Confirm Delete Dialog */}
            {deleteTarget && (
                <ConfirmDialog
                    open={Boolean(deleteTarget)}
                    title={`Delete category "${deleteTarget.category_name}"?`}
                    message={`Are you sure you want to delete this category? This action cannot be undone.`}
                    confirmLabel="Delete Category"
                    busy={deleting}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
        </main>
    );
}
