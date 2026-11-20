import type { PoolConnection } from "mariadb";
import { NextResponse } from "next/server";

export function parseId(raw: string): number | null {
    const id = Number(raw);
    return Number.isSafeInteger(id) && id >= 1 ? id : null;
}

export function fieldError(field: string, error: string, status = 400) {
    return NextResponse.json({ error, field }, { status });
}

export async function writeAudit(
    connection: PoolConnection,
    adminId: number | undefined,
    handling: string,
    tableName: string,
    recordId: number,
    details: object
) {
    if (adminId === undefined) {
        console.warn("Skipping audit log because no local admin record exists.");
        return;
    }

    await connection.query(
        `INSERT INTO Audit_log (admin_id, handling, table_name, record_id, details)
         VALUES (?, ?, ?, ?, ?)`,
        [adminId, handling, tableName, recordId, JSON.stringify(details)]
    );
}

export const isText = (v: unknown, max: number): v is string =>
    typeof v === "string" && v.trim() !== "" && v.length <= max;

export const isQty = (v: unknown): v is number =>
    typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= 2147483647;

export type VariantInput = {
    sku: string;
    color: string | null;
    size: string;
    quantity: number;
};

export type VariantParse =
    | { ok: true; value: VariantInput }
    | { ok: false; field: string; error: string };

const VARIANT_KEYS = ["sku", "color", "size", "quantity"];

// prefix is "variants.0" for an item in a list, or "" for a single variant.
export function parseVariant(raw: unknown, prefix: string): VariantParse {
    const at = (name: string) => (prefix === "" ? name : `${prefix}.${name}`);

    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
        return { ok: false, field: prefix === "" ? "variant" : prefix, error: "Invalid variant data" };
    }
    const v = raw as Record<string, unknown>;

    const extra = Object.keys(v).find((k) => !VARIANT_KEYS.includes(k));
    if (extra) {
        return { ok: false, field: at(extra), error: "Field not allowed" };
    }

    const color = v.color === null || v.color === "" ? null : v.color;

    if (!isText(v.sku, 100)) {
        return { ok: false, field: at("sku"), error: "SKU is required (max 100 characters)" };
    }
    if (!isText(v.size, 50)) {
        return { ok: false, field: at("size"), error: "Size is required (max 50 characters)" };
    }
    if (color !== null && !isText(color, 100)) {
        return { ok: false, field: at("color"), error: "Colour must be 1-100 characters" };
    }
    if (!isQty(v.quantity)) {
        return { ok: false, field: at("quantity"), error: "Quantity must be a whole number, 0 or higher" };
    }

    return {
        ok: true,
        value: {
            sku: v.sku.trim(),
            size: v.size.trim(),
            color: color === null ? null : (color as string).trim(),
            quantity: v.quantity,
        },
    };
}

export function dbErrorResponse(error: unknown, fallback: string) {
    const code = (error as { code?: string }).code;
    if (code === "ER_DUP_ENTRY") {
        return fieldError("sku", "SKU already exists", 409);
    }
    if (code === "ER_NO_REFERENCED_ROW_2") {
        return fieldError("categoryId", "Invalid category");
    }
    if (code === "ER_ROW_IS_REFERENCED_2") {
        return NextResponse.json(
            { error: "Record has orders and cannot be deleted" },
            { status: 409 }
        );
    }
    console.error(fallback, error);
    return NextResponse.json({ error: fallback }, { status: 500 });
}
