export type ProductVariant = {
  variant_id: number;
  product_variant_size: string;
  color?: string | null;
  sku?: string | null;
  quantity?: number; 
};

export type Product = {
  product_id: number;
  category_id?: number | null;
  product_name: string;
  product_description: string | null;
  price: number;
  picture_url?: string | null;
  origin?: string | null;
  material?: string | null;
  environmental_labels?: string | null;
  created_date?: string;
  
  variants?: ProductVariant[];
  sizes: string[];       
  stock: number;
};