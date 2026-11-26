import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { ProductMediaItem } from "@/types/product-media";

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ mediaId: string }> }
) {
	const { mediaId } = await params;
	const id = Number(mediaId);

	if (!Number.isSafeInteger(id) || id < 1) {
		return NextResponse.json({ error: "Invalid media ID." }, { status: 400 });
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
	}

	if (typeof body !== "object" || body === null) {
		return NextResponse.json({ error: "Request body must be an object." }, { status: 400 });
	}

	const payload = body as Record<string, unknown>;
	const updates: string[] = [];
	const values: unknown[] = [];

	if ("product_id" in payload) {
		if (
			typeof payload.product_id !== "number" ||
			!Number.isInteger(payload.product_id) ||
			payload.product_id <= 0
		) {
			return NextResponse.json({ error: "Invalid product_id." }, { status: 422 });
		}
		updates.push("product_id = ?");
		values.push(payload.product_id);
	}

	if ("variant_id" in payload) {
		if (
			payload.variant_id !== null &&
			(typeof payload.variant_id !== "number" ||
				!Number.isInteger(payload.variant_id) ||
				payload.variant_id <= 0)
		) {
			return NextResponse.json({ error: "Invalid variant_id." }, { status: 422 });
		}
		updates.push("variant_id = ?");
		values.push(payload.variant_id);
	}

	if ("media_type" in payload) {
		if (payload.media_type !== "image" && payload.media_type !== "video") {
			return NextResponse.json(
				{ error: "media_type must be 'image' or 'video'." },
				{ status: 422 }
			);
		}
		updates.push("media_type = ?");
		values.push(payload.media_type);
	}

	if ("media_url" in payload) {
		if (typeof payload.media_url !== "string" || payload.media_url.trim().length === 0) {
			return NextResponse.json({ error: "media_url cannot be empty." }, { status: 422 });
		}
		const trimmedUrl = payload.media_url.trim();
		if (trimmedUrl.length > 255) {
			return NextResponse.json(
				{ error: "media_url cannot exceed 255 characters." },
				{ status: 422 }
			);
		}
		updates.push("media_url = ?");
		values.push(trimmedUrl);
	}

	if ("sort_order" in payload) {
		if (
			typeof payload.sort_order !== "number" ||
			!Number.isInteger(payload.sort_order) ||
			payload.sort_order < 0
		) {
			return NextResponse.json(
				{ error: "sort_order must be a non-negative integer." },
				{ status: 422 }
			);
		}
		updates.push("sort_order = ?");
		values.push(payload.sort_order);
	}

	if (updates.length === 0) {
		return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
	}

	let connection;
	try {
		connection = await pool.getConnection();

		const existing = await connection.query<{ product_id: number }[]>(
			"SELECT product_id FROM Product_media WHERE media_id = ?",
			[id]
		);
		if (existing.length === 0) {
			return NextResponse.json({ error: "Product media not found." }, { status: 404 });
		}

		const targetProductId =
			typeof payload.product_id === "number"
				? payload.product_id
				: existing[0].product_id;

		if ("product_id" in payload) {
			const products = await connection.query<{ product_id: number }[]>(
				"SELECT product_id FROM Products WHERE product_id = ?",
				[targetProductId]
			);
			if (products.length === 0) {
				return NextResponse.json({ error: "Product not found." }, { status: 404 });
			}
		}

		if ("variant_id" in payload && payload.variant_id !== null) {
			const variants = await connection.query<{ variant_id: number }[]>(
				"SELECT variant_id FROM Product_variants WHERE variant_id = ? AND product_id = ?",
				[payload.variant_id, targetProductId]
			);
			if (variants.length === 0) {
				return NextResponse.json(
					{ error: "Variant not found for this product." },
					{ status: 404 }
				);
			}
		}

		values.push(id);
		await connection.query(
			`UPDATE Product_media SET ${updates.join(", ")} WHERE media_id = ?`,
			values
		);

		const updatedRows = await connection.query<ProductMediaItem[]>(
			`SELECT media_id, product_id, variant_id, media_type, media_url, sort_order
			 FROM Product_media
			 WHERE media_id = ?`,
			[id]
		);

		return NextResponse.json(updatedRows[0], { status: 200 });
	} catch (error) {
		console.error("Failed to update product media:", error);
		return NextResponse.json(
			{ error: "Failed to update product media." },
			{ status: 500 }
		);
	} finally {
		connection?.release();
	}
}

export async function DELETE(
	_request: Request,
	{ params }: { params: Promise<{ mediaId: string }> }
) {
	const { mediaId } = await params;
	const id = Number(mediaId);

	if (!Number.isSafeInteger(id) || id < 1) {
		return NextResponse.json({ error: "Invalid media ID." }, { status: 400 });
	}

	let connection;
	try {
		connection = await pool.getConnection();

		const result = await connection.query<{ affectedRows: number }>(
			"DELETE FROM Product_media WHERE media_id = ?",
			[id]
		);

		if (result.affectedRows === 0) {
			return NextResponse.json({ error: "Product media not found." }, { status: 404 });
		}

		return NextResponse.json({ deleted: true, media_id: id }, { status: 200 });
	} catch (error) {
		console.error("Failed to delete product media:", error);
		return NextResponse.json(
			{ error: "Failed to delete product media." },
			{ status: 500 }
		);
	} finally {
		connection?.release();
	}
}