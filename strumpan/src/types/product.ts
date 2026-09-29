export type Product = {
    product_id: number;
    category_id: number;
    name: string;
    description: string;
    price: number;
    image_url: string | null;
    created_at: Date; // TODO: check if this is needed
}