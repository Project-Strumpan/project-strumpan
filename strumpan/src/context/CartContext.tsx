"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { OrderItemInput, calculateOrderPricing, PricingSummary } from "@/lib/pricing";

export interface CartItem extends OrderItemInput {
  id: string;
  variantId?: number;
  availableStock: number;
}
export type CartItemInput = Omit<CartItem, "quantity"> & {
  quantity?: number;
};

export interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  buyNow: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  loadDemoItems: () => void;

  // Kompatibilitet med pro-7 branch
  getProductQuantity: (id: string) => number;
  addOneToCart: (id: string) => void;
  removeOneFromCart: (id: string) => void;
  deleteFromCart: (id: string) => void;
  getTotalCost: () => number;

  // Prissammanfattning
  pricing: PricingSummary;
  selectedCountry: string;
  setSelectedCountry: (countryCode: string) => void;
}

// Förvalda demoartiklar ifall kunden går direkt till /checkout innan produktsidorna är mergade
export const DEFAULT_DEMO_ITEMS: CartItem[] = [
  {
    id: "1",
    title: "Klassisk Ullstrumpa - Svart",
    description: "beskrivning",
    price: 129,
    quantity: 2,
    size: "40-45",
    color: "Svart",
    picture_url: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=300&q=80",
    availableStock: 5
  },
  {
    id: "2",
    title: "Randig Bomullsstrumpa - Blå/Vit",
    description: "beskrivning",
    price: 89,
    quantity: 1,
    size: "40-45",
    color: "Marinblå",
    picture_url: "https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&w=300&q=80",
    availableStock:10
  },
];

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  const [selectedCountry, setSelectedCountry] = useState<string>("SE");

  // Läs den sparade varukorgen efter att klienten har monterats. Detta undviker
  // att SSR:s tomma initialvärde skriver över en befintlig varukorg.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("strumpan_cart");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch (err) {
      console.error("Kunde inte läsa varukorg från localStorage:", err);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Spara varukorgen till localStorage först efter att den har lästs in.
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    try {
      localStorage.setItem("strumpan_cart", JSON.stringify(items));
    } catch (err) {
      console.error("Kunde inte spara varukorg i localStorage:", err);
    }
  }, [items, isHydrated]);

  const pricing = useMemo(() => {
    return calculateOrderPricing(items, selectedCountry);
  }, [items, selectedCountry]);

  function addItem(item: CartItemInput) {
  const qtyToAdd = item.quantity && item.quantity > 0
    ? item.quantity
    : 1;

  setItems((prev) => {
    const existingItem = prev.find((i) => i.id === item.id);
    const currentQuantity = existingItem?.quantity ?? 0;
    const newQuantity = Math.min(currentQuantity + qtyToAdd, item.availableStock);

    if (existingItem) {
      return prev.map((i) =>
        i.id === item.id
          ? { ...i, quantity: newQuantity }
          : i
      );
    }

    return [
      ...prev,
      { ...item, quantity: Math.min(qtyToAdd, item.availableStock) },
    ];
  });
}

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  function updateQuantity(id: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, quantity: quantity } : i
      )
    );
  }

  const clearCart = React.useCallback(() => {
    setItems([]);
  }, []);

  function loadDemoItems() {
    setItems(DEFAULT_DEMO_ITEMS);
  }

  /**
   * "Köp nu" flöde: Lägger till varan i varukorgen (om den inte redan finns)
   * och skickar kunden direkt till /checkout i 1 klick!
   */
  function buyNow(item: Omit<CartItem, "quantity"> & { quantity?: number }) {
    addItem(item);
    if (typeof window !== "undefined") {
      window.location.assign("/checkout");
    }
  }

  // Kompatibilitetsfunktioner för pro-7 branch
  function getProductQuantity(id: string): number {
    return items.find((i) => i.id === id)?.quantity || 0;
  }

  function addOneToCart(id: string) {
    addItem({ id, title: `Strumpa ${id}`, description: "beskrivning", price: 99, availableStock: 2 });
  }

  function removeOneFromCart(id: string) {
    const current = getProductQuantity(id);
    if (current <= 1) {
      removeItem(id);
    } else {
      updateQuantity(id, current - 1);
    }
  }

  function deleteFromCart(id: string) {
    removeItem(id);
  }

  function getTotalCost(): number {
    return pricing.subtotalGross;
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        buyNow,
        loadDemoItems,
        getProductQuantity,
        addOneToCart,
        removeOneFromCart,
        deleteFromCart,
        getTotalCost,
        pricing,
        selectedCountry,
        setSelectedCountry,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart måste användas inom en CartProvider");
  }
  return context;
}

export { CartContext };
export default CartProvider;
