export type InventoryAccess =
    | { ok: true }
    | { ok: false; status: 401 | 403; error: string };

// TODO: replace with real role check when admin login exists.
// Will need the Request again then (to read session/cookie).
export async function authorizeInventoryAccess(): Promise<InventoryAccess> {
    if (process.env.NODE_ENV === "production") {
        return { ok: false, status: 403, error: "Forbidden" };
    }
    return { ok: true };
}