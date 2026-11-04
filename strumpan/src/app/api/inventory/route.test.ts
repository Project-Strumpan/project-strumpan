import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, authorizeInventoryAccess } = vi.hoisted(() => ({
	getConnection: vi.fn(),
	authorizeInventoryAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	pool: { getConnection },
}));

vi.mock("@/lib/inventory/access", () => ({
	authorizeInventoryAccess,
}));

import { GET } from "./route";

const rows = [
	{
		product_id: 1,
		variant_id: 10,
		name: "Classic Cotton Sock",
		sku: "SOCK-BLK-M",
		color: "Black",
		size: "M",
		quantity: "12",
		last_updated: "2026-11-04T12:00:00.000Z",
	},
	{
		product_id: 1,
		variant_id: 11,
		name: "Classic Cotton Sock",
		sku: "SOCK-BLK-L",
		color: "Black",
		size: "L",
		quantity: 3,
		last_updated: null,
	},
	{
		product_id: 2,
		variant_id: 20,
		name: "Wool Sock",
		sku: "WOOL-GRY-M",
		color: null,
		size: "M",
		quantity: 0,
		last_updated: null,
	},
];

function mockConnection(result: unknown) {
	const connection = {
		query: vi.fn().mockResolvedValue(result),
		release: vi.fn(),
	};
	getConnection.mockResolvedValue(connection);
	return connection;
}

describe("GET /api/inventory", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authorizeInventoryAccess.mockResolvedValue({ ok: true });
	});

	it("returns inventory items with computed availability and releases the connection", async () => {
		const connection = mockConnection(rows);

		const response = await GET(new Request("http://localhost/api/inventory"));
		const body = await response.json();

		expect(response.status).toBe(200);
		expect(body.total).toBe(3);
		expect(body.items.map((i: { availability: string }) => i.availability)).toEqual([
			"in_stock",
			"low_stock",
			"out_of_stock",
		]);
		expect(body.items[0]).toEqual({
			product_id: 1,
			variant_id: 10,
			name: "Classic Cotton Sock",
			sku: "SOCK-BLK-M",
			color: "Black",
			size: "M",
			quantity: 12,
			last_updated: "2026-11-04T12:00:00.000Z",
			availability: "in_stock",
		});
		expect(body.items[2].last_updated).toBeNull();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("searches by product name and SKU", async () => {
		const connection = mockConnection([rows[0]]);

		await GET(new Request("http://localhost/api/inventory?search=sock"));

		expect(connection.query).toHaveBeenCalledWith(
			expect.stringContaining("p.product_name LIKE ? OR pv.sku LIKE ?"),
			["%sock%", "%sock%"]
		);
	});

	it("filters by color and size", async () => {
		const connection = mockConnection([rows[0]]);

		await GET(new Request("http://localhost/api/inventory?color=Black&size=M"));

		expect(connection.query).toHaveBeenCalledWith(
			expect.stringContaining("pv.color = ?"),
			["Black", "M"]
		);
		expect(connection.query).toHaveBeenCalledWith(
			expect.stringContaining("pv.product_variant_size = ?"),
			["Black", "M"]
		);
	});

	it("filters by availability", async () => {
		const connection = mockConnection([rows[2]]);

		await GET(new Request("http://localhost/api/inventory?availability=out_of_stock"));

		expect(connection.query).toHaveBeenCalledWith(
			expect.stringContaining("COALESCE(i.quantity, 0) <= 0"),
			[]
		);

		await GET(new Request("http://localhost/api/inventory?availability=low_stock"));

		expect(connection.query).toHaveBeenLastCalledWith(
			expect.stringContaining("COALESCE(i.quantity, 0) <= ?"),
			[5]
		);
	});

	it("rejects an invalid availability filter without querying the database", async () => {
		const response = await GET(
			new Request("http://localhost/api/inventory?availability=banana")
		);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Invalid availability filter" });
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("returns an empty list when nothing matches", async () => {
		const connection = mockConnection([]);

		const response = await GET(new Request("http://localhost/api/inventory?search=none"));

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ items: [], total: 0 });
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("returns 500 without mock fallback when the database fails", async () => {
		const connection = {
			query: vi.fn().mockRejectedValue(new Error("database unavailable")),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);
		vi.spyOn(console, "error").mockImplementation(() => {});

		const response = await GET(new Request("http://localhost/api/inventory"));

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: "Failed to fetch inventory" });
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("returns 403 and does not touch the database when access is denied", async () => {
		authorizeInventoryAccess.mockResolvedValue({
			ok: false,
			status: 403,
			error: "Forbidden",
		});

		const response = await GET(new Request("http://localhost/api/inventory"));

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: "Forbidden" });
		expect(getConnection).not.toHaveBeenCalled();
	});
});