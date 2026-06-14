import type { AssetListItem } from "./assets";
import type { EditorExportPreset, GenerationCreativeSettings, ResolvedGenerationSettings } from "./generation";

export const CANVAS_NODE_TYPES = [
  "novel",
  "source_text",
  "source_image",
  "source_video",
  "source_audio",
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

export const CANVAS_NODE_FAMILIES = [
  "business",
  "source_media",
  "ai_generation",
  "media_operation",
  "layout_helper",
  "advanced_visual",
] as const;
export type CanvasNodeFamily = (typeof CANVAS_NODE_FAMILIES)[number];

export const CANVAS_NODE_CAPABILITIES = [
  "accepts_text",
  "accepts_image",
  "accepts_video",
  "accepts_audio",
  "produces_asset",
  "produces_text",
  "has_preview",
  "has_task",
] as const;
export type CanvasNodeCapability = (typeof CANVAS_NODE_CAPABILITIES)[number];

export const CANVAS_NODE_FAMILY_LABELS = {
  business: "Business",
  source_media: "Source Media",
  ai_generation: "AI Generation",
  media_operation: "Media Operation",
  layout_helper: "Layout / Helper",
  advanced_visual: "Advanced Visual",
} as const satisfies Record<CanvasNodeFamily, string>;

export interface CanvasNodeRegistryItem {
  type: CanvasNodeType;
  family: CanvasNodeFamily;
  familyLabel: string;
  label: string;
  description: string;
  capabilities: readonly CanvasNodeCapability[];
}

export const CANVAS_NODE_REGISTRY = {
  novel: {
    type: "novel",
    family: "business",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.business,
    label: "Novel",
    description: "Long-form source text and story blueprint context.",
    capabilities: ["accepts_text", "produces_text", "has_preview"],
  },
  source_text: {
    type: "source_text",
    family: "source_media",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.source_media,
    label: "Source Text",
    description: "Uploaded text or markdown source file stored as a project asset.",
    capabilities: ["accepts_text", "produces_text", "has_preview"],
  },
  source_image: {
    type: "source_image",
    family: "source_media",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.source_media,
    label: "Source Image",
    description: "Uploaded source image asset for references, prompts, and generation context.",
    capabilities: ["accepts_image", "produces_asset", "has_preview"],
  },
  source_video: {
    type: "source_video",
    family: "source_media",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.source_media,
    label: "Source Video",
    description: "Uploaded source video asset for clips, reference motion, and editor context.",
    capabilities: ["accepts_video", "accepts_audio", "produces_asset", "has_preview"],
  },
  source_audio: {
    type: "source_audio",
    family: "source_media",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.source_media,
    label: "Source Audio",
    description: "Uploaded source audio asset for voice, music, narration, or sound references.",
    capabilities: ["accepts_audio", "produces_asset", "has_preview"],
  },
  scene_frame: {
    type: "scene_frame",
    family: "layout_helper",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.layout_helper,
    label: "Scene Frame",
    description: "Canvas grouping frame for scene and shot layout.",
    capabilities: ["accepts_text", "has_preview"],
  },
  scene: {
    type: "scene",
    family: "business",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.business,
    label: "Scene",
    description: "Story scene facts such as location, time, mood, and synopsis.",
    capabilities: ["accepts_text", "produces_text", "has_preview"],
  },
  shot: {
    type: "shot",
    family: "business",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.business,
    label: "Shot",
    description: "Visual beat that can drive image, video, prompt, and audio tasks.",
    capabilities: [
      "accepts_text",
      "accepts_image",
      "accepts_audio",
      "produces_text",
      "has_preview",
      "has_task",
    ],
  },
  character_asset: {
    type: "character_asset",
    family: "business",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.business,
    label: "Character",
    description: "Character reference facts for identity, appearance, voice, and continuity.",
    capabilities: ["accepts_text", "accepts_image", "accepts_audio", "produces_text", "has_preview"],
  },
  location_asset: {
    type: "location_asset",
    family: "business",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.business,
    label: "Location",
    description: "Location reference facts for environment, mood, and visual consistency.",
    capabilities: ["accepts_text", "accepts_image", "produces_text", "has_preview"],
  },
  style_asset: {
    type: "style_asset",
    family: "business",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.business,
    label: "Style",
    description: "Project visual style reference for prompt and generation context.",
    capabilities: ["accepts_text", "accepts_image", "produces_text", "has_preview"],
  },
  prop_asset: {
    type: "prop_asset",
    family: "business",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.business,
    label: "Prop",
    description: "Prop reference facts for object continuity and prompt context.",
    capabilities: ["accepts_text", "accepts_image", "produces_text", "has_preview"],
  },
  image: {
    type: "image",
    family: "ai_generation",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.ai_generation,
    label: "Image",
    description: "Generated or imported image result with asset and prompt context.",
    capabilities: ["accepts_text", "accepts_image", "produces_asset", "has_preview", "has_task"],
  },
  video: {
    type: "video",
    family: "ai_generation",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.ai_generation,
    label: "Video",
    description: "Generated or imported video clip with asset, duration, and prompt context.",
    capabilities: [
      "accepts_text",
      "accepts_image",
      "accepts_video",
      "accepts_audio",
      "produces_asset",
      "has_preview",
      "has_task",
    ],
  },
  editor_package: {
    type: "editor_package",
    family: "media_operation",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.media_operation,
    label: "Editor Package",
    description: "Task-backed media packaging and timeline handoff node.",
    capabilities: ["accepts_video", "accepts_audio", "produces_asset", "has_preview", "has_task"],
  },
  note: {
    type: "note",
    family: "layout_helper",
    familyLabel: CANVAS_NODE_FAMILY_LABELS.layout_helper,
    label: "Note",
    description: "Freeform annotation for planning and canvas organization.",
    capabilities: ["accepts_text", "produces_text"],
  },
} as const satisfies Record<CanvasNodeType, CanvasNodeRegistryItem>;

export const CANVAS_NODE_REGISTRY_ITEMS = CANVAS_NODE_TYPES.map((type) => CANVAS_NODE_REGISTRY[type]);

export function getCanvasNodeRegistryItem(type: CanvasNodeType): CanvasNodeRegistryItem {
  return CANVAS_NODE_REGISTRY[type];
}

export function canvasNodeTypesByFamily(family: CanvasNodeFamily): CanvasNodeType[] {
  return CANVAS_NODE_REGISTRY_ITEMS.filter((item) => item.family === family).map((item) => item.type);
}

export function canvasNodeHasCapability(
  type: CanvasNodeType,
  capability: CanvasNodeCapability,
): boolean {
  return (CANVAS_NODE_REGISTRY[type].capabilities as readonly CanvasNodeCapability[]).includes(
    capability,
  );
}

export const PHASE_3_CANVAS_NODE_TYPES = [
  "novel",
  "source_text",
  "source_image",
  "source_video",
  "source_audio",
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

export const SOURCE_MEDIA_IMPORT_METHODS = ["drag_drop", "asset_library", "manual"] as const;
export type SourceMediaImportMethod = (typeof SOURCE_MEDIA_IMPORT_METHODS)[number];

export interface SourceMediaNodeData {
  assetId?: string;
  mimeType?: string;
  originalFilename?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  source?: "asset";
  importMethod?: SourceMediaImportMethod;
  previewKind?: AssetListItem["previewKind"];
  previewUrl?: string;
}

export interface GeneratedMediaNodeData {
  generationJobId?: string;
  generationOperation?: "shot_to_image" | "image_refinement" | "image_to_video" | "workflow_run";
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
  source_text: SourceMediaNodeData;
  source_image: SourceMediaNodeData;
  source_video: SourceMediaNodeData;
  source_audio: SourceMediaNodeData;
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
