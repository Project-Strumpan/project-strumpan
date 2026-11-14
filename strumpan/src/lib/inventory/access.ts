import { auth0, hasAdminRole } from "@/lib/auth";
import { pool } from "@/lib/db";

export type InventoryAccess =
    | { ok: true; adminId: number }
    | { ok: false; status: 401 | 403 | 500; error: string };

export async function authorizeInventoryAccess(): Promise<InventoryAccess> {
    const session = await auth0.getSession();
    if (!session) {
        return { ok: false, status: 401, error: "Authentication required" };
    }

    if (!hasAdminRole(session.user)) {
        return { ok: false, status: 403, error: "Forbidden" };
    }

    if (!session.user.email) {
        return { ok: false, status: 403, error: "Forbidden" };
    }

    let connection: Awaited<ReturnType<typeof pool.getConnection>> | undefined;
    try {
        connection = await pool.getConnection();
        const rows = await connection.query(
            "SELECT admin_id FROM Admins WHERE email = ? LIMIT 1",
            [session.user.email]
        ) as Array<{ admin_id: number }>;

        if (rows.length === 0) {
            return { ok: false, status: 403, error: "Forbidden" };
        }

        return { ok: true, adminId: rows[0].admin_id };
    } catch (error) {
        console.error("Could not verify admin access:", error);
        return { ok: false, status: 500, error: "Unable to verify admin access" };
    } finally {
        connection?.release();
    }
}