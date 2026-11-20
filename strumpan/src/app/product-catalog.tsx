"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogueProduct, ProductVariant, ProductWithVariants } from "@/types/product";

type CatalogProductItem = CatalogueProduct & {
  variants?: ProductVariant[];
};

function resolveImageSrc(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;

  const trimmed = imageUrl.trim();
  if (!trimmed) return null;

  const fullPath =
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
      ? trimmed
      : `/media/images/socks/${trimmed}`;

  return encodeURI(fullPath);
}

export default function ProductCatalog() {
  const [products, setProducts] = useState<CatalogProductItem[]>([]);
  const [selectedSize, setSelectedSize] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Håll koll på vilka produkt-ID:n vars bilder misslyckats med att ladda
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function loadCatalogData() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Could not fetch products");
        const baseProducts: CatalogueProduct[] = await res.json();

        const validProducts = baseProducts.filter((e: CatalogueProduct) => e.price > 0);

        const productsWithVariants = await Promise.all(
          validProducts.map(async (product: CatalogueProduct) => {
            try {
              const detailRes = await fetch(`/api/products/${product.product_id}`);
              if (detailRes.ok) {
                const detail: ProductWithVariants = await detailRes.json();
                return { ...product, variants: detail.variants };
              }
            } catch {
              // Ignorera om detaljhämtning misslyckas
            }
            return { ...product, variants: [] };
          })
        );

        setProducts(productsWithVariants);
      } catch {
        setError("Något gick fel när produkterna skulle hämtas.");
      } finally {
        setLoading(false);
      }
    }

    loadCatalogData();
  }, []);

  const availableSizes = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach((p) => {
      p.variants?.forEach((v) => {
        if (v.size) sizes.add(v.size);
      });
    });
    return Array.from(sizes).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((product: CatalogProductItem) => {
      const matchesSize =
        selectedSize === "" ||
        (product.variants &&
          product.variants.some((v: ProductVariant) => v.size === selectedSize));

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-800">
          Strumpor & Sortiment
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Utforska vårt utbud av bekväma strumpor för alla tillfällen.
        </p>
      </div>

      {/* Filter-sektion */}
      <div className="bg-foreground p-4 rounded-xl shadow-sm mb-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label htmlFor="size-filter" className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">
            Storlek
          </label>
          <select
            id="size-filter"
            value={selectedSize}
            onChange={(event) => setSelectedSize(event.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="">Alla storlekar</option>
            {availableSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
          <label htmlFor="price-filter" className="text-xs font-semibold text-zinc-800 uppercase tracking-wider">
            Maxpris (kr)
          </label>
          <input
            id="price-filter"
            type="number"
            min="0"
            placeholder="Exempel: 150"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            className="w-full rounded-lg border border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedSize("");
            setMaxPrice("");
          }}
          className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-white hover:bg-foreground hover:text-zinc-800 transition-colors"
        >
          Rensa filter
        </button>
      </div>

      <p className="text-sm text-zinc-800 mb-6">
        Visar <span className="font-semibold text-white">{filteredProducts.length}</span> av {products.length} produkter
      </p>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-foreground rounded-2xl border border-dashed border-zinc-800">
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Inga produkter matchar dina filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product: CatalogProductItem) => {
            const totalStock = product.variants?.reduce(
              (acc: number, v: ProductVariant) => acc + (v.available_quantity ?? 0),
              0
            ) ?? 0;

            const uniqueSizes = Array.from(
              new Set(product.variants?.map((v: ProductVariant) => v.size) || [])
            );

            const resolvedSrc = resolveImageSrc(product.image_url);
            const hasImageError = imageErrors[product.product_id];

            return (
              <Link
                key={product.product_id}
                href={`/products/${product.product_id}`}
                className="group flex flex-col justify-between rounded-xl bg-foreground p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-indigo-500 dark:hover:border-indigo-500"
              >
                <div>
                  {/* Bildruta som visar bild om den finns och fungerar, annars "Bild saknas" */}
                  <div className="relative w-full h-48 mb-4 overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
                    {resolvedSrc && !hasImageError ? (
                      <img
                        src={resolvedSrc}
                        alt={product.name}
                        onError={() => {
                          setImageErrors((prev) => ({
                            ...prev,
                            [product.product_id]: true,
                          }));
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                        Bild saknas
                      </span>
                    )}
                  </div>

                  <h2 className="text-lg font-semibold text-zinc-800 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {product.name}
                  </h2>

                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {product.description || "Ingen beskrivning tillgänglig."}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">
                      Storlekar
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        totalStock > 0
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                      }`}
                    >
                      {totalStock > 0 ? "I lager" : "Slut"}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {uniqueSizes.length > 0
                        ? uniqueSizes.join(", ")
                        : "Inga storlekar"}
                    </span>
                    <p className="text-lg font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {product.price} kr
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}