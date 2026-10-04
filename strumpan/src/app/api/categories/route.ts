import { NextRequest, NextResponse } from "next/server";
import { demoOnly } from "@/lib/demo-only";

export async function GET() {
  const disabled = demoOnly();
  if (disabled) return disabled;

  const categories = [
    {
      category_id: 1,
      category_name: "Socks",
      category_description: "Durable, European-made socks",
    },
    {
      category_id: 2,
      category_name: "Underwear",
      category_description: null,
    },
  ];

  return NextResponse.json(categories);
}