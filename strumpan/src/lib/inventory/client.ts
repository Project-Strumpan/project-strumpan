import { getProduct } from "@/lib/api-client";
import type { InventoryListResponse } from "@/types/inventory";

export async function getInventory(): Promise<InventoryListResponse> {
  const useMocks =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_INVENTORY_MOCKS === "true";

  if (!useMocks) {
    throw new Error(
      "Inventory API integration is not configured yet. " +
        "Enable inventory mocks for local development.",
    );
  }

  const { startInventoryMocking } = await import("@/mocks/browser");
  await startInventoryMocking();

  const { mockInventory } = await import("@/mocks/inventory");

  // Temporary product discovery for the mock preview only.
  const productIds = [
    ...new Set(mockInventory.map((item) => item.productId)),
  ];

  // Alan's unchanged client performs fetch and validates each response.
  const products = await Promise.all(
    productIds.map((productId) => getProduct(productId)),
  );

  return {
    items: products.flatMap((product) =>
      product.variants.map((variant) => {
        const previewMetadata = mockInventory.find(
          (item) =>
            item.productId === product.product_id &&
            item.variantId === variant.variant_id,
        );

        if (!previewMetadata) {
          throw new Error("Missing mock metadata for inventory variant.");
        }

        return {
          productId: product.product_id,
          variantId: variant.variant_id,
          productName: product.name,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          quantity: variant.available_quantity,

          // Not supplied by Alan's product endpoint yet.
          isActive: previewMetadata.isActive,
          lastUpdated: previewMetadata.lastUpdated,
        };
      }),
    ),
  };
}