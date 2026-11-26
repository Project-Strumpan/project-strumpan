import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "@/lib/db";

interface ScannedFile {
	media_url: string;
	media_type: "image" | "video";
}

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".m4v"]);

async function scanPublicMedia(): Promise<ScannedFile[]> {
	const mediaRoot = path.join(process.cwd(), "public", "media");
	const results: ScannedFile[] = [];

	async function walk(currentDir: string) {
		let entries;
		try {
			entries = await fs.readdir(currentDir, { withFileTypes: true });
		} catch {
			return;
		}

		for (const entry of entries) {
			const fullPath = path.join(currentDir, entry.name);
			if (entry.isDirectory()) {
				await walk(fullPath);
			} else if (entry.isFile()) {
				const ext = path.extname(entry.name).toLowerCase();
				let media_type: "image" | "video" | null = null;

				if (IMAGE_EXTENSIONS.has(ext)) media_type = "image";
				else if (VIDEO_EXTENSIONS.has(ext)) media_type = "video";

				if (!media_type) continue;

				const relativeToPublic = path
					.relative(path.join(process.cwd(), "public"), fullPath)
					.split(path.sep)
					.join("/");

				results.push({
					media_url: `/${relativeToPublic}`,
					media_type,
				});
			}
		}
	}

	await walk(mediaRoot);
	return results;
}

export async function POST(request: Request) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
	}

	const { default_product_id, default_sort_order } = body as Record<string, unknown>;

	if (
		typeof default_product_id !== "number" ||
		!Number.isInteger(default_product_id) ||
		default_product_id <= 0
	) {
		return NextResponse.json(
			{ error: "A valid default_product_id is required." },
			{ status: 422 }
		);
	}

	const sortOrder =
		typeof default_sort_order === "number" &&
		Number.isInteger(default_sort_order) &&
		default_sort_order >= 0
			? default_sort_order
			: 0;

	let connection;
	try {
		connection = await pool.getConnection();

		const products = await connection.query<{ product_id: number }[]>(
			"SELECT product_id FROM Products WHERE product_id = ?",
			[default_product_id]
		);
		if (products.length === 0) {
			return NextResponse.json(
				{ error: `Product with ID ${default_product_id} does not exist.` },
				{ status: 404 }
			);
		}

		const files = await scanPublicMedia();
		const existingRows = await connection.query<{ media_url: string }[]>(
			"SELECT media_url FROM Product_media"
		);
		const existingUrls = new Set(existingRows.map((row) => row.media_url));

		const missingFiles = files.filter(
			(f) => !existingUrls.has(f.media_url) && f.media_url.length <= 255
		);

		for (const file of missingFiles) {
			await connection.query(
				`INSERT INTO Product_media (product_id, variant_id, media_type, media_url, sort_order)
				 VALUES (?, NULL, ?, ?, ?)`,
				[default_product_id, file.media_type, file.media_url, sortOrder]
			);
		}

		return NextResponse.json(
			{
				insertedCount: missingFiles.length,
				inserted: missingFiles,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Failed to sync media files:", error);
		return NextResponse.json(
			{ error: "Failed to sync media files to database." },
			{ status: 500 }
		);
	} finally {
		connection?.release();
	}
}