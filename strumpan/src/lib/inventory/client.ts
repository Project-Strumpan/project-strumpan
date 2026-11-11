import { getInventoryList } from "@/lib/api-client";
import type { InventoryListResponse } from "@/types/inventory";

export async function getInventory(): Promise<InventoryListResponse> {
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

export class StockConflictError extends Error {
  constructor(public currentQuantity: number) {
    super("Stock was changed by someone else");
  }
}

export async function updateInventoryQuantity(
  variantId: number,
  quantity: number,
  expectedQuantity: number,
): Promise<{ quantity: number; lastUpdated: string }> {
  const response = await fetch(`/api/inventory/${variantId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity, expectedQuantity }),
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 409) {
    throw new StockConflictError(Number(data.currentQuantity));
  }
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to update stock");
  }
  return { quantity: data.quantity, lastUpdated: data.last_updated };
}