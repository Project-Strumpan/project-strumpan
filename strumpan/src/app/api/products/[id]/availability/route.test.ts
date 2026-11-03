import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection } = vi.hoisted(() => ({
	getConnection: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	pool: { getConnection },
}));

import { GET } from "./route";

describe("GET /api/products/[id]/availability", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns product availability with numeric quantities", async () => {
		const connection = {
			query: vi.fn()
				.mockResolvedValueOnce([{ product_id: 1 }])
				.mockResolvedValueOnce([
					{
						inventory_id: 100,
						variant_id: 10,
						quantity: "12",
						last_updated: "2026-10-01T12:00:00.000Z",
					},
				]),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await GET(
			new Request("http://localhost/api/products/1/availability"),
			{ params: Promise.resolve({ id: "1" }) }
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([
			{
				inventory_id: 100,
				variant_id: 10,
				quantity: 12,
				last_updated: "2026-10-01T12:00:00.000Z",
			},
		]);
		expect(connection.query).toHaveBeenNthCalledWith(
			1,
			expect.stringContaining("FROM Products"),
			[1]
		);
		expect(connection.query).toHaveBeenNthCalledWith(
			2,
			expect.stringContaining("ORDER BY i.variant_id ASC"),
			[1]
		);
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("returns an empty array when the product has no inventory records", async () => {
		const connection = {
			query: vi.fn()
				.mockResolvedValueOnce([{ product_id: 1 }])
				.mockResolvedValueOnce([]),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await GET(
			new Request("http://localhost/api/products/1/availability"),
			{ params: Promise.resolve({ id: "1" }) }
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("returns not found for an unknown product", async () => {
		const connection = {
			query: vi.fn().mockResolvedValue([]),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await GET(
			new Request("http://localhost/api/products/999/availability"),
			{ params: Promise.resolve({ id: "999" }) }
		);

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Product not found" });
		expect(connection.query).toHaveBeenCalledOnce();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("rejects an invalid product ID without connecting to the database", async () => {
		const response = await GET(
			new Request("http://localhost/api/products/nope/availability"),
			{ params: Promise.resolve({ id: "nope" }) }
		);

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

		const response = await GET(
			new Request("http://localhost/api/products/1/availability"),
			{ params: Promise.resolve({ id: "1" }) }
		);

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({
			error: "Failed to fetch product availability",
		});
		expect(connection.release).toHaveBeenCalledOnce();
	});
});
