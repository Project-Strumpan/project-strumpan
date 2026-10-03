import { NextRequest, NextResponse } from "next/server";
import { demoOnly } from "@/lib/demo-only";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }
) {
  const disabled = demoOnly();
  if (disabled) return disabled;

  const { id } = await params;
  const productId = Number(id);

  if (!Number.isSafeInteger(productId) || productId < 1) {
    return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
  }

  if (productId !== 1) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const variants = [
    {
      variant_id: 11,
      product_id: 1,
      product_variant_size: "39-42",
      color: "Black",
      sku: "SOCK-BLK-39-42",
    },
    {
      variant_id: 12,
      product_id: 1,
      product_variant_size: "43-46",
      color: "Black",
      sku: "SOCK-BLK-43-46",
    },
  ];

  return NextResponse.json(variants);
}