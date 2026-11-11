import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection } = vi.hoisted(() => ({
	getConnection: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	pool: { getConnection },
}));

import { GET } from "./route";

describe("GET /api/products", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns products from the database and releases the connection", async () => {
		const products = [
			{
				product_id: 1,
				category_id: 1,
				name: "Classic Cotton Sock",
				description: "Soft cotton socks for everyday use.",
				price: 89.00,
				image_url: "https://example.test/images/classic-cotton-sock.jpg",
			},
		];
		const connection = {
			query: vi.fn().mockResolvedValue(products),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await GET();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(products);
		expect(connection.query).toHaveBeenCalledWith(
			expect.stringContaining("product_name AS name")
		);
		expect(connection.query).toHaveBeenCalledWith(
			expect.stringContaining("product_description AS description")
		);
		expect(connection.query).toHaveBeenCalledWith(
			expect.stringContaining("picture_url AS image_url")
		);
		expect(connection.query).toHaveBeenCalledWith(
			expect.stringContaining("ORDER BY product_id ASC")
		);
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("returns an empty array when no products exist", async () => {
		const connection = {
			query: vi.fn().mockResolvedValue([]),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await GET();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("returns an error when the database request fails", async () => {
		const connection = {
			query: vi.fn().mockRejectedValue(new Error("database unavailable")),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await GET();

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({
			error: "Failed to fetch products",
	});
		expect(connection.release).toHaveBeenCalledOnce();
	});
});
