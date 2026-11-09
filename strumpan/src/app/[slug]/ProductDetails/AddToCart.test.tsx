import { describe, it, expect} from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import '@testing-library/jest-dom/vitest';
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import AddToCart from "./AddToCart";
import { CartProvider } from "@/app/CartContext";

const product = {
    id: 1,
    title: "Test product",
    description: "Test description",
    price: 100,
    stock: 50,
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