import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateOrderPricing } from "../lib/pricing";

// Simulerad Cart-logik som speglar metoderna i CartContext för ren enhetstestning
function createMockCart(initialItems: Array<{ id: string; title: string; price: number; quantity: number }> = []) {
  let items = [...initialItems];

  return {
    getItems: () => items,
    addItem: (item: { id: string; title: string; price: number; quantity?: number }) => {
      const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
      const existing = items.findIndex((i) => i.id === item.id);
      if (existing > -1) {
        items[existing] = { ...items[existing], quantity: items[existing].quantity + qty };
      } else {
        items.push({ ...item, quantity: qty });
      }
    },
    updateQuantity: (id: string, qty: number) => {
      if (qty <= 0) {
        items = items.filter((i) => i.id !== id);
      } else {
        items = items.map((i) => (i.id === id ? { ...i, quantity: qty } : i));
      }
    },
    removeItem: (id: string) => {
      items = items.filter((i) => i.id !== id);
    },
    clearCart: () => {
      items = [];
    },
    buyNow: (item: { id: string; title: string; price: number }) => {
      // 1. Lägg till varan om den inte finns
      const existing = items.find((i) => i.id === item.id);
      if (!existing) {
        items.push({ ...item, quantity: 1 });
      }
      // 2. Returnera omdirigeringsmål för 1-klicks snabbkassa
      return "/checkout";
    },
  };
}

describe("Cart & Buy Now Flow (Acceptanskriterier för snabbkassa & varukorg)", () => {
  it("ska återanvända varukorgen när kunden har flera artiklar", () => {
    const cart = createMockCart([
      { id: "1", title: "Ullstrumpa Svart", price: 129, quantity: 2 },
      { id: "2", title: "Sportstrumpa Vit", price: 89, quantity: 1 },
    ]);

    assert.equal(cart.getItems().length, 2);

    // Kassan beräknar totalsumma baserat på alla varor i varukorgen
    const pricing = calculateOrderPricing(cart.getItems(), "SE");
    assert.equal(pricing.subtotalGross, 129 * 2 + 89 * 1); // 347 kr
  });

  it("ska stödja 'Köp nu' (Buy now) med direkt navigering till /checkout i 1 klick", () => {
    const cart = createMockCart([
      { id: "existing-1", title: "Tidigare sparad strumpa", price: 99, quantity: 1 },
    ]);

    // Kunden klickar "Köp nu" på en ny produktsida
    const redirectUrl = cart.buyNow({
      id: "quick-item-1",
      title: "Snabbköpt Skidstrumpa",
      price: 199,
    });

    // 1. Verifiera omdirigering direkt till kassan
    assert.equal(redirectUrl, "/checkout");

    // 2. Verifiera att artikeln lagts till i kassan
    const items = cart.getItems();
    assert.equal(items.length, 2);
    assert.ok(items.some((i) => i.id === "quick-item-1"));

    // 3. Verifiera att tidigare varukorgsartiklar bevarats
    assert.ok(items.some((i) => i.id === "existing-1"));
  });

  it("ska uppdatera kvantitet och ta bort artikel vid antal <= 0", () => {
    const cart = createMockCart([
      { id: "1", title: "Strumpa", price: 50, quantity: 2 },
    ]);

    cart.updateQuantity("1", 3);
    assert.equal(cart.getItems()[0].quantity, 3);

    // Minska till 0 ska radera artikeln
    cart.updateQuantity("1", 0);
    assert.equal(cart.getItems().length, 0);
  });

  it("ska tömma varukorgen vid slutfört köp", () => {
    const cart = createMockCart([
      { id: "1", title: "Strumpa", price: 100, quantity: 2 },
    ]);

    assert.equal(cart.getItems().length, 1);
    cart.clearCart();
    assert.equal(cart.getItems().length, 0);
  });
});

