
"use client";

import { useCart } from "@/app/CartContext";
import type { CartItem } from "@/app/CartContext";

type AddToCartProps = {
  product: Omit<CartItem, "quantity">;
  available: boolean;
};

export default function AddToCart({
  product,
  available,
}: AddToCartProps) {
  const cart = useCart();
  const productQuantity = cart.getProductQuantity(product.id);

  if (!available) {
    return (
      <button
        type="button"
        disabled
        className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-gray-500 font-semibold cursor-not-allowed border border-gray-200 dark:border-zinc-700"
      >
        Slut i lager
      </button>
    );
  }

  return (
    <div className="flex flex-col xl:w-7/12 items-start gap-3">
      {productQuantity > 0 ? (
        <>
          {/* Quantity selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Antal
            </span>

            <div className="inline-flex items-center rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  cart.updateQuantity(product.id, productQuantity - 1)
                }
                className="w-11 h-11 flex items-center justify-center text-lg font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-40"
                aria-label="Minska antal"
              >
                −
              </button>

              <span className="w-12 text-center text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                {productQuantity}
              </span>

              <button
                type="button"
                onClick={() =>
                  cart.updateQuantity(product.id, productQuantity + 1)
                }
                className="w-11 h-11 flex items-center justify-center text-lg font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Öka antal"
              >
                +
              </button>
            </div>
          </div>

          {/* Cart status */}
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-medium">
              {productQuantity} st i varukorgen
            </span>
          </div>

          {/* Remove button */}
          <button
            type="button"
            onClick={() => cart.removeItem(product.id)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
          >
            <span aria-hidden="true">×</span>
            Ta bort från varukorgen
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => cart.addItem({ ...product, quantity: 1 })}
          className="w-full px-6 py-3 rounded-3xl bg-(--button) hover:bg-[#594333] text-white text-2xl font-serif transition-colors"
        >
          Lägg i varukorg
        </button>
      )}
    </div>
  );
}
