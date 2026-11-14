import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client();
export const ADMIN_ROLE_CLAIM = "https://strumpan.example.com/roles";

export type AuthenticatedUser = {
    customer_id: number;
};

export function hasAdminRole(user: unknown): boolean {
    if (!user || typeof user !== "object") {
        return false;
    }

    const roles = (user as Record<string, unknown>)[ADMIN_ROLE_CLAIM];
    return Array.isArray(roles) && roles.some((role) => role === "admin");
}

export async function requireUser() : Promise<AuthenticatedUser> {
    throw new Error( "Authentication is not implemented" );
}