import { Auth0Client } from "@auth0/nextjs-auth0/server";
import type { NextRequest } from "next/server";
import type { NextResponse } from "next/server";

export const ADMIN_PERMISSION = "admin:access";
export const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

export const auth0 = new Auth0Client({
    authorizationParameters: {
        audience: AUTH0_AUDIENCE,
    },
});

export type AuthenticatedUser = {
    customer_id: number;
};

function hasAdminPermissionClaim(payload: unknown): boolean {
    if (!payload || typeof payload !== "object") {
        return false;
    }

    const permissions = (payload as { permissions?: unknown }).permissions;
    return Array.isArray(permissions) && permissions.includes(ADMIN_PERMISSION);
}

function decodeJwtPayload(token: string): unknown {
    const parts = token.split(".");
    if (parts.length !== 3) {
        return null;
    }

    try {
        const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const paddedPayload = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
        return JSON.parse(Buffer.from(paddedPayload, "base64").toString("utf8"));
    } catch {
        return null;
    }
}

export async function hasAdminPermission(
    request?: NextRequest,
    response?: NextResponse
): Promise<boolean> {
    if (!AUTH0_AUDIENCE) {
        console.error("AUTH0_AUDIENCE is not configured.");
        return false;
    }

    try {
        const tokenResult = request && response
            ? await auth0.getAccessToken(request, response, { audience: AUTH0_AUDIENCE })
            : await auth0.getAccessToken({ audience: AUTH0_AUDIENCE });

        return hasAdminPermissionClaim(decodeJwtPayload(tokenResult.token));
    } catch (error) {
        console.error("Could not retrieve Auth0 access token:", error);
        return false;
    }
}

export async function requireUser() : Promise<AuthenticatedUser> {
    throw new Error( "Authentication is not implemented" );
}