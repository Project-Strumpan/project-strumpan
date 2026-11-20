import CartButton from "./CartButton";
import LoginButton from "./LoginButton"
import LogoutButton from "./LogoutButton"
import { auth0 } from "@/lib/auth"

export default async function Navbar() {
    let user = null;
    try {
        if (process.env.AUTH0_DOMAIN) {
            const session = await auth0.getSession();
            user = session?.user;
        }
    } catch {
        // Auth0 är inte konfigurerat i lokal miljö
    }

    return (
        <div className="flex w-full items-center justify-between px-6 py-2 bg-background">
            <a href="/" className="text-2xl font-bold">Strumpan</a>
            <CartButton/>
            <div>
                {user ? <LogoutButton /> : <LoginButton />}
            </div>
        </div>
    )
}
