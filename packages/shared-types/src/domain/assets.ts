export const ASSET_TYPES = ["image", "video", "document", "package"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_PURPOSES = [
  "uploaded",
  "shot_keyframe",
  "character_reference",
  "location_reference",
  "style_reference",
  "shot_clip",
  "editor_package",
] as const;
export type AssetPurpose = (typeof ASSET_PURPOSES)[number];

export const UPLOADABLE_ASSET_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/webm",
  "text/plain",
  "text/markdown",
] as const;
export type UploadableAssetMimeType = (typeof UPLOADABLE_ASSET_MIME_TYPES)[number];

export const ASSET_PREVIEW_KINDS = ["image", "video", "text", "metadata"] as const;
export type AssetPreviewKind = (typeof ASSET_PREVIEW_KINDS)[number];

export const EDITOR_PACKAGE_MIME_TYPE = "application/zip" as const;
export type EditorPackageMimeType = typeof EDITOR_PACKAGE_MIME_TYPE;

export interface AssetRecord {
  id: string;
  projectId: string;
  type: AssetType;
  purpose: AssetPurpose;
  storageKey: string;
  mimeType: string;
  originalFilename?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  metadataJson?: unknown;
  createdAt: string;
}

export interface AssetListItem extends AssetRecord {
  previewKind: AssetPreviewKind;
  previewUrl?: string;
}

export interface AssetDetail extends AssetListItem {
  textPreview?: string;
}

export interface AssetUploadResult {
  asset: AssetDetail;
}
