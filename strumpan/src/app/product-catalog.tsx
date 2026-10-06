"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Product } from "./types/product";

export default function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSize, setSelectedSize] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await fetch("/api/products");

        if (!response.ok) {
          throw new Error("Kunde inte hämta produkter");
        }

        const data: Product[] = await response.json();
        setProducts(data);
      } catch {
        setError("Något gick fel när produkterna skulle hämtas.");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  // Filtrering baserad på storlek och pris
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSize =
        selectedSize === "" ||
        (product.sizes && product.sizes.includes(selectedSize));

      const matchesPrice =
        maxPrice === "" || product.price <= Number(maxPrice);

      return matchesSize && matchesPrice;
    });
  }, [products, selectedSize, maxPrice]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 text-gray-500">
        <p className="animate-pulse text-lg font-medium">Laddar produkter...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg" role="alert">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Rubrik */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
          Strumpor & Sortiment
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Utforska vårt utbud av bekväma strumpor för alla tillfällen.
        </p>
      </div>

      {/* Filter-sektion */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm mb-6 flex flex-wrap items-end gap-4">
        {/* Storlek-filter */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label htmlFor="size-filter" className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Storlek
          </label>
          <select
            id="size-filter"
            value={selectedSize}
            onChange={(event) => setSelectedSize(event.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Alla storlekar</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
          </select>
        </div>

        {/* Maxpris-filter */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label htmlFor="price-filter" className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Maxpris (kr)
          </label>
          <input
            id="price-filter"
            type="number"
            min="0"
            placeholder="Exempel: 150"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* Rensa filter-knapp */}
        <button
          type="button"
          onClick={() => {
            setSelectedSize("");
            setMaxPrice("");
          }}
          className="rounded-lg border border-gray-300 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        >
          Rensa filter
        </button>
      </div>

      {/* Produktantal */}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Visar <span className="font-semibold text-gray-900 dark:text-white">{filteredProducts.length}</span> av {products.length} produkter
      </p>

      {/* Produktnätverk */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-gray-300 dark:border-zinc-800">
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Inga produkter matchar dina filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Link
              key={product.product_id}
              href={`/products/${product.product_id}`}
              className="group flex flex-col justify-between rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-indigo-500 dark:hover:border-indigo-500"
            >
              <div>
                {/* Bildomfång (om picture_url finns i DB) */}
                {product.picture_url && (
                  <div className="relative w-full h-48 mb-4 overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-800">
                    <Image
                      src={product.picture_url}
                      alt={product.product_name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                )}

                <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {product.product_name}
                </h2>

                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {product.product_description || "Ingen beskrivning tillgänglig."}
                </p>
              </div>

              {/* Nedre sektion: Storlekar, Lager & Pris */}
              <div className="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                    Storlekar
                  </span>
                  {/* Lagerindikator utifrån total_stock / stock */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      product.stock > 0
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                    }`}
                  >
                    {product.stock > 0 ? "I lager" : "Slut"}
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {product.sizes && product.sizes.length > 0
                      ? product.sizes.join(", ")
                      : "Slut"}
                  </span>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {product.price} kr
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}