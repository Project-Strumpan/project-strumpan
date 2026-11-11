"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { OrderItemInput, calculateOrderPricing, PricingSummary } from "@/lib/pricing";

export interface CartItem extends OrderItemInput {
  id: string;
}

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
    price: 129,
    quantity: 2,
    size: "40-45",
    color: "Svart",
    picture_url: "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=300&q=80",
  },
  {
    id: "2",
    title: "Randig Bomullsstrumpa - Blå/Vit",
    price: 89,
    quantity: 1,
    size: "40-45",
    color: "Marinblå",
    picture_url: "https://images.unsplash.com/photo-1582966772680-860e372bb558?auto=format&fit=crop&w=300&q=80",
  },
];

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const stored = localStorage.getItem("strumpan_cart");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch {
      // Ignorera fel vid parsing
    }
    return [];
  });

  const [selectedCountry, setSelectedCountry] = useState<string>("SE");

  // Spara varukorgen till localStorage vid ändringar
  useEffect(() => {
    try {
      localStorage.setItem("strumpan_cart", JSON.stringify(items));
    } catch (err) {
      console.error("Kunde inte spara varukorg i localStorage:", err);
    }
  }, [items]);

  const pricing = useMemo(() => {
    return calculateOrderPricing(items, selectedCountry);
  }, [items, selectedCountry]);

  function addItem(item: Omit<CartItem, "quantity"> & { quantity?: number }) {
    const qtyToAdd = item.quantity && item.quantity > 0 ? item.quantity : 1;
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === item.id);
      if (existingIndex > -1) {
        return prev.map((i, index) =>
          index === existingIndex ? { ...i, quantity: i.quantity + qtyToAdd } : i
        );
      }
      return [...prev, { ...item, quantity: qtyToAdd }];
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
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  }

  function clearCart() {
    setItems([]);
  }

  function loadDemoItems() {
    setItems(DEFAULT_DEMO_ITEMS);
  }

  /**
   * "Köp nu" flöde: Lägger till varan i varukorgen (om den inte redan finns)
   * och skickar kunden direkt till /checkout i 1 klick!
   */
  function buyNow(item: Omit<CartItem, "quantity"> & { quantity?: number }) {
    addItem(item);
    router.push("/checkout");
  }

  // Kompatibilitetsfunktioner för pro-7 branch
  function getProductQuantity(id: string): number {
    return items.find((i) => i.id === id)?.quantity || 0;
  }

  function addOneToCart(id: string) {
    addItem({ id, title: `Strumpa ${id}`, price: 99 });
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
