"use client";

import Link from "next/link";
import { useEffect, useState, use } from "react";
import { getProduct } from "@/lib/api-client";
import type { ProductVariant, ProductWithVariants } from "@/types/product";
import AddToCart from "../AddToCart";

type ProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type VariantWithOptionalImage = ProductVariant & {
  image_url?: string | null;
  picture_url?: string | null;
};

function resolveMediaSrc(rawPath?: string | null): string | null {
  if (!rawPath) return null;

  const trimmed = rawPath.trim();
  if (!trimmed) return null;

  const fullPath =
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
      ? trimmed
      : `/media/images/socks/${trimmed}`;

  return encodeURI(fullPath);
}

function getVariantRawImage(variant?: ProductVariant | null): string | null {
  if (!variant) return null;
  const v = variant as VariantWithOptionalImage;
  return v.image_url || v.picture_url || null;
}

export default function ProductPage({ params }: ProductPageProps) {
  const resolvedParams = use(params);
  const productId = Number(resolvedParams.id);

  const [product, setProduct] = useState<ProductWithVariants | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Håll koll på bildfel för huvudbild och enskilda varianter
  const [mainImageError, setMainImageError] = useState(false);
  const [variantImageErrors, setVariantImageErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setMainImageError(false);
    setVariantImageErrors({});

    getProduct(productId)
      .then((data) => {
        setProduct(data);
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

  const totalStock =
    product.variants?.reduce(
      (acc, v) => acc + (v.available_quantity ?? 0),
      0
    ) ?? 0;

  const selectedVariant =
    product.variants?.find((v) => v.variant_id === selectedVariantId) ?? null;

  const isSelectionValid =
    selectedVariant !== null && (selectedVariant.available_quantity ?? 0) > 0;

  // Visa vald variants bild om den har en egen, annars huvudproduktens bild
  const activeRawImage =
    (selectedVariant && getVariantRawImage(selectedVariant)) || product.image_url;
  const activeImageSrc = resolveMediaSrc(activeRawImage);

  const isActiveImageBroken =
    selectedVariant && getVariantRawImage(selectedVariant)
      ? Boolean(variantImageErrors[selectedVariant.variant_id])
      : mainImageError;

  const activePictureUrl = activeImageSrc ?? product.image_url;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 mb-6 transition-colors"
      >
        ← Tillbaka till produktlistan
      </Link>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Vänster kolumn: Huvudbild + mini-bilder för varianter */}
          <div className="space-y-4">
            <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center">
              {activeImageSrc && !isActiveImageBroken ? (
                <img
                  src={activeImageSrc}
                  alt={
                    selectedVariant
                      ? `${product.name} - ${selectedVariant.size}${
                          selectedVariant.color ? ` (${selectedVariant.color})` : ""
                        }`
                      : product.name
                  }
                  onError={() => {
                    if (selectedVariant && getVariantRawImage(selectedVariant)) {
                      setVariantImageErrors((prev) => ({
                        ...prev,
                        [selectedVariant.variant_id]: true,
                      }));
                    } else {
                      setMainImageError(true);
                    }
                  }}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                  Bild saknas
                </span>
              )}
            </div>

            {/* Galleri med varianter som har egen bild */}
            {product.variants &&
              product.variants.some((v) => Boolean(getVariantRawImage(v))) && (
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    Variantbilder
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => {
                      const variantSrc = resolveMediaSrc(getVariantRawImage(variant));
                      if (!variantSrc) return null;

                      const hasErr = Boolean(variantImageErrors[variant.variant_id]);
                      const isSelected = selectedVariantId === variant.variant_id;
                      const isOutOfStock = (variant.available_quantity ?? 0) <= 0;

                      return (
                        <button
                          key={`thumb-${variant.variant_id}`}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() =>
                            setSelectedVariantId(isSelected ? null : variant.variant_id)
                          }
                          title={`${variant.size}${variant.color ? ` (${variant.color})` : ""}`}
                          className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 transition ${
                            isSelected
                              ? "border-indigo-600 ring-2 ring-indigo-500/40"
                              : "border-gray-200 dark:border-zinc-700 hover:border-indigo-400"
                          } ${isOutOfStock ? "opacity-40 cursor-not-allowed" : ""}`}
                        >
                          {!hasErr ? (
                            <img
                              src={variantSrc}
                              alt={`${product.name} ${variant.size}`}
                              onError={() =>
                                setVariantImageErrors((prev) => ({
                                  ...prev,
                                  [variant.variant_id]: true,
                                }))
                              }
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] text-gray-400 text-center px-1">
                              Bild saknas
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>

          {/* Höger kolumn: Produktinfo, varianter och köpknapp */}
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

            {/* Varianter (klickbara val) och lagerstatus */}
            <div className="space-y-4 text-sm">
              <div>
                <span className="block font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Välj storlek / variant:
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.variants?.length ? (
                    product.variants.map((variant) => {
                      const isOutOfStock = (variant.available_quantity ?? 0) <= 0;
                      const isSelected = selectedVariantId === variant.variant_id;
                      const variantImgSrc = resolveMediaSrc(getVariantRawImage(variant));
                      const variantImgBroken = Boolean(
                        variantImageErrors[variant.variant_id]
                      );

                      return (
                        <button
                          key={variant.variant_id}
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() =>
                            setSelectedVariantId(
                              isSelected ? null : variant.variant_id
                            )
                          }
                          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                            isOutOfStock
                              ? "bg-gray-50 dark:bg-zinc-900 text-gray-400 dark:text-zinc-600 border-gray-200 dark:border-zinc-800 line-through cursor-not-allowed"
                              : isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-zinc-700 hover:border-indigo-500"
                          }`}
                        >
                          {variantImgSrc && !variantImgBroken && (
                            <img
                              src={variantImgSrc}
                              alt=""
                              onError={() =>
                                setVariantImageErrors((prev) => ({
                                  ...prev,
                                  [variant.variant_id]: true,
                                }))
                              }
                              className="w-5 h-5 rounded object-cover shrink-0"
                            />
                          )}
                          <span>
                            {variant.size}{" "}
                            {variant.color ? `(${variant.color})` : ""} (
                            {variant.available_quantity} st)
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">
                      Inga storlekar tillgängliga
                    </span>
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
                  {selectedVariant
                    ? `${selectedVariant.available_quantity} st i lager för vald storlek`
                    : totalStock > 0
                    ? `${totalStock} st i lager totalt`
                    : "Slut i lager"}
                </span>
              </div>
            </div>

            {/* Köpknapp */}
            <div className="mt-2">
              {!selectedVariant && totalStock > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 font-medium">
                  Välj en storlek ovan innan du lägger produkten i kundvagnen.
                </p>
              )}

              <div className={!isSelectionValid ? "pointer-events-none opacity-50" : ""}>
                <AddToCart
                  product={{
                    id: String(product.product_id),
                    title: selectedVariant
                      ? `${product.name} (${selectedVariant.size}${
                          selectedVariant.color ? ` - ${selectedVariant.color}` : ""
                        })`
                      : product.name,
                    description: product.description ?? "",
                    price: product.price,
                    picture_url: activePictureUrl,
                    availableStock: selectedVariant?.available_quantity ?? 0,
                  }}
                  available={isSelectionValid}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}