/*
 * Admin & role management API for Super Admin (PRO-89)
 * GET: Lists all admins with their roles, plus available roles from Roles table.
 * POST: Creates a new admin record with an assigned role in MariaDB (Owner only).
 */

import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { authorizeOwnerAccess } from "@/lib/inventory/access";
import { fieldError, parseId, writeAudit } from "@/lib/inventory/helpers";

export async function GET() {
    const access = await authorizeOwnerAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        const admins = await connection.query<any[]>(`
            SELECT a.admin_id, a.admin_name, a.email, a.role_id, r.role_name, r.roles_description
            FROM Admins a
            JOIN Roles r ON r.role_id = a.role_id
            ORDER BY a.admin_id ASC
        `);

        const roles = await connection.query<any[]>(`
            SELECT role_id, role_name, roles_description
            FROM Roles
            ORDER BY role_id ASC
        `);

        return NextResponse.json({
            currentAdminId: access.adminId ?? null,
            admins: admins.map((a) => ({
                admin_id: Number(a.admin_id),
                admin_name: a.admin_name,
                email: a.email,
                role_id: Number(a.role_id),
                role_name: a.role_name,
                roles_description: a.roles_description ?? null,
            })),
            roles: roles.map((r) => ({
                role_id: Number(r.role_id),
                role_name: r.role_name,
                roles_description: r.roles_description ?? null,
            })),
        }, { status: 200 });
    } catch (error) {
        console.error("Failed to list admins", error);
        return NextResponse.json({ error: "Failed to list admins" }, { status: 500 });
    } finally {
        connection?.release();
    }
}

export async function POST(request: Request) {
    const access = await authorizeOwnerAccess();
    if (!access.ok) {
        return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let body: Record<string, unknown>;
    try {
        body = (await request.json()) as Record<string, unknown>;
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const adminName = typeof body?.admin_name === "string" ? body.admin_name.trim() : "";
    if (!adminName || adminName.length > 255) {
        return fieldError("admin_name", "Admin name is required and cannot exceed 255 characters");
    }

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@") || email.length > 255) {
        return fieldError("email", "A valid email address is required");
    }

    const roleId = parseId(String(body?.role_id ?? ""));
    if (!roleId) {
        return fieldError("role_id", "A valid role is required");
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const roleRows = await connection.query<Array<{ role_id: number; role_name: string }>>(
            "SELECT role_id, role_name FROM Roles WHERE role_id = ?",
            [roleId]
        );
        if (roleRows.length === 0) {
            await connection.rollback();
            return fieldError("role_id", "Selected role does not exist");
        }

        const existing = await connection.query<Array<{ admin_id: number }>>(
            "SELECT admin_id FROM Admins WHERE email = ?",
            [email]
        );
        if (existing.length > 0) {
            await connection.rollback();
            return fieldError("email", "An admin with this email already exists", 409);
        }

        const result = await connection.query(
            "INSERT INTO Admins (role_id, admin_name, email, password_hash) VALUES (?, ?, ?, ?)",
            [roleId, adminName, email, "auth0_managed"]
        );
        const newAdminId = Number(result.insertId ?? result.insert_id);

        await writeAudit(
            connection,
            access.adminId,
            "create_admin",
            "Admins",
            newAdminId,
            {
                admin_name: adminName,
                email,
                role_id: roleId,
                role_name: roleRows[0].role_name,
            }
        );

        await connection.commit();
        return NextResponse.json({
            admin_id: newAdminId,
            admin_name: adminName,
            email,
            role_id: roleId,
            role_name: roleRows[0].role_name,
        }, { status: 201 });
    } catch (error) {
        try { await connection?.rollback(); } catch { /* ignore */ }
        console.error("Failed to create admin", error);
        return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
    } finally {
        connection?.release();
    }
}
