import { describe, it, expect} from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import '@testing-library/jest-dom/vitest';
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import AddToCart from "./AddToCart";
import { CartItem, CartProvider } from "@/app/CartContext";
import { ProductWithVariants } from "@/types/product";

const product: CartItem = {
    id: "1",
    title: "Test product",
    description: "Test description",
    price: 100,
    quantity: 0,
    picture_url:
      "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=300&q=80",
};

function renderComponent() {
    return render(
        <CartProvider>
            <AddToCart product={product} available={true} />
        </CartProvider>
    );
}

afterEach(() => {
    cleanup();
    localStorage.clear();
});

describe("AddToCart", () => {

    it("should show Add to cart when opening the product page", () => {
        renderComponent();

        expect(
            screen.getByText("Lägg i varukorg")
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
            screen.getByText("Lägg i varukorg")
        );

        expect(
            screen.getByRole("button", { name: /Öka antal/i })
        ).toBeInTheDocument();

        expect(
            screen.getByRole("button", { name: /Minska antal/i })
        ).toBeInTheDocument();
    });

    it("The customer should be able to add the quantity of a product that is available in the stock", async () => {
        const user = userEvent.setup();

        renderComponent();

        await user.click(
            screen.getByText("Lägg i varukorg")
        );

        await user.click(
            screen.getByRole("button", { name: /Öka antal/i })
        );

        expect(screen.getByText("2 st i varukorgen")).toBeInTheDocument();
    });

    it("The customer should be able to decrease the quantity of product to be added to the cart", async () => {
        const user = userEvent.setup();

        renderComponent();
        await user.click(
            screen.getByText("Lägg i varukorg")
        );

        await user.click(
            screen.getByRole("button", { name: /Öka antal/i })
        );

        await user.click(
            screen.getByRole("button", { name: /Minska antal/i })
        );

        expect(screen.getByText("1 st i varukorgen")).toBeInTheDocument();
    });
 
    it("Buttons to change the quantity of the product shouldn’t be visible upon opening the page", async () => {
        const user = userEvent.setup();

        renderComponent();
        screen.debug()
        await user.click(
            screen.getByText("Lägg i varukorg")
        );

        await user.click(
            screen.getByRole("button", { name: /Minska antal/i })
        );

        expect(
            screen.getByText("Lägg i varukorg")
        ).toBeInTheDocument();
    });
});