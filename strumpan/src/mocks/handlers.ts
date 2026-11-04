import { http, HttpResponse } from "msw";
import { mockInventory } from "@/mocks/inventory";

export const handlers = [
  http.get("/api/products/:id", ({ params }) => {
    const productId = Number(params.id);

    if (!Number.isSafeInteger(productId) || productId < 1) {
      return HttpResponse.json(
        { error: "Invalid product ID" },
        { status: 400 },
      );
    }

    const items = mockInventory.filter(
      (item) => item.productId === productId,
    );

    if (items.length === 0) {
      return HttpResponse.json(
        { error: "Product not found" },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      product_id: productId,
      category_id: 1,
      name: items[0].productName,
      description: "Development mock product",
      price: 0,
      image_url: null,
      variants: items.map((item) => ({
        variant_id: item.variantId,
        size: item.size,
        color: item.color,
        sku: item.sku,
        available_quantity: item.quantity,
      })),
    });
  }),
];