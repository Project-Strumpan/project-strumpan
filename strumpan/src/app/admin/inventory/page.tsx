import type { Metadata } from "next";
import InventoryOverview from "@/components/inventory/InventoryOverview";

export const metadata: Metadata = {
  title: "Inventory | Strumpan Admin",
  description: "Administrative inventory overview.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function InventoryPage() {
  return <InventoryOverview />;
}