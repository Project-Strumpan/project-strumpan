"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type VariantRow = { sku: string; color: string; size: string; quantity: string };
type Category = { category_id: number; category_name: string };
type FieldErrors = Record<string, string>;

const emptyVariant: VariantRow = { sku: "", color: "", size: "", quantity: "0" };

const baseInput =
  "w-full rounded-md border bg-white px-3 py-2 text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";
const inputClass = (invalid: boolean) =>
  `${baseInput} ${invalid ? "border-red-500" : "border-gray-500"}`;
const outlineBtn =
  "rounded border border-gray-500 px-3 py-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

const VARIANT_KEY = /^variants\.(\d+)\.(sku|color|size|quantity)$/;

function idFor(key: string): string {
  if (key === "productName") return "product-name";
  if (key === "categoryId") return "category-id";
  const match = VARIANT_KEY.exec(key);
  if (match) return `${match[2] === "quantity" ? "qty" : match[2]}-${match[1]}`;
  return "variants-error";
}

function toFieldKey(field: unknown): string | null {
  if (typeof field !== "string") return null;
  if (field === "productName" || field === "categoryId" || VARIANT_KEY.test(field)) return field;
  if (field === "sku" || field.startsWith("variants")) return "variants";
  return null;
}

function focusFirst(errors: FieldErrors) {
  const first = Object.keys(errors)[0];
  if (first) window.setTimeout(() => document.getElementById(idFor(first))?.focus(), 0);
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} tabIndex={-1} className="mt-1 text-sm text-red-700">
      {message}
    </p>
  );
}

export default function ProductForm() {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [variants, setVariants] = useState<VariantRow[]>([{ ...emptyVariant }]);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await fetch("/api/inventory/categories");
        if (!response.ok) throw new Error("Request failed");
        const data = (await response.json()) as Category[];
        if (!cancelled) setCategories(data);
      } catch {
        if (!cancelled) setCategoriesError("Could not load categories.");
      }
    }

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateVariant(index: number, field: keyof VariantRow, value: string) {
    setVariants((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!productName.trim()) errors.productName = "Product name is required.";
    if (!categoryId) errors.categoryId = "Choose a category.";
    variants.forEach((v, i) => {
      if (!v.sku.trim()) errors[`variants.${i}.sku`] = "SKU is required.";
      if (!v.size.trim()) errors[`variants.${i}.size`] = "Size is required.";
      const quantity = Number(v.quantity);
      if (v.quantity.trim() === "" || !Number.isInteger(quantity) || quantity < 0) {
        errors[`variants.${i}.quantity`] = "Quantity must be a whole number, 0 or higher.";
      }
    });
    return errors;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirst(errors);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/inventory/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          categoryId: Number(categoryId),
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
        const key = toFieldKey(data.field);
        if (key) {
          const serverErrors: FieldErrors = { [key]: data.error ?? "Invalid value." };
          setFieldErrors(serverErrors);
          focusFirst(serverErrors);
        } else {
          setFormError(data.error ?? "Could not create the product.");
        }
        return;
      }
      router.push("/admin/inventory");
    } catch {
      setFormError("Could not reach the server.");
    } finally {
      setSaving(false);
    }
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  return (
    <form onSubmit={submit} className="max-w-3xl space-y-6" noValidate>
      {(formError || hasFieldErrors) && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {formError ?? "Please fix the highlighted fields."}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="product-name" className="mb-2 block text-sm">Product name</label>
          <input
            id="product-name"
            className={inputClass(Boolean(fieldErrors.productName))}
            value={productName}
            aria-invalid={Boolean(fieldErrors.productName)}
            aria-describedby={fieldErrors.productName ? "product-name-error" : undefined}
            onChange={(e) => setProductName(e.target.value)}
          />
          <FieldError id="product-name-error" message={fieldErrors.productName} />
        </div>
        <div>
          <label htmlFor="category-id" className="mb-2 block text-sm">Category</label>
          <select
            id="category-id"
            className={inputClass(Boolean(fieldErrors.categoryId))}
            value={categoryId}
            disabled={categories === null && !categoriesError}
            aria-invalid={Boolean(fieldErrors.categoryId)}
            aria-describedby={
              fieldErrors.categoryId ? "category-id-error" : categoriesError ? "category-load-error" : undefined
            }
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">
              {categories === null && !categoriesError ? "Loading…" : "Select a category"}
            </option>
            {(categories ?? []).map((c) => (
              <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
            ))}
          </select>
          <FieldError id="category-id-error" message={fieldErrors.categoryId} />
          {categoriesError && (
            <p id="category-load-error" role="alert" className="mt-1 text-sm text-red-700">
              {categoriesError}
            </p>
          )}
        </div>
      </div>

      <fieldset className="space-y-4">
        <legend className="mb-2 text-lg font-semibold">Variants</legend>
        {variants.map((v, i) => {
          const skuErr = fieldErrors[`variants.${i}.sku`];
          const colorErr = fieldErrors[`variants.${i}.color`];
          const sizeErr = fieldErrors[`variants.${i}.size`];
          const qtyErr = fieldErrors[`variants.${i}.quantity`];
          return (
            <div key={i} className="grid gap-3 rounded-lg border border-gray-300 p-4 sm:grid-cols-4">
              <div>
                <label htmlFor={`sku-${i}`} className="mb-2 block text-sm">SKU</label>
                <input id={`sku-${i}`} className={inputClass(Boolean(skuErr))} value={v.sku}
                  aria-invalid={Boolean(skuErr)} aria-describedby={skuErr ? `sku-${i}-error` : undefined}
                  onChange={(e) => updateVariant(i, "sku", e.target.value)} />
                <FieldError id={`sku-${i}-error`} message={skuErr} />
              </div>
              <div>
                <label htmlFor={`color-${i}`} className="mb-2 block text-sm">Colour</label>
                <input id={`color-${i}`} className={inputClass(Boolean(colorErr))} value={v.color}
                  aria-invalid={Boolean(colorErr)} aria-describedby={colorErr ? `color-${i}-error` : undefined}
                  onChange={(e) => updateVariant(i, "color", e.target.value)} />
                <FieldError id={`color-${i}-error`} message={colorErr} />
              </div>
              <div>
                <label htmlFor={`size-${i}`} className="mb-2 block text-sm">Size</label>
                <input id={`size-${i}`} className={inputClass(Boolean(sizeErr))} value={v.size}
                  aria-invalid={Boolean(sizeErr)} aria-describedby={sizeErr ? `size-${i}-error` : undefined}
                  onChange={(e) => updateVariant(i, "size", e.target.value)} />
                <FieldError id={`size-${i}-error`} message={sizeErr} />
              </div>
              <div>
                <label htmlFor={`qty-${i}`} className="mb-2 block text-sm">Quantity</label>
                <input id={`qty-${i}`} type="number" min={0} step={1} className={inputClass(Boolean(qtyErr))}
                  value={v.quantity}
                  aria-invalid={Boolean(qtyErr)} aria-describedby={qtyErr ? `qty-${i}-error` : undefined}
                  onChange={(e) => updateVariant(i, "quantity", e.target.value)} />
                <FieldError id={`qty-${i}-error`} message={qtyErr} />
              </div>
              {variants.length > 1 && (
                <button type="button" className={`${outlineBtn} w-fit`}
                  onClick={() => setVariants((rows) => rows.filter((_, idx) => idx !== i))}>
                  Remove variant {i + 1}
                </button>
              )}
            </div>
          );
        })}
        <FieldError id="variants-error" message={fieldErrors.variants} />
        <button type="button" className={`${outlineBtn} py-2`}
          onClick={() => setVariants((rows) => [...rows, { ...emptyVariant }])}>
          Add variant
        </button>
      </fieldset>

      <p className="text-sm text-gray-600">
        The price is set later by the owner.
      </p>

      <button type="submit" disabled={saving}
        className="rounded bg-zinc-800 px-5 py-2 text-white hover:bg-zinc-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
        {saving ? "Saving…" : "Create product"}
      </button>
    </form>
  );
}
