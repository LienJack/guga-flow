export declare const ASSET_TYPES: readonly ["image", "video", "document", "package"];
export type AssetType = (typeof ASSET_TYPES)[number];
export declare const ASSET_PURPOSES: readonly ["uploaded", "shot_keyframe", "character_reference", "location_reference", "style_reference", "shot_clip", "editor_package"];
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
//# sourceMappingURL=assets.d.ts.map