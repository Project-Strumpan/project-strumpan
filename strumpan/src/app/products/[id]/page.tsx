import Link from "next/link";
import { notFound } from "next/navigation";
import type { Product } from "../../types/product";

type ProductPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const productId = Number(id);

  // Hämtar produkten via vårt test-API
  let product: Product | null = null;

  try {
    // För serverkomponenter i utveckling kan du anropa API-ruten direkt eller filtrera mock-datan
    const res = await fetch(`http://localhost:3000/api/products`, {
      cache: "no-store",
    });

    if (res.ok) {
      const products: Product[] = await res.json();
      product = products.find((p) => p.product_id === productId) || null;
    }
  } catch {
    product = null;
  }

  if (!product) {
    notFound();
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 mb-6 transition-colors"
      >
        ← Tillbaka till produktlistan
      </Link>

      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col gap-6">
          <div>
            <span className="inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-md mb-3">
              Produkt-ID: #{product.product_id}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {product.product_name}
            </h1>
            <p className="mt-3 text-base text-gray-600 dark:text-gray-300 leading-relaxed">
              {product.product_description || "Ingen beskrivning tillgänglig."}
            </p>
          </div>

          <div className="border-t border-b border-gray-100 dark:border-zinc-800 py-4 my-2 flex items-baseline justify-between">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Pris
            </span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {product.price} kr
            </span>
          </div>

          {/* Produktdetaljer från ER-diagrammet */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block font-semibold text-gray-700 dark:text-gray-300">
                Tillgängliga storlekar:
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {product.sizes.length > 0 ? product.sizes.join(", ") : "Inga storlekar"}
              </span>
            </div>

            <div>
              <span className="block font-semibold text-gray-700 dark:text-gray-300">
                Lagerstatus:
              </span>
              <span
                className={`font-medium ${
                  product.stock > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {product.stock > 0
                  ? `${product.stock} st i lager`
                  : "Slut i lager"}
              </span>
            </div>

            {product.material && (
              <div>
                <span className="block font-semibold text-gray-700 dark:text-gray-300">
                  Material:
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {product.material}
                </span>
              </div>
            )}

            {product.origin && (
              <div>
                <span className="block font-semibold text-gray-700 dark:text-gray-300">
                  Ursprung:
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {product.origin}
                </span>
              </div>
            )}
          </div>

          {/* Köpknapp */}
          <div className="mt-4">
            <button
              type="button"
              disabled={product.stock === 0}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors disabled:bg-gray-300 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed"
            >
              {product.stock > 0 ? "Lägg i varukorg" : "Slut i lager"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}