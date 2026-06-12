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
  createdAt: string;
}
