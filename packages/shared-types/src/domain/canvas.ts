import type { AssetListItem } from "./assets";
import type { EditorExportPreset, GenerationCreativeSettings, ResolvedGenerationSettings } from "./generation";

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
  "story_seed",
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
  | { [key: string]: CanvasSnapshotJson | undefined };

export interface StoryEventTraceData {
  [key: string]: CanvasSnapshotJson | undefined;
  eventId: string;
  title?: string;
  orderIndex?: number;
  chapterIndex?: number;
  sourceExcerpt?: string;
  summary?: string;
  characters?: string[];
  locationName?: string;
  emotion?: string;
  conflict?: string;
  result?: string;
  estimatedDurationSec?: number;
}

export interface CharacterRelationshipTraceData {
  [key: string]: CanvasSnapshotJson | undefined;
  relationshipId: string;
  characterTempIds: string[];
  type?: string;
  summary?: string;
  status?: string;
}

export interface StoryBlueprintNodeData {
  [key: string]: CanvasSnapshotJson | undefined;
  worldSummary?: string;
  timelineEvents?: StoryEventTraceData[];
  characterRelationships?: CharacterRelationshipTraceData[];
  themes?: string[];
  adaptationNotes?: string;
}

export interface StorySeedReferenceData {
  [key: string]: CanvasSnapshotJson | undefined;
  assetId?: string;
  imageNodeId?: string;
  label?: string;
  prompt?: string;
}

export interface CharacterLifecycleStageData {
  [key: string]: CanvasSnapshotJson | undefined;
  stageId: string;
  label: string;
  ageRange?: string;
  appearance?: string;
  costume?: string;
  hairstyle?: string;
  emotionalState?: string;
  identityPrompt?: string;
}

export interface CharacterStageReferenceData {
  [key: string]: CanvasSnapshotJson | undefined;
  characterTempId: string;
  stageId: string;
}

export interface AudioReferenceData {
  [key: string]: CanvasSnapshotJson | undefined;
  assetId: string;
  label?: string;
  role?: "voice" | "narration" | "sound_effect" | "bgm" | "clip_audio";
  sourceNodeId?: string;
}

export interface NovelNodeData {
  sourceText?: string;
  synopsis?: string;
  language?: string;
  storyboardTitle?: string;
  storyBlueprint?: StoryBlueprintNodeData;
  storySeedReferences?: StorySeedReferenceData[];
}

export interface SceneFrameNodeData {
  label?: string;
  order?: number;
  description?: string;
  locationAssetId?: string;
  locationTempId?: string;
  collapsed?: boolean;
  shotNodeIds?: string[];
  storyEventIds?: string[];
  storyEvents?: StoryEventTraceData[];
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
  storyEventIds?: string[];
  storyEvents?: StoryEventTraceData[];
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
  storyEventIds?: string[];
  storyEvents?: StoryEventTraceData[];
  characterStageRefs?: CharacterStageReferenceData[];
  characterTempIds?: string[];
  locationTempId?: string;
  characterAssetIds?: string[];
  locationAssetId?: string;
  referenceAssetIds?: string[];
  audioAssetIds?: string[];
  audioReferences?: AudioReferenceData[];
  selectedImageNodeId?: string;
  selectedVideoNodeId?: string;
  generationSettings?: GenerationCreativeSettings;
}

export interface CharacterAssetNodeData {
  name?: string;
  role?: string;
  appearance?: string;
  personality?: string;
  wardrobe?: string;
  consistencyPrompt?: string;
  identityPrompt?: string;
  lifecycleStages?: CharacterLifecycleStageData[];
  activeStageId?: string;
  locked?: boolean;
  lockedFields?: string[];
  referenceAssetIds?: string[];
  voiceAssetIds?: string[];
  voiceReferences?: AudioReferenceData[];
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
  referenceAssetIds?: string[];
  assetKey?: string;
}

export interface GeneratedMediaNodeData {
  generationJobId?: string;
  generationOperation?: "shot_to_image" | "image_refinement" | "image_to_video";
  generatedFromNodeId?: string;
  sourceNodeIds?: string[];
  referenceAssetIds?: string[];
  provider?: string;
  model?: string;
  inputJson?: unknown;
  outputJson?: unknown;
  generationSettings?: ResolvedGenerationSettings;
}

export interface ImageNodeData extends GeneratedMediaNodeData {
  prompt?: string;
  assetId?: string;
  description?: string;
}

export interface VideoNodeData extends GeneratedMediaNodeData {
  prompt?: string;
  assetId?: string;
  durationSeconds?: number;
  description?: string;
  audioAssetIds?: string[];
  audioReferences?: AudioReferenceData[];
}

export interface EditorPackageNodeData {
  packageName?: string;
  format?: string;
  assetId?: string;
  editorExportId?: string;
  packageAssetId?: string;
  selectedVideoNodeIds?: string[];
  sortMode?: "shot_index" | "canvas_x" | "manual";
  exportPreset?: EditorExportPreset;
  sourceEditorExportId?: string;
  clipCount?: number;
  downloadUrl?: string;
  localEditorUrl?: string;
  localEditorError?: string;
  exportedAt?: string;
  notes?: string;
  generationSettings?: ResolvedGenerationSettings;
  packagingReferences?: unknown;
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
