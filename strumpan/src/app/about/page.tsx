import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Om oss | Strumpan",
  description:
    "Läs om Strumpans EU-producerade strumpor och underkläder och vår hållbarhetsvision.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm hover:underline">
        ← Tillbaka till startsidan
      </Link>

      {/* TODO (PRO-27): Ta bort denna banner när texten från Daniel/teamet är på plats */}
      <div
        role="alert"
        className="mb-8 rounded-lg border-2 border-yellow-500 bg-yellow-100 p-4 text-yellow-900"
      >
        <p className="font-bold">OBS: Preliminär text</p>
        <p className="mt-1 text-sm">
          Texten på denna sida är platshållare och ska ersättas med text från
          Daniel/projektteamet.
        </p>
      </div>

      <h1 className="mb-6 text-3xl font-bold">Om Strumpan</h1>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">Vår historia</h2>
        <p>[Text om varumärkets bakgrund – fylls i av Daniel/teamet]</p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">
          Tillverkade i EU
        </h2>
        <p>
          [Text om var och hur våra strumpor och underkläder produceras inom EU
          – fylls i av Daniel/teamet]
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">Vår hållbarhetsvision</h2>
        <p>
          [Text om hållbarhetsarbetet och målen framåt – fylls i av
          Daniel/teamet]
        </p>
      </section>
    </main>
  );
}