import Image from "next/image";
import Link from "next/link";
import ProductCatalog from "./product-catalog";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center font-sans bg-background">
      <main className="flex flex-1 w-full max-w-full flex-col items-center justify-between px-16 sm:items-start bg-background">
        <ProductCatalog/>
      </main>
    </div>
  );
}
