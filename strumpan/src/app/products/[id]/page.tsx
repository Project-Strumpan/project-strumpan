
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    getProduct(productId)
      .then((data) => {
        setProduct(data);
        setImageError(false);
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
      <div className="min-h-screen bg-[#e9dfd2] flex items-center justify-center font-serif text-[#38291f]">
        Laddar produkt...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#e9dfd2] flex flex-col items-center justify-center px-6 text-center">
        <h1 className="text-3xl font-serif text-[#38291f] mb-3">
          Produkten kunde inte hittas
        </h1>
        <p className="text-[#74685d] mb-6">
          Produkten du söker existerar inte eller så uppstod ett fel.
        </p>
        <Link
          href="/catalog"
          className="underline text-[#38291f]"
        >
          ← Tillbaka till produktlistan
        </Link>
      </div>
    );
  }

  // Calculate total stock
  const totalStock =
    product.variants?.reduce(
      (acc, v) => acc + (v.available_quantity ?? 0),
      0
    ) ?? 0;

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-8 sm:py-12">
      <div className="max-w-337.5 mx-auto">
        <Link
          href="/catalog"
          className="inline-block mb-6 text-sm text-[#74685d] hover:text-[#38291f] transition-colors"
        >
          ← Tillbaka till produktlistan
        </Link>

        {/* Product container */}
        <div className="bg-foreground min-h-162.5 p-6 sm:p-10 lg:p-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">

            {/* Product images */}
            <div className="flex flex-col sm:flex-row gap-4">

              {/* Main product image */}
              <div className="w-full sm:flex-1 h-100 sm:h-137.5 lg:h-157.5 overflow-hidden">

                {product.image_url && !imageError ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-[#8b7968]">
                    <span className="text-5xl mb-3">◇</span>
                    <span className="text-sm font-serif">
                      Ingen produktbild tillgänglig
                    </span>
                  </div>
                )}

              </div>
            </div>

            <div className="flex flex-col py-2 lg:py-0">
              <div>
                <span className="text-xs tracking-[0.2em] uppercase text-[#8b7968]">
                  Produkt #{product.product_id}
                </span>

                <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-serif font-normal leading-tight text-[#211912] dark:text-(--text-color-headings)">
                  {product.name}
                </h1>

                <p className="mt-6 text-base sm:text-lg leading-relaxed font-serif text-[#716153] dark:text-(--text-color-subheadings)">
                  {product.description ||
                    "Ingen beskrivning tillgänglig."}
                </p>
              </div>

              {/* Price */}
              <div className="mt-12 text-center">
                <span className="text-2xl font-serif text-[#211912] dark:text-(--text-color-headings)">
                  {product.price} kr
                </span>
              </div>

              {/* Spacer */}
              <div className="flex-1 min-h-12" />

              {/* Variants */}
              <div className="border-t border-[#d7c4ae] pt-6 mt-8">
                <div className="flex flex-row justify-between">

                  <h2 className="font-serif text-xl text-[#38291f] dark:text-(--text-color-headings) pb-4">
                    Tillgängliga varianter
                  </h2>

                    <span
                      className={
                        totalStock > 0
                          ? "text-emerald-700 pb-4"
                          : "text-red-700"
                      }
                    >
                      {totalStock > 0
                        ? `${totalStock} st i lager`
                        : "Slut i lager"}
                    </span>
                </div>

                {product.variants?.length ? (
                  <div className="flex flex-wrap gap-3">
                    {product.variants.map((variant) => (
                      <span
                        key={variant.variant_id}
                        className="border border-[#b9a58f] px-4 py-2 text-sm text-[#38291f] dark:text-(--text-color-subheadings)"
                      >
                        {variant.size}
                        {variant.color
                          ? ` / ${variant.color}`
                          : ""}
                        {" "}({variant.available_quantity} st)
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#74685d]">
                    Inga storlekar tillgängliga
                  </p>
                )}
              </div>

              {/* Add to cart */}
              <div className="flex mt-8 justify-center">
                <AddToCart
                  product={{
                    id: String(product.product_id),
                    title: product.name,
                    description: product.description ?? "",
                    price: product.price,
                    picture_url: product.image_url,
                    availableStock: totalStock,
                  }}
                  available={totalStock > 0}
                />
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
