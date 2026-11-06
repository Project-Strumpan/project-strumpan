import { Auth0Client } from "@auth0/nextjs-auth0/server";

export const auth0 = new Auth0Client();

export type AuthenticatedUser = {
    customer_id: number;
};

export async function requireUser() : Promise<AuthenticatedUser> {
    throw new Error( "Authentication is not implemented" );
}