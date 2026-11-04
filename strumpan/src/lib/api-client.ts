import type { CreateOrderRequest, CreateOrderResponse } from "@/types/order";
import type { ProductWithVariants } from "@/types/product";

export type ApiClientErrorKind = "network" | "http" | "invalid-response";

export class ApiClientError extends Error {
	readonly kind: ApiClientErrorKind;
	readonly status?: number;

	constructor(kind: ApiClientErrorKind, message: string, status?: number) {
		super(message);
		this.name = "ApiClientError";
		this.kind = kind;
		this.status = status;
	}
}

export async function getProduct(productId: number): Promise<ProductWithVariants> {
	return requestJson<ProductWithVariants>(
		`/api/products/${encodeURIComponent(String(productId))}`,
		isProductWithVariants
	);
}

export async function createOrder(
	request: CreateOrderRequest
): Promise<CreateOrderResponse> {
	return requestJson<CreateOrderResponse>(
		"/api/orders",
		isCreateOrderResponse,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(request),
		}
	);
}

async function requestJson<T>(
	url: string,
	isExpectedResponse: (value: unknown) => value is T,
	init?: RequestInit
): Promise<T> {
	let response: Response;

	try {
		response = await fetch(url, init);
	} catch {
		throw new ApiClientError(
			"network",
			"Unable to reach the server. Check your connection and try again."
		);
	}

	if (!response.ok) {
		const errorMessage = await readErrorMessage(response);
		throw new ApiClientError("http", errorMessage, response.status);
	}

	let payload: unknown;
	try {
		payload = await response.json();
	} catch {
		throw new ApiClientError(
			"invalid-response",
			"The server returned an invalid response."
		);
	}

	if (!isExpectedResponse(payload)) {
		throw new ApiClientError(
			"invalid-response",
			"The server returned an unexpected response."
		);
	}

	return payload;
}

async function readErrorMessage(response: Response): Promise<string> {
	try {
		const payload: unknown = await response.clone().json();
		if (
			typeof payload === "object" &&
			payload !== null &&
			"error" in payload &&
			typeof payload.error === "string"
		) {
			return payload.error;
		}
	} catch {
		// Use the status-based message below when the error body is not JSON.
	}

	return `Request failed with status ${response.status}.`;
}

function isProductWithVariants(value: unknown): value is ProductWithVariants {
	if (!isRecord(value)) return false;

	return (
		isPositiveInteger(value.product_id) &&
		isNonNegativeInteger(value.category_id) &&
		typeof value.name === "string" &&
		(value.description === null || typeof value.description === "string") &&
		typeof value.price === "number" &&
		Number.isFinite(value.price) &&
		(value.image_url === null || typeof value.image_url === "string") &&
		Array.isArray(value.variants) &&
		value.variants.every(isProductVariant)
	);
}

function isProductVariant(value: unknown): boolean {
	if (!isRecord(value)) return false;

	return (
		isPositiveInteger(value.variant_id) &&
		typeof value.size === "string" &&
		(value.color === null || typeof value.color === "string") &&
		typeof value.sku === "string" &&
		isNonNegativeInteger(value.available_quantity)
	);
}

function isCreateOrderResponse(value: unknown): value is CreateOrderResponse {
	if (!isRecord(value)) return false;

	return (
		isPositiveInteger(value.order_id) &&
		value.order_status === "created" &&
		typeof value.total_cost === "number" &&
		Number.isFinite(value.total_cost) &&
		Array.isArray(value.items) &&
		value.items.every(isCreatedOrderItem)
	);
}

function isCreatedOrderItem(value: unknown): boolean {
	if (!isRecord(value)) return false;

	return (
		isPositiveInteger(value.order_item_id) &&
		isPositiveInteger(value.variant_id) &&
		isPositiveInteger(value.quantity) &&
		typeof value.unit_price === "number" &&
		Number.isFinite(value.unit_price)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isPositiveInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
