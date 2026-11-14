import { auth0, hasAdminPermission } from "@/lib/auth";

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

    return { ok: true };
}