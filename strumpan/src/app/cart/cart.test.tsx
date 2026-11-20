
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

import CartPage from "./page";
import { CartProvider, useCart } from "@/app/CartContext";
import type { CartItem } from "@/app/CartContext";
import { useState } from "react";

const product1: Omit<CartItem, "quantity"> = {
  id: "1",
  title: "Test product 1",
  description: "Description 1",
  picture_url: "/test1.jpg",
  price: 100,
  availableStock: 5,
};

const product2: Omit<CartItem, "quantity"> = {
  id: "2",
  title: "Test product 2",
  description: "Description 2",
  picture_url: "/test2.jpg",
  price: 200,
  availableStock: 10,
};

function CartControls() {
  const cart = useCart();

  return (
    <div>
      <button onClick={() => cart.addItem(product1)}>
        Add product 1
      </button>

      <button onClick={() => cart.addItem(product2)}>
        Add product 2
      </button>
    </div>
  );
}

function renderCartPage() {
  return render(
    <CartProvider>
      <CartControls />
      <CartPage />
    </CartProvider>
  );
}

function NavigationTest() {
  const [page, setPage] = useState("product");
  const cart = useCart();

  return (
    <div>
      <button onClick={() => setPage("cart")}>
        Open cart
      </button>

      <button onClick={() => setPage("another")}>
        Go to another page
      </button>

      <button onClick={() => setPage("product")}>
        Go back to product page
      </button>

      {page === "product" && (
        <>
          <button onClick={() => cart.addItem(product1)}>
            Add product
          </button>
          <h1>Product page</h1>
        </>
      )}

      {page === "cart" && <CartPage />}

      {page === "another" && <h1>Another page</h1>}
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("CartPage", () => {
  it("renders the cart page", () => {
    renderCartPage();

    expect(
      screen.getByRole("heading", { name: "Your cart" })
    ).toBeInTheDocument();
  });

  it("shows an empty cart when no products have been added", () => {
    renderCartPage();

    expect(
      screen.getByRole("heading", { name: "Your cart" })
    ).toBeInTheDocument();

    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  it("shows free shipping when the cart is empty", () => {
    renderCartPage();

    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  it("displays products added to the shared cart", async () => {
    const user = userEvent.setup();

    renderCartPage();

    await user.click(screen.getByRole("button", { name: "Add product 1" }));
    await user.click(screen.getByRole("button", { name: "Add product 2" }));

    expect(screen.getByText("Test product 1")).toBeInTheDocument();
    expect(screen.getByText("Test product 2")).toBeInTheDocument();

    expect(screen.getByText("2 items")).toBeInTheDocument();
  });

  it("displays the correct product price", async () => {
    const user = userEvent.setup();

    renderCartPage();

    await user.click(screen.getByRole("button", { name: "Add product 1" }));

    expect(
      screen.getByLabelText(/price of Test product 1/i)
    ).toHaveTextContent("100.00 kr");
  });

  it("calculates the product subtotal based on quantity", async () => {
    const user = userEvent.setup();

    renderCartPage();

    await user.click(screen.getByRole("button", { name: "Add product 1" }));

    await user.click(
      screen.getByRole("button", { name: "Increase quantity" })
    );

    // 100 kr * 2 = 200 kr
    expect(screen.getAllByText("200.00 kr").length).toBe(2);
    expect(screen.getByText("2", { selector: "span" })).toBeInTheDocument();
  });

  it("increases the quantity of a product", async () => {
    const user = userEvent.setup();

    renderCartPage();

    await user.click(screen.getByRole("button", { name: "Add product 1" }));

    await user.click(
      screen.getByRole("button", { name: "Increase quantity" })
    );

    expect(screen.getByText("2", { selector: "span" })).toBeInTheDocument();
  });

  it("decreases the quantity of a product", async () => {
    const user = userEvent.setup();

    renderCartPage();

    await user.click(screen.getByRole("button", { name: "Add product 1" }));

    await user.click(
      screen.getByRole("button", { name: "Increase quantity" })
    );

    await user.click(
      screen.getByRole("button", { name: "Decrease quantity" })
    );

    expect(screen.getByText("1", { selector: "span" })).toBeInTheDocument();
  });

  it("removes a product when its quantity is decreased to zero", async () => {
    const user = userEvent.setup();

    renderCartPage();

    await user.click(screen.getByRole("button", { name: "Add product 1" }));

    await user.click(
      screen.getByRole("button", { name: "Decrease quantity" })
    );

    expect(screen.queryByText("Test product 1")).not.toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  it("removes a product when the remove button is pressed", async () => {
    const user = userEvent.setup();

    renderCartPage();

    await user.click(screen.getByRole("button", { name: "Add product 1" }));

    await user.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.queryByText("Test product 1")).not.toBeInTheDocument();
    expect(screen.getByText("0 items")).toBeInTheDocument();
  });

  it("calculates the total cart subtotal correctly", async () => {
    const user = userEvent.setup();

    renderCartPage();

    await user.click(screen.getByRole("button", { name: "Add product 1" }));
    await user.click(screen.getByRole("button", { name: "Add product 2" }));

    // 100 + 200 = 300
    expect(screen.getAllByText("300.00 kr").length).toBe(2);
  });

  it("calculates shipping costs below the free shipping threshold", async () => {
    const user = userEvent.setup();

    renderCartPage();

    await user.click(screen.getByRole("button", { name: "Add product 1" }));

    expect(screen.getByText("15.00 kr")).toBeInTheDocument();
    expect(screen.getByText("115.00 kr")).toBeInTheDocument();
  });

  it("offers free shipping above the free shipping threshold", async () => {
    const user = userEvent.setup();

    renderCartPage();

    await user.click(screen.getByRole("button", { name: "Add product 1" }));
    await user.click(screen.getByRole("button", { name: "Add product 1" }));
    await user.click(screen.getByRole("button", { name: "Add product 1" }));

    expect(screen.getByText("Free")).toBeInTheDocument();
    expect(screen.getAllByText("300.00 kr").length).toBe(3);
  });

  it("keeps cart contents when navigating between pages", async () => {
    const user = userEvent.setup();

    render(
      <CartProvider>
        <NavigationTest />
      </CartProvider>
    );

    // Add product
    await user.click(screen.getByRole("button", { name: "Add product" }));

    // Open cart
    await user.click(screen.getByRole("button", { name: "Open cart" }));

    expect(screen.getByText("Test product 1")).toBeInTheDocument();

    // Navigate away
    await user.click(
      screen.getByRole("button", { name: "Go to another page" })
    );

    // Navigate back
    await user.click(screen.getByRole("button", { name: "Open cart" }));

    expect(screen.getByText("Test product 1")).toBeInTheDocument();

    expect(
      screen.getByLabelText(/price of Test product 1/i)
    ).toBeInTheDocument();
  });
});
