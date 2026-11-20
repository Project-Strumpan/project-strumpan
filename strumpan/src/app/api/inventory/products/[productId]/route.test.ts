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
		vi.spyOn(console, "error").mockImplementation(() => {});
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

		it("returns 401 when signed out", async () => {
			authorizeInventoryAccess.mockResolvedValue({
				ok: false,
				status: 401,
				error: "Authentication required",
			});
			const res = await GET(new Request("http://localhost/x"), ctx("1"));
			expect(res.status).toBe(401);
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
		const patchImpl = (sql: string) =>
			sql.includes("SELECT product_name") ? [{ product_name: "Old name" }] : { affectedRows: 1 };

		it("renames the product and logs before and after values", async () => {
			const c = mockConnection(patchImpl);

			const res = await patch("1", { productName: "  New name " });

			expect(res.status).toBe(200);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("UPDATE Products SET product_name"),
				["New name", 1]
			);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO Audit_log"),
				[
					1,
					"update_product",
					"Products",
					1,
					JSON.stringify({
						before: { productName: "Old name" },
						after: { productName: "New name" },
					}),
				]
			);
			expect(c.commit).toHaveBeenCalledOnce();
		});

		it("rolls back and returns 500 when the audit insert fails", async () => {
			const c = mockConnection((sql) => {
				if (sql.includes("INSERT INTO Audit_log")) throw new Error("audit failed");
				return patchImpl(sql);
			});

			const res = await patch("1", { productName: "New name" });

			expect(res.status).toBe(500);
			expect(c.rollback).toHaveBeenCalledOnce();
			expect(c.commit).not.toHaveBeenCalled();
			expect(c.release).toHaveBeenCalledOnce();
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

		it("rejects an empty name and names the field", async () => {
			const res = await patch("1", { productName: " " });
			expect(res.status).toBe(400);
			expect((await res.json()).field).toBe("productName");
		});

		it("rejects invalid JSON", async () => {
			const res = await PATCH(
				new Request("http://localhost/x", { method: "PATCH", body: "not json" }),
				ctx("1")
			);
			expect(res.status).toBe(400);
			expect(getConnection).not.toHaveBeenCalled();
		});

		it("returns 400 for an invalid id", async () => {
			const res = await patch("abc", { productName: "A" });
			expect(res.status).toBe(400);
			expect(getConnection).not.toHaveBeenCalled();
		});

		it("returns 404 and rolls back for an unknown product", async () => {
			const c = mockConnection(() => []);
			const res = await patch("999", { productName: "A" });
			expect(res.status).toBe(404);
			expect(c.rollback).toHaveBeenCalledOnce();
			expect(c.commit).not.toHaveBeenCalled();
		});

		it("returns 403 when access is denied", async () => {
			authorizeInventoryAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
			const res = await patch("1", { productName: "A" });
			expect(res.status).toBe(403);
			expect(getConnection).not.toHaveBeenCalled();
		});
	});

	describe("DELETE", () => {
		const snapshotRows = [
			{
				product_name: "Sock", category_id: 2,
				variant_id: 10, sku: "S-BLK-M", color: "Black", size: "M", quantity: "12",
			},
		];

		const deleteImpl = (orders: number, rows: unknown[] = snapshotRows) => (sql: string) => {
			if (sql.includes("COUNT(*)")) return [{ n: BigInt(orders) }];
			if (sql.includes("FROM Products p")) return rows;
			return { affectedRows: 1 };
		};

		it("deletes a product without orders and logs a snapshot of what was removed", async () => {
			const c = mockConnection(deleteImpl(0));

			const res = await DELETE(new Request("http://localhost/x"), ctx("1"));

			expect(res.status).toBe(200);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("DELETE FROM Products"),
				[1]
			);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO Audit_log"),
				[
					1,
					"delete_product",
					"Products",
					1,
					JSON.stringify({
						before: {
							productName: "Sock",
							categoryId: 2,
							variants: [
								{ variantId: 10, sku: "S-BLK-M", color: "Black", size: "M", quantity: 12 },
							],
						},
					}),
				]
			);
			expect(c.commit).toHaveBeenCalledOnce();
		});

		it("logs an empty variant list for a product without variants", async () => {
			const c = mockConnection(
				deleteImpl(0, [
					{
						product_name: "Empty", category_id: 2,
						variant_id: null, sku: null, color: null, size: null, quantity: null,
					},
				])
			);

			const res = await DELETE(new Request("http://localhost/x"), ctx("1"));

			expect(res.status).toBe(200);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO Audit_log"),
				[
					1,
					"delete_product",
					"Products",
					1,
					JSON.stringify({ before: { productName: "Empty", categoryId: 2, variants: [] } }),
				]
			);
		});

		it("returns 409 and deletes nothing when the product has orders", async () => {
			const c = mockConnection(deleteImpl(2));

			const res = await DELETE(new Request("http://localhost/x"), ctx("1"));

			expect(res.status).toBe(409);
			expect(c.query).not.toHaveBeenCalledWith(
				expect.stringContaining("DELETE FROM Products"),
				expect.anything()
			);
			expect(c.query).not.toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO Audit_log"),
				expect.anything()
			);
			expect(c.rollback).toHaveBeenCalledOnce();
		});

		it("rolls back and keeps the product when the audit insert fails", async () => {
			const c = mockConnection((sql) => {
				if (sql.includes("INSERT INTO Audit_log")) throw new Error("audit failed");
				return deleteImpl(0)(sql);
			});

			const res = await DELETE(new Request("http://localhost/x"), ctx("1"));

			expect(res.status).toBe(500);
			expect(c.rollback).toHaveBeenCalledOnce();
			expect(c.commit).not.toHaveBeenCalled();
			expect(c.release).toHaveBeenCalledOnce();
		});

		it("returns 404 for an unknown product", async () => {
			const c = mockConnection(deleteImpl(0, []));
			const res = await DELETE(new Request("http://localhost/x"), ctx("999"));
			expect(res.status).toBe(404);
			expect(c.rollback).toHaveBeenCalledOnce();
		});

		it("returns 400 for an invalid id", async () => {
			const res = await DELETE(new Request("http://localhost/x"), ctx("abc"));
			expect(res.status).toBe(400);
			expect(getConnection).not.toHaveBeenCalled();
		});

		it("returns 403 when access is denied", async () => {
			authorizeInventoryAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
			const res = await DELETE(new Request("http://localhost/x"), ctx("1"));
			expect(res.status).toBe(403);
			expect(getConnection).not.toHaveBeenCalled();
		});
	});
});
