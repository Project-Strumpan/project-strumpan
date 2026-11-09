// En variant visas bara om den matchar samtliga valda villkor. Ett tomt filter betyder ”visa alla”.


"use client";


import { useEffect, useState } from "react";
import Link from "next/link";
import { getInventory } from "@/lib/inventory/client";
import type { InventoryItem } from "@/types/inventory";
import StockEditor from "./StockEditor";


const controlClass =
  "w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";


export default function InventoryOverview() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);


  const [search, setSearch] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [stock, setStock] = useState("");


  useEffect(() => {
    let cancelled = false;


    async function loadInventory() {
      setLoading(true);
      setError(null);


      try {
        const response = await getInventory();


        if (!cancelled) {
          setItems(response.items);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load inventory. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }


    void loadInventory();


    return () => {
      cancelled = true;
    };
  }, [reloadKey]);


  const colors = Array.from(
    new Set(
      items
        .map((item) => item.color)
        .filter((value): value is string => value !== null),
    ),
  ).sort();


  const sizes = Array.from(
    new Set(items.map((item) => item.size)),
  ).sort();


  const query = search.trim().toLowerCase();


  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query);


    const matchesColor = color === "" || item.color === color;
    const matchesSize = size === "" || item.size === size;


    const matchesStock =
      stock === "" ||
      (stock === "in-stock" && item.quantity > 0) ||
      (stock === "out-of-stock" && item.quantity === 0);


    return matchesSearch && matchesColor && matchesSize && matchesStock;
  });


  function resetFilters() {
    setSearch("");
    setColor("");
    setSize("");
    setStock("");
  }


  return (
    <main>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Inventory</h1>
          <p className="mt-2 text-zinc-400">
            View and manage stock levels by product variant, colour and size.
          </p>
        </div>


        <Link
          href="/admin/inventory/products/new"
          className="rounded bg-emerald-600 px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
        >
          Add product
        </Link>
      </div>


      {loading ? (
        <p role="status" className="py-8 text-zinc-300">
          Loading inventory…
        </p>
      ) : error ? (
        <div role="alert" className="rounded-lg border border-red-700 p-4">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className="mt-3 rounded border border-zinc-600 px-4 py-2 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <p role="status" className="py-8 text-zinc-300">
          No inventory items are available.
        </p>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="inventory-search" className="mb-2 block text-sm">
                Search product or SKU
              </label>
              <input
                id="inventory-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="e.g. Cotton or CCS-BLK"
                className={controlClass}
              />
            </div>


            <div>
              <label htmlFor="inventory-color" className="mb-2 block text-sm">
                Colour
              </label>
              <select
                id="inventory-color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className={controlClass}
              >
                <option value="">All colours</option>
                {colors.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>


            <div>
              <label htmlFor="inventory-size" className="mb-2 block text-sm">
                Size
              </label>
              <select
                id="inventory-size"
                value={size}
                onChange={(event) => setSize(event.target.value)}
                className={controlClass}
              >
                <option value="">All sizes</option>
                {sizes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>


            <div>
              <label htmlFor="inventory-stock" className="mb-2 block text-sm">
                Stock availability
              </label>
              <select
                id="inventory-stock"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
                className={controlClass}
              >
                <option value="">All stock levels</option>
                <option value="in-stock">In stock</option>
                <option value="out-of-stock">Out of stock</option>
              </select>
            </div>
          </div>


          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-sm text-zinc-400">
              Showing {filteredItems.length} of {items.length} variants
            </p>


            <button
              type="button"
              onClick={resetFilters}
              className="rounded px-2 py-1 text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
            >
              Reset filters
            </button>
          </div>


          {filteredItems.length === 0 ? (
            <p className="rounded-lg border border-zinc-800 p-6 text-zinc-300">
              No variants match your filters.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-zinc-800">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Inventory quantities for each product variant
                </caption>


                <thead className="bg-zinc-900 text-zinc-300">
                  <tr>
                    <th scope="col" className="px-4 py-3">Product</th>
                    <th scope="col" className="px-4 py-3">SKU</th>
                    <th scope="col" className="px-4 py-3">Colour</th>
                    <th scope="col" className="px-4 py-3">Size</th>
                    <th scope="col" className="px-4 py-3 text-right">Quantity</th>
                    <th scope="col" className="px-4 py-3">Actions</th>
                  </tr>
                </thead>


                <tbody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.variantId}
                      className="border-t border-zinc-800"
                    >
                      <th scope="row" className="px-4 py-3 font-medium">
                        {item.productName}
                      </th>
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-300">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3">{item.color ?? "—"}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {item.size}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {item.quantity}
                        {item.quantity === 0 && (
                          <span className="ml-2 text-red-300">
                            Out of stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-start gap-2">
                          <StockEditor
                            item={item}
                            onSaved={() => setReloadKey((value) => value + 1)}
                          />
                          <Link
                            href={`/admin/inventory/products/${item.productId}`}
                            className="rounded border border-zinc-600 px-3 py-1 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                          >
                            Edit product
                            <span className="sr-only"> {item.productName}</span>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}