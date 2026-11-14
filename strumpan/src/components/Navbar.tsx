import LoginButton from "./LoginButton"
import LogoutButton from "./LogoutButton"
import { auth0 } from "@/lib/auth"

export default async function() {
    const session = await auth0.getSession();
    const user = session?.user;

    return (
        <div className="flex w-full items-center justify-between px-6 py-2 bg-background">
            <a href="/" className="text-2xl font-bold">Strumpan</a>
            <div>
                {user ? <LogoutButton /> : <LoginButton />}
            </div>
        </div>
    )
}