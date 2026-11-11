"use client";

import { useState } from "react";
import {
  StockConflictError,
  updateInventoryQuantity,
} from "@/lib/inventory/client";
import type { InventoryItem } from "@/types/inventory";

type Props = { item: InventoryItem; onSaved: () => void };

export default function StockEditor({ item, onSaved }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.quantity));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const inputId = `stock-${item.variantId}`;

  async function save() {
    const next = Number(value);
    if (value.trim() === "" || !Number.isInteger(next) || next < 0) {
      setMessage("Enter a whole number, 0 or higher.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await updateInventoryQuantity(item.variantId, next, item.quantity);
      setEditing(false);
      onSaved();
    } catch (error) {
      setMessage(
        error instanceof StockConflictError
          ? `Stock changed to ${error.currentQuantity} in the meantime. Reload and try again.`
          : "Could not save. The quantity was not changed.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(item.quantity));
          setMessage(null);
          setEditing(true);
        }}
        className="rounded border border-zinc-600 px-3 py-1 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
      >
        Edit stock<span className="sr-only"> for {item.sku}</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-zinc-400">
        {item.productName} · {item.sku} · {item.color ?? "—"} · {item.size} ·
        current {item.quantity}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={inputId} className="sr-only">
          New quantity for {item.sku}
        </label>
        <input
          id={inputId}
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={saving}
          className="w-24 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded bg-emerald-600 px-3 py-1 text-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="rounded border border-zinc-600 px-3 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          Cancel
        </button>
      </div>
      {message && (
        <p role="alert" className="text-sm text-red-300">
          {message}
        </p>
      )}
    </div>
  );
}