"use client";

import { useEffect, useMemo, useState } from "react";
import { SyncMediaButton } from "@/components/media/SyncMediaButton";
import {
	getAllProductMedia,
	updateProductMedia,
	deleteProductMedia,
	getProduct,
} from "@/lib/api-client";
import type { ProductMediaItem } from "@/types/product-media";
import type { ProductWithVariants } from "@/types/product";

interface ProductOption {
	product_id: number;
	name: string;
}

// "/media/images/underwear/men/file.jpg" -> { folder: "underwear", subFolder: "men" }
// "/media/images/socks/file.jpg" -> { folder: "socks", subFolder: null }
function parseMediaPath(mediaUrl: string): { folder: string; subFolder: string | null } {
	const parts = mediaUrl.split("/").filter(Boolean); // ["media", "images", "underwear", "men", "file.jpg"]
	const folder = parts.length >= 4 ? parts[2] : "uncategorized";
	const subFolder = parts.length >= 5 ? parts[3] : null;
	return { folder, subFolder };
}

export default function MediaManagementPage() {
	const [mediaList, setMediaList] = useState<ProductMediaItem[]>([]);
	const [products, setProducts] = useState<ProductOption[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);

	// Navigation state for folders & subfolders
	const [openFolder, setOpenFolder] = useState<string | null>(null);
	const [openSubFolder, setOpenSubFolder] = useState<string | null>(null);

	// Selected media item for editing/linking
	const [selectedMedia, setSelectedMedia] = useState<ProductMediaItem | null>(null);
	const [selectedProductId, setSelectedProductId] = useState<number>(1);
	const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
	const [sortOrder, setSortOrder] = useState<number>(0);

	// Variants for the currently selected product
	const [availableVariants, setAvailableVariants] = useState<ProductWithVariants["variants"]>([]);
	const [isLoadingVariants, setIsLoadingVariants] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	async function loadMediaAndProducts() {
		setIsLoading(true);
		setErrorMessage(null);
		try {
			const [media, productsResponse] = await Promise.all([
				getAllProductMedia(),
				fetch("/api/products").then((res) => (res.ok ? res.json() : [])),
			]);
			setMediaList(media);
			if (Array.isArray(productsResponse)) {
				setProducts(productsResponse);
			}
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : "Failed to load media.");
		} finally {
			setIsLoading(false);
		}
	}

	useEffect(() => {
		loadMediaAndProducts();
	}, []);

	// Fetch variants whenever a media item is selected or the target product changes
	useEffect(() => {
		if (!selectedMedia || !selectedProductId) {
			setAvailableVariants([]);
			return;
		}

		let isCancelled = false;
		async function fetchVariantsForProduct() {
			setIsLoadingVariants(true);
			try {
				const productDetails = await getProduct(selectedProductId);
				if (!isCancelled) {
					setAvailableVariants(productDetails.variants);
				}
			} catch {
				if (!isCancelled) {
					setAvailableVariants([]);
				}
			} finally {
				if (!isCancelled) {
					setIsLoadingVariants(false);
				}
			}
		}

		fetchVariantsForProduct();
		return () => {
			isCancelled = true;
		};
	}, [selectedMedia, selectedProductId]);

	// Group all media items by top-level folder ("socks", "underwear", etc.)
	const groupedMediaByFolder = useMemo(() => {
		const sorted = [...mediaList].sort((a, b) => {
			const pathA = parseMediaPath(a.media_url);
			const pathB = parseMediaPath(b.media_url);
			const folderCompare = pathA.folder.localeCompare(pathB.folder);
			if (folderCompare !== 0) return folderCompare;
			if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
			return a.media_url.localeCompare(b.media_url);
		});

		const groups = new Map<string, ProductMediaItem[]>();
		for (const item of sorted) {
			const { folder } = parseMediaPath(item.media_url);
			const existing = groups.get(folder) ?? [];
			existing.push(item);
			groups.set(folder, existing);
		}

		return Array.from(groups.entries());
	}, [mediaList]);

	// All items in the currently opened folder
	const itemsInOpenFolder = useMemo(() => {
		if (!openFolder) return [];
		return groupedMediaByFolder.find(([folder]) => folder === openFolder)?.[1] ?? [];
	}, [groupedMediaByFolder, openFolder]);

	// Subfolders inside openFolder (e.g. [["men", [...]], ["women", [...]]])
	const subFoldersInOpenFolder = useMemo(() => {
		const subGroups = new Map<string, ProductMediaItem[]>();
		for (const item of itemsInOpenFolder) {
			const { subFolder } = parseMediaPath(item.media_url);
			if (subFolder) {
				const existing = subGroups.get(subFolder) ?? [];
				existing.push(item);
				subGroups.set(subFolder, existing);
			}
		}
		return Array.from(subGroups.entries()).sort(([a], [b]) => a.localeCompare(b));
	}, [itemsInOpenFolder]);

	const hasSubFolders = subFoldersInOpenFolder.length > 0;

	// Visible items based on whether a subfolder is selected
	const visibleMediaItems = useMemo(() => {
		if (!openFolder) return [];
		if (!hasSubFolders) return itemsInOpenFolder;
		if (!openSubFolder) return [];
		return subFoldersInOpenFolder.find(([sub]) => sub === openSubFolder)?.[1] ?? [];
	}, [openFolder, hasSubFolders, itemsInOpenFolder, openSubFolder, subFoldersInOpenFolder]);

	function handleOpenFolder(folderName: string) {
		setOpenFolder(folderName);
		setOpenSubFolder(null);
		setSelectedMedia(null);
		setStatusMessage(null);
		setErrorMessage(null);
	}

	function handleCloseFolder() {
		setOpenFolder(null);
		setOpenSubFolder(null);
		setSelectedMedia(null);
	}

	function handleOpenSubFolder(subFolderName: string) {
		setOpenSubFolder(subFolderName);
		setSelectedMedia(null);
		setStatusMessage(null);
		setErrorMessage(null);
	}

	function handleSelectMedia(item: ProductMediaItem) {
		setSelectedMedia(item);
		setSelectedProductId(item.product_id);
		setSelectedVariantId(item.variant_id);
		setSortOrder(item.sort_order);
		setStatusMessage(null);
		setErrorMessage(null);
	}

	function handleProductChange(newProductId: number) {
		setSelectedProductId(newProductId);
		setSelectedVariantId(null);
	}

	async function handleSaveAssignment(e: React.FormEvent) {
		e.preventDefault();
		if (!selectedMedia) return;

		setIsSaving(true);
		setErrorMessage(null);
		setStatusMessage(null);

		try {
			const updated = await updateProductMedia(selectedMedia.media_id, {
				product_id: selectedProductId,
				variant_id: selectedVariantId,
				sort_order: sortOrder,
			});

			setMediaList((prev) =>
				prev.map((m) => (m.media_id === updated.media_id ? updated : m))
			);
			setSelectedMedia(updated);
			setStatusMessage(`Media #${updated.media_id} has been updated.`);
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : "Failed to update media.");
		} finally {
			setIsSaving(false);
		}
	}

	async function handleDeleteMedia(mediaId: number) {
		if (!window.confirm(`Are you sure you want to delete media #${mediaId} from the database?`)) {
			return;
		}

		setErrorMessage(null);
		setStatusMessage(null);
		try {
			await deleteProductMedia(mediaId);
			setMediaList((prev) => prev.filter((m) => m.media_id !== mediaId));
			if (selectedMedia?.media_id === mediaId) {
				setSelectedMedia(null);
			}
			setStatusMessage(`Media #${mediaId} has been deleted.`);
		} catch (err) {
			setErrorMessage(err instanceof Error ? err.message : "Failed to delete media.");
		}
	}

	return (
		<div className="max-w-6xl mx-auto p-6 space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
				<div>
					<h1 className="text-2xl font-semibold">Manage Product Media</h1>
					<p className="text-sm text-gray-600">
						Sync media files, select a folder to view its media, or assign to products and variants.
					</p>
				</div>

				<SyncMediaButton
					defaultProductId={1}
					onSynced={() => loadMediaAndProducts()}
				/>
			</div>

			{statusMessage && (
				<div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm">
					{statusMessage}
				</div>
			)}

			{errorMessage && (
				<div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
					{errorMessage}
				</div>
			)}

			{isLoading ? (
				<p className="text-sm text-gray-500">Loading product media...</p>
			) : groupedMediaByFolder.length === 0 ? (
				<p className="text-sm text-gray-500">
					No media found in database. Try syncing public/media.
				</p>
			) : openFolder === null ? (
				<div className="space-y-3">
					<h2 className="font-semibold text-base">
						Media Folders ({groupedMediaByFolder.length})
					</h2>

					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
						{groupedMediaByFolder.map(([folderName, items]) => (
							<button
								key={folderName}
								type="button"
								onClick={() => handleOpenFolder(folderName)}
								className="flex items-center justify-between p-4 border border-gray-200 rounded-md bg-white hover:border-black hover:bg-gray-50 transition text-left"
							>
								<div>
									<p className="font-semibold text-base capitalize">{folderName}</p>
									<p className="text-xs text-gray-500 mt-0.5">
										{items.length} {items.length === 1 ? "file" : "files"}
									</p>
								</div>

								<span className="text-xs font-medium bg-black text-white px-3 py-1.5 rounded">
									Open
								</span>
							</button>
						))}
					</div>
				</div>
			) : hasSubFolders && openSubFolder === null ? (
				<div className="space-y-4">
					<div className="flex items-center justify-between border-b border-gray-200 pb-3">
						<div>
							<h2 className="font-semibold text-lg capitalize">
								{openFolder} – Select Category
							</h2>
							<p className="text-xs text-gray-500 font-mono">
								/media/&#123;images|videos&#125;/{openFolder}
							</p>
						</div>

						<button
							type="button"
							onClick={handleCloseFolder}
							className="px-4 py-1.5 border border-gray-300 bg-white rounded-md text-sm font-medium hover:bg-gray-100 transition"
						>
							Close
						</button>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
						{subFoldersInOpenFolder.map(([subFolderName, items]) => (
							<button
								key={subFolderName}
								type="button"
								onClick={() => handleOpenSubFolder(subFolderName)}
								className="flex items-center justify-between p-4 border border-gray-200 rounded-md bg-white hover:border-black hover:bg-gray-50 transition text-left"
							>
								<div>
									<p className="font-semibold text-base capitalize">{subFolderName}</p>
									<p className="text-xs text-gray-500 mt-0.5">
										{items.length} {items.length === 1 ? "file" : "files"}
									</p>
								</div>

								<span className="text-xs font-medium bg-black text-white px-3 py-1.5 rounded">
									Open
								</span>
							</button>
						))}
					</div>
				</div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 space-y-4">
						<div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
							<div>
								<h2 className="font-semibold text-lg capitalize">
									{openFolder}
									{openSubFolder ? ` / ${openSubFolder}` : ""} ({visibleMediaItems.length})
								</h2>
								<p className="text-xs text-gray-500 font-mono">
									/media/&#123;images|videos&#125;/{openFolder}
									{openSubFolder ? `/${openSubFolder}` : ""}
								</p>
							</div>

							<button
								type="button"
								onClick={handleCloseFolder}
								className="px-4 py-1.5 border border-gray-300 bg-white rounded-md text-sm font-medium hover:bg-gray-100 transition"
							>
								Close
							</button>
						</div>

						{visibleMediaItems.length === 0 ? (
							<p className="text-sm text-gray-500">
								No media left in this folder.
							</p>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								{visibleMediaItems.map((item) => {
									const isSelected = selectedMedia?.media_id === item.media_id;
									const productName = products.find(
										(p) => p.product_id === item.product_id
									)?.name;

									return (
										<div
											key={item.media_id}
											className={`border rounded-md p-3 flex flex-col justify-between gap-3 transition ${
												isSelected
													? "border-black ring-2 ring-black/10 bg-gray-50"
													: "border-gray-200 bg-white"
											}`}
										>
											<div className="space-y-2">
												<div className="aspect-video w-full bg-gray-100 rounded overflow-hidden flex items-center justify-center">
													{item.media_type === "image" ? (
														<img
															src={item.media_url}
															alt={`Media ${item.media_id}`}
															className="w-full h-full object-cover"
														/>
													) : (
														<video
															src={item.media_url}
															controls
															className="w-full h-full object-cover"
														/>
													)}
												</div>

												<div className="text-xs space-y-1">
													<p
														className="font-mono text-gray-600 truncate"
														title={item.media_url}
													>
														{item.media_url}
													</p>
													<p>
														<span className="font-medium">Product:</span>{" "}
														{productName
															? `${productName} (#${item.product_id})`
															: `#${item.product_id}`}
													</p>
													<p>
														<span className="font-medium">Variant:</span>{" "}
														{item.variant_id
															? `#${item.variant_id}`
															: "All (general)"}
													</p>
													<p>
														<span className="font-medium">Sort order:</span>{" "}
														{item.sort_order}
													</p>
												</div>
											</div>

											<div className="flex items-center gap-2 pt-2 border-t">
												<button
													type="button"
													onClick={() => handleSelectMedia(item)}
													className="flex-1 bg-black text-white text-xs py-1.5 px-3 rounded hover:bg-gray-800"
												>
													{isSelected ? "Selected" : "Select / Assign"}
												</button>
												<button
													type="button"
													onClick={() => handleDeleteMedia(item.media_id)}
													className="bg-red-50 text-red-700 border border-red-200 text-xs py-1.5 px-3 rounded hover:bg-red-100"
												>
													Remove
												</button>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</div>

					<div className="lg:col-span-1">
						<div className="border border-gray-200 rounded-md p-4 bg-white sticky top-6">
							<h2 className="font-semibold text-base mb-3">
								Assign Selected Media
							</h2>

							{!selectedMedia ? (
								<p className="text-sm text-gray-500">
									Click <strong>Select / Assign</strong> on any image or video to assign it to a product or variant.
								</p>
							) : (
								<form onSubmit={handleSaveAssignment} className="space-y-4">
									<div className="text-xs bg-gray-50 p-2.5 rounded border">
										<span className="font-medium">
											Selected file (#{selectedMedia.media_id}):
										</span>
										<p className="font-mono text-gray-600 break-all mt-1">
											{selectedMedia.media_url}
										</p>
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Product
										</label>
										{products.length > 0 ? (
											<select
												value={selectedProductId}
												onChange={(e) =>
													handleProductChange(Number(e.target.value))
												}
												className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
											>
												{products.map((p) => (
													<option key={p.product_id} value={p.product_id}>
														#{p.product_id} – {p.name}
													</option>
												))}
											</select>
										) : (
											<input
												type="number"
												min={1}
												value={selectedProductId}
												onChange={(e) =>
													handleProductChange(Number(e.target.value))
												}
												className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
											/>
										)}
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Variant (optional)
										</label>
										<select
											value={selectedVariantId ?? ""}
											onChange={(e) =>
												setSelectedVariantId(
													e.target.value === ""
														? null
														: Number(e.target.value)
												)
											}
											disabled={isLoadingVariants}
											className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100"
										>
											<option value="">
												No specific variant (applies to all variants)
											</option>
											{availableVariants.map((v) => (
												<option key={v.variant_id} value={v.variant_id}>
													#{v.variant_id} – {v.color ? `${v.color}, ` : ""}
													{v.size} ({v.sku})
												</option>
											))}
										</select>
										{isLoadingVariants && (
											<p className="text-xs text-gray-500 mt-1">
												Loading variants...
											</p>
										)}
									</div>

									<div>
										<label className="block text-sm font-medium text-gray-700 mb-1">
											Sort order
										</label>
										<input
											type="number"
											min={0}
											value={sortOrder}
											onChange={(e) => setSortOrder(Number(e.target.value))}
											className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
										/>
									</div>

									<div className="flex gap-2 pt-2">
										<button
											type="submit"
											disabled={isSaving}
											className="flex-1 bg-black text-white py-2 px-4 rounded-md text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400"
										>
											{isSaving ? "Saving..." : "Save Assignment"}
										</button>
										<button
											type="button"
											onClick={() => setSelectedMedia(null)}
											className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
										>
											Cancel
										</button>
									</div>
								</form>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}