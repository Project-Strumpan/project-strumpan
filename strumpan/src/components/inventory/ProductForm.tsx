"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VariantRow = { sku: string; color: string; size: string; quantity: string };

const emptyVariant: VariantRow = { sku: "", color: "", size: "", quantity: "0" };

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

export default function ProductForm() {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [variants, setVariants] = useState<VariantRow[]>([{ ...emptyVariant }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateVariant(index: number, field: keyof VariantRow, value: string) {
    setVariants((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!productName.trim()) return setError("Product name is required.");
    if (!Number.isInteger(Number(categoryId)) || Number(categoryId) < 1) {
      return setError("Category ID must be a whole number, 1 or higher.");
    }
    if (price.trim() === "" || Number(price) < 0) {
      return setError("Price must be 0 or higher.");
    }
    for (const v of variants) {
      if (!v.sku.trim() || !v.size.trim()) {
        return setError("Every variant needs a SKU and a size.");
      }
      if (!Number.isInteger(Number(v.quantity)) || Number(v.quantity) < 0) {
        return setError("Quantity must be a whole number, 0 or higher.");
      }
    }

    setSaving(true);
    try {
      const response = await fetch("/api/inventory/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          categoryId: Number(categoryId),
          price: Number(price),
          variants: variants.map((v) => ({
            sku: v.sku.trim(),
            size: v.size.trim(),
            color: v.color.trim() === "" ? null : v.color.trim(),
            quantity: Number(v.quantity),
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not create the product.");
        return;
      }
      router.push("/admin/inventory");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-3">
          <label htmlFor="product-name" className="mb-2 block text-sm">Product name</label>
          <input id="product-name" className={inputClass} value={productName}
            onChange={(e) => setProductName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="category-id" className="mb-2 block text-sm">Category ID</label>
          <input id="category-id" type="number" min={1} step={1} className={inputClass}
            value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
        </div>
        <div>
          <label htmlFor="price" className="mb-2 block text-sm">Price</label>
          <input id="price" type="number" min={0} step="0.01" className={inputClass}
            value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">Variants</legend>
        {variants.map((v, i) => (
          <div key={i} className="grid gap-3 rounded-lg border border-zinc-800 p-4 sm:grid-cols-4">
            <div>
              <label htmlFor={`sku-${i}`} className="mb-2 block text-sm">SKU</label>
              <input id={`sku-${i}`} className={inputClass} value={v.sku}
                onChange={(e) => updateVariant(i, "sku", e.target.value)} />
            </div>
            <div>
              <label htmlFor={`color-${i}`} className="mb-2 block text-sm">Colour</label>
              <input id={`color-${i}`} className={inputClass} value={v.color}
                onChange={(e) => updateVariant(i, "color", e.target.value)} />
            </div>
            <div>
              <label htmlFor={`size-${i}`} className="mb-2 block text-sm">Size</label>
              <input id={`size-${i}`} className={inputClass} value={v.size}
                onChange={(e) => updateVariant(i, "size", e.target.value)} />
            </div>
            <div>
              <label htmlFor={`qty-${i}`} className="mb-2 block text-sm">Quantity</label>
              <input id={`qty-${i}`} type="number" min={0} step={1} className={inputClass}
                value={v.quantity} onChange={(e) => updateVariant(i, "quantity", e.target.value)} />
            </div>
            {variants.length > 1 && (
              <button type="button"
                onClick={() => setVariants((rows) => rows.filter((_, idx) => idx !== i))}
                className="w-fit rounded border border-zinc-600 px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400">
                Remove variant {i + 1}
              </button>
            )}
          </div>
        ))}
        <button type="button"
          onClick={() => setVariants((rows) => [...rows, { ...emptyVariant }])}
          className="rounded border border-zinc-600 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400">
          Add variant
        </button>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg border border-red-700 p-3 text-red-300">{error}</p>
      )}

      <button type="submit" disabled={saving}
        className="rounded bg-emerald-600 px-5 py-2 text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">
        {saving ? "Saving…" : "Create product"}
      </button>
    </form>
  );
}