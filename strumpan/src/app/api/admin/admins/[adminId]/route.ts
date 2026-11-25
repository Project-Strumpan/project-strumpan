/*
 * Admin update & delete API for Super Admin (PRO-89)
 * PATCH: Update an admin's role or name (Owner only).
 * DELETE: Remove an admin from Admins table (Owner only).
 */

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeOwnerAccess } from "@/lib/inventory/access";
import { fieldError, parseId, writeAudit } from "@/lib/inventory/helpers";

type Context = { params: Promise<{ adminId: string }> };

export async function PATCH(request: Request, { params }: Context) {
    const access = await authorizeOwnerAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const adminId = parseId((await params).adminId);
    if (!adminId) {
        return NextResponse.json({ error: "Invalid admin ID" }, { status: 400 });
    }

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const hasRole = body.role_id !== undefined;
    const hasName = body.admin_name !== undefined;
    if (!hasRole && !hasName) {
        return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    let nextRoleId: number | undefined;
    if (hasRole) {
        const parsedRole = parseId(String(body.role_id));
        if (!parsedRole) {
            return fieldError("role_id", "Invalid role ID");
        }
        nextRoleId = parsedRole;
    }

    let nextName: string | undefined;
    if (hasName) {
        if (typeof body.admin_name !== "string" || body.admin_name.trim() === "" || body.admin_name.length > 255) {
            return fieldError("admin_name", "Admin name must be between 1 and 255 characters");
        }
        nextName = body.admin_name.trim();
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [existing] = await connection.query<any[]>(
            "SELECT admin_id, admin_name, email, role_id FROM Admins WHERE admin_id = ? FOR UPDATE",
            [adminId]
        );
        if (!existing) {
            await connection.rollback();
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        if (nextRoleId !== undefined && access.adminId === adminId && nextRoleId !== Number(existing.role_id)) {
            await connection.rollback();
            return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
        }

        let roleName: string | undefined;
        if (nextRoleId !== undefined) {
            const roleRows = await connection.query<Array<{ role_id: number; role_name: string }>>(
                "SELECT role_id, role_name FROM Roles WHERE role_id = ?",
                [nextRoleId]
            );
            if (roleRows.length === 0) {
                await connection.rollback();
                return fieldError("role_id", "Selected role does not exist");
            }
            roleName = roleRows[0].role_name;
        }

        const finalRoleId = nextRoleId !== undefined ? nextRoleId : Number(existing.role_id);
        const finalName = nextName !== undefined ? nextName : existing.admin_name;

        await connection.query(
            "UPDATE Admins SET role_id = ?, admin_name = ? WHERE admin_id = ?",
            [finalRoleId, finalName, adminId]
        );

        await writeAudit(
            connection,
            access.adminId,
            "update_admin_role",
            "Admins",
            adminId,
            {
                before: { admin_name: existing.admin_name, role_id: Number(existing.role_id) },
                after: { admin_name: finalName, role_id: finalRoleId },
            }
        );

        await connection.commit();
        return NextResponse.json({
            admin_id: adminId,
            admin_name: finalName,
            email: existing.email,
            role_id: finalRoleId,
            ...(roleName ? { role_name: roleName } : {}),
        }, { status: 200 });
    } catch (error) {
        try { await connection?.rollback(); } catch { /* ignore */ }
        console.error("Failed to update admin", error);
        return NextResponse.json({ error: "Failed to update admin" }, { status: 500 });
    } finally {
        connection?.release();
    }
}

export async function DELETE(_request: Request, { params }: Context) {
    const access = await authorizeOwnerAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const adminId = parseId((await params).adminId);
    if (!adminId) {
        return NextResponse.json({ error: "Invalid admin ID" }, { status: 400 });
    }

    if (access.adminId === adminId) {
        return NextResponse.json({ error: "You cannot delete your own admin account" }, { status: 400 });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const [existing] = await connection.query<any[]>(
            "SELECT admin_id, admin_name, email, role_id FROM Admins WHERE admin_id = ? FOR UPDATE",
            [adminId]
        );
        if (!existing) {
            await connection.rollback();
            return NextResponse.json({ error: "Admin not found" }, { status: 404 });
        }

        await connection.query("DELETE FROM Admins WHERE admin_id = ?", [adminId]);

        await writeAudit(
            connection,
            access.adminId,
            "delete_admin",
            "Admins",
            adminId,
            {
                before: {
                    admin_name: existing.admin_name,
                    email: existing.email,
                    role_id: Number(existing.role_id),
                },
            }
        );

        await connection.commit();
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        try { await connection?.rollback(); } catch { /* ignore */ }
        console.error("Failed to delete admin", error);
        return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 });
    } finally {
        connection?.release();
    }
}
