import { describe, it, expect} from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import '@testing-library/jest-dom/vitest';
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import AddToCart from "./AddToCart";
import { CartProvider, Product } from "@/app/CartContext";

const product: Product = {
    id: 1,
    category_id: 1,
    product_name: "Test product",
    product_description: "Test description",
    price: 100,
    stock: 50,
    quantity: 0,
    picture_url:
      "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=300&q=80",
    origin: "Lorem Ipsum",
    material: "Lorem Ipsum",
    env_labels: "Lorem Ipsum",
    created_date: new Date("2025/4/4"),
};

function renderComponent() {
    return render(
        <CartProvider>
            <AddToCart product={product} />
        </CartProvider>
    );
}

afterEach(() => {
    cleanup();
});

describe("AddToCart", () => {

    it("should show Add to cart when opening the product page", () => {
        renderComponent();

        expect(
            screen.getByRole("button", { name: /add to cart/i })
        ).toBeInTheDocument();

        expect(
            screen.queryByRole("button", { name: /increase quantity/i })
        ).not.toBeInTheDocument();

        expect(
            screen.queryByRole("button", { name: /decrease quantity/i })
        ).not.toBeInTheDocument();
    });

    it("Buttons to change the quantity of the product should show when add to cart is pressed once", async () => {
        const user = userEvent.setup();

        renderComponent();

        await user.click(
            screen.getByRole("button", { name: /add to cart/i })
        );

        expect(
            screen.getByRole("button", { name: /increase quantity/i })
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: /decrease quantity/i })
        ).toBeInTheDocument();
    });

    it("The customer should be able to add the quantity of a product that is available in the stock", async () => {
        const user = userEvent.setup();

        renderComponent();

        await user.click(
            screen.getByRole("button", { name: /add to cart/i })
        );

        await user.click(
            screen.getByRole("button", { name: /increase quantity/i })
        );

        expect(screen.getByText("In Cart: 2")).toBeInTheDocument();
    });

    it("The customer should be able to decrease the quantity of product to be added to the cart", async () => {
        const user = userEvent.setup();

        renderComponent();

        await user.click(
            screen.getByRole("button", { name: /add to cart/i })
        );

        await user.click(
            screen.getByRole("button", { name: /increase quantity/i })
        );

        await user.click(
            screen.getByRole("button", { name: /decrease quantity/i })
        );

        expect(screen.getByText("In Cart: 1")).toBeInTheDocument();
    });
 
    it("Buttons to change the quantity of the product shouldn’t be visible upon opening the page", async () => {
        const user = userEvent.setup();

        renderComponent();

        await user.click(
            screen.getByRole("button", { name: /add to cart/i })
        );

        await user.click(
            screen.getByRole("button", { name: /decrease quantity/i })
        );

        expect(
            screen.getByRole("button", { name: /add to cart/i })
        ).toBeInTheDocument();
    });
});