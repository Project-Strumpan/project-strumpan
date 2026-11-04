export const LOW_STOCK_THRESHOLD = 5;

export const INVENTORY_AVAILABILITY = [
    "in_stock",
    "low_stock",
    "out_of_stock",
] as const;

export type InventoryAvailability = (typeof INVENTORY_AVAILABILITY)[number];

export type InventoryApiItem = {
    product_id: number;
    variant_id: number;
    name: string;
    sku: string;
    color: string | null;
    size: string;
    quantity: number;
    last_updated: string | null;
    availability: InventoryAvailability;
};

export type InventoryApiResponse = {
    items: InventoryApiItem[];
    total: number;
};

export type InventoryApiQuery = {
    search?: string;
    color?: string;
    size?: string;
    availability?: InventoryAvailability;
};

export function isInventoryAvailability(
    value: unknown
): value is InventoryAvailability {
    return (
        typeof value === "string" &&
        (INVENTORY_AVAILABILITY as readonly string[]).includes(value)
    );
}

export function getAvailability(quantity: number): InventoryAvailability {
    if (quantity <= 0) return "out_of_stock";
    if (quantity <= LOW_STOCK_THRESHOLD) return "low_stock";
    return "in_stock";
}