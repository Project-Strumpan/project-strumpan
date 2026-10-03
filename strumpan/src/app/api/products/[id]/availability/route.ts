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

  const availability = [
    {
      inventory_id: 101,
      variant_id: 11,
      quantity: 8,
      last_updated: "2026-09-30T12:00:00.000Z",
    },
    {
      inventory_id: 102,
      variant_id: 12,
      quantity: 0,
      last_updated: "2026-09-30T12:00:00.000Z",
    },
  ];

  return NextResponse.json(availability);
}