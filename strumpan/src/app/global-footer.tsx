import Link from "next/link"; 

export default function Footer() {
  return (
    <footer className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 px-4 border-t border-gray-200 text-sm text-gray-600" aria-label="Footer">
      <div className="space-y-2">
        <h2 className="font-semibold text-base text-gray-900 mb-3">Contact Us</h2>
        <p>
          <span className="font-medium text-gray-700">Email:</span>{" "}
          <a href="mailto:info@example.com" className="hover:underline">info@example.com</a>
        </p>
        <p>
          <span className="font-medium text-gray-700">Phone:</span>{" "}
          <a href="tel:+46123456789" className="hover:underline">+46 123 456 789</a>
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold text-base text-gray-900 mb-3">Company</h2>
        <p>
          <span className="font-medium text-gray-700">Name:</span> Company Name AB
        </p>
        <p>
          <span className="font-medium text-gray-700">Org.nr:</span> 556XXX-XXXX
        </p>
        <p>
          <span className="font-medium text-gray-700">Address:</span> placeholder
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold text-base text-gray-900 mb-3">
          <Link href="/returns-and-complaints" className="hover:underline">
            Returns & Complaints
          </Link>
        </h2>
        <p>
          Read about our policy for returns, exchanges, and complaints.
        </p>
      </div>
    </footer>
  );
}