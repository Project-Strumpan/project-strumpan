import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, authorizeInventoryAccess } = vi.hoisted(() => ({
	getConnection: vi.fn(),
	authorizeInventoryAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ pool: { getConnection } }));
vi.mock("@/lib/inventory/access", () => ({ authorizeInventoryAccess }));

import { POST } from "./route";

const validBody = { sku: "NEW-1", color: "Grey", size: "L", quantity: 5 };

const ctx = (productId: string) => ({ params: Promise.resolve({ productId }) });

function mockConnection(productExists = true) {
	const connection = {
		beginTransaction: vi.fn(),
		commit: vi.fn(),
		rollback: vi.fn(),
		release: vi.fn(),
		query: vi.fn(async (sql: string) => {
			if (sql.includes("SELECT product_id FROM Products")) {
				return productExists ? [{ product_id: 1 }] : [];
			}
			if (sql.includes("INSERT INTO Product_variants")) {
				return { insertId: 50, affectedRows: 1 };
			}
			return { affectedRows: 1 };
		}),
	};
	getConnection.mockResolvedValue(connection);
	return connection;
}

function call(productId: string, body: unknown) {
	return POST(
		new Request("http://localhost/x", {
			method: "POST",
			body: typeof body === "string" ? body : JSON.stringify(body),
		}),
		ctx(productId)
	);
}

describe("POST /api/inventory/products/[productId]/variants", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authorizeInventoryAccess.mockResolvedValue({ ok: true, adminId: 1 });
	});

	it("adds a variant and its inventory row, writes an audit log and commits", async () => {
		const c = mockConnection();

		const res = await call("1", validBody);

		expect(res.status).toBe(201);
		expect(await res.json()).toEqual({ variant_id: 50 });
		expect(c.query).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO Product_variants"),
			[1, "L", "Grey", "NEW-1"]
		);
		expect(c.query).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO Inventory"),
			[50, 5]
		);
		expect(c.query).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO Audit_log"),
			expect.arrayContaining([1, "create_variant", "Product_variants", 50])
		);
		expect(c.commit).toHaveBeenCalledOnce();
		expect(c.release).toHaveBeenCalledOnce();
	});

	it("returns 404 and rolls back for an unknown product", async () => {
		const c = mockConnection(false);

		const res = await call("999", validBody);

		expect(res.status).toBe(404);
		expect(c.rollback).toHaveBeenCalledOnce();
		expect(c.query).not.toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO Product_variants"),
			expect.anything()
		);
	});

	it("returns 409 and rolls back on duplicate SKU", async () => {
		const c = mockConnection();
		c.query.mockImplementation(async (sql: string) => {
			if (sql.includes("SELECT product_id FROM Products")) return [{ product_id: 1 }];
			if (sql.includes("INSERT INTO Product_variants")) {
				throw Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" });
			}
			return { affectedRows: 1 };
		});

		const res = await call("1", validBody);

		expect(res.status).toBe(409);
		expect(await res.json()).toEqual({ error: "SKU already exists", field: "sku" });
		expect(c.rollback).toHaveBeenCalledOnce();
		expect(c.commit).not.toHaveBeenCalled();
	});

	it.each([
		["price", { ...validBody, price: 10 }, "price"],
		["product_id", { ...validBody, product_id: 2 }, "product_id"],
		["role", { ...validBody, role: "admin" }, "role"],
	])("rejects forbidden field (%s)", async (_name, body, field) => {
		const res = await call("1", body);

		expect(res.status).toBe(400);
		expect((await res.json()).field).toBe(field);
		expect(getConnection).not.toHaveBeenCalled();
	});

	it.each([
		["negative quantity", { ...validBody, quantity: -1 }],
		["fractional quantity", { ...validBody, quantity: 1.5 }],
		["string quantity", { ...validBody, quantity: "5" }],
	])("rejects %s", async (_name, body) => {
		const res = await call("1", body);

		expect(res.status).toBe(400);
		expect((await res.json()).field).toBe("quantity");
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("rejects a missing sku", async () => {
		const res = await call("1", { ...validBody, sku: " " });

		expect(res.status).toBe(400);
		expect((await res.json()).field).toBe("sku");
	});

	it("returns 400 for an invalid product id", async () => {
		const res = await call("abc", validBody);

		expect(res.status).toBe(400);
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("rejects invalid JSON", async () => {
		const res = await call("1", "not json");

		expect(res.status).toBe(400);
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("returns 500, rolls back and releases the connection on unexpected errors", async () => {
		const c = mockConnection();
		c.query.mockRejectedValue(new Error("boom"));

		const res = await call("1", validBody);

		expect(res.status).toBe(500);
		expect(c.rollback).toHaveBeenCalledOnce();
		expect(c.release).toHaveBeenCalledOnce();
	});

	it("returns 401 when signed out", async () => {
		authorizeInventoryAccess.mockResolvedValue({
			ok: false,
			status: 401,
			error: "Authentication required",
		});

		const res = await call("1", validBody);

		expect(res.status).toBe(401);
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("returns 403 when access is denied", async () => {
		authorizeInventoryAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });

		const res = await call("1", validBody);

		expect(res.status).toBe(403);
		expect(getConnection).not.toHaveBeenCalled();
	});
});
