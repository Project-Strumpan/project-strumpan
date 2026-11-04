import { getInventoryList } from "@/lib/api-client";
import type { InventoryListResponse } from "@/types/inventory";

export async function getInventory(): Promise<InventoryListResponse> {
  const useMocks =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_INVENTORY_MOCKS === "true";

  // TEMPORARY: the API has no active flag, so the mock preview keeps
  // isActive from mockInventory. Without mocks every row is treated as active.
  let activeByVariant = new Map<number, boolean>();

  if (useMocks) {
    const { startInventoryMocking } = await import("@/mocks/browser");
    await startInventoryMocking();

    const { mockInventory } = await import("@/mocks/inventory");
    activeByVariant = new Map(
      mockInventory.map((item) => [item.variantId, item.isActive]),
    );
  }

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
      isActive: activeByVariant.get(item.variant_id) ?? true,
      lastUpdated: item.last_updated,
    })),
  };
}