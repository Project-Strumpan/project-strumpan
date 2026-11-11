export type InventoryAccess =
    | { ok: true; adminId: number }
    | { ok: false; status: 401 | 403; error: string };

// TODO: replace with real session/role check (PRO-20, PRO-47).
export async function authorizeInventoryAccess(): Promise<InventoryAccess> {
    if (process.env.NODE_ENV === "production") {
        return { ok: false, status: 403, error: "Forbidden" };
    }
    const adminId = Number(process.env.DEV_ADMIN_ID);
    if (!Number.isSafeInteger(adminId) || adminId < 1) {
        return { ok: false, status: 403, error: "Forbidden" };
    }
    return { ok: true, adminId };
}