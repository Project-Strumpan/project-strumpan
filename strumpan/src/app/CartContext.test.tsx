import { useContext, useState} from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { CartProvider, CartContext } from "./CartContext";

// Mock product data used for calculating the total cost
vi.mock("../productsStore", () => ({
    getProductData: (id: number) => {
        const products = [
            { id: 1, title: "Product 1", price: 100, stock: 5 },
            { id: 2, title: "Product 2", price: 200, stock: 10},
        ];

        return products.find(product => product.id === id);
    },
    productsArray: [],
}));

function TestComponent() {
    const cart = useContext(CartContext);

    if (!cart) return null;

    return (
        <div>
            <p data-testid="quantity-1">
                {cart.getProductQuantity(1)}
            </p>

            <p data-testid="quantity-2">
                {cart.getProductQuantity(2)}
            </p>

            <p data-testid="total-cost">
                {cart.getTotalCost()}
            </p>

            <p data-testid="cart-items">
                {cart.items.length}
            </p>

            <button onClick={() => cart.addOneToCart(1)}>
                Add product 1
            </button>

            <button onClick={() => cart.addOneToCart(2)}>
                Add product 2
            </button>

            <button onClick={() => cart.removeOneFromCart(1)}>
                Remove one product 1
            </button>

            <button onClick={() => cart.deleteFromCart(1)}>
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

            <button onClick={() => cart.addOneToCart(1)}>
                Add product
            </button>

            <p data-testid="current-page">{page}</p>

            <p data-testid="cart-quantity">
                {cart.getProductQuantity(1)}
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