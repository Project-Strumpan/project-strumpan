import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, authorizeInventoryAccess } = vi.hoisted(() => ({
	getConnection: vi.fn(),
	authorizeInventoryAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ pool: { getConnection } }));
vi.mock("@/lib/inventory/access", () => ({ authorizeInventoryAccess }));

import { GET } from "./route";

describe("GET /api/inventory/categories", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		authorizeInventoryAccess.mockResolvedValue({ ok: true, adminId: 1 });
	});

	it("returns the categories and releases the connection", async () => {
		const rows = [{ category_id: 1, category_name: "Everyday socks" }];
		const release = vi.fn();
		getConnection.mockResolvedValue({ query: vi.fn(async () => rows), release });

		const res = await GET();

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(rows);
		expect(release).toHaveBeenCalledOnce();
	});

	it("returns 500 and releases the connection when the database fails", async () => {
		const release = vi.fn();
		getConnection.mockResolvedValue({
			query: vi.fn(async () => {
				throw new Error("boom");
			}),
			release,
		});

		const res = await GET();

		expect(res.status).toBe(500);
		expect(release).toHaveBeenCalledOnce();
	});

	it("returns 403 and does not touch the database when forbidden", async () => {
		authorizeInventoryAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });

		const res = await GET();

		expect(res.status).toBe(403);
		expect(getConnection).not.toHaveBeenCalled();
	});
});
