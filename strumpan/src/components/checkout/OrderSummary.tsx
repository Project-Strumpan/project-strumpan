"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { formatSEK, PricingSummary } from "@/lib/pricing";
import { CartItem } from "@/context/CartContext";

interface OrderSummaryProps {
  items: CartItem[];
  pricing: PricingSummary;
  onUpdateQuantity?: (id: string, qty: number) => void;
  onRemoveItem?: (id: string) => void;
  onLoadDemoItems?: () => void;
  isEditable?: boolean;
}

export function OrderSummary({
  items,
  pricing,
  onUpdateQuantity,
  onRemoveItem,
  isEditable = false,
}: OrderSummaryProps) {
  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Ordersammanfattning</h2>
          <p className="text-xs text-gray-500">Granska din beställning innan betalning</p>
        </div>
        <span
          suppressHydrationWarning
          className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
        >
          {totalItemCount} {totalItemCount === 1 ? "artikel" : "artiklar"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-gray-500">Varukorgen är tom.</p>
          <Link
            href="/cart"
            className="mt-3 inline-block text-xs font-medium text-blue-600 hover:text-blue-800 underline"
          >
            Gå till varukorgen &rarr;
          </Link>
        </div>
      ) : (
        <>
          {/* Artikellista */}
          <div className="divide-y divide-gray-100 overflow-y-auto max-h-72 my-4 pr-1">
            {items.map((item) => {
              const lineTotal = item.price * item.quantity;
              return (
                <div key={item.id} className="flex gap-4 py-3.5 first:pt-0 last:pb-0">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    {item.picture_url ? (
                      <Image
                        src={item.picture_url}
                        alt={item.title}
                        fill
                        sizes="64px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                        Strumpa
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                        {(item.size || item.color) && (
                          <p className="text-xs text-gray-500">
                            {[item.size && `Stl: ${item.size}`, item.color].filter(Boolean).join(" • ")}
                          </p>
                        )}
                        <p className="text-xs text-gray-500">
                          {formatSEK(item.price)} &times; {item.quantity} st
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatSEK(lineTotal)}
                      </p>
                    </div>

                    {isEditable && onUpdateQuantity && (
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center rounded border border-gray-200">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="flex h-6 w-6 items-center justify-center text-xs text-gray-600 hover:bg-gray-100"
                            aria-label="Minska antal"
                          >
                            −
                          </button>
                          <span className="w-7 text-center text-xs font-medium text-gray-800">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                            className="flex h-6 w-6 items-center justify-center text-xs text-gray-600 hover:bg-gray-100"
                            aria-label="Öka antal"
                          >
                            +
                          </button>
                        </div>

                        {onRemoveItem && (
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="text-xs text-gray-400 hover:text-red-600"
                          >
                            Ta bort
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-2 text-right">
            <Link
              href="/cart"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 underline"
            >
              Ändra artiklar i varukorgen &rarr;
            </Link>
          </div>

          {/* Pris- och momssammanfattning */}
          <div suppressHydrationWarning className="border-t border-gray-100 pt-4 space-y-2.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Varuvärde (inkl. moms)</span>
              <span suppressHydrationWarning className="font-medium text-gray-900">
                {formatSEK(pricing.subtotalGross)}
              </span>
            </div>

            <div className="flex justify-between text-gray-600">
              <span>Frakt</span>
              <span suppressHydrationWarning className="font-medium text-gray-900">
                {pricing.isFreeShipping ? (
                  <span className="text-emerald-600 font-semibold">Fri frakt</span>
                ) : (
                  formatSEK(pricing.shippingGross)
                )}
              </span>
            </div>

            {/* Momsredovisning (VAT Breakdown) */}
            <div suppressHydrationWarning className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 border border-gray-100 space-y-1">
              <div className="flex justify-between font-medium text-gray-700">
                <span>Momsland</span>
                <span>{pricing.countryName} ({pricing.countryCode})</span>
              </div>
              <div className="flex justify-between">
                <span>Momssats</span>
                <span>{pricing.vatPercentageText}</span>
              </div>
              <div className="flex justify-between">
                <span>Varuvärde exkl. moms</span>
                <span suppressHydrationWarning>{formatSEK(pricing.subtotalNet)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200/60 pt-1 font-medium text-gray-800">
                <span>Varav moms totalt ({pricing.vatPercentageText})</span>
                <span suppressHydrationWarning>{formatSEK(pricing.totalVat)}</span>
              </div>
            </div>

            {/* Totalbelopp */}
            <div className="border-t border-gray-200 pt-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-base font-bold text-gray-900">Totalt att betala</span>
                  <p className="text-xs text-gray-500">Inklusive moms</p>
                </div>
                <span suppressHydrationWarning className="text-xl font-extrabold text-gray-900">
                  {formatSEK(pricing.totalGross)}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

