import { describe, it, expect} from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddToCart from "./AddToCart";
import { CartProvider } from "@/app/CartContext";
import '@testing-library/jest-dom/vitest';

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

const product = {
    id: "1",
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

    it("should show quantity buttons after pressing Add to cart", async () => {
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

    it("should increase the quantity when pressing plus", async () => {
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

    it("should decrease the quantity when pressing minus", async () => {
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
 
    it("should show Add to cart again when quantity reaches zero", async () => {
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