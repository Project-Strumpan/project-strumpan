export type ProductVariant = {
    variant_id: number;
    size: string;
    color: string | null;
    sku: string;
    availableQuantity: number;
}

export type Product = {
    product_id: number;
    category_id: number;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    created_at: Date, // TODO: check if this is needed
    variants: ProductVariant[];
}