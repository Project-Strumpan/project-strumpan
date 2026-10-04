export type ProductVariant = {
    variant_id: number;
    size: string;
    color: string | null;
    sku: string;
    availableQuantity: number;
}

export type ProductWithVariants = {
    product_id: number;
    category_id: number;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    variants: ProductVariant[];
}

export type CatalogueProduct = {
    product_id: number;
    category_id: number;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
}