"use client";

import Link from "next/link";
import { useEffect, useContext, useState, use } from "react";
import { getProduct } from "@/lib/api-client";
import type { ProductWithVariants } from "@/types/product";
import { CartContext } from "@/app/CartContext";
import AddToCart from "../AddToCart";

type ProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = use(params);
  const productId = Number(resolvedParams.id);

  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getProduct(productId)
      .then((data) => {
        setProduct(data);
        const firstInStock = data.variants?.find((v) => (v.available_quantity ?? 0) > 0);
        const initialVariant = firstInStock ?? data.variants?.[0];
        if (initialVariant) {
          setSelectedVariantId(initialVariant.variant_id);
        }
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productId]);

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
        Laddar produkt...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Produkten kunde inte hittas
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Produkten du söker existerar inte eller så uppstod ett fel.
        </p>
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 underline"
        >
          ← Tillbaka till produktlistan
        </Link>
      </div>
    );
  }

  // Beräkna totalt lager säkert
  const totalStock = product.variants?.reduce(
    (acc, v) => acc + (v.available_quantity ?? 0),
    0
  ) ?? 0;

  const selectedVariant =
    product.variants?.find((v) => v.variant_id === selectedVariantId) ??
    product.variants?.[0] ??
    null;
  const selectedStock = selectedVariant ? (selectedVariant.available_quantity ?? 0) : totalStock;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 mb-6 transition-colors"
      >
        ← Tillbaka till produktlistan
      </Link>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6">
          <div>
            <span className="inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-md mb-3">
              Produkt-ID: #{product.product_id}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {product.name}
            </h1>
            <p className="mt-3 text-base text-gray-600 dark:text-gray-300 leading-relaxed">
              {product.description || "Ingen beskrivning tillgänglig."}
            </p>
          </div>

          <div className="border-t border-b border-gray-100 dark:border-zinc-800 py-4 my-2 flex items-baseline justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Pris
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {product.price} kr
            </span>
          </div>

          {/* Varianter och lagerstatus */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Tillgängliga varianter (Storlek / Färg):
              </span>
              <div className="flex flex-wrap gap-2">
                {product.variants?.length ? (
                  product.variants.map((variant) => {
                    const isSelected = selectedVariant?.variant_id === variant.variant_id;
                    return (
                      <button
                        type="button"
                        key={variant.variant_id}
                        onClick={() => setSelectedVariantId(variant.variant_id)}
                        className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 font-semibold"
                            : "bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-zinc-700 hover:border-indigo-400"
                        }`}
                      >
                        {variant.size} {variant.color ? `(${variant.color})` : ""} ({variant.available_quantity} st)
                      </button>
                    );
                  })
                ) : (
                  <span className="text-gray-600 dark:text-gray-400">Inga storlekar tillgängliga</span>
                )}
              </div>
            </div>

            <div>
              <span className="block font-semibold text-gray-700 dark:text-gray-300">
                Lagerstatus:
              </span>
              <span
                className={`font-medium ${
                  totalStock > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {totalStock > 0 ? `${totalStock} st i lager totalt` : "Slut i lager"}
              </span>
            </div>
          </div>

          {/* Köpknapp */}
          <div className="mt-4">
            <AddToCart
              product={{
                id: String(selectedVariant?.variant_id ?? product.product_id),
                variantId: selectedVariant?.variant_id,
                title: product.name,
                description: product.description ?? "",
                price: product.price,
                size: selectedVariant?.size,
                color: selectedVariant?.color ?? undefined,
                picture_url: product.image_url,
                availableStock: selectedStock,
              }}
              available={selectedStock > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}