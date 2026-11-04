export type InventoryItem = {
    productId: number;
    variantId: number;
    sku: string;
    productName: string;
    size: string;
    color: string | null;
    quantity: number;
    isActive: boolean;
    lastUpdated: string | null;
}

export type InventoryListResponse = {
    items: InventoryItem[];
}