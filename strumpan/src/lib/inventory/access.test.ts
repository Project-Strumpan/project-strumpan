import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSession, hasAdminPermission, getConnection } = vi.hoisted(() => ({
	getSession: vi.fn(),
	hasAdminPermission: vi.fn(),
	getConnection: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
	auth0: { getSession },
	hasAdminPermission,
}));
vi.mock("@/lib/db", () => ({ pool: { getConnection } }));

import { authorizeInventoryAccess } from "./access";

function mockConnection(queryResult: unknown) {
	const connection = {
		query: vi.fn().mockResolvedValue(queryResult),
		release: vi.fn(),
	};
	getConnection.mockResolvedValue(connection);
	return connection;
}

describe("authorizeInventoryAccess", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => {});
		getSession.mockResolvedValue({ user: { email: "inventory@strumpan.test" } });
		hasAdminPermission.mockResolvedValue(true);
	});

	it("returns 401 when there is no session", async () => {
		getSession.mockResolvedValue(null);

		expect(await authorizeInventoryAccess()).toEqual({
			ok: false,
			status: 401,
			error: "Authentication required",
		});
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("returns 403 without admin permission and does not query the database", async () => {
		hasAdminPermission.mockResolvedValue(false);

		expect(await authorizeInventoryAccess()).toEqual({
			ok: false,
			status: 403,
			error: "Forbidden",
		});
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("resolves adminId from the session email and releases the connection", async () => {
		const connection = mockConnection([{ admin_id: 2 }]);

		expect(await authorizeInventoryAccess()).toEqual({ ok: true, adminId: 2 });
		expect(connection.query).toHaveBeenCalledWith(
			expect.stringContaining("FROM Admins WHERE email = ?"),
			["inventory@strumpan.test"]
		);
		expect(connection.release).toHaveBeenCalledOnce();
	});

	it("returns ok without adminId when the email has no Admins row", async () => {
		mockConnection([]);

		expect(await authorizeInventoryAccess()).toEqual({ ok: true, adminId: undefined });
	});

	it("returns ok without a lookup when the session has no email", async () => {
		getSession.mockResolvedValue({ user: {} });

		expect(await authorizeInventoryAccess()).toEqual({ ok: true });
		expect(getConnection).not.toHaveBeenCalled();
	});

	it("returns 500 and releases the connection when the lookup fails", async () => {
		const connection = {
			query: vi.fn().mockRejectedValue(new Error("database unavailable")),
			release: vi.fn(),
		};
		getConnection.mockResolvedValue(connection);

		expect(await authorizeInventoryAccess()).toEqual({
			ok: false,
			status: 500,
			error: "Could not verify admin account",
		});
		expect(connection.release).toHaveBeenCalledOnce();
	});
});
