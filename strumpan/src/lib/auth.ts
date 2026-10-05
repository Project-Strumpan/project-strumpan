export type AuthenticatedUser = {
    customer_id: number;
};

export async function requireUser() : Promise<AuthenticatedUser> {
    throw new Error( "Authentication is not implemented" );
}