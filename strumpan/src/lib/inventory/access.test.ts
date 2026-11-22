import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, hasAdminPermission, getConnection } = vi.hoisted(() => ({
	getSession: vi.fn(),
	hasAdminPermission: vi.fn(),
	getConnection: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth0: { getSession }, hasAdminPermission }));
vi.mock("@/lib/db", () => ({ pool: { getConnection } }));

import { authorizeInventoryAccess, authorizeOwnerAccess } from "./access";

const superadmin = [
	{ admin_id: 1, permissions_name: "manage_inventory" },
	{ admin_id: 1, permissions_name: "manage_products" },
	{ admin_id: 1, permissions_name: "manage_admins" },
];
const inventoryManager = [
	{ admin_id: 2, permissions_name: "manage_inventory" },
	{ admin_id: 2, permissions_name: "manage_products" },
];
const customerService = [
	{ admin_id: 3, permissions_name: "view_orders" },
	{ admin_id: 3, permissions_name: "update_orders" },
];

function mockRows(rows: unknown[]) {
	const connection = { query: vi.fn().mockResolvedValue(rows), release: vi.fn() };
	getConnection.mockResolvedValue(connection);
	return connection;
}

describe("admin role access", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getSession.mockResolvedValue({ user: { email: "a@b.se", email_verified: true } });
		hasAdminPermission.mockResolvedValue(true);
	});

	it("returns 401 when signed out", async () => {
		getSession.mockResolvedValue(null);
		expect(await authorizeInventoryAccess()).toMatchObject({ ok: false, status: 401 });
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("returns 403 without the Auth0 admin permission", async () => {
		hasAdminPermission.mockResolvedValue(false);
		expect(await authorizeInventoryAccess()).toMatchObject({ ok: false, status: 403 });
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("returns 403 when the email is missing", async () => {
		getSession.mockResolvedValue({ user: {} });
		expect(await authorizeInventoryAccess()).toMatchObject({ ok: false, status: 403 });
		expect(getConnection).not.toHaveBeenCalled();
	});


	it("returns 403 when no Admins row exists", async () => {
		mockRows([]);
		expect(await authorizeInventoryAccess()).toMatchObject({ ok: false, status: 403 });
	});

	it("returns 403 for customer_service on inventory", async () => {
		mockRows(customerService);
		expect(await authorizeInventoryAccess()).toMatchObject({ ok: false, status: 403 });
	});

	it("lets inventory_manager into inventory but not owner routes", async () => {
		mockRows(inventoryManager);
		expect(await authorizeInventoryAccess()).toEqual({ ok: true, adminId: 2 });
		mockRows(inventoryManager);
		expect(await authorizeOwnerAccess()).toMatchObject({ ok: false, status: 403 });
	});

	it("lets superadmin into both inventory and owner routes", async () => {
		mockRows(superadmin);
		expect(await authorizeInventoryAccess()).toEqual({ ok: true, adminId: 1 });
		mockRows(superadmin);
		expect(await authorizeOwnerAccess()).toEqual({ ok: true, adminId: 1 });
	});

	it("returns 500 and releases the connection when the lookup fails", async () => {
		const connection = { query: vi.fn().mockRejectedValue(new Error("db")), release: vi.fn() };
		getConnection.mockResolvedValue(connection);
		vi.spyOn(console, "error").mockImplementation(() => { });
		expect(await authorizeInventoryAccess()).toMatchObject({ ok: false, status: 500 });
		expect(connection.release).toHaveBeenCalledOnce();
	});
});
