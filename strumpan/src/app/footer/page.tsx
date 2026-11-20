import Link from "next/link";

export default function Footer() {
  return (
    <footer
      className="border-t border-gray-200 py-8 px-4 text-sm text-gray-600"
      aria-label="Footer"
    >
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div className="space-y-2">
          <h2 className="font-semibold text-base text-blue-900 mb-3">
            <Link href="/support-contact" className="hover:underline">
              Contact us
            </Link>
          </h2>
          <p>
            <span className="font-medium text-blue-700">Email:</span>{" "}
            <a href="mailto:info@example.com" className="hover:underline">
              info@example.com
            </a>
          </p>
          <p>
            <span className="font-medium text-blue-700">Phone:</span>{" "}
            <a href="tel:+46123456789" className="hover:underline">
              +46 123 456 789
            </a>
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold text-base text-blue-900 mb-3">
            <Link href="/returns-complaint" className="hover:underline">
              Returns & Complaints
            </Link>
          </h2>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold text-base text-blue-900 mb-3">
            <Link href="/about" className="hover:underline">
              Om oss
            </Link>
          </h2>
        </div>

        <div className="space-y-2">
          <h2 className="font-semibold text-base text-blue-900 mb-3">
            <Link href="/cookies" className="hover:underline">
              Cookies
            </Link>
          </h2>
        </div>
      </div>
    </footer>
  );
}