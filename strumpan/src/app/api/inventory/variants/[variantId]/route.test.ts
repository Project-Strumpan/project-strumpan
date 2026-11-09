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

function patch(variantId: string, body: unknown) {
	return PATCH(
		new Request("http://localhost/x", { method: "PATCH", body: JSON.stringify(body) }),
		ctx(variantId)
	);
}

describe("/api/inventory/variants/[variantId]", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authorizeInventoryAccess.mockResolvedValue({ ok: true, adminId: 1 });
	});

	describe("PATCH", () => {
		it("updates sku, colour and size", async () => {
			const c = mockConnection();

			const res = await patch("10", { sku: " NEW-SKU ", color: "Grey", size: "L" });

			expect(res.status).toBe(200);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("sku = ?, color = ?, product_variant_size = ?"),
				["NEW-SKU", "Grey", "L", 10]
			);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("INSERT INTO Audit_log"),
				expect.arrayContaining([1, "update_variant", "Product_variants", 10])
			);
			expect(c.commit).toHaveBeenCalledOnce();
		});

		it("allows clearing the colour", async () => {
			const c = mockConnection();

			const res = await patch("10", { color: "" });

			expect(res.status).toBe(200);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("color = ?"),
				[null, 10]
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

		it("rejects an empty sku", async () => {
			const res = await patch("10", { sku: " " });
			expect(res.status).toBe(400);
		});

		it("returns 404 for an unknown variant", async () => {
			const c = mockConnection(() => ({ affectedRows: 0 }));
			const res = await patch("999", { sku: "A" });
			expect(res.status).toBe(404);
			expect(c.rollback).toHaveBeenCalledOnce();
		});

		it("returns 409 on duplicate SKU", async () => {
			const c = mockConnection(() => {
				throw Object.assign(new Error("dup"), { code: "ER_DUP_ENTRY" });
			});
			const res = await patch("10", { sku: "TAKEN" });
			expect(res.status).toBe(409);
			expect(c.rollback).toHaveBeenCalledOnce();
		});

		it("returns 403 when access is denied", async () => {
			authorizeInventoryAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
			const res = await patch("10", { sku: "A" });
			expect(res.status).toBe(403);
			expect(getConnection).not.toHaveBeenCalled();
		});
	});

	describe("DELETE", () => {
		it("deletes a variant without orders", async () => {
			const c = mockConnection((sql) =>
				sql.includes("COUNT(*)") ? [{ n: BigInt(0) }] : { affectedRows: 1 }
			);

			const res = await DELETE(new Request("http://localhost/x"), ctx("10"));

			expect(res.status).toBe(200);
			expect(c.query).toHaveBeenCalledWith(
				expect.stringContaining("DELETE FROM Product_variants"),
				[10]
			);
			expect(c.commit).toHaveBeenCalledOnce();
		});

		it("returns 409 and deletes nothing when the variant has orders", async () => {
			const c = mockConnection((sql) =>
				sql.includes("COUNT(*)") ? [{ n: BigInt(3) }] : { affectedRows: 1 }
			);

			const res = await DELETE(new Request("http://localhost/x"), ctx("10"));

			expect(res.status).toBe(409);
			expect(c.query).not.toHaveBeenCalledWith(
				expect.stringContaining("DELETE FROM Product_variants"),
				expect.anything()
			);
			expect(c.rollback).toHaveBeenCalledOnce();
		});

		it("returns 404 for an unknown variant", async () => {
			mockConnection((sql) =>
				sql.includes("COUNT(*)") ? [{ n: BigInt(0) }] : { affectedRows: 0 }
			);
			const res = await DELETE(new Request("http://localhost/x"), ctx("999"));
			expect(res.status).toBe(404);
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