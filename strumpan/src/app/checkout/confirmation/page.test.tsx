import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { useSearchParams, clearCart } = vi.hoisted(() => ({
  useSearchParams: vi.fn(),
  clearCart: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/context/CartContext", () => ({
  useCart: () => ({
    items: [
      {
        id: "1",
        title: "Classic Cotton Sock",
        description: "desc",
        price: 89,
        quantity: 1,
        availableStock: 5,
      },
    ],
    pricing: {
      subtotalGross: 89,
      shippingGross: 39,
      totalGross: 128,
      totalVat: 25.6,
      vatRate: 0.25,
      countryCode: "SE",
      freeShippingThreshold: 399,
      amountUntilFreeShipping: 310,
    },
    clearCart,
  }),
}));

import ConfirmationPage from "./page";

describe("ConfirmationPage (PRO-15 payment error UX)", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));
  });

  it("shows human-readable error and links to retry or return to cart when payment fails", () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams("payment_intent=pi_123&redirect_status=failed")
    );

    render(<ConfirmationPage />);

    expect(screen.getByText("Betalningen kunde inte genomföras")).toBeTruthy();
    expect(screen.getByText(/Inga pengar har dragits/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Försök betala igen" }).getAttribute("href")).toBe("/checkout");
    expect(screen.getByRole("link", { name: "Tillbaka till varukorgen" }).getAttribute("href")).toBe("/cart");
    expect(clearCart).not.toHaveBeenCalled();
  });

  it("shows canceled message when user cancels payment", () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams("payment_intent=pi_123&redirect_status=canceled")
    );

    render(<ConfirmationPage />);

    expect(screen.getByText("Betalningen avbröts")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Försök betala igen" }).getAttribute("href")).toBe("/checkout");
    expect(screen.getByRole("link", { name: "Tillbaka till varukorgen" }).getAttribute("href")).toBe("/cart");
    expect(clearCart).not.toHaveBeenCalled();
  });

  it("shows confirmation when payment succeeded", () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams("payment_intent=pi_123&redirect_status=succeeded")
    );

    render(<ConfirmationPage />);

    expect(screen.getByText("Tack för din beställning!")).toBeTruthy();
    expect(clearCart).toHaveBeenCalledOnce();
  });
});
