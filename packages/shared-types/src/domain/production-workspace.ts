import type { CanvasNodeRecord, NodeStatus } from "./canvas";
import type { GenerationQueueSummary } from "./generation";
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
  sourceScriptDraftId?: string;
  sourceSceneId?: string;
  sourceBeatId?: string;
  updatedAt: string;
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
