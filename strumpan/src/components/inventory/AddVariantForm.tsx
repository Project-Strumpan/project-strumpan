"use client";

import { useState } from "react";

type FieldName = "sku" | "color" | "size" | "quantity";
type Errors = Partial<Record<FieldName, string>>;

const FIELDS: FieldName[] = ["sku", "color", "size", "quantity"];

const baseInput =
    "w-full rounded-md border bg-zinc-900 px-3 py-2 text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";
const inputClass = (invalid: boolean) =>
    `${baseInput} ${invalid ? "border-red-500" : "border-zinc-700"}`;

function isFieldName(value: unknown): value is FieldName {
    return typeof value === "string" && (FIELDS as string[]).includes(value);
}

export default function AddVariantForm({ productId, onAdded }: {
    productId: number;
    onAdded: () => void;
}) {
    const [sku, setSku] = useState("");
    const [color, setColor] = useState("");
    const [size, setSize] = useState("");
    const [quantity, setQuantity] = useState("0");
    const [errors, setErrors] = useState<Errors>({});
    const [message, setMessage] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    function focusField(name: FieldName) {
        window.setTimeout(() => document.getElementById(`new-variant-${name}`)?.focus(), 0);
    }

    function validate(): Errors {
        const next: Errors = {};
        if (!sku.trim()) next.sku = "SKU is required.";
        if (!size.trim()) next.size = "Size is required.";
        const qty = Number(quantity);
        if (quantity.trim() === "" || !Number.isInteger(qty) || qty < 0) {
            next.quantity = "Quantity must be a whole number, 0 or higher.";
        }
        return next;
    }

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        setMessage(null);

        const found = validate();
        setErrors(found);
        const first = FIELDS.find((name) => found[name]);
        if (first) {
            focusField(first);
            return;
        }

        setSaving(true);
        try {
            const response = await fetch(`/api/inventory/products/${productId}/variants`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sku: sku.trim(),
                    color: color.trim() === "" ? null : color.trim(),
                    size: size.trim(),
                    quantity: Number(quantity),
                }),
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const field: unknown = data.field;
                if (isFieldName(field)) {
                    const next: Errors = {};
                    next[field] = String(data.error ?? "Invalid value.");
                    setErrors(next);
                    focusField(field);
                } else {
                    setMessage(data.error ?? "Could not add the variant.");
                }
                return;
            }
            setSku("");
            setColor("");
            setSize("");
            setQuantity("0");
            setErrors({});
            setMessage("Variant added.");
            onAdded();
        } catch {
            setMessage("Could not reach the server.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={submit} noValidate className="space-y-3 rounded-lg border border-zinc-800 p-4">
            <h3 className="text-lg font-semibold">Add variant</h3>
            <div className="grid gap-3 sm:grid-cols-4">
                <div>
                    <label htmlFor="new-variant-sku" className="mb-2 block text-sm">SKU</label>
                    <input id="new-variant-sku" className={inputClass(Boolean(errors.sku))} value={sku}
                        aria-invalid={Boolean(errors.sku)}
                        aria-describedby={errors.sku ? "new-variant-sku-error" : undefined}
                        onChange={(e) => setSku(e.target.value)} />
                    {errors.sku && <p id="new-variant-sku-error" className="mt-1 text-sm text-red-300">{errors.sku}</p>}
                </div>
                <div>
                    <label htmlFor="new-variant-color" className="mb-2 block text-sm">Colour</label>
                    <input id="new-variant-color" className={inputClass(Boolean(errors.color))} value={color}
                        aria-invalid={Boolean(errors.color)}
                        aria-describedby={errors.color ? "new-variant-color-error" : undefined}
                        onChange={(e) => setColor(e.target.value)} />
                    {errors.color && <p id="new-variant-color-error" className="mt-1 text-sm text-red-300">{errors.color}</p>}
                </div>
                <div>
                    <label htmlFor="new-variant-size" className="mb-2 block text-sm">Size</label>
                    <input id="new-variant-size" className={inputClass(Boolean(errors.size))} value={size}
                        aria-invalid={Boolean(errors.size)}
                        aria-describedby={errors.size ? "new-variant-size-error" : undefined}
                        onChange={(e) => setSize(e.target.value)} />
                    {errors.size && <p id="new-variant-size-error" className="mt-1 text-sm text-red-300">{errors.size}</p>}
                </div>
                <div>
                    <label htmlFor="new-variant-quantity" className="mb-2 block text-sm">Quantity</label>
                    <input id="new-variant-quantity" type="number" min={0} step={1}
                        className={inputClass(Boolean(errors.quantity))} value={quantity}
                        aria-invalid={Boolean(errors.quantity)}
                        aria-describedby={errors.quantity ? "new-variant-quantity-error" : undefined}
                        onChange={(e) => setQuantity(e.target.value)} />
                    {errors.quantity && <p id="new-variant-quantity-error" className="mt-1 text-sm text-red-300">{errors.quantity}</p>}
                </div>
            </div>
            <button type="submit" disabled={saving}
                className="rounded border border-zinc-600 px-3 py-2 text-sm disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400">
                {saving ? "Adding…" : "Add variant"}
            </button>
            {message && <p role="status" className="text-sm text-zinc-300">{message}</p>}
        </form>
    );
}
