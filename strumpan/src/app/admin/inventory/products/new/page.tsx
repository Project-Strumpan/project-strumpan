import Link from "next/link";
import ProductForm from "@/components/inventory/ProductForm";

export default function NewProductPage() {
  return (
    <main>
      <Link href="/admin/inventory" className="text-sm underline underline-offset-4">
        ← Back to inventory
      </Link>
      <h1 className="mt-4 mb-6 text-3xl font-bold">New product</h1>
      <ProductForm />
    </main>
  );
}