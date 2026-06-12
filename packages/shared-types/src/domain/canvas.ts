import type { AssetListItem } from "./assets";

export const CANVAS_NODE_TYPES = [
  "novel",
  "scene_frame",
  "scene",
  "shot",
  "character_asset",
  "location_asset",
  "style_asset",
  "prop_asset",
  "image",
  "video",
  "editor_package",
  "note",
] as const;
export type CanvasNodeType = (typeof CANVAS_NODE_TYPES)[number];

export const CANVAS_EDGE_RELATIONS = [
  "derived_from",
  "belongs_to_scene",
  "references_character",
  "references_location",
  "references_style",
  "references_prop",
  "generated_image",
  "generated_video",
  "first_frame_for",
  "selected_version_for",
  "sent_to_editor",
  "sequence_next",
] as const;
export type CanvasEdgeRelation = (typeof CANVAS_EDGE_RELATIONS)[number];

export const NODE_STATUSES = [
  "draft",
  "queued",
  "running",
  "provider_waiting",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type NodeStatus = (typeof NODE_STATUSES)[number];

export const CANVAS_SAVE_STATUSES = ["idle", "saving", "saved", "failed"] as const;
export type CanvasSaveStatus = (typeof CANVAS_SAVE_STATUSES)[number];

export type CanvasSnapshotJson =
  | string
  | number
  | boolean
  | null
  | CanvasSnapshotJson[]
  | { [key: string]: CanvasSnapshotJson };

export interface CanvasDocumentRecord {
  id: string;
  projectId: string;
  snapshotJson: CanvasSnapshotJson;
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

export interface CanvasLoadResult {
  canvasDocument: CanvasDocumentRecord;
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
  assets: AssetListItem[];
}

export interface SaveCanvasSnapshotInput {
  snapshotJson: CanvasSnapshotJson;
}

export interface SaveCanvasSnapshotResult {
  canvasDocument: CanvasDocumentRecord;
}
