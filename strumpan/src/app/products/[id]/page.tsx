"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, use } from "react";
import { getProduct } from "@/lib/api-client";
import type { ProductVariant, ProductWithVariants } from "@/types/product";
import type { ProductMediaItem } from "@/types/product-media";
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

<<<<<<< HEAD
interface GalleryItem {
  id: string;
  media_type: "image" | "video";
  src: string;
  variant_id: number | null;
  sort_order: number;
}

=======
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
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
<<<<<<< HEAD
  const [productMedia, setProductMedia] = useState<ProductMediaItem[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState<number>(0);

=======
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [brokenMediaIds, setBrokenMediaIds] = useState<Record<string, boolean>>({});

  // Håll koll på bildfel för huvudbild och enskilda varianter
  const [mainImageError, setMainImageError] = useState(false);
  const [variantImageErrors, setVariantImageErrors] = useState<Record<number, boolean>>({});

  useEffect(() => {
<<<<<<< HEAD
    setLoading(true);
    setError(false);
    setSelectedVariantId(null);
    setActiveMediaIndex(0);
    setBrokenMediaIds({});

    Promise.all([
      getProduct(productId),
      fetch(`/api/products/${productId}/media`)
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []),
    ])
      .then(([productData, mediaData]) => {
        setProduct(productData);
        setProductMedia(Array.isArray(mediaData) ? mediaData : []);
=======
    setMainImageError(false);
    setVariantImageErrors({});

    getProduct(productId)
      .then((data) => {
        setProduct(data);
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [productId]);

  const galleryItems = useMemo<GalleryItem[]>(() => {
    if (!product) return [];

    const items: GalleryItem[] = [];
    const seenSrcs = new Set<string>();

    const sortedMedia = [...productMedia].sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.media_id - b.media_id;
    });

    for (const media of sortedMedia) {
      const resolved = resolveMediaSrc(media.media_url);
      if (!resolved || seenSrcs.has(resolved)) continue;
      seenSrcs.add(resolved);

      items.push({
        id: `media-${media.media_id}`,
        media_type: media.media_type,
        src: resolved,
        variant_id: media.variant_id,
        sort_order: media.sort_order,
      });
    }

    const fallbackMainSrc = resolveMediaSrc(product.image_url);
    if (fallbackMainSrc && !seenSrcs.has(fallbackMainSrc)) {
      seenSrcs.add(fallbackMainSrc);
      items.unshift({
        id: "product-main",
        media_type: "image",
        src: fallbackMainSrc,
        variant_id: null,
        sort_order: -1,
      });
    }

    for (const variant of product.variants ?? []) {
      const variantSrc = resolveMediaSrc(getVariantRawImage(variant));
      if (variantSrc && !seenSrcs.has(variantSrc)) {
        seenSrcs.add(variantSrc);
        items.push({
          id: `variant-${variant.variant_id}`,
          media_type: "image",
          src: variantSrc,
          variant_id: variant.variant_id,
          sort_order: 9999,
        });
      }
    }

    return items;
  }, [product, productMedia]);

  function handleSelectVariant(variantId: number) {
    const isAlreadySelected = selectedVariantId === variantId;
    const nextVariantId = isAlreadySelected ? null : variantId;
    setSelectedVariantId(nextVariantId);

    // Jump to the first media item linked to this variant if one exists
    if (nextVariantId !== null) {
      const matchingIndex = galleryItems.findIndex(
        (item) => item.variant_id === nextVariantId
      );
      if (matchingIndex !== -1) {
        setActiveMediaIndex(matchingIndex);
      }
    }
  }

  function handlePrevMedia() {
    if (galleryItems.length <= 1) return;
    setActiveMediaIndex((prev) =>
      prev === 0 ? galleryItems.length - 1 : prev - 1
    );
  }

  function handleNextMedia() {
    if (galleryItems.length <= 1) return;
    setActiveMediaIndex((prev) =>
      prev === galleryItems.length - 1 ? 0 : prev + 1
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center text-gray-500">
        Loading product...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Product not found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The product you are looking for does not exist or an error occurred.
        </p>
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 underline"
        >
          ← Back to products
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

<<<<<<< HEAD
  const safeIndex =
    galleryItems.length > 0
      ? Math.min(activeMediaIndex, galleryItems.length - 1)
      : 0;
  const activeMedia = galleryItems[safeIndex] ?? null;
  const isActiveMediaBroken = activeMedia
    ? Boolean(brokenMediaIds[activeMedia.id])
    : false;

  const variantLinkedCount =
    selectedVariantId !== null
      ? galleryItems.filter((item) => item.variant_id === selectedVariantId).length
      : 0;

  const cartPictureUrl =
    (activeMedia?.media_type === "image" ? activeMedia.src : null) ??
    galleryItems.find((item) => item.media_type === "image")?.src ??
    product.image_url;
=======
  // Visa vald variants bild om den har en egen, annars huvudproduktens bild
  const activeRawImage =
    (selectedVariant && getVariantRawImage(selectedVariant)) || product.image_url;
  const activeImageSrc = resolveMediaSrc(activeRawImage);

  const isActiveImageBroken =
    selectedVariant && getVariantRawImage(selectedVariant)
      ? Boolean(variantImageErrors[selectedVariant.variant_id])
      : mainImageError;

  const activePictureUrl = activeImageSrc ?? product.image_url;
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 mb-6 transition-colors"
      >
        ← Back to products
      </Link>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
<<<<<<< HEAD
          {/* Left column: Scrollable Media Viewer + Highlighted Thumbnails */}
          <div className="space-y-4">
            <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center group">
              {activeMedia && !isActiveMediaBroken ? (
                activeMedia.media_type === "image" ? (
                  <img
                    src={activeMedia.src}
                    alt={
                      selectedVariant
                        ? `${product.name} - ${selectedVariant.size}${
                            selectedVariant.color
                              ? ` (${selectedVariant.color})`
                              : ""
                          }`
                        : product.name
                    }
                    onError={() =>
                      setBrokenMediaIds((prev) => ({
                        ...prev,
                        [activeMedia.id]: true,
                      }))
                    }
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    key={activeMedia.src}
                    src={activeMedia.src}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                )
              ) : (
                <span className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                  No media available
                </span>
              )}

              {/* Previous / Next navigation arrows */}
              {galleryItems.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevMedia}
                    aria-label="Previous media"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-zinc-900/90 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 shadow flex items-center justify-center hover:bg-white dark:hover:bg-zinc-800 transition"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMedia}
                    aria-label="Next media"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 dark:bg-zinc-900/90 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 shadow flex items-center justify-center hover:bg-white dark:hover:bg-zinc-800 transition"
                  >
                    ›
                  </button>

                  <span className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-black/65 text-white">
                    {safeIndex + 1} / {galleryItems.length}
                  </span>
                </>
              )}
            </div>

            {/* Horizontal scrollable thumbnail strip with variant highlights */}
            {galleryItems.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Media ({galleryItems.length})
                  </span>
                  {selectedVariant && variantLinkedCount > 0 && (
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      {variantLinkedCount} linked to selected variant
                    </span>
                  )}
                </div>

                <div className="flex gap-2.5 overflow-x-auto p-1">
                  {galleryItems.map((item, index) => {
                    const isCurrent = index === safeIndex;
                    const isBroken = Boolean(brokenMediaIds[item.id]);
                    const isVariantMatch =
                      selectedVariantId !== null &&
                      item.variant_id === selectedVariantId;

                    let borderClasses =
                      "border-gray-200 dark:border-zinc-700 hover:border-indigo-400";

                    if (isCurrent && isVariantMatch) {
                      borderClasses =
                        "border-indigo-600 ring-2 ring-amber-400 shadow-sm";
                    } else if (isCurrent) {
                      borderClasses =
                        "border-indigo-600 ring-2 ring-indigo-500/40";
                    } else if (isVariantMatch) {
                      borderClasses =
                        "border-amber-500 ring-2 ring-amber-400/50";
                    } else if (selectedVariantId !== null && variantLinkedCount > 0) {
                      borderClasses =
                        "border-gray-200 dark:border-zinc-700 opacity-55 hover:opacity-100";
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveMediaIndex(index)}
                        title={
                          isVariantMatch
                            ? "Linked to selected variant"
                            : `Media ${index + 1}`
                        }
                        className={`relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 flex items-center justify-center bg-gray-100 dark:bg-zinc-800 transition ${borderClasses}`}
                      >
                        {isBroken ? (
                          <span className="text-[10px] text-gray-400 text-center px-1">
                            Broken
                          </span>
                        ) : item.media_type === "image" ? (
                          <img
                            src={item.src}
                            alt={`${product.name} thumbnail ${index + 1}`}
                            onError={() =>
                              setBrokenMediaIds((prev) => ({
                                ...prev,
                                [item.id]: true,
                              }))
                            }
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="relative w-full h-full flex items-center justify-center bg-zinc-900 text-white">
                            <video
                              src={item.src}
                              muted
                              preload="metadata"
                              className="w-full h-full object-cover opacity-75"
                            />
                            <span className="absolute text-xs font-bold bg-black/70 px-1.5 py-0.5 rounded">
                              ▶
                            </span>
                          </div>
                        )}

                        {isVariantMatch && (
                          <span
                            aria-hidden="true"
                            className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-1 ring-black/40"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column: Product details, variants and Add to Cart */}
          <div className="flex flex-col gap-6">
            <div>
=======
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
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {product.name}
              </h1>
              <p className="mt-3 text-base text-gray-600 dark:text-gray-300 leading-relaxed">
<<<<<<< HEAD
                {product.description || "No description available."}
=======
                {product.description || "Ingen beskrivning tillgänglig."}
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
              </p>
            </div>

            <div className="border-t border-b border-gray-100 dark:border-zinc-800 py-4 my-2 flex items-baseline justify-between">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
<<<<<<< HEAD
                Price
=======
                Pris
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
              </span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {product.price} kr
              </span>
            </div>

<<<<<<< HEAD
            {/* Variants & Stock */}
            <div className="space-y-4 text-sm">
              <div>
                <span className="block font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Select size / variant:
=======
            {/* Varianter (klickbara val) och lagerstatus */}
            <div className="space-y-4 text-sm">
              <div>
                <span className="block font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Välj storlek / variant:
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.variants?.length ? (
                    product.variants.map((variant) => {
                      const isOutOfStock = (variant.available_quantity ?? 0) <= 0;
                      const isSelected = selectedVariantId === variant.variant_id;
<<<<<<< HEAD

                      const linkedMedia = galleryItems.find(
                        (item) =>
                          item.variant_id === variant.variant_id &&
                          item.media_type === "image" &&
                          !brokenMediaIds[item.id]
=======
                      const variantImgSrc = resolveMediaSrc(getVariantRawImage(variant));
                      const variantImgBroken = Boolean(
                        variantImageErrors[variant.variant_id]
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
                      );

                      return (
                        <button
                          key={variant.variant_id}
                          type="button"
                          disabled={isOutOfStock}
<<<<<<< HEAD
                          onClick={() => handleSelectVariant(variant.variant_id)}
=======
                          onClick={() =>
                            setSelectedVariantId(
                              isSelected ? null : variant.variant_id
                            )
                          }
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
                          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                            isOutOfStock
                              ? "bg-gray-50 dark:bg-zinc-900 text-gray-400 dark:text-zinc-600 border-gray-200 dark:border-zinc-800 line-through cursor-not-allowed"
                              : isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                              : "bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-zinc-700 hover:border-indigo-500"
                          }`}
                        >
<<<<<<< HEAD
                          {linkedMedia && (
                            <img
                              src={linkedMedia.src}
                              alt=""
=======
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
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
                              className="w-5 h-5 rounded object-cover shrink-0"
                            />
                          )}
                          <span>
                            {variant.size}{" "}
                            {variant.color ? `(${variant.color})` : ""} (
<<<<<<< HEAD
                            {variant.available_quantity} in stock)
=======
                            {variant.available_quantity} st)
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">
<<<<<<< HEAD
                      No sizes available
=======
                      Inga storlekar tillgängliga
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="block font-semibold text-gray-700 dark:text-gray-300">
<<<<<<< HEAD
                  Availability:
=======
                  Lagerstatus:
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
                </span>
                <span
                  className={`font-medium ${
                    totalStock > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {selectedVariant
<<<<<<< HEAD
                    ? `${selectedVariant.available_quantity} in stock for selected size`
                    : totalStock > 0
                    ? `${totalStock} in stock total`
                    : "Out of stock"}
=======
                    ? `${selectedVariant.available_quantity} st i lager för vald storlek`
                    : totalStock > 0
                    ? `${totalStock} st i lager totalt`
                    : "Slut i lager"}
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
                </span>
              </div>
            </div>

<<<<<<< HEAD
            {/* Add to Cart */}
            <div className="mt-2">
              {!selectedVariant && totalStock > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 font-medium">
                  Please select a size above before adding the product to your cart.
=======
            {/* Köpknapp */}
            <div className="mt-2">
              {!selectedVariant && totalStock > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mb-2 font-medium">
                  Välj en storlek ovan innan du lägger produkten i kundvagnen.
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
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
<<<<<<< HEAD
                    picture_url: cartPictureUrl,
=======
                    picture_url: activePictureUrl,
>>>>>>> d6d3d9a5f17f0bbbf4f69dae0659af8a0a231354
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