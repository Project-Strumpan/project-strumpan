import LoginButton from "./LoginButton"
import LogoutButton from "./LogoutButton"
import { auth0 } from "@/lib/auth"
import Link from 'next/link'
import Image from 'next/image'
import DarkLogo from '../../public/AEP-white.png';
import LightLogo from '../../public/AEP.png';
import CartButton from "./CartButton"


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
        <div className="flex top-10 z-30 mx-auto w-29/30 items-center justify-between px-6 py-2 rounded-md bg-olive-200 dark:bg-(--navbar)">
            <Link href="/">
                <Image
                    className="hidden w-auto h-auto dark:block"
                    src={DarkLogo}
                    alt="AEP"
                    width={100}
                />
                <Image
                    className="mb-4 block w-auto h-auto dark:hidden"
                    src={LightLogo}
                    alt="AEP"
                    width={100}
                />
            </Link>
            <CartButton fill="var(--blackOrWhite)"/>
            <div>
                {user ? <LogoutButton /> : <LoginButton />}
            </div>
        </div>
    )
}
