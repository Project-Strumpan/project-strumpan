import { NextResponse } from "next/server";
import type { Product } from "../../types/product";

export const mockProducts: Product[] = [
  {
    product_id: 1,
    category_id: 1,
    product_name: "Vita bomullsstrumpor",
    product_description: "Mjuka och sköna strumpor tillverkade i 100% ekologisk bomull.",
    price: 99,
    picture_url: null,
    origin: "Sverige",
    material: "Bomull",
    environmental_labels: "GOTS-certifierad",
    sizes: ["S", "M", "L"],
    stock: 20,
  },
  {
    product_id: 2,
    category_id: 2,
    product_name: "Svarta sportstrumpor",
    product_description: "Funktionsstrumpor med god andningsförmåga för träning och löpning.",
    price: 149,
    picture_url: null,
    origin: "Portugal",
    material: "Syntet",
    environmental_labels: "OEKO-TEX",
    sizes: ["M", "L", "XL"],
    stock: 12,
  },
  {
    product_id: 3,
    category_id: 1,
    product_name: "Värmande ullstrumpor",
    product_description: "Tjocka och varma strumpor i merinoull för kalla vinterdagar.",
    price: 199,
    picture_url: null,
    origin: "Norge",
    material: "Merinoull",
    environmental_labels: "Svanenmärkt",
    sizes: ["S", "M", "L", "XL"],
    stock: 0, 
  },
];

export async function GET() {
  await new Promise((resolve) => setTimeout(resolve, 200));

  return NextResponse.json(mockProducts);
}