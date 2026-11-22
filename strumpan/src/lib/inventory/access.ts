import { auth0, hasAdminPermission } from "@/lib/auth";
import { pool } from "@/lib/db";

export const INVENTORY_PERMISSION = "manage_inventory";
export const OWNER_PERMISSION = "manage_admins";

export type AdminPermission = typeof INVENTORY_PERMISSION | typeof OWNER_PERMISSION;

export type InventoryAccess =
    | { ok: true; adminId?: number }
    | { ok: false; status: 401 | 403 | 500; error: string };

async function authorizeAdmin(required: AdminPermission): Promise<InventoryAccess> {
    const session = await auth0.getSession();
    if (!session) {
        return { ok: false, status: 401, error: "Authentication required" };
    }
    if (!await hasAdminPermission()) {
        return { ok: false, status: 403, error: "Forbidden" };
    }
    const email = session.user?.email;
    if (!email) {
        return { ok: false, status: 403, error: "Forbidden" };
    }


    let connection;
    try {
        connection = await pool.getConnection();
        const rows = await connection.query<Array<{ admin_id: number; permissions_name: string }>>(
            `SELECT a.admin_id, p.permissions_name
             FROM Admins a
             JOIN Role_permissions rp ON rp.role_id = a.role_id
             JOIN Permissions p ON p.permission_id = rp.permission_id
             WHERE a.email = ?`, [email]
        );
        const match = rows.find((r) => r.permissions_name === required);
        if (!match) {
            return { ok: false, status: 403, error: "Forbidden" };
        }
        return { ok: true, adminId: Number(match.admin_id) };
    } catch (error) {
        console.error("Could not look up admin permissions", error);
        return { ok: false, status: 500, error: "Could not verify admin account" };
    } finally {
        connection?.release();
    }
}

export function authorizeInventoryAccess(): Promise<InventoryAccess> {
    return authorizeAdmin(INVENTORY_PERMISSION);
}

export function authorizeOwnerAccess(): Promise<InventoryAccess> {
    return authorizeAdmin(OWNER_PERMISSION);
}