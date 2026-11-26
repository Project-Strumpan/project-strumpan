export type ProductMediaType = "image" | "video";

export interface ProductMediaItem {
	media_id: number;
	product_id: number;
	variant_id: number | null;
	media_type: ProductMediaType;
	media_url: string;
	sort_order: number;
}

export interface CreateProductMediaRequest {
	product_id: number;
	variant_id?: number | null;
	media_type?: ProductMediaType;
	media_url: string;
	sort_order?: number;
}

export interface UpdateProductMediaRequest {
	product_id?: number;
	variant_id?: number | null;
	media_type?: ProductMediaType;
	media_url?: string;
	sort_order?: number;
}

export interface DeleteProductMediaResponse {
	deleted: true;
	media_id: number;
}