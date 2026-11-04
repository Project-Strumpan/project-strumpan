import Link from "next/link";
import type { ReactNode } from "react";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800">
        <nav
          aria-label="Admin navigation"
          className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-5"
        >
          <span className="text-lg font-semibold">
            Strumpan Admin
          </span>

          <Link
            href="/admin/inventory"
            className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
          >
            Inventory
          </Link>

          <Link
            href="/"
            className="ml-auto rounded text-sm text-zinc-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
          >
            Back to storefront
          </Link>
        </nav>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </div>
    </div>
  );
}