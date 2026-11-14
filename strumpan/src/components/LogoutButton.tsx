"use client";

export default function LoginButton() {
    return (
        <a href="/auth/logout" className="text-center inline-block px-6 py-3 font-medium rounded-full bg-foreground">
            Logout
        </a>
    );
}