import Link from "next/link"; 

export default function Footer() {
  return (
    
    <footer className="grid grid-cols-1 md:grid-cols-5 gap-8 py-8 px-4 border-t border-gray-200 text-sm text-gray-600 flex justify-center gap-4 border-t px-4 py-6 text-sm" aria-label="Footer">
      <div className="space-y-2">
        <h2 className="font-semibold text-base text-blue-900 mb-3">Contact Us</h2>
        <p>
          <span className="font-medium text-blue-700">Email:</span>{" "}
          <a href="mailto:info@example.com" className="hover:underline">info@example.com</a>
        </p>
        <p>
          <span className="font-medium text-blue-700">Phone:</span>{" "}
          <a href="tel:+46123456789" className="hover:underline">+46 123 456 789</a>
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold text-base text-blue-900 mb-3">Company</h2>
        <p>
          <span className="font-medium text-blue-700">Name:</span> Company Name AB
        </p>
        <p>
          <span className="font-medium text-blue-700">Org.nr:</span> 556XXX-XXXX
        </p>
        <p>
          <span className="font-medium text-blue-700">Address:</span> placeholder
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="font-semibold text-base text-blue-900 mb-3">
          <Link href="/returns-complaint" className="hover:underline">
            Returns & Complaints
          </Link>
        </h2>
        <p>
        </p>
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
    </footer>
  );
}