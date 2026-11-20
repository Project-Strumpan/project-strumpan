import { auth0, hasAdminPermission } from "@/lib/auth";
import { pool } from "@/lib/db";

export type InventoryAccess =
    | { ok: true; adminId?: number }
    | { ok: false; status: 401 | 403 | 500; error: string };

export async function authorizeInventoryAccess(): Promise<InventoryAccess> {
    const session = await auth0.getSession();
    if (!session) {
        return { ok: false, status: 401, error: "Authentication required" };
    }
    if (!await hasAdminPermission()) {
        return { ok: false, status: 403, error: "Forbidden" };
    }
    const email = session.user?.email;
    if (!email) {
        return { ok: true };
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const rows = await connection.query<Array<{ admin_id: number }>>(
            "SELECT admin_id FROM Admins WHERE email = ?", [email]
        );
        return { ok: true, adminId: rows.length > 0 ? Number(rows[0].admin_id) : undefined };
    } catch (error) {
        console.error("Could not look up admin record", error);
        return { ok: false, status: 500, error: "Could not verify admin account" };
    } finally {
        connection?.release();
    }
}