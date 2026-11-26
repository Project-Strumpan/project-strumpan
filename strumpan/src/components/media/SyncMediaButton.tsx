"use client";

import { useState } from "react";

interface SyncMediaButtonProps {
	defaultProductId?: number;
	defaultSortOrder?: number;
	onSynced?: (insertedCount: number) => void;
}

export function SyncMediaButton({
	defaultProductId = 1,
	defaultSortOrder = 0,
	onSynced,
}: SyncMediaButtonProps) {
	const [isSyncing, setIsSyncing] = useState(false);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [isError, setIsError] = useState(false);

	async function handleSyncMedia() {
		setIsSyncing(true);
		setStatusMessage(null);
		setIsError(false);

		try {
			const res = await fetch("/api/product-media/sync", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					default_product_id: defaultProductId,
					default_sort_order: defaultSortOrder,
				}),
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.error || "Media sync failed.");
			}

			setStatusMessage(
				data.insertedCount > 0
					? `${data.insertedCount} new media file(s) added.`
					: "All media files are already synced."
			);
			onSynced?.(data.insertedCount);
		} catch (err) {
			setIsError(true);
			setStatusMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
		} finally {
			setIsSyncing(false);
		}
	}

	return (
		<div className="inline-flex flex-col items-start gap-2">
			<button
				type="button"
				onClick={handleSyncMedia}
				disabled={isSyncing}
				className="bg-black text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-800 transition disabled:bg-gray-400"
			>
				{isSyncing ? "Syncing media..." : "Sync media"}
			</button>

			{statusMessage && (
				<span
					className={`text-xs ${
						isError ? "text-red-600" : "text-emerald-700"
					}`}
				>
					{statusMessage}
				</span>
			)}
		</div>
	);
}