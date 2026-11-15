import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useContext, useState } from "react";
import "@testing-library/jest-dom/vitest";

import CartPage from "./page";
import { CartProvider, CartContext } from "@/app/CartContext";

// Mock product data
const { mockProducts } = vi.hoisted(() => ({
    mockProducts: [
        {
            id: 1,
            product_name: "Test product 1",
            product_description: "Description 1",
            picture_url: "/test1.jpg",
            price: 100,
            stock: 10,
        },
        {
            id: 2,
            product_name: "Test product 2",
            product_description: "Description 2",
            picture_url: "/test2.jpg",
            price: 200,
            stock: 10,
        },
    ],
}));

vi.mock("@/productsStore", () => ({
    productsArray: mockProducts,
    getProductData: (id: number) =>
        mockProducts.find(product => product.id === id),
}));

// Component for adding products to the cart
function CartControls() {
    const cart = useContext(CartContext);

    if (!cart) return null;

    return (
        <div>
            <button onClick={() => cart.addOneToCart(1)}>
                Add product 1
            </button>

            <button onClick={() => cart.addOneToCart(2)}>
                Add product 2
            </button>
        </div>
    );
}

// Render the actual CartProvider and CartPage
function renderCartPage() {
    return render(
        <CartProvider>
            <CartControls />
            <CartPage />
        </CartProvider>
    );
}

afterEach(() => {
    cleanup();
});

describe("CartPage", () => {
    it("renders the cart page", () => {
        const { container } = render(
            <CartProvider>
            <CartPage />
            </CartProvider>
        );

        screen.debug();
        expect(container).toHaveTextContent("Your cart");
    });

    it("should display an empty cart initially", () => {
        renderCartPage();

        expect(
            screen.getByRole("heading", { name: "Your cart" })
        ).toBeInTheDocument();

        screen.debug();
        expect(screen.getByText("0 items")).toBeInTheDocument();
    });

    it("There shouldn’t be a shipping price over 0 with no items in the cart.", () => {
        renderCartPage();

        expect(
            screen.getByRole("heading", { name: "Your cart" })
        ).toBeInTheDocument();

        expect(screen.getByText("Free")).toBeInTheDocument();

    });


    it("should display products that have been added to the cart", async () => {
        const user = userEvent.setup();

        renderCartPage();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        await user.click(
            screen.getByRole("button", { name: "Add product 2" })
        );

        expect(
            screen.getByText("Test product 1")
        ).toBeInTheDocument();

        expect(
            screen.getByText("Test product 2")
        ).toBeInTheDocument();

        expect(screen.getByText("2 items")).toBeInTheDocument();
    });

    it("should display product descriptions", async () => {
        const user = userEvent.setup();

        renderCartPage();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        expect(
            screen.getByText("Description 1")
        ).toBeInTheDocument();
    });

    it("should display the correct product price", async () => {
        const user = userEvent.setup();

        renderCartPage();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        expect(screen.getAllByText("100.00 kr").length).toBeGreaterThan(0);
    });

    it("should calculate the product price based on quantity", async () => {
        const user = userEvent.setup();

        renderCartPage();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        await user.click(
            screen.getByRole("button", { name: "Increase quantity" })
        );

        // 100 kr * 2 = 200 kr
        expect(screen.getAllByText("200.00 kr").length).toBe(2);

        expect(screen.getByText("2", { selector: "span" }))
            .toBeInTheDocument();
    });

    it("should increase the quantity of a product", async () => {
        const user = userEvent.setup();

        renderCartPage();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        await user.click(
            screen.getByRole("button", { name: "Increase quantity" })
        );

        expect(screen.getByText("2", { selector: "span" }))
            .toBeInTheDocument();
    });

    it("should decrease the quantity of a product", async () => {
        const user = userEvent.setup();

        renderCartPage();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        await user.click(
            screen.getByRole("button", { name: "Increase quantity" })
        );

        await user.click(
            screen.getByRole("button", { name: "Decrease quantity" })
        );

        expect(screen.getByText("1", { selector: "span" }))
            .toBeInTheDocument();
    });

    it("should remove a product when its quantity reaches zero", async () => {
        const user = userEvent.setup();

        renderCartPage();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        await user.click(
            screen.getByRole("button", { name: "Decrease quantity" })
        );

        expect(
            screen.queryByText("Test product 1")
        ).not.toBeInTheDocument();

        expect(screen.getByText("0 items")).toBeInTheDocument();
    });

    it("should remove a product when Remove is pressed", async () => {
        const user = userEvent.setup();

        renderCartPage();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        await user.click(
            screen.getByRole("button", { name: "Remove" })
        );

        expect(
            screen.queryByText("Test product 1")
        ).not.toBeInTheDocument();

        expect(screen.getByText("0 items")).toBeInTheDocument();
    });

    it("should calculate the subtotal correctly", async () => {
        const user = userEvent.setup();

        renderCartPage();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        await user.click(
            screen.getByRole("button", { name: "Add product 2" })
        );

        // 100 + 200 = 300
        expect(screen.getAllByText("300.00 kr").length).toBe(2);
    });

    it("should charge 15 kr shipping when subtotal is below 300 kr", async () => {
        const user = userEvent.setup();

        renderCartPage();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        expect(screen.getByText("15.00 kr")).toBeInTheDocument();

        // 100 + 15 = 115
        expect(screen.getByText("115.00 kr")).toBeInTheDocument();
    });

    it("should provide free shipping when subtotal is 300 kr or more", async () => {
        const user = userEvent.setup();

        renderCartPage();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        // 3 * 100 = 300
        expect(screen.getByText("Free")).toBeInTheDocument();

        expect(screen.getAllByText("300.00 kr").length).toBe(3);
    });

});