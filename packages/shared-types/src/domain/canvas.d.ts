export declare const CANVAS_NODE_TYPES: readonly ["novel", "scene_frame", "scene", "shot", "character_asset", "location_asset", "style_asset", "prop_asset", "image", "video", "editor_package", "note"];
export type CanvasNodeType = (typeof CANVAS_NODE_TYPES)[number];
export declare const CANVAS_EDGE_RELATIONS: readonly ["derived_from", "belongs_to_scene", "references_character", "references_location", "references_style", "references_prop", "generated_image", "generated_video", "first_frame_for", "selected_version_for", "sent_to_editor", "sequence_next"];
export type CanvasEdgeRelation = (typeof CANVAS_EDGE_RELATIONS)[number];
export declare const NODE_STATUSES: readonly ["draft", "queued", "running", "provider_waiting", "succeeded", "failed", "cancelled"];
export type NodeStatus = (typeof NODE_STATUSES)[number];
export interface CanvasDocumentRecord {
    id: string;
    projectId: string;
    snapshotJson: unknown;
    createdAt: string;
    updatedAt: string;
}
export interface CanvasNodeRecord<TData = unknown> {
    id: string;
    projectId: string;
    canvasDocumentId: string;
    tldrawShapeId: string;
    type: CanvasNodeType;
    title?: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    status: NodeStatus;
    dataJson: TData;
    createdAt: string;
    updatedAt: string;
}
export interface CanvasEdgeRecord<TData = unknown> {
    id: string;
    projectId: string;
    canvasDocumentId: string;
    sourceNodeId: string;
    targetNodeId: string;
    sourceShapeId?: string;
    targetShapeId?: string;
    visualArrowShapeId?: string;
    relation: CanvasEdgeRelation;
    dataJson?: TData;
    createdAt: string;
}
//# sourceMappingURL=canvas.d.ts.map