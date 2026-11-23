import Link from "next/link";
import type { ReactNode } from "react";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="text-gray-900">
      <header className="border-b border-gray-300">
        <nav
          aria-label="Admin navigation"
          className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-5"
        >
          <span className="text-lg font-semibold">
            Strumpan Admin
          </span>

          <Link
            href="/admin/inventory"
            className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
          >
            Inventory
          </Link>

          <Link
            href="/admin/categories"
            className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
          >
            Categories
          </Link>

          <Link
            href="/admin/orders"
            className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
          >
            Orders & Summaries
          </Link>

          <Link
            href="/admin/audit-log"
            className="rounded hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
          >
            Audit Log
          </Link>

          <Link
            href="/"
            className="ml-auto rounded text-sm text-gray-600 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-600"
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