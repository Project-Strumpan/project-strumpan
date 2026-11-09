"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import StockEditor from "@/components/inventory/StockEditor";

type Variant = {
  variant_id: number;
  sku: string;
  color: string | null;
  size: string;
  quantity: number;
};
type Product = { product_id: number; product_name: string; variants: Variant[] };

const inputClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";
const btn =
  "rounded border border-zinc-600 px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

async function send(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

function VariantEditor({ productName, variant, onChanged }: {
  productName: string;
  variant: Variant;
  onChanged: () => void;
}) {
  const [sku, setSku] = useState(variant.sku);
  const [color, setColor] = useState(variant.color ?? "");
  const [size, setSize] = useState(variant.size);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      await send(`/api/inventory/variants/${variant.variant_id}`, "PATCH", {
        sku, color: color.trim() === "" ? null : color, size,
      });
      setMessage("Saved.");
      onChanged();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete variant ${variant.sku}? This cannot be undone.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      await send(`/api/inventory/variants/${variant.variant_id}`, "DELETE");
      onChanged();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not delete.");
      setBusy(false);
    }
  }

  const id = variant.variant_id;

  return (
    <li className="space-y-3 rounded-lg border border-zinc-800 p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`sku-${id}`} className="mb-2 block text-sm">SKU</label>
          <input id={`sku-${id}`} className={inputClass} value={sku} onChange={(e) => setSku(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`color-${id}`} className="mb-2 block text-sm">Colour</label>
          <input id={`color-${id}`} className={inputClass} value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`size-${id}`} className="mb-2 block text-sm">Size</label>
          <input id={`size-${id}`} className={inputClass} value={size} onChange={(e) => setSize(e.target.value)} />
        </div>
      </div>
      <p className="text-sm text-zinc-400">Current stock: {variant.quantity}</p>
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
        <button type="button" className={btn} onClick={remove} disabled={busy}>Delete variant</button>
      </div>
      {message && <p role="status" className="text-sm text-zinc-300">{message}</p>}
    </li>
  );
}

export default function EditProductPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
    try {
      await send(`/api/inventory/products/${productId}`, "PATCH", { productName: name });
      setMessage("Saved.");
      reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save.");
    }
  }

  async function removeProduct() {
    if (!window.confirm("Delete this product and all its variants? This cannot be undone.")) return;
    setMessage(null);
    try {
      await send(`/api/inventory/products/${productId}`, "DELETE");
      router.push("/admin/inventory");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not delete.");
    }
  }

  if (loading) return <p role="status" className="py-8 text-zinc-300">Loading product…</p>;
  if (error || !product) return <p role="alert" className="py-8 text-red-300">{error ?? "Product not found."}</p>;

  return (
    <main className="max-w-3xl space-y-6">
      <Link href="/admin/inventory" className="text-sm underline underline-offset-4">
        ← Back to inventory
      </Link>
      <h1 className="text-3xl font-bold">Edit product</h1>

      <div>
        <label htmlFor="product-name" className="mb-2 block text-sm">Product name</label>
        <div className="flex flex-wrap gap-3">
          <input id="product-name" className={`${inputClass} max-w-md`} value={name}
            onChange={(e) => setName(e.target.value)} />
          <button type="button" className={btn} onClick={saveName}>Save name</button>
        </div>
      </div>

      <section aria-labelledby="variants-heading" className="space-y-4">
        <h2 id="variants-heading" className="text-xl font-semibold">Variants</h2>
        {product.variants.length === 0 ? (
          <p className="text-zinc-400">This product has no variants.</p>
        ) : (
          <ul className="space-y-4">
            {product.variants.map((v) => (
              <VariantEditor key={v.variant_id} productName={product.product_name}
                variant={v} onChanged={reload} />
            ))}
          </ul>
        )}
      </section>

      <button type="button" className={`${btn} border-red-700 text-red-300`} onClick={removeProduct}>
        Delete product
      </button>

      {message && <p role="status" className="text-sm text-zinc-300">{message}</p>}
    </main>
  );
}