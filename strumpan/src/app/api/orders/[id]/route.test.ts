import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, requireUser } = vi.hoisted(() => ({
	getConnection: vi.fn(),
	requireUser: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
	pool: { getConnection },
}));

vi.mock("@/lib/auth", () => ({
	requireUser,
}));

import { GET } from "./route";

function createRequest(id: string) {
	return new Request(`http://localhost/api/orders/${id}`);
}

describe("GET /api/orders/[id]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireUser.mockResolvedValue({ customer_id: 7 });
	});

	it("returns the authenticated customer's order and items", async () => {
		const connection = {
			query: vi.fn()
				.mockResolvedValueOnce([
					{
						order_id: 100,
						customer_id: 7,
						delivery_address_id: 10,
						invoice_address_id: 11,
						order_date: "2026-11-04T10:00:00.000Z",
						order_status: "created",
						total_cost: "178.00",
					},
				])
				.mockResolvedValueOnce([
					{
						order_item_id: 200,
						order_id: 100,
						variant_id: 20,
						quantity: "2",
						unit_price: "89.00",
					},
				]),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await GET(createRequest("100"), {
			params: Promise.resolve({ id: "100" }),
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			order_id: 100,
			customer_id: 7,
			delivery_address_id: 10,
			invoice_address_id: 11,
			order_date: "2026-11-04T10:00:00.000Z",
			order_status: "created",
			total_cost: 178,
			items: [
				{
					order_item_id: 200,
					order_id: 100,
					variant_id: 20,
					quantity: 2,
					unit_price: 89,
				},
			],
		});
		expect(connection.query).toHaveBeenNthCalledWith(
			1,
			expect.stringContaining("o.customer_id = ?"),
			[100, 7]
		);
		expect(connection.query).toHaveBeenNthCalledWith(
			2,
			expect.stringContaining("ORDER BY oi.order_item_id ASC"),
			[100]
		);
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("returns not found for an unknown or unauthorized order", async () => {
		const connection = {
			query: vi.fn().mockResolvedValue([]),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await GET(createRequest("999"), {
			params: Promise.resolve({ id: "999" }),
		});

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ error: "Order not found" });
		expect(connection.query).toHaveBeenCalledOnce();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("returns 401 when the customer is not authenticated", async () => {
		requireUser.mockRejectedValue(new Error("Authentication required"));

		const response = await GET(createRequest("100"), {
			params: Promise.resolve({ id: "100" }),
		});

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Authentication required" });
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("rejects an invalid order ID without connecting to the database", async () => {
		const response = await GET(createRequest("nope"), {
			params: Promise.resolve({ id: "nope" }),
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: "Invalid order ID" });
		expect(requireUser).not.toHaveBeenCalled();
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("returns 500 and releases the connection when the database fails", async () => {
		const connection = {
			query: vi.fn().mockRejectedValue(new Error("database unavailable")),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await GET(createRequest("100"), {
			params: Promise.resolve({ id: "100" }),
		});

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: "Failed to fetch order" });
		expect(connection.release).toHaveBeenCalledOnce();
	});
});
