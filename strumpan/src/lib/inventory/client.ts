// DETTA SKA BYTAS TILL API SEN FÖR ATT VISA DATA
import { mockInventory } from "@/mocks/inventory";
import type { InventoryListResponse } from "@/types/inventory";

export async function getInventory(): Promise<InventoryListResponse> {
  return {
    items: mockInventory.map((item) => ({ ...item })),
  };
}
