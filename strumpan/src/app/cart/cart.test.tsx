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
            <button onClick={() => cart.addOneToCart("1")}>
                Add product 1
            </button>

            <button onClick={() => cart.addOneToCart("2")}>
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


function NavigationTest() {
    const [page, setPage] = useState("product");

    const cart = useContext(CartContext);

    if (!cart) return null;

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
                <button onClick={() => cart.addOneToCart("1")}>
                    Add product
                </button>
            )}

            {page === "cart" && <CartPage />}

            {page === "another" && <h1>Another page</h1>}

            {page === "product" && <h1>Product page</h1>}
        </div>
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

    it("The cart page item list is empty if there's nothing in the cart.", () => {
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


    it("Shows the items from the customers site-wide shopping cart", async () => {
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

    it("The price of the product shown on the page is the same as in the storage", async () => {
        const user = userEvent.setup();

        renderCartPage();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        expect(screen.getByLabelText(/price of Test product 1/i).innerHTML === "100.00 kr");
    });

    it("Total cost per product is based on the quantity of the product", async () => {
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

    it("Supports increasing the quantity of a product", async () => {
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

    it("Supports decreasing the quantity of a product   ", async () => {
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

    it("Removes item if quantity is decreased to 0 or remove button is pressed_decrease", async () => {
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

    it("Removes item if quantity is decreased to 0 or remove button is pressed_remove", async () => {
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

    it("The cart page lists items, quantities, subtotals and total_subtotal", async () => {
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

    it("Shipping price is based on the total price of the cart items_UnderThreshold", async () => {
        const user = userEvent.setup();

        renderCartPage();

        await user.click(
            screen.getByRole("button", { name: "Add product 1" })
        );

        expect(screen.getByText("15.00 kr")).toBeInTheDocument();

        // 100 + 15 = 115
        expect(screen.getByText("115.00 kr")).toBeInTheDocument();
    });

    it("Shipping price is based on the total price of the cart items_OverThreshold", async () => {
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
    it("Changes persist between opening a different page and going back", async () => {
        const user = userEvent.setup();

        render(
            <CartProvider>
                <NavigationTest />
            </CartProvider>
        );

        // Add product
        await user.click(
            screen.getByRole("button", { name: "Add product" })
        );

        // Open cart
        await user.click(
            screen.getByRole("button", { name: "Open cart" })
        );

        expect(
            screen.getByText("Test product 1")
        ).toBeInTheDocument();

        // Navigate away
        await user.click(
            screen.getByRole("button", { name: "Go to another page" })
        );

        // Navigate back to cart
        await user.click(
            screen.getByRole("button", { name: "Open cart" })
        );

        // Product should still exist
        expect(
            screen.getByText("Test product 1")
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText(/price of Test product 1/i)
        ).toBeInTheDocument();
    });
});