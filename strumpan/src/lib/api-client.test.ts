import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createOrder,
	getProduct,
} from "./api-client";

const product = {
	product_id: 1,
	category_id: 1,
	name: "Classic Cotton Sock",
	description: "Soft cotton socks for everyday use.",
	price: 89,
	image_url: "https://example.test/images/classic-cotton-sock.jpg",
	variants: [
		{
			variant_id: 10,
			size: "M",
			color: "black",
			sku: "SOCK-BLK-M",
			available_quantity: 12,
		},
	],
};

const createdOrder = {
	order_id: 100,
	order_status: "created" as const,
	total_cost: 178,
	items: [
		{
			order_item_id: 200,
			variant_id: 10,
			quantity: 2,
			unit_price: 89,
		},
	],
};

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("product and order client operations", () => {
	it("returns a typed product detail response", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(product), { status: 200 })
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(getProduct(1)).resolves.toEqual(product);
		expect(fetchMock).toHaveBeenCalledWith("/api/products/1", undefined);
	});

	it("returns a typed completed order response", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(createdOrder), { status: 201 })
		);
		vi.stubGlobal("fetch", fetchMock);

		await expect(
			createOrder({
				delivery_address_id: 10,
				invoice_address_id: 11,
				items: [{ variant_id: 10, quantity: 2 }],
			})
		).resolves.toEqual(createdOrder);
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/orders",
			expect.objectContaining({ method: "POST" })
		);
	});

	it("classifies a network failure", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

		const result = getProduct(1);

		await expect(result).rejects.toMatchObject({
			name: "ApiClientError",
			kind: "network",
		});
		await expect(result).rejects.toThrow(
			"Unable to reach the server. Check your connection and try again."
		);
	});

	it("classifies a non-success HTTP response and preserves its useful message", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ error: "Product not found" }), {
					status: 404,
				})
			)
		);

		await expect(getProduct(999)).rejects.toEqual(
			expect.objectContaining({
				name: "ApiClientError",
				kind: "http",
				status: 404,
				message: "Product not found",
			})
		);
	});

	it("classifies invalid JSON as an invalid response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response("not-json", { status: 200 })
			)
		);

		await expect(getProduct(1)).rejects.toEqual(
			expect.objectContaining({
				name: "ApiClientError",
				kind: "invalid-response",
			})
		);
	});

	it("classifies a structurally invalid order response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(JSON.stringify({ order_id: 100 }), { status: 201 })
			)
		);

		await expect(createOrder({
			delivery_address_id: 10,
			invoice_address_id: 11,
			items: [{ variant_id: 10, quantity: 2 }],
		})).rejects.toMatchObject({
			name: "ApiClientError",
			kind: "invalid-response",
		});
	});
});
