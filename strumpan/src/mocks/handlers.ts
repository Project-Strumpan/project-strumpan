import { http, HttpResponse } from "msw";
import { mockInventory } from "@/mocks/inventory";
import { getAvailability } from "@/types/inventory-api";

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

  http.get("/api/inventory", ({ request }) => {
    const url = new URL(request.url);
    const search = (url.searchParams.get("search") ?? "").toLowerCase();
    const color = url.searchParams.get("color") ?? "";
    const size = url.searchParams.get("size") ?? "";
    const availability = url.searchParams.get("availability") ?? "";

    const items = mockInventory
      .map((item) => ({
        product_id: item.productId,
        variant_id: item.variantId,
        name: item.productName,
        sku: item.sku,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
        last_updated: item.lastUpdated,
        availability: getAvailability(item.quantity),
      }))
      .filter(
        (i) =>
          (!search ||
            i.name.toLowerCase().includes(search) ||
            i.sku.toLowerCase().includes(search)) &&
          (!color || i.color === color) &&
          (!size || i.size === size) &&
          (!availability || i.availability === availability),
      );

    return HttpResponse.json({ items, total: items.length });
  }),
];