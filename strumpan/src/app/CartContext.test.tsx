import { useContext, useState} from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { CartProvider, CartContext } from "./CartContext";
import { CartItem } from "./CartContext";

// Test products using the new CartItem structure
const product1: Omit<CartItem, "quantity"> = {
    id: "1",
    title: "Test product 1",
    description: "Description 1",
    picture_url: "/test1.jpg",
    price: 100,
    size: "40-45",
    color: "Marinblå",
    availableStock: 5,
};

const product2: Omit<CartItem, "quantity"> = {
  id: "2",
  title: "Test product 2",
  description: "Description 2",
  picture_url: "/test2.jpg",
  price: 200,
  availableStock: 50
};

function TestComponent() {
    const cart = useContext(CartContext);

    if (!cart) return null;

    return (
        <div>
            <p data-testid="quantity-1">
                {cart.getProductQuantity(product1.id)}
            </p>

            <p data-testid="quantity-2">
                {cart.getProductQuantity(product2.id)}
            </p>

            <p data-testid="total-cost">
                {cart.getTotalCost()}
            </p>

            <p data-testid="cart-items">
                {cart.items.length}
            </p>

            <button onClick={() => cart.addItem(product1)}>
                Add product 1
            </button>
            <button onClick={() => cart.updateQuantity(product1.id, cart.getProductQuantity(product1.id) + 1)}>
                Increase product 1
            </button>

            <button onClick={() => cart.addItem(product2)}>
                Add product 2
            </button>

            <button onClick={() => cart.updateQuantity(product2.id, cart.getProductQuantity(product2.id) + 1)}>
                Increase product 2
            </button>

            <button onClick={() => cart.removeOneFromCart(product1.id)}>
                Remove one product 1
            </button>

            <button onClick={() => cart.deleteFromCart(product1.id)}>
                Delete product 1
            </button>
        </div>
    );
}

function NavigationTest() {
    const [page, setPage] = useState("product");

    const cart = useContext(CartContext);

    if (!cart) return null;

    return (
        <div>
            <button onClick={() => setPage("another")}>
                Navigate to another page
            </button>

            <button onClick={() => cart.addItem(product1)}>
                Add product
            </button>

            <p data-testid="current-page">{page}</p>

            <p data-testid="cart-quantity">
                {cart.getProductQuantity("1")}
            </p>
        </div>
    );
}

function renderCart() {
    return render(
        <CartProvider>
            <TestComponent />
        </CartProvider>
    );
}

afterEach(() => {
    cleanup();
    localStorage.clear()
});

describe("CartContext", () => {

    it("should initially have an empty cart", () => {
        renderCart();

        expect(screen.getByTestId("quantity-1")).toHaveTextContent("0");
        expect(screen.getByTestId("quantity-2")).toHaveTextContent("0");
        expect(screen.getByTestId("cart-items")).toHaveTextContent("0");
    });

    it("should add a product to the cart", async () => {
        const user = userEvent.setup();

        renderCart();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        expect(screen.getByTestId("quantity-1")).toHaveTextContent("1");
        expect(screen.getByTestId("cart-items")).toHaveTextContent("1");
    });

    it("should increase the quantity of an existing product", async () => {
        const user = userEvent.setup();

        renderCart();

        // add two
        await user.click(screen.getByRole("button", { name: "Add product 1" }));
        await user.click(screen.getByRole("button", { name: "Add product 1" }));

        expect(screen.getByTestId("quantity-1")).toHaveTextContent("2");
    });

    it("should decrease the quantity of a product", async () => {
        const user = userEvent.setup();

        renderCart();

        // adds two
        await user.click(screen.getByRole("button", { name: "Add product 1" }));
        await user.click(screen.getByRole("button", { name: "Add product 1" }));

        // remove one
        await user.click(
            screen.getByRole("button", { name: "Remove one product 1" })
        );

        expect(screen.getByTestId("quantity-1")).toHaveTextContent("1");
    });

    it("should delete a product when its quantity reaches zero", async () => {
        const user = userEvent.setup();

        renderCart();

        // add a product
        await user.click(screen.getByRole("button", { name: "Add product 1" }));

        // decrease quantity by one
        await user.click(
            screen.getByRole("button", { name: "Remove one product 1" })
        );

        expect(screen.getByTestId("quantity-1")).toHaveTextContent("0");
        expect(screen.getByTestId("cart-items")).toHaveTextContent("0");
    });

    it("should delete a product from the cart", async () => {
        const user = userEvent.setup();

        renderCart();

        // add a product
        await user.click(screen.getByRole("button", { name: "Add product 1" }));

        // remove the product
        await user.click(
            screen.getByRole("button", { name: "Delete product 1" })
        );

        expect(screen.getByTestId("quantity-1")).toHaveTextContent("0");
        expect(screen.getByTestId("cart-items")).toHaveTextContent("0");
    });

    it("should allow multiple different products in the cart", async () => {
        const user = userEvent.setup();

        renderCart();

        await user.click(screen.getByRole("button", { name: "Add product 1" }));
        await user.click(screen.getByRole("button", { name: "Add product 2" }));

        expect(screen.getByTestId("quantity-1")).toHaveTextContent("1");
        expect(screen.getByTestId("quantity-2")).toHaveTextContent("1");
        expect(screen.getByTestId("cart-items")).toHaveTextContent("2");
    });

    it("should calculate the total cost of products in the cart", async () => {
        const user = userEvent.setup();

        renderCart();

        await user.click(screen.getByRole("button", { name: "Add product 1" }));
        await user.click(screen.getByRole("button", { name: "Add product 1" }));
        await user.click(screen.getByRole("button", { name: "Add product 2" }));

        // 2 * 100 + 1 * 200 = 400
        expect(screen.getByTestId("total-cost")).toHaveTextContent("400");
    });

    it("should not allow adding more products than available stock", async () => {
    const user = userEvent.setup();

    renderCart();

    // Product 1 has a stock limit of 5 in this test
    for (let i = 0; i < 6; i++) {
        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );
    }
    screen.debug();

    expect(screen.getByTestId("quantity-1")).toHaveTextContent("5");
    });


    it("should preserve cart contents when navigating between pages", async () => {
    const user = userEvent.setup();

    render(
        <CartProvider>
            <NavigationTest />
        </CartProvider>
    );

    // Add product to cart
    await user.click(
        screen.getByRole("button", { name: "Add product" })
    );

    expect(screen.getByTestId("cart-quantity")).toHaveTextContent("1");

    // Navigate to another page
    await user.click(
        screen.getByRole("button", { name: "Navigate to another page" })
    );

    expect(screen.getByTestId("current-page")).toHaveTextContent("another");

    // Verify cart contents are preserved
    expect(screen.getByTestId("cart-quantity")).toHaveTextContent("1");
});
});