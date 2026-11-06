import { getInventoryList } from "@/lib/api-client";
import type { InventoryListResponse } from "@/types/inventory";

export async function getInventory(): Promise<InventoryListResponse> {
  // Throws ApiClientError on network/HTTP/invalid response. No mock fallback.
  const { items } = await getInventoryList();

  return {
    items: items.map((item) => ({
      productId: item.product_id,
      variantId: item.variant_id,
      productName: item.name,
      sku: item.sku,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      lastUpdated: item.last_updated,
    })),
  };
}