"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StockEditor from "@/components/inventory/StockEditor";
import ConfirmDialog from "@/components/inventory/ConfirmDialog";
import AddVariantForm from "@/components/inventory/AddVariantForm";

type Variant = {
  variant_id: number;
  sku: string;
  color: string | null;
  size: string;
  quantity: number;
};
type Product = { product_id: number; product_name: string; variants: Variant[] };
type VariantField = "sku" | "color" | "size";

const inputClass = (invalid: boolean) =>
  `w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${invalid ? "border-red-500" : "border-gray-500"
  }`;
const btn =
  "rounded border border-gray-500 px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

class ApiError extends Error {
  field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}

async function send(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error ?? "Request failed", data.field);
  return data;
}

function isVariantField(value: string | undefined): value is VariantField {
  return value === "sku" || value === "color" || value === "size";
}

function VariantEditor({ productName, variant, onChanged }: {
  productName: string;
  variant: Variant;
  onChanged: () => void;
}) {
  const [sku, setSku] = useState(variant.sku);
  const [color, setColor] = useState(variant.color ?? "");
  const [size, setSize] = useState(variant.size);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<VariantField, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function save() {
    setBusy(true);
    setMessage(null);
    setFieldErrors({});
    try {
      await send(`/api/inventory/variants/${variant.variant_id}`, "PATCH", {
        sku, color: color.trim() === "" ? null : color, size,
      });
      setMessage("Saved.");
      onChanged();
    } catch (e) {
      if (e instanceof ApiError && isVariantField(e.field)) {
        const next: Partial<Record<VariantField, string>> = {};
        next[e.field] = e.message;
        setFieldErrors(next);
      } else {
        setMessage(e instanceof Error ? e.message : "Could not save.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setMessage(null);
    try {
      await send(`/api/inventory/variants/${variant.variant_id}`, "DELETE");
      setConfirmOpen(false);
      onChanged();
    } catch (e) {
      setConfirmOpen(false);
      setMessage(e instanceof Error ? e.message : "Could not delete.");
      setBusy(false);
    }
  }

  const id = variant.variant_id;

  return (
    <li className="space-y-3 rounded-lg border border-gray-300 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`sku-${id}`} className="mb-2 block text-sm">SKU</label>
          <input id={`sku-${id}`} className={inputClass(Boolean(fieldErrors.sku))} value={sku}
            aria-invalid={Boolean(fieldErrors.sku)}
            aria-describedby={fieldErrors.sku ? `sku-${id}-error` : undefined}
            onChange={(e) => setSku(e.target.value)} />
          {fieldErrors.sku && <p id={`sku-${id}-error`} className="mt-1 text-sm text-red-700">{fieldErrors.sku}</p>}
        </div>
        <div>
          <label htmlFor={`color-${id}`} className="mb-2 block text-sm">Colour</label>
          <input id={`color-${id}`} className={inputClass(Boolean(fieldErrors.color))} value={color}
            aria-invalid={Boolean(fieldErrors.color)}
            aria-describedby={fieldErrors.color ? `color-${id}-error` : undefined}
            onChange={(e) => setColor(e.target.value)} />
          {fieldErrors.color && <p id={`color-${id}-error`} className="mt-1 text-sm text-red-700">{fieldErrors.color}</p>}
        </div>
        <div>
          <label htmlFor={`size-${id}`} className="mb-2 block text-sm">Size</label>
          <input id={`size-${id}`} className={inputClass(Boolean(fieldErrors.size))} value={size}
            aria-invalid={Boolean(fieldErrors.size)}
            aria-describedby={fieldErrors.size ? `size-${id}-error` : undefined}
            onChange={(e) => setSize(e.target.value)} />
          {fieldErrors.size && <p id={`size-${id}-error`} className="mt-1 text-sm text-red-700">{fieldErrors.size}</p>}
        </div>
      </div>
      <p className="text-sm text-gray-600">Current stock: {variant.quantity}</p>
      <div className="flex flex-wrap items-start gap-3">
        <button type="button" className={btn} onClick={save} disabled={busy}>Save variant</button>
        <StockEditor
          item={{
            productId: 0, variantId: variant.variant_id, productName,
            sku: variant.sku, size: variant.size, color: variant.color,
            quantity: variant.quantity, lastUpdated: null,
          }}
          onSaved={onChanged}
        />
        <button type="button" className={btn} onClick={() => setConfirmOpen(true)} disabled={busy}>
          Delete variant
        </button>
      </div>
      {message && <p role="status" className="text-sm text-gray-600">{message}</p>}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete variant?"
        message={`Delete variant ${variant.sku}? This cannot be undone. Variants with orders cannot be deleted.`}
        confirmLabel="Delete variant"
        busy={busy}
        onConfirm={remove}
        onCancel={() => setConfirmOpen(false)}
      />
    </li>
  );
}

export default function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function reload() {
    setReloadKey((value) => value + 1);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      try {
        const data = (await send(`/api/inventory/products/${productId}`, "GET")) as Product;
        if (!cancelled) {
          setProduct(data);
          setName(data.product_name);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Could not load product.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productId, reloadKey]);

  async function saveName() {
    setMessage(null);
    setNameError(null);
    try {
      await send(`/api/inventory/products/${productId}`, "PATCH", { productName: name });
      setMessage("Saved.");
      reload();
    } catch (e) {
      if (e instanceof ApiError && e.field === "productName") {
        setNameError(e.message);
      } else {
        setMessage(e instanceof Error ? e.message : "Could not save.");
      }
    }
  }

  async function removeProduct() {
    setDeleting(true);
    setMessage(null);
    try {
      await send(`/api/inventory/products/${productId}`, "DELETE");
      router.push("/admin/inventory");
    } catch (e) {
      setConfirmOpen(false);
      setMessage(e instanceof Error ? e.message : "Could not delete.");
      setDeleting(false);
    }
  }

  if (loading) return <p role="status" className="py-8 text-gray-600">Loading product…</p>;
  if (error || !product) return <p role="alert" className="py-8 text-red-700">{error ?? "Product not found."}</p>;

  return (
    <main className="max-w-3xl space-y-6">
      <Link href="/admin/inventory" className="text-sm underline underline-offset-4">
        ← Back to inventory
      </Link>
      <h1 className="text-3xl font-bold">Edit product</h1>

      <div>
        <label htmlFor="product-name" className="mb-2 block text-sm">Product name</label>
        <div className="flex flex-wrap gap-3">
          <input id="product-name" className={`${inputClass(Boolean(nameError))} max-w-md`} value={name}
            aria-invalid={Boolean(nameError)}
            aria-describedby={nameError ? "product-name-error" : undefined}
            onChange={(e) => setName(e.target.value)} />
          <button type="button" className={btn} onClick={saveName}>Save name</button>
        </div>
        {nameError && <p id="product-name-error" className="mt-1 text-sm text-red-700">{nameError}</p>}
      </div>

      <section aria-labelledby="variants-heading" className="space-y-4">
        <h2 id="variants-heading" className="text-xl font-semibold">Variants</h2>
        {product.variants.length === 0 ? (
          <p className="text-gray-600">This product has no variants.</p>
        ) : (
          <ul className="space-y-4">
            {product.variants.map((v) => (
              <VariantEditor key={v.variant_id} productName={product.product_name}
                variant={v} onChanged={reload} />
            ))}
          </ul>
        )}
        <AddVariantForm productId={product.product_id} onAdded={reload} />
      </section>

      <button type="button" className={`${btn} border-red-700 text-red-700`} onClick={() => setConfirmOpen(true)}>
        Delete product
      </button>

      {message && <p role="status" className="text-sm text-gray-600">{message}</p>}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete product?"
        message={`Delete ${product.product_name} and all its variants? This cannot be undone. Products with orders cannot be deleted.`}
        confirmLabel="Delete product"
        busy={deleting}
        onConfirm={removeProduct}
        onCancel={() => setConfirmOpen(false)}
      />
    </main>
  );
}
