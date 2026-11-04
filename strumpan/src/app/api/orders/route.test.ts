import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

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

import { POST } from "./route";

const validRequest = {
	delivery_address_id: 10,
	invoice_address_id: 11,
	items: [{ variant_id: 20, quantity: 2 }],
};

function createRequest(body: unknown) {
	return new NextRequest("http://localhost/api/orders", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/orders", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireUser.mockResolvedValue({ customer_id: 7 });
	});

	it("creates an order for the authenticated customer", async () => {
		const connection = {
			beginTransaction: vi.fn(),
			query: vi.fn()
				.mockResolvedValueOnce([{ address_id: 10 }, { address_id: 11 }])
				.mockResolvedValueOnce([{ variant_id: 20, quantity: "5", price: "89.00" }])
				.mockResolvedValueOnce({ insert_id: 100, affected_rows: 1 })
				.mockResolvedValueOnce({ insert_id: 200, affected_rows: 1 }),
			commit: vi.fn(),
			rollback: vi.fn(),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await POST(createRequest(validRequest));

		expect(response.status).toBe(201);
		expect(await response.json()).toEqual({
			order_id: 100,
			order_status: "created",
			total_cost: 178,
			items: [
				{
					order_item_id: 200,
					variant_id: 20,
					quantity: 2,
					unit_price: 89,
				},
			],
		});
		expect(connection.beginTransaction).toHaveBeenCalledOnce();
		expect(connection.commit).toHaveBeenCalledOnce();
		expect(connection.rollback).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
		expect(connection.query).toHaveBeenNthCalledWith(
			1,
			expect.stringContaining("customer_id = ?"),
			[10, 11, 7]
		);
		expect(connection.query).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO Orders"),
			[7, 10, 11, 178]
		);
	});

	it("returns 401 when the customer is not authenticated", async () => {
		requireUser.mockRejectedValue(new Error("Authentication is not implemented"));

		const response = await POST(createRequest(validRequest));

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "Authentication required" });
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("rejects malformed JSON", async () => {
		const request = new NextRequest("http://localhost/api/orders", {
			method: "POST",
			body: "not-json",
		});

		const response = await POST(request);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "Request body must be valid JSON",
		});
		expect(requireUser).not.toHaveBeenCalled();
	});

	it("rolls back when an address does not belong to the customer", async () => {
		const connection = {
			beginTransaction: vi.fn(),
			query: vi.fn().mockResolvedValue([{ address_id: 10 }]),
			commit: vi.fn(),
			rollback: vi.fn(),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await POST(createRequest(validRequest));

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: "One or more addresses are invalid",
		});
		expect(connection.rollback).toHaveBeenCalledOnce();
		expect(connection.commit).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("returns conflict and rolls back when stock is insufficient", async () => {
		const connection = {
			beginTransaction: vi.fn(),
			query: vi.fn()
				.mockResolvedValueOnce([{ address_id: 10 }, { address_id: 11 }])
				.mockResolvedValueOnce([{ variant_id: 20, quantity: "1", price: "89.00" }]),
			commit: vi.fn(),
			rollback: vi.fn(),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await POST(createRequest(validRequest));

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			error: "Insufficient stock for variant 20",
		});
		expect(connection.rollback).toHaveBeenCalledOnce();
		expect(connection.commit).not.toHaveBeenCalled();
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("returns 500 and rolls back when the database fails", async () => {
		const connection = {
			beginTransaction: vi.fn(),
			query: vi.fn().mockRejectedValue(new Error("database unavailable")),
			commit: vi.fn(),
			rollback: vi.fn(),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		const response = await POST(createRequest(validRequest));

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: "Could not create order" });
		expect(connection.rollback).toHaveBeenCalledOnce();
		expect(connection.release).toHaveBeenCalledOnce();
	});
});
