import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { ProductMediaItem } from "@/types/product-media";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	const productId = Number(id);

	if (!Number.isSafeInteger(productId) || productId < 1) {
		return NextResponse.json({ error: "Invalid product ID." }, { status: 400 });
	}

	let connection;
	try {
		connection = await pool.getConnection();

		const products = await connection.query<{ product_id: number }[]>(
			"SELECT product_id FROM Products WHERE product_id = ?",
			[productId]
		);
		if (products.length === 0) {
			return NextResponse.json({ error: "Product not found." }, { status: 404 });
		}

		const rows = await connection.query<ProductMediaItem[]>(
			`SELECT media_id, product_id, variant_id, media_type, media_url, sort_order
			 FROM Product_media
			 WHERE product_id = ?
			 ORDER BY sort_order ASC, media_id ASC`,
			[productId]
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