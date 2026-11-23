import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, authorizeOwnerAccess } = vi.hoisted(() => ({
    getConnection: vi.fn(),
    authorizeOwnerAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ pool: { getConnection } }));
vi.mock("@/lib/inventory/access", () => ({ authorizeOwnerAccess }));

import { GET } from "./route";

describe("GET /api/admin/audit-log", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 403 for non-owner / inventory admin", async () => {
        authorizeOwnerAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
        const req = new Request("http://localhost/api/admin/audit-log");
        const res = await GET(req);
        expect(res.status).toBe(403);
    });

    it("returns audit logs and sanitizes sensitive fields in details", async () => {
        const rows = [
            {
                log_id: 1,
                admin_id: 2,
                handling: "create",
                table_name: "Categories",
                record_id: 10,
                time_stamp: new Date("2026-03-01T12:00:00Z"),
                details: JSON.stringify({
                    name: "Secret Category",
                    password: "my-plain-password",
                    token: "sensitive-token-abc",
                    safeField: "ok-value",
                }),
                admin_name: "Admin User",
                admin_email: "admin@example.com",
            },
        ];

        const release = vi.fn();
        getConnection.mockResolvedValue({ query: vi.fn(async () => rows), release });

        const req = new Request("http://localhost/api/admin/audit-log?table=Categories");
        const res = await GET(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.logs).toHaveLength(1);
        expect(data.logs[0].log_id).toBe(1);
        expect(data.logs[0].handling).toBe("create");
        expect(data.logs[0].table_name).toBe("Categories");
        expect(data.logs[0].admin.name).toBe("Admin User");
        expect(data.logs[0].details.password).toBe("[REDACTED]");
        expect(data.logs[0].details.token).toBe("[REDACTED]");
        expect(data.logs[0].details.safeField).toBe("ok-value");
        expect(release).toHaveBeenCalledOnce();
    });
});
