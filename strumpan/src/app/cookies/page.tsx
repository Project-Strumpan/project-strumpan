import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookies | Strumpan",
  description: "Information om hur Strumpan använder cookies.",
};

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Link href="/" className="mb-6 inline-block text-sm hover:underline">
        ← Tillbaka till startsidan
      </Link>

      {/* TODO (PRO-25): Ta bort hela denna banner när legal har godkänt texten */}
      <div
        role="alert"
        className="mb-8 rounded-lg border-2 border-yellow-500 bg-yellow-100 p-4 text-yellow-900"
      >
        <p className="font-bold">OBS: Preliminär text</p>
        <p className="mt-1 text-sm">
          Denna cookie policy är ett utkast och ska ersättas med den text som
          Daniel/legal har godkänt innan sajten publiceras.
        </p>
      </div>

      <h1 className="mb-2 text-3xl font-bold">Cookies</h1>
      <p className="mb-8 text-sm text-gray-400">
        Senast uppdaterad: [DATUM – fylls i av legal]
      </p>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">Vad är cookies?</h2>
        <p>
          Cookies (kakor) är små textfiler som sparas i din webbläsare när du
          besöker en webbplats. De gör att sajten kan komma ihåg information
          mellan sidbesök.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">
          Så använder Strumpan cookies
        </h2>
        <p className="mb-3">
          Vår varukorg använder cookies för att komma ihåg vilka produkter du
          har lagt i den medan du handlar. Utan dessa cookies skulle din
          varukorg tömmas varje gång du byter sida.
        </p>
        <p>
          Vi följer gällande lagstiftning, bland annat lagen om elektronisk
          kommunikation och dataskyddsförordningen (GDPR).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-xl font-semibold">Cookies vi använder</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-black text-left text-sm text-white">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-800 text-white">
                <th className="p-2">Namn</th>
                <th className="p-2">Syfte</th>
                <th className="p-2">Typ</th>
                <th className="p-2">Lagringstid</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-700">
                <td className="p-2">[cookie-namn]</td>
                <td className="p-2">Håller reda på innehållet i varukorgen</td>
                <td className="p-2">Nödvändig</td>
                <td className="p-2">[fylls i]</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">Samtycke</h2>
        <p>
          Nödvändiga cookies, som varukorgens, behövs för att tjänsten ska
          fungera och kräver inget samtycke. Om vi i framtiden använder cookies
          för statistik eller marknadsföring ber vi först om ditt samtycke, och
          du kan när som helst ändra dig.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">Hantera cookies</h2>
        <p>
          Du kan ta bort eller blockera cookies i din webbläsares inställningar.
          Observera att varukorgen då kan sluta fungera.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Kontakt</h2>
        <p>Frågor om cookies? Kontakta oss på [e-postadress – fylls i].</p>
      </section>
    </main>
  );
}