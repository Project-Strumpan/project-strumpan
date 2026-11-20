import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { updateInventoryQuantity } = vi.hoisted(() => ({
    updateInventoryQuantity: vi.fn(),
}));

vi.mock("@/lib/inventory/client", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/lib/inventory/client")>();
    return { ...actual, updateInventoryQuantity };
});

import { StockConflictError } from "@/lib/inventory/client";
import type { InventoryItem } from "@/types/inventory";
import StockEditor from "./StockEditor";

const item: InventoryItem = {
    productId: 1,
    variantId: 10,
    productName: "Classic Cotton Sock",
    sku: "SOCK-BLK-M",
    size: "M",
    color: "Black",
    quantity: 12,
    lastUpdated: null,
};

const EDIT_BUTTON = /^Edit stock\s*for SOCK-BLK-M$/;


function openEditor(onSaved = vi.fn()) {
    render(<StockEditor item={item} onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: EDIT_BUTTON }));
    const input = screen.getByLabelText("New quantity for SOCK-BLK-M") as HTMLInputElement;
    return { input, onSaved };
}

describe("StockEditor", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it("shows only the edit button until it is clicked", () => {
        render(<StockEditor item={item} onSaved={vi.fn()} />);

        expect(screen.getByRole("button", { name: EDIT_BUTTON })).toBeTruthy();
        expect(screen.queryByLabelText("New quantity for SOCK-BLK-M")).toBeNull();
    });

    it("opens with the current quantity prefilled", () => {
        const { input } = openEditor();

        expect(input.value).toBe("12");
    });

    it("saves a valid quantity with the expected quantity and closes the editor", async () => {
        updateInventoryQuantity.mockResolvedValue({ quantity: 20, lastUpdated: "x" });
        const { input, onSaved } = openEditor();

        await userEvent.clear(input);
        await userEvent.type(input, "20");
        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
        expect(updateInventoryQuantity).toHaveBeenCalledWith(10, 20, 12);
        expect(screen.queryByLabelText("New quantity for SOCK-BLK-M")).toBeNull();
    });

    it.each(["", "-1", "1.5"])("rejects the invalid value %j without calling the API", async (value) => {
        const { input, onSaved } = openEditor();

        fireEvent.change(input, { target: { value } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        expect(screen.getByRole("alert").textContent).toBe("Enter a whole number, 0 or higher.");
        expect(updateInventoryQuantity).not.toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
    });

    it("shows the current quantity and keeps the editor open on a stock conflict", async () => {
        updateInventoryQuantity.mockRejectedValue(new StockConflictError(15));
        const { onSaved } = openEditor();

        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        const alert = await screen.findByRole("alert");
        expect(alert.textContent).toContain("Stock changed to 15");
        expect(onSaved).not.toHaveBeenCalled();
        expect(screen.getByLabelText("New quantity for SOCK-BLK-M")).toBeTruthy();
    });

    it("shows a generic error when saving fails", async () => {
        updateInventoryQuantity.mockRejectedValue(new Error("boom"));
        const { onSaved } = openEditor();

        await userEvent.click(screen.getByRole("button", { name: "Save" }));

        const alert = await screen.findByRole("alert");
        expect(alert.textContent).toBe("Could not save. The quantity was not changed.");
        expect(onSaved).not.toHaveBeenCalled();
    });

    it("cancel closes the editor without calling the API", async () => {
        openEditor();

        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(screen.getByRole("button", { name: EDIT_BUTTON })).toBeTruthy();
        expect(updateInventoryQuantity).not.toHaveBeenCalled();
    });
});
