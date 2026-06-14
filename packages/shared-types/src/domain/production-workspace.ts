import type { CanvasEdgeRecord, CanvasNodeRecord, NodeStatus } from "./canvas";
import type { EditorExportPreset, GenerationQueueSummary } from "./generation";
import type { ScriptAdaptationStrategy } from "./script";

export const PRODUCTION_WORKSPACE_ITEM_TYPES = ["storyboard_item"] as const;
export type ProductionWorkspaceItemType = (typeof PRODUCTION_WORKSPACE_ITEM_TYPES)[number];

export type ProductionWorkspaceAssetNodeType =
  | "character_asset"
  | "location_asset"
  | "prop_asset";

export interface ProductionWorkspaceScriptPlan {
  scriptDraftId: string;
  version: number;
  title: string;
  logline: string;
  strategy: ScriptAdaptationStrategy;
  sceneCount: number;
  beatCount: number;
  sourceEventIds: string[];
  revisionNotes?: string;
}

export interface ProductionWorkspaceStoryboardItem {
  itemId: string;
  shotNodeId: string;
  orderIndex: number;
  sceneNodeId?: string;
  sceneTitle?: string;
  shotNumber?: string;
  title: string;
  summary: string;
  action?: string;
  durationSeconds?: number;
  imagePrompt?: string;
  videoPrompt?: string;
  status: NodeStatus;
  storyEventIds: string[];
  referenceAssetIds: string[];
  imageNodeId?: string;
  videoNodeId?: string;
  sourceScriptDraftId?: string;
  sourceSceneId?: string;
  sourceBeatId?: string;
  updatedAt: string;
}

export interface ProductionWorkspaceVideoCandidate {
  candidateId: string;
  videoNodeId: string;
  shotNodeId: string;
  title: string;
  status: NodeStatus;
  isSelected: boolean;
  videoAssetId?: string;
  durationSeconds?: number;
  sourceImageNodeId?: string;
  sourceNodeIds: string[];
  updatedAt: string;
}

export interface ProductionWorkspaceVideoTrack {
  trackId: string;
  storyboardItemId: string;
  shotNodeId: string;
  orderIndex: number;
  title: string;
  prompt: string;
  durationSeconds?: number;
  selectedVideoNodeId?: string;
  candidates: ProductionWorkspaceVideoCandidate[];
}

export interface ProductionWorkspaceAssetSummary {
  nodeId: string;
  nodeType: ProductionWorkspaceAssetNodeType;
  title: string;
  status: NodeStatus;
  referenceAssetIds: string[];
  variantCount: number;
  selectedVariantId?: string;
  sourceScriptDraftId?: string;
  assetKey?: string;
}

export interface ProductionWorkspaceAgentContext {
  scriptPlanSummary: string;
  storyboardTableSummary: string;
  storyboardSummary: string;
  assetSummary: string;
  generationSummary: string;
}

export interface ProductionWorkspaceSummary {
  shotCount: number;
  assetCount: number;
  referenceAssetCount: number;
  latestUpdatedAt?: string;
  generationQueue: GenerationQueueSummary;
}

export interface ProductionWorkspaceProjection {
  projectId: string;
  scriptPlan?: ProductionWorkspaceScriptPlan;
  storyboardTable: ProductionWorkspaceStoryboardItem[];
  storyboardItems: ProductionWorkspaceStoryboardItem[];
  videoTracks: ProductionWorkspaceVideoTrack[];
  assets: ProductionWorkspaceAssetSummary[];
  summary: ProductionWorkspaceSummary;
  agentContext: ProductionWorkspaceAgentContext;
}

export interface UpdateProductionWorkspaceItemInput {
  itemType: ProductionWorkspaceItemType;
  title?: string;
  summary?: string;
  imagePrompt?: string;
  videoPrompt?: string;
  durationSeconds?: number;
}

export interface UpdateProductionWorkspaceItemResult {
  workspace: ProductionWorkspaceProjection;
  updatedNode: CanvasNodeRecord;
}

export interface CreateProductionStoryboardItemsInput {
  count?: number;
  titlePrefix?: string;
  afterItemId?: string;
}

export interface DeleteProductionStoryboardItemsInput {
  itemIds: string[];
}

export interface ReorderProductionStoryboardItemsInput {
  itemIds: string[];
}

export interface CreateStoryboardMediaBoardInput {
  itemIds?: string[];
  title?: string;
  columns?: number;
}

export interface SelectProductionTrackVideoInput {
  videoNodeId?: string;
}

export interface SelectProductionTrackVideoResult {
  workspace: ProductionWorkspaceProjection;
  updatedNode: CanvasNodeRecord;
}

export interface CreateProductionMediaClipInput {
  trackIds?: string[];
  videoNodeIds?: string[];
  title?: string;
  trimStartMs?: number;
  trimEndMs?: number;
  exportPreset?: EditorExportPreset;
}

export interface ProductionWorkspaceMutationResult {
  workspace: ProductionWorkspaceProjection;
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
  deletedNodeIds?: string[];
  focusNodeId?: string;
}

export interface CreateStoryboardMediaBoardResult extends ProductionWorkspaceMutationResult {
  boardNode: CanvasNodeRecord;
}

export interface CreateProductionMediaClipResult extends ProductionWorkspaceMutationResult {
  mediaClipNode: CanvasNodeRecord;
}
