import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { ProductMediaItem } from "@/types/product-media";

export async function GET() {
	let connection;
	try {
		connection = await pool.getConnection();

		const rows = await connection.query<ProductMediaItem[]>(
			`SELECT media_id, product_id, variant_id, media_type, media_url, sort_order
			 FROM Product_media
			 ORDER BY product_id ASC, sort_order ASC, media_id DESC`
		);

		return NextResponse.json(rows, { status: 200 });
	} catch (error) {
		console.error("Failed to fetch product media:", error);
		return NextResponse.json(
			{ error: "Failed to fetch product media." },
			{ status: 500 }
		);
	} finally {
		connection?.release();
	}
}

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
	}

	if (typeof body !== "object" || body === null) {
		return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
	}

	const { product_id, variant_id, media_type, media_url, sort_order } =
		body as Record<string, unknown>;

	if (typeof product_id !== "number" || !Number.isInteger(product_id) || product_id <= 0) {
		return NextResponse.json({ error: "Valid product_id is required." }, { status: 422 });
	}

	const resolvedVariantId = variant_id === undefined || variant_id === null ? null : variant_id;
	if (
		resolvedVariantId !== null &&
		(typeof resolvedVariantId !== "number" ||
			!Number.isInteger(resolvedVariantId) ||
			resolvedVariantId <= 0)
	) {
		return NextResponse.json({ error: "Invalid variant_id." }, { status: 422 });
	}

	const resolvedMediaType = media_type === undefined ? "image" : media_type;
	if (resolvedMediaType !== "image" && resolvedMediaType !== "video") {
		return NextResponse.json(
			{ error: "media_type must be 'image' or 'video'." },
			{ status: 422 }
		);
	}

	if (typeof media_url !== "string" || media_url.trim().length === 0) {
		return NextResponse.json({ error: "media_url is required." }, { status: 422 });
	}

	const trimmedUrl = media_url.trim();
	if (trimmedUrl.length > 255) {
		return NextResponse.json(
			{ error: "media_url cannot exceed 255 characters." },
			{ status: 422 }
		);
	}

	const resolvedSortOrder = sort_order === undefined ? 0 : sort_order;
	if (
		typeof resolvedSortOrder !== "number" ||
		!Number.isInteger(resolvedSortOrder) ||
		resolvedSortOrder < 0
	) {
		return NextResponse.json(
			{ error: "sort_order must be a non-negative integer." },
			{ status: 422 }
		);
	}

	let connection;
	try {
		connection = await pool.getConnection();

		const products = await connection.query<{ product_id: number }[]>(
			"SELECT product_id FROM Products WHERE product_id = ?",
			[product_id]
		);
		if (products.length === 0) {
			return NextResponse.json({ error: "Product not found." }, { status: 404 });
		}

		if (resolvedVariantId !== null) {
			const variants = await connection.query<{ variant_id: number }[]>(
				"SELECT variant_id FROM Product_variants WHERE variant_id = ? AND product_id = ?",
				[resolvedVariantId, product_id]
			);
			if (variants.length === 0) {
				return NextResponse.json(
					{ error: "Variant not found for this product." },
					{ status: 404 }
				);
			}
		}

		const result = await connection.query<{ insertId: bigint | number }>(
			`INSERT INTO Product_media (product_id, variant_id, media_type, media_url, sort_order)
			 VALUES (?, ?, ?, ?, ?)`,
			[product_id, resolvedVariantId, resolvedMediaType, trimmedUrl, resolvedSortOrder]
		);

		return NextResponse.json(
			{
				media_id: Number(result.insertId),
				product_id,
				variant_id: resolvedVariantId,
				media_type: resolvedMediaType,
				media_url: trimmedUrl,
				sort_order: resolvedSortOrder,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Failed to create product media:", error);
		return NextResponse.json(
			{ error: "Failed to create product media." },
			{ status: 500 }
		);
	} finally {
		connection?.release();
	}
}