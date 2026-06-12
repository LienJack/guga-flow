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

export const PHASE_3_CANVAS_NODE_TYPES = [
  "novel",
  "scene_frame",
  "scene",
  "shot",
  "character_asset",
  "location_asset",
  "image",
  "video",
  "editor_package",
] as const;
export type Phase3CanvasNodeType = (typeof PHASE_3_CANVAS_NODE_TYPES)[number];

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

export interface NovelNodeData {
  sourceText?: string;
  synopsis?: string;
  language?: string;
  storyboardTitle?: string;
}

export interface SceneFrameNodeData {
  label?: string;
  order?: number;
  description?: string;
  locationAssetId?: string;
  locationTempId?: string;
}

export interface SceneNodeData {
  sceneNumber?: string;
  synopsis?: string;
  location?: string;
  timeOfDay?: string;
  mood?: string;
  sourceExcerpt?: string;
  characterTempIds?: string[];
  locationTempId?: string;
}

export interface ShotNodeData {
  shotNumber?: string;
  visualDescription?: string;
  action?: string;
  cameraMovement?: string;
  durationSeconds?: number;
  durationSec?: number;
  imagePrompt?: string;
  videoPrompt?: string;
  promptNotes?: string;
  negativePromptNotes?: string;
  lens?: string;
  lighting?: string;
  mood?: string;
  dialogue?: string;
  narration?: string;
  soundEffect?: string;
  sourceExcerpt?: string;
  characterTempIds?: string[];
  locationTempId?: string;
  characterAssetIds?: string[];
  locationAssetId?: string;
}

export interface CharacterAssetNodeData {
  name?: string;
  role?: string;
  appearance?: string;
  personality?: string;
  wardrobe?: string;
  consistencyPrompt?: string;
  identityPrompt?: string;
  assetKey?: string;
}

export interface LocationAssetNodeData {
  name?: string;
  environment?: string;
  mood?: string;
  visualStyle?: string;
  consistencyPrompt?: string;
  locationPrompt?: string;
  locationType?: string;
  assetKey?: string;
}

export interface ImageNodeData {
  prompt?: string;
  assetId?: string;
  description?: string;
}

export interface VideoNodeData {
  prompt?: string;
  assetId?: string;
  durationSeconds?: number;
  description?: string;
}

export interface EditorPackageNodeData {
  packageName?: string;
  format?: string;
  assetId?: string;
  notes?: string;
}

export interface Phase3CanvasNodeDataByType {
  novel: NovelNodeData;
  scene_frame: SceneFrameNodeData;
  scene: SceneNodeData;
  shot: ShotNodeData;
  character_asset: CharacterAssetNodeData;
  location_asset: LocationAssetNodeData;
  image: ImageNodeData;
  video: VideoNodeData;
  editor_package: EditorPackageNodeData;
}

export type Phase3CanvasNodeData<TType extends Phase3CanvasNodeType = Phase3CanvasNodeType> =
  Phase3CanvasNodeDataByType[TType];

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

export type Phase3CanvasNodeRecord<TType extends Phase3CanvasNodeType = Phase3CanvasNodeType> =
  CanvasNodeRecord<Phase3CanvasNodeData<TType>> & { type: TType };

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

export interface CanvasEdgeData {
  appliedShotNodeIds?: string[];
  childEdgeIds?: string[];
  batchSourceEdgeId?: string;
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

export interface CreateCanvasNodeInput<TData = CanvasSnapshotJson> {
  tldrawShapeId: string;
  type: Phase3CanvasNodeType;
  title?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  status?: NodeStatus;
  dataJson?: TData;
}

export interface CreateCanvasNodeResult {
  node: CanvasNodeRecord;
}

export interface UpdateCanvasNodeInput<TData = CanvasSnapshotJson> {
  title?: string;
  status?: NodeStatus;
  dataJson?: TData;
}

export interface UpdateCanvasNodeResult {
  node: CanvasNodeRecord;
}

export interface UpdateCanvasNodeGeometryInput {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
}

export interface UpdateCanvasNodeGeometryResult {
  node: CanvasNodeRecord;
}

export interface DeleteCanvasNodeResult {
  deleted: true;
  nodeId: string;
}

export interface CreateCanvasEdgeInput<TData = CanvasSnapshotJson> {
  sourceNodeId: string;
  targetNodeId: string;
  relation: CanvasEdgeRelation;
  sourceShapeId?: string;
  targetShapeId?: string;
  visualArrowShapeId?: string;
  dataJson?: TData;
  affectedShotNodeIds?: string[];
}

export interface CreateCanvasEdgeResult {
  edge: CanvasEdgeRecord;
  edges: CanvasEdgeRecord[];
  updatedNodes: CanvasNodeRecord[];
  appliedShotCount?: number;
}

export interface DeleteCanvasEdgeResult {
  deleted: true;
  edgeId: string;
  deletedEdgeIds: string[];
  updatedNodes: CanvasNodeRecord[];
}
