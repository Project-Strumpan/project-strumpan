import { beforeEach, describe, expect, it, vi } from "vitest";

const { getConnection, authorizeOwnerAccess } = vi.hoisted(() => ({
    getConnection: vi.fn(),
    authorizeOwnerAccess: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ pool: { getConnection } }));
vi.mock("@/lib/inventory/access", () => ({ authorizeOwnerAccess }));

import { GET } from "./route";

describe("GET /api/admin/orders/summary", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authorizeOwnerAccess.mockResolvedValue({ ok: true, adminId: 1 });
    });

    it("returns 403 for non-owner", async () => {
        authorizeOwnerAccess.mockResolvedValue({ ok: false, status: 403, error: "Forbidden" });
        const req = new Request("http://localhost/api/admin/orders/summary?period=24h");
        const res = await GET(req);
        expect(res.status).toBe(403);
    });

    it("handles period=24h with 'Last 24 hours' label and aggregation", async () => {
        const boundsRow = {
            start_time: "2026-03-01 10:00:00",
            end_time: "2026-03-02 10:00:00",
        };
        const itemsRows = [
            {
                product_id: 1,
                product_name: "Wool Socks",
                variant_id: 10,
                size: "40-42",
                color: "Grey",
                sku: "SKU-1",
                total_quantity: "5",
                total_revenue: "495.00",
                orders_count: 3,
            },
        ];
        const overallRow = {
            total_orders: "3",
            total_items_sold: "5",
            total_sales: "495.00",
        };

        const query = vi.fn(async (sql: string) => {
            if (sql.includes("CURRENT_TIMESTAMP - INTERVAL 24 HOUR")) {
                if (sql.includes("COUNT(DISTINCT o.order_id) AS total_orders")) {
                    return [overallRow];
                }
                if (sql.includes("SUM(oi.quantity) AS total_quantity")) {
                    return itemsRows;
                }
                return [boundsRow];
            }
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/orders/summary?period=24h");
        const res = await GET(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.period).toBe("24h");
        expect(data.label).toBe("Last 24 hours");
        expect(data.total_orders).toBe(3);
        expect(data.total_items_sold).toBe(5);
        expect(data.total_sales).toBe(495);
        expect(data.items).toHaveLength(1);
        expect(data.items[0].product_name).toBe("Wool Socks");
        expect(release).toHaveBeenCalledOnce();
    });

    it("handles period=7d with 'Last 7 days' label and empty state", async () => {
        const boundsRow = {
            start_time: "2026-02-23 10:00:00",
            end_time: "2026-03-02 10:00:00",
        };
        const overallRow = {
            total_orders: "0",
            total_items_sold: "0",
            total_sales: "0.00",
        };

        const query = vi.fn(async (sql: string) => {
            if (sql.includes("INTERVAL 7 DAY")) {
                if (sql.includes("COUNT(DISTINCT o.order_id) AS total_orders")) {
                    return [overallRow];
                }
                if (sql.includes("SUM(oi.quantity) AS total_quantity")) {
                    return [];
                }
                return [boundsRow];
            }
            return [];
        });
        const release = vi.fn();
        getConnection.mockResolvedValue({ query, release });

        const req = new Request("http://localhost/api/admin/orders/summary?period=7d");
        const res = await GET(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.period).toBe("7d");
        expect(data.label).toBe("Last 7 days");
        expect(data.total_orders).toBe(0);
        expect(data.items).toHaveLength(0);
        expect(release).toHaveBeenCalledOnce();
    });
});
