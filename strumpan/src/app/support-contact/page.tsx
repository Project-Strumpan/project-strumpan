import Link from "next/link";

export default function ContactPage() {
    return(
    <div className="space-y-2">
      <Link href="/" className="mb-6 inline-block text-sm hover:underline">
        ← Tillbaka till startsidan
      </Link>

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
      )
}