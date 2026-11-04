import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection } = vi.hoisted(() => ({
	getConnection: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	pool: { getConnection },
}));

import { GET } from "./route";

describe("GET /api/products/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns a product with its variants", async () => {
		const productRows = [
			{
				product_id: 1,
				category_id: 1,
				name: "Classic Cotton Sock",
				description: "Soft cotton socks for everyday use.",
				price: "89.00",
				image_url: "https://example.test/images/classic-cotton-sock.jpg",
			},
		];
		const variantRows = [
			{
				variant_id: 10,
				size: "M",
				color: "black",
				sku: "SOCK-BLK-M",
				available_quantity: "12",
			},
		];
		const connection = {
			query: vi.fn()
				.mockResolvedValueOnce(productRows)
				.mockResolvedValueOnce(variantRows),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await GET(new Request("http://localhost/api/products/1"), {
			params: Promise.resolve({ id: "1" }),
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
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
		});
		expect(connection.query).toHaveBeenNthCalledWith(
			1,
			expect.stringContaining("product_name AS name"),
			[1]
		);
		expect(connection.query).toHaveBeenNthCalledWith(
			2,
			expect.stringContaining("pv.product_variant_size AS size"),
			[1]
		);
		expect(connection.query).toHaveBeenNthCalledWith(
			2,
			expect.stringContaining("ORDER BY pv.variant_id ASC"),
			[1]
		);
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("returns not found for an unknown product", async () => {
		const connection = {
			query: vi.fn().mockResolvedValue([]),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await GET(new Request("http://localhost/api/products/999"), {
			params: Promise.resolve({ id: "999" }),
		});

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Product not found" });
		expect(connection.query).toHaveBeenCalledOnce();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("rejects an invalid product ID without connecting to the database", async () => {
		const response = await GET(new Request("http://localhost/api/products/nope"), {
			params: Promise.resolve({ id: "nope" }),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Invalid product ID" });
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("returns an error when the database request fails", async () => {
		const connection = {
			query: vi.fn().mockRejectedValue(new Error("database unavailable")),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await GET(new Request("http://localhost/api/products/1"), {
			params: Promise.resolve({ id: "1" }),
		});

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({
			error: "Failed to fetch product",
		});
		expect(connection.release).toHaveBeenCalledOnce();
	});
});
