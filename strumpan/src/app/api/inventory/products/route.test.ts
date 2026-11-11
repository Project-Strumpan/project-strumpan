import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, authorizeInventoryAccess } = vi.hoisted(() => ({
	getConnection: vi.fn(),
	authorizeInventoryAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ pool: { getConnection } }));
vi.mock("@/lib/inventory/access", () => ({ authorizeInventoryAccess }));

import { POST } from "./route";

const validBody = {
	productName: "Test Sock",
	categoryId: 1,
	price: 79,
	variants: [{ sku: "TEST-BLK-M", color: "Black", size: "M", quantity: 10 }],
};

function mockConnection() {
	let nextId = 100;
	const connection = {
		beginTransaction: vi.fn(),
		commit: vi.fn(),
		rollback: vi.fn(),
		release: vi.fn(),
		query: vi.fn(async (sql: string) => {
			if (
				sql.includes("INSERT INTO Products") ||
				sql.includes("INSERT INTO Product_variants")
			) {
				return { insertId: nextId++, affectedRows: 1 };
			}
			return { affectedRows: 1 };
		}),
	};
	getConnection.mockResolvedValue(connection);
	return connection;
}

function call(body: unknown) {
	return POST(
		new Request("http://localhost/api/inventory/products", {
			method: "POST",
			body: typeof body === "string" ? body : JSON.stringify(body),
		})
	);
}

describe("POST /api/inventory/products", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authorizeInventoryAccess.mockResolvedValue({ ok: true, adminId: 1 });
	});

	it("creates product, variant and inventory row, writes audit log and commits", async () => {
		const c = mockConnection();

		const res = await call(validBody);

		expect(res.status).toBe(201);
		expect(await res.json()).toEqual({ product_id: 100, variant_ids: [101] });
		expect(c.query).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO Inventory"),
			[101, 10]
		);
		expect(c.query).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO Audit_log"),
			expect.arrayContaining([1, "create_product", "Products", 100])
		);
		expect(c.commit).toHaveBeenCalledOnce();
		expect(c.release).toHaveBeenCalledOnce();
	});

	it("stores an empty colour as null", async () => {
		const c = mockConnection();

		await call({
			...validBody,
			variants: [{ sku: "X-1", color: "", size: "M", quantity: 0 }],
		});

		expect(c.query).toHaveBeenCalledWith(
			expect.stringContaining("INSERT INTO Product_variants"),
			[100, "M", null, "X-1"]
		);
	});

	it.each([
		["empty name", { ...validBody, productName: "  " }],
		["category 0", { ...validBody, categoryId: 0 }],
		["negative price", { ...validBody, price: -1 }],
		["no variants", { ...validBody, variants: [] }],
		[
			"negative quantity",
			{ ...validBody, variants: [{ sku: "A", color: null, size: "M", quantity: -1 }] },
		],
		[
			"fractional quantity",
			{ ...validBody, variants: [{ sku: "A", color: null, size: "M", quantity: 1.5 }] },
		],
		[
			"missing sku",
			{ ...validBody, variants: [{ sku: "", color: null, size: "M", quantity: 1 }] },
		],
	])("rejects %s without touching the database", async (_name, body) => {
		const res = await call(body);

		expect(res.status).toBe(400);
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("rejects invalid JSON", async () => {
		const res = await call("not json");
		expect(res.status).toBe(400);
	});

	it("returns 409 and rolls back on duplicate SKU", async () => {
		const c = mockConnection();
		c.query.mockImplementation(async (sql: string) => {
			if (sql.includes("INSERT INTO Product_variants")) {
				throw Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" });
			}
			return { insertId: 100, affectedRows: 1 };
		});

		const res = await call(validBody);

		expect(res.status).toBe(409);
		expect(await res.json()).toEqual({ error: "SKU already exists" });
		expect(c.rollback).toHaveBeenCalledOnce();
		expect(c.commit).not.toHaveBeenCalled();
	});

	it("returns 400 for an unknown category", async () => {
		const c = mockConnection();
		c.query.mockRejectedValue(
			Object.assign(new Error("fk"), { code: "ER_NO_REFERENCED_ROW_2" })
		);

		const res = await call(validBody);

		expect(res.status).toBe(400);
		expect(await res.json()).toEqual({ error: "Invalid category" });
		expect(c.rollback).toHaveBeenCalledOnce();
	});

	it("returns 403 and does not touch the database when forbidden", async () => {
		authorizeInventoryAccess.mockResolvedValue({
			ok: false,
			status: 403,
			error: "Forbidden",
		});

		const res = await call(validBody);

		expect(res.status).toBe(403);
		expect(getConnection).not.toHaveBeenCalled();
	});
});