export const ASSET_TYPES = ["image", "video", "audio", "document", "package"] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const ASSET_PURPOSES = [
  "uploaded",
  "shot_keyframe",
  "shot_audio",
  "character_reference",
  "voice_reference",
  "location_reference",
  "style_reference",
  "background_music",
  "shot_clip",
  "editor_package",
  "canvas_fragment",
] as const;
export type AssetPurpose = (typeof ASSET_PURPOSES)[number];

export const UPLOADABLE_ASSET_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "text/plain",
  "text/markdown",
] as const;
export type UploadableAssetMimeType = (typeof UPLOADABLE_ASSET_MIME_TYPES)[number];

export const ASSET_PREVIEW_KINDS = ["image", "video", "audio", "text", "metadata"] as const;
export type AssetPreviewKind = (typeof ASSET_PREVIEW_KINDS)[number];

export const ASSET_DERIVATIVE_KINDS = [
  "original",
  "display",
  "thumbnail",
  "waveform",
] as const;
export type AssetDerivativeKind = (typeof ASSET_DERIVATIVE_KINDS)[number];

export const ASSET_DERIVATIVE_STATUSES = [
  "ready",
  "pending",
  "failed",
  "skipped",
] as const;
export type AssetDerivativeStatus = (typeof ASSET_DERIVATIVE_STATUSES)[number];

export const ASSET_DERIVATIVE_REBUILD_STRATEGIES = [
  "source_asset",
  "mock_media_metadata",
  "external_provider",
  "manual",
] as const;
export type AssetDerivativeRebuildStrategy = (typeof ASSET_DERIVATIVE_REBUILD_STRATEGIES)[number];

export interface AssetDerivativeMetadata {
  kind: AssetDerivativeKind;
  status: AssetDerivativeStatus;
  assetId?: string;
  storageKey?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  sizeBytes?: number;
  sourceAssetId?: string;
  derivedFromAssetId?: string;
  generationJobId?: string;
  createdAt?: string;
  rebuildStrategy?: AssetDerivativeRebuildStrategy;
  errorMessage?: string;
}

export interface AssetMediaStreamMetadata {
  kind: "video" | "audio";
  codec?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  frameRate?: number;
  sampleRate?: number;
  channelCount?: number;
  bitrate?: number;
}

export interface AssetMediaInfo {
  container?: string;
  durationMs?: number;
  width?: number;
  height?: number;
  frameRate?: number;
  bitrate?: number;
  hasVideo?: boolean;
  hasAudio?: boolean;
  streamCount?: number;
  streams?: AssetMediaStreamMetadata[];
}

export interface AssetMediaMetadata {
  previewKind?: AssetPreviewKind;
  original?: AssetDerivativeMetadata;
  display?: AssetDerivativeMetadata;
  thumbnail?: AssetDerivativeMetadata;
  derivatives?: AssetDerivativeMetadata[];
  mediaInfo?: AssetMediaInfo;
  mediaMetadataProvider?: string;
  mediaMetadataModel?: string;
  mediaMetadataAnalyzedAt?: string;
  mediaMetadataStrategy?: string[];
  mediaMetadataError?: string;
}

export interface AssetPromptMetadata {
  assetPrompt?: string;
  polishedPrompt?: string;
  promptPolishProvider?: string;
  promptPolishModel?: string;
  promptPolishedAt?: string;
  promptPolishJobId?: string;
  promptPolishSourcePrompt?: string;
  generatedAssetIds?: string[];
  lastGeneratedAssetId?: string;
  lastAssetImageGenerationJobId?: string;
}

export const EDITOR_PACKAGE_MIME_TYPE = "application/zip" as const;
export type EditorPackageMimeType = typeof EDITOR_PACKAGE_MIME_TYPE;

export interface AssetRecord {
  id: string;
  projectId: string;
  type: AssetType;
  purpose: AssetPurpose;
  collectionId?: string;
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
  collection?: AssetCollectionRecord;
  tags?: AssetTagRecord[];
  referenceCount?: number;
}

export interface AssetDetail extends AssetListItem {
  textPreview?: string;
}

export interface AssetUploadResult {
  asset: AssetDetail;
}

export const ASSET_COLLECTION_KINDS = ["manual", "character", "location", "style", "shot", "archive"] as const;
export type AssetCollectionKind = (typeof ASSET_COLLECTION_KINDS)[number];

export interface AssetCollectionRecord {
  id: string;
  projectId: string;
  name: string;
  parentId?: string;
  kind: AssetCollectionKind;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssetTagRecord {
  id: string;
  projectId: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface AssetReferenceSummary {
  assetId: string;
  nodeIds: string[];
  jobIds: string[];
}

export interface AssetLibrarySummary {
  assets: AssetListItem[];
  collections: AssetCollectionRecord[];
  tags: AssetTagRecord[];
}

export interface AssetListFilters {
  query?: string;
  type?: AssetType;
  purpose?: AssetPurpose;
  collectionId?: string;
  tagIds?: string[];
}

export const ASSET_BATCH_ACTIONS = [
  "move_collection",
  "add_tags",
  "remove_tags",
  "delete",
] as const;
export type AssetBatchAction = (typeof ASSET_BATCH_ACTIONS)[number];

export interface AssetBatchInput {
  assetIds: string[];
  action: AssetBatchAction;
  collectionId?: string;
  tagIds?: string[];
}

export interface AssetBatchResult {
  assets: AssetListItem[];
  deletedAssetIds?: string[];
}

export const ASSET_EDIT_ACTIONS = ["crop", "grid_split"] as const;
export type AssetEditAction = (typeof ASSET_EDIT_ACTIONS)[number];

export interface AssetCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EditAssetInput {
  action: AssetEditAction;
  crop?: AssetCropRect;
  rows?: number;
  columns?: number;
  selectedCells?: number[];
}

export interface EditAssetResult {
  assets: AssetListItem[];
}

export interface ImportRemoteAssetInput {
  url: string;
  purpose?: AssetPurpose;
}

export interface ImportLocalAssetInput {
  storageKey: string;
  mimeType: UploadableAssetMimeType;
  purpose?: AssetPurpose;
  originalFilename?: string;
}

export interface ImportedAssetResult {
  asset: AssetDetail;
  deduplicated: boolean;
}

export interface AssetMaintenanceInput {
  dryRun: boolean;
  confirm?: string;
}

export interface AssetMaintenanceSummary {
  totalAssets: number;
  referencedAssets: number;
  unreferencedAssets: number;
  candidateAssetIds: string[];
  deletedAssetIds?: string[];
}

export interface AssetMaintenanceResult {
  summary: AssetMaintenanceSummary;
}
