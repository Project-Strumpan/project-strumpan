import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, authorizeInventoryAccess } = vi.hoisted(() => ({
	getConnection: vi.fn(),
	authorizeInventoryAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ pool: { getConnection } }));
vi.mock("@/lib/inventory/access", () => ({ authorizeInventoryAccess }));

import { DELETE, PATCH } from "./route";

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

const ctx = (variantId: string) => ({ params: Promise.resolve({ variantId }) });

function patchRaw(variantId: string, raw: string) {
	return PATCH(new Request("http://localhost/x", { method: "PATCH", body: raw }), ctx(variantId));
}

function patch(variantId: string, body: unknown) {
	return patchRaw(variantId, JSON.stringify(body));
}

const beforeRow = { sku: "OLD-SKU", color: "Black", product_variant_size: "M" };

describe("/api/inventory/variants/[variantId]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => { });
		authorizeInventoryAccess.mockResolvedValue({ ok: true, adminId: 1 });
	});

	describe("PATCH", () => {
		const patchImpl = (sql: string) =>
			sql.includes("SELECT sku, color") ? [beforeRow] : { affectedRows: 1 };

		it("updates sku, colour and size and logs before and after values", async () => {
			const c = mockConnection(patchImpl);

			const res = await patch("10", { sku: " NEW-SKU ", color: "Grey", size: "L" });

			expect(res.status).toBe(200);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("sku = ?, color = ?, product_variant_size = ?"),
				["NEW-SKU", "Grey", "L", 10]
			);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO Audit_log"),
				[
					1,
					"update_variant",
					"Product_variants",
					10,
					JSON.stringify({
						before: { sku: "OLD-SKU", color: "Black", size: "M" },
						after: { sku: "NEW-SKU", color: "Grey", size: "L" },
					}),
				]
			);
			expect(c.commit).toHaveBeenCalledOnce();
		});

		it("logs only the fields that were sent", async () => {
			const c = mockConnection(patchImpl);

			await patch("10", { sku: "ONLY-SKU" });

			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO Audit_log"),
				[
					1,
					"update_variant",
					"Product_variants",
					10,
					JSON.stringify({ before: { sku: "OLD-SKU" }, after: { sku: "ONLY-SKU" } }),
				]
			);
		});

		it("allows clearing the colour and logs null as the new value", async () => {
			const c = mockConnection(patchImpl);

			const res = await patch("10", { color: "" });

			expect(res.status).toBe(200);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("color = ?"),
				[null, 10]
			);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO Audit_log"),
				[
					1,
					"update_variant",
					"Product_variants",
					10,
					JSON.stringify({ before: { color: "Black" }, after: { color: null } }),
				]
			);
		});

		it.each([
			["price", { price: 1 }],
			["product_id", { product_id: 2 }],
			["quantity", { quantity: 5 }],
			["empty body", {}],
		])("rejects forbidden fields (%s)", async (_name, body) => {
			const res = await patch("10", body);
			expect(res.status).toBe(400);
			expect(getConnection).not.toHaveBeenCalled();
		});

		it.each(["constructor", "toString", "__proto__"])(
			"rejects the inherited key %s as a forbidden field",
			async (key) => {
				const res = await patchRaw("10", `{"${key}":"x"}`);
				expect(res.status).toBe(400);
				expect(await res.json()).toEqual({ error: "Field not allowed" });
				expect(getConnection).not.toHaveBeenCalled();
			}
		);

		it("rejects an empty sku and names the field", async () => {
			const res = await patch("10", { sku: " " });
			expect(res.status).toBe(400);
			expect((await res.json()).field).toBe("sku");
		});

		it("rejects invalid JSON", async () => {
			const res = await patchRaw("10", "not json");
			expect(res.status).toBe(400);
			expect(getConnection).not.toHaveBeenCalled();
		});

		it("returns 400 for an invalid id", async () => {
			const res = await patch("abc", { sku: "A" });
			expect(res.status).toBe(400);
			expect(getConnection).not.toHaveBeenCalled();
		});

		it("returns 404 for an unknown variant", async () => {
			const c = mockConnection(() => []);
			const res = await patch("999", { sku: "A" });
			expect(res.status).toBe(404);
			expect(c.rollback).toHaveBeenCalledOnce();
			expect(c.commit).not.toHaveBeenCalled();
		});

		it("returns 409 on duplicate SKU and names the field", async () => {
			const c = mockConnection((sql) => {
				if (sql.includes("UPDATE Product_variants")) {
					throw Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" });
				}
				return patchImpl(sql);
			});
			const res = await patch("10", { sku: "TAKEN" });
			expect(res.status).toBe(409);
			expect((await res.json()).field).toBe("sku");
			expect(c.rollback).toHaveBeenCalledOnce();
		});

		it("rolls back and returns 500 when the audit insert fails", async () => {
			const c = mockConnection((sql) => {
				if (sql.includes("INSERT INTO Audit_log")) throw new Error("audit failed");
				return patchImpl(sql);
			});

			const res = await patch("10", { sku: "NEW" });

			expect(res.status).toBe(500);
			expect(c.rollback).toHaveBeenCalledOnce();
			expect(c.commit).not.toHaveBeenCalled();
			expect(c.release).toHaveBeenCalledOnce();
		});

		it("returns 401 when signed out", async () => {
			authorizeInventoryAccess.mockResolvedValue({
				ok: false,
				status: 401,
				error: "Authentication required",
			});
			const res = await patch("10", { sku: "A" });
			expect(res.status).toBe(401);
			expect(getConnection).not.toHaveBeenCalled();
		});

		it("returns 403 when access is denied", async () => {
			authorizeInventoryAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
			const res = await patch("10", { sku: "A" });
			expect(res.status).toBe(403);
			expect(getConnection).not.toHaveBeenCalled();
		});
	});

	describe("DELETE", () => {
		const snapshotRow = { product_id: 1, sku: "S-BLK-M", color: "Black", size: "M", quantity: "12" };

		const deleteImpl = (orders: number, rows: unknown[] = [snapshotRow]) => (sql: string) => {
			if (sql.includes("COUNT(*)")) return [{ n: BigInt(orders) }];
			if (sql.includes("FROM Product_variants pv")) return rows;
			return { affectedRows: 1 };
		};

		it("deletes a variant without orders and logs a snapshot of what was removed", async () => {
			const c = mockConnection(deleteImpl(0));

			const res = await DELETE(new Request("http://localhost/x"), ctx("10"));

			expect(res.status).toBe(200);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("DELETE FROM Product_variants"),
				[10]
			);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO Audit_log"),
				[
					1,
					"delete_variant",
					"Product_variants",
					10,
					JSON.stringify({
						before: { productId: 1, sku: "S-BLK-M", color: "Black", size: "M", quantity: 12 },
					}),
				]
			);
			expect(c.commit).toHaveBeenCalledOnce();
		});

		it("returns 409 and deletes nothing when the variant has orders", async () => {
			const c = mockConnection(deleteImpl(3));

			const res = await DELETE(new Request("http://localhost/x"), ctx("10"));

			expect(res.status).toBe(409);
			expect(c.query).not.toHaveBeenCalledWith(
				expect.stringContaining("DELETE FROM Product_variants"),
				expect.anything()
			);
			expect(c.query).not.toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO Audit_log"),
				expect.anything()
			);
			expect(c.rollback).toHaveBeenCalledOnce();
		});

		it("rolls back and keeps the variant when the audit insert fails", async () => {
			const c = mockConnection((sql) => {
				if (sql.includes("INSERT INTO Audit_log")) throw new Error("audit failed");
				return deleteImpl(0)(sql);
			});

			const res = await DELETE(new Request("http://localhost/x"), ctx("10"));

			expect(res.status).toBe(500);
			expect(c.rollback).toHaveBeenCalledOnce();
			expect(c.commit).not.toHaveBeenCalled();
			expect(c.release).toHaveBeenCalledOnce();
		});

		it("returns 404 for an unknown variant", async () => {
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
			const res = await DELETE(new Request("http://localhost/x"), ctx("10"));
			expect(res.status).toBe(403);
			expect(getConnection).not.toHaveBeenCalled();
		});
	});
});