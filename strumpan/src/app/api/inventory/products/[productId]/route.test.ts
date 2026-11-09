import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, authorizeInventoryAccess } = vi.hoisted(() => ({
	getConnection: vi.fn(),
	authorizeInventoryAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ pool: { getConnection } }));
vi.mock("@/lib/inventory/access", () => ({ authorizeInventoryAccess }));

import { DELETE, GET, PATCH } from "./route";

function mockConnection(queryImpl?: (sql: string) => unknown) {
	const connection = {
		beginTransaction: vi.fn(),
		commit: vi.fn(),
		rollback: vi.fn(),
		release: vi.fn(),
		query: vi.fn(async (sql: string) =>
			queryImpl ? queryImpl(sql) : { affectedRows: 1 }
		),
	};
	getConnection.mockResolvedValue(connection);
	return connection;
}

const ctx = (productId: string) => ({ params: Promise.resolve({ productId }) });

function patch(productId: string, body: unknown) {
	return PATCH(
		new Request("http://localhost/x", { method: "PATCH", body: JSON.stringify(body) }),
		ctx(productId)
	);
}

const productRows = [
	{
		product_id: 1, product_name: "Sock", category_id: 2,
		variant_id: 10, sku: "S-BLK-M", color: "Black", size: "M", quantity: "12",
	},
	{
		product_id: 1, product_name: "Sock", category_id: 2,
		variant_id: 11, sku: "S-BLK-L", color: null, size: "L", quantity: 0,
	},
];

describe("/api/inventory/products/[productId]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authorizeInventoryAccess.mockResolvedValue({ ok: true, adminId: 1 });
	});

	describe("GET", () => {
		it("returns the product with its variants", async () => {
			mockConnection(() => productRows);

			const res = await GET(new Request("http://localhost/x"), ctx("1"));
			const body = await res.json();

			expect(res.status).toBe(200);
			expect(body.product_name).toBe("Sock");
			expect(body.variants).toEqual([
				{ variant_id: 10, sku: "S-BLK-M", color: "Black", size: "M", quantity: 12 },
				{ variant_id: 11, sku: "S-BLK-L", color: null, size: "L", quantity: 0 },
			]);
		});

		it("returns an empty variant list for a product without variants", async () => {
			mockConnection(() => [
				{ ...productRows[0], variant_id: null, sku: null, color: null, size: null, quantity: 0 },
			]);

			const res = await GET(new Request("http://localhost/x"), ctx("1"));

			expect((await res.json()).variants).toEqual([]);
		});

		it("returns 404 for an unknown product", async () => {
			mockConnection(() => []);
			const res = await GET(new Request("http://localhost/x"), ctx("999"));
			expect(res.status).toBe(404);
		});

		it("returns 400 for an invalid id", async () => {
			const res = await GET(new Request("http://localhost/x"), ctx("<product_id>"));
			expect(res.status).toBe(400);
			expect(getConnection).not.toHaveBeenCalled();
		});

		it("returns 403 when access is denied", async () => {
			authorizeInventoryAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
			const res = await GET(new Request("http://localhost/x"), ctx("1"));
			expect(res.status).toBe(403);
			expect(getConnection).not.toHaveBeenCalled();
		});
	});

	describe("PATCH", () => {
		it("renames the product and writes an audit log", async () => {
			const c = mockConnection();

			const res = await patch("1", { productName: "  New name " });

			expect(res.status).toBe(200);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("UPDATE Products SET product_name"),
				["New name", 1]
			);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO Audit_log"),
				expect.arrayContaining([1, "update_product", "Products", 1])
			);
			expect(c.commit).toHaveBeenCalledOnce();
		});

		it.each([
			["price", { price: 1 }],
			["category", { categoryId: 2 }],
			["role", { role: "admin" }],
			["name plus price", { productName: "A", price: 1 }],
			["empty body", {}],
		])("rejects forbidden fields (%s)", async (_name, body) => {
			const res = await patch("1", body);
			expect(res.status).toBe(400);
			expect(getConnection).not.toHaveBeenCalled();
		});

		it("rejects an empty name", async () => {
			const res = await patch("1", { productName: " " });
			expect(res.status).toBe(400);
		});

		it("returns 404 and rolls back for an unknown product", async () => {
			const c = mockConnection(() => ({ affectedRows: 0 }));
			const res = await patch("999", { productName: "A" });
			expect(res.status).toBe(404);
			expect(c.rollback).toHaveBeenCalledOnce();
		});

		it("returns 403 when access is denied", async () => {
			authorizeInventoryAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
			const res = await patch("1", { productName: "A" });
			expect(res.status).toBe(403);
			expect(getConnection).not.toHaveBeenCalled();
		});
	});

	describe("DELETE", () => {
		it("deletes a product without orders", async () => {
			const c = mockConnection((sql) =>
				sql.includes("COUNT(*)") ? [{ n: BigInt(0) }] : { affectedRows: 1 }
			);

			const res = await DELETE(new Request("http://localhost/x"), ctx("1"));

			expect(res.status).toBe(200);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("DELETE FROM Products"),
				[1]
			);
			expect(c.commit).toHaveBeenCalledOnce();
		});

		it("returns 409 and deletes nothing when the product has orders", async () => {
			const c = mockConnection((sql) =>
				sql.includes("COUNT(*)") ? [{ n: BigInt(2) }] : { affectedRows: 1 }
			);

			const res = await DELETE(new Request("http://localhost/x"), ctx("1"));

			expect(res.status).toBe(409);
			expect(c.query).not.toHaveBeenCalledWith(
				expect.stringContaining("DELETE FROM Products"),
				expect.anything()
			);
			expect(c.rollback).toHaveBeenCalledOnce();
		});

		it("returns 404 for an unknown product", async () => {
			mockConnection((sql) =>
				sql.includes("COUNT(*)") ? [{ n: BigInt(0) }] : { affectedRows: 0 }
			);
			const res = await DELETE(new Request("http://localhost/x"), ctx("999"));
			expect(res.status).toBe(404);
		});

		it("returns 403 when access is denied", async () => {
			authorizeInventoryAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
			const res = await DELETE(new Request("http://localhost/x"), ctx("1"));
			expect(res.status).toBe(403);
			expect(getConnection).not.toHaveBeenCalled();
		});
	});
});