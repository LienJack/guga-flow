import type {
  AssetListItem,
  CanvasNodeCapability,
  CanvasNodeFamily,
  CanvasNodeRecord,
  CreateCanvasNodeInput,
  NodeStatus,
  Phase3CanvasNodeData,
  Phase3CanvasNodeType,
  SourceMediaImportMethod,
  SourceMediaNodeData,
} from "@guga-flow/shared-types";
import { getCanvasNodeRegistryItem, PHASE_3_CANVAS_NODE_TYPES } from "@guga-flow/shared-types";

export interface BusinessNodeDefinition {
  label: string;
  shortLabel: string;
  defaultTitle: string;
  summaryFallback: string;
  detailFallback: string;
  tone: "story" | "source" | "scene" | "shot" | "asset" | "media" | "export";
  family: CanvasNodeFamily;
  familyLabel: string;
  capabilities: readonly CanvasNodeCapability[];
}

export interface BusinessNodeCardModel {
  nodeId: string;
  nodeType: Phase3CanvasNodeType;
  title: string;
  status: NodeStatus;
  summary: string;
  detail: string;
  collapsed?: boolean;
  w: number;
  h: number;
}

type BusinessNodeDefinitionInput = Omit<
  BusinessNodeDefinition,
  "family" | "familyLabel" | "capabilities"
>;

function defineBusinessNode(
  type: Phase3CanvasNodeType,
  definition: BusinessNodeDefinitionInput,
): BusinessNodeDefinition {
  const registry = getCanvasNodeRegistryItem(type);
  return {
    ...definition,
    family: registry.family,
    familyLabel: registry.familyLabel,
    capabilities: registry.capabilities,
  };
}

export const BUSINESS_NODE_DEFINITIONS = {
  novel: defineBusinessNode("novel", {
    label: "Novel",
    shortLabel: "Novel",
    defaultTitle: "Novel Source",
    summaryFallback: "Source manuscript",
    detailFallback: "Full text and synopsis",
    tone: "story",
  }),
  source_text: defineBusinessNode("source_text", {
    label: "Source Text",
    shortLabel: "Text",
    defaultTitle: "Source Text",
    summaryFallback: "Uploaded text source",
    detailFallback: "Asset-backed text reference",
    tone: "source",
  }),
  source_image: defineBusinessNode("source_image", {
    label: "Source Image",
    shortLabel: "Image Src",
    defaultTitle: "Source Image",
    summaryFallback: "Uploaded image source",
    detailFallback: "Asset-backed image reference",
    tone: "source",
  }),
  source_video: defineBusinessNode("source_video", {
    label: "Source Video",
    shortLabel: "Video Src",
    defaultTitle: "Source Video",
    summaryFallback: "Uploaded video source",
    detailFallback: "Asset-backed video reference",
    tone: "source",
  }),
  source_audio: defineBusinessNode("source_audio", {
    label: "Source Audio",
    shortLabel: "Audio Src",
    defaultTitle: "Source Audio",
    summaryFallback: "Uploaded audio source",
    detailFallback: "Asset-backed audio reference",
    tone: "source",
  }),
  scene_frame: defineBusinessNode("scene_frame", {
    label: "Scene Frame",
    shortLabel: "Frame",
    defaultTitle: "Scene Frame",
    summaryFallback: "Scene grouping frame",
    detailFallback: "Organizes scenes and shots",
    tone: "scene",
  }),
  scene: defineBusinessNode("scene", {
    label: "Scene",
    shortLabel: "Scene",
    defaultTitle: "Scene",
    summaryFallback: "Story scene",
    detailFallback: "Location, time, and mood",
    tone: "scene",
  }),
  shot: defineBusinessNode("shot", {
    label: "Shot",
    shortLabel: "Shot",
    defaultTitle: "Shot",
    summaryFallback: "Visual beat",
    detailFallback: "Action, camera, and prompt notes",
    tone: "shot",
  }),
  character_asset: defineBusinessNode("character_asset", {
    label: "Character",
    shortLabel: "Char",
    defaultTitle: "Character",
    summaryFallback: "Character reference",
    detailFallback: "Appearance and consistency",
    tone: "asset",
  }),
  location_asset: defineBusinessNode("location_asset", {
    label: "Location",
    shortLabel: "Loc",
    defaultTitle: "Location",
    summaryFallback: "Location reference",
    detailFallback: "Environment and visual style",
    tone: "asset",
  }),
  prop_asset: defineBusinessNode("prop_asset", {
    label: "Prop",
    shortLabel: "Prop",
    defaultTitle: "Prop",
    summaryFallback: "Prop reference",
    detailFallback: "Object continuity and prompt context",
    tone: "asset",
  }),
  ai_text: defineBusinessNode("ai_text", {
    label: "AI Text",
    shortLabel: "AI Text",
    defaultTitle: "AI Text Node",
    summaryFallback: "Generated text",
    detailFallback: "Prompt and source context",
    tone: "media",
  }),
  ai_audio: defineBusinessNode("ai_audio", {
    label: "AI Audio",
    shortLabel: "AI Audio",
    defaultTitle: "AI Audio Node",
    summaryFallback: "Generated audio",
    detailFallback: "TTS script and voice reference",
    tone: "media",
  }),
  image: defineBusinessNode("image", {
    label: "Image",
    shortLabel: "Image",
    defaultTitle: "Image Node",
    summaryFallback: "Generated or uploaded image",
    detailFallback: "Prompt and asset link",
    tone: "media",
  }),
  video: defineBusinessNode("video", {
    label: "Video",
    shortLabel: "Video",
    defaultTitle: "Video Node",
    summaryFallback: "Generated or uploaded clip",
    detailFallback: "Prompt, duration, and asset link",
    tone: "media",
  }),
  editor_package: defineBusinessNode("editor_package", {
    label: "Editor Package",
    shortLabel: "Export",
    defaultTitle: "Editor Package",
    summaryFallback: "Timeline handoff package",
    detailFallback: "Export metadata",
    tone: "export",
  }),
} as const satisfies Record<Phase3CanvasNodeType, BusinessNodeDefinition>;

const PHASE_3_NODE_TYPE_SET = new Set<Phase3CanvasNodeType>(PHASE_3_CANVAS_NODE_TYPES);

export function isPhase3CanvasNodeType(value: unknown): value is Phase3CanvasNodeType {
  return typeof value === "string" && PHASE_3_NODE_TYPE_SET.has(value as Phase3CanvasNodeType);
}

export function getBusinessNodeDefinition(type: Phase3CanvasNodeType): BusinessNodeDefinition {
  return BUSINESS_NODE_DEFINITIONS[type];
}

export function createDefaultBusinessNodeData<TType extends Phase3CanvasNodeType>(
  type: TType,
): Phase3CanvasNodeData<TType> {
  switch (type) {
    case "novel":
      return {
        sourceText: "",
        synopsis: "",
        language: "zh-CN",
      } as Phase3CanvasNodeData<TType>;
    case "source_text":
    case "source_image":
    case "source_video":
    case "source_audio":
      return {
        source: "asset",
        importMethod: "manual",
      } as Phase3CanvasNodeData<TType>;
    case "scene_frame":
      return {
        label: "",
        order: 1,
        description: "",
        collapsed: false,
      } as Phase3CanvasNodeData<TType>;
    case "scene":
      return {
        sceneNumber: "",
        synopsis: "",
        location: "",
        timeOfDay: "",
        mood: "",
      } as Phase3CanvasNodeData<TType>;
    case "shot":
      return {
        shotNumber: "",
        visualDescription: "",
        action: "",
        cameraMovement: "",
        durationSeconds: 4,
        promptNotes: "",
        negativePromptNotes: "",
      } as Phase3CanvasNodeData<TType>;
    case "character_asset":
      return {
        name: "",
        role: "",
        appearance: "",
        personality: "",
        wardrobe: "",
        consistencyPrompt: "",
        identityPrompt: "",
        referenceAssetIds: [],
      } as Phase3CanvasNodeData<TType>;
    case "location_asset":
      return {
        name: "",
        environment: "",
        mood: "",
        visualStyle: "",
        consistencyPrompt: "",
        locationPrompt: "",
        referenceAssetIds: [],
      } as Phase3CanvasNodeData<TType>;
    case "prop_asset":
      return {
        name: "",
        category: "",
        description: "",
        visualStyle: "",
        consistencyPrompt: "",
        propPrompt: "",
        referenceAssetIds: [],
        assetVariants: [],
      } as Phase3CanvasNodeData<TType>;
    case "ai_text":
      return {
        prompt: "",
        outputText: "",
        contextSummary: "",
      } as Phase3CanvasNodeData<TType>;
    case "ai_audio":
      return {
        prompt: "",
        scriptText: "",
        assetId: "",
        contextSummary: "",
        voiceReferenceAssetIds: [],
      } as Phase3CanvasNodeData<TType>;
    case "image":
      return {
        prompt: "",
        assetId: "",
        description: "",
      } as Phase3CanvasNodeData<TType>;
    case "video":
      return {
        prompt: "",
        assetId: "",
        durationSeconds: 4,
        description: "",
      } as Phase3CanvasNodeData<TType>;
    case "editor_package":
      return {
        packageName: "",
        format: "zip",
        assetId: "",
        notes: "",
      } as Phase3CanvasNodeData<TType>;
  }
}

export function createBusinessCanvasNodeInput<TType extends Phase3CanvasNodeType>(
  type: TType,
  input: {
    tldrawShapeId: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    zIndex?: number;
  },
): CreateCanvasNodeInput<Phase3CanvasNodeData<TType>> {
  const definition = getBusinessNodeDefinition(type);

  return {
    tldrawShapeId: input.tldrawShapeId,
    type,
    title: definition.defaultTitle,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    zIndex: input.zIndex,
    status: "draft",
    dataJson: createDefaultBusinessNodeData(type),
  };
}

export function createSourceMediaNodeData(
  asset: AssetListItem,
  importMethod: SourceMediaImportMethod = "drag_drop",
): SourceMediaNodeData {
  return compactJsonObject({
    assetId: asset.id,
    mimeType: asset.mimeType,
    originalFilename: asset.originalFilename,
    sizeBytes: asset.sizeBytes,
    width: asset.width,
    height: asset.height,
    durationMs: asset.durationMs,
    source: "asset",
    importMethod,
    previewKind: asset.previewKind,
    previewUrl: asset.previewUrl,
  }) as SourceMediaNodeData;
}

export function buildBusinessNodeCardModel(node: CanvasNodeRecord): BusinessNodeCardModel {
  if (!isPhase3CanvasNodeType(node.type)) {
    throw new Error(`Unsupported business node type: ${node.type}`);
  }

  const definition = getBusinessNodeDefinition(node.type);
  const data = objectData(node.dataJson);
  const summary = summaryForNode(node.type, data, definition.summaryFallback);
  const detail = detailForNode(node.type, data, definition.detailFallback);
  const collapsed = node.type === "scene_frame" && data.collapsed === true;

  return {
    nodeId: node.id,
    nodeType: node.type,
    title: firstText(node.title, titleFromData(node.type, data), definition.defaultTitle),
    status: node.status,
    summary,
    detail,
    collapsed,
    w: node.width,
    h: collapsed ? Math.min(node.height, 112) : node.height,
  };
}

function objectData(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function firstText(...values: Array<unknown>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return truncate(value.trim(), 140);
    }
  }

  return "";
}

function text(data: Record<string, unknown>, key: string): string {
  const value = data[key];
  return typeof value === "string" ? value.trim() : "";
}

function numberText(data: Record<string, unknown>, key: string, suffix = ""): string {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? `${value}${suffix}` : "";
}

function stringArray(data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function compactJsonObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined && fieldValue !== ""),
  );
}

function objectArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];
}

function storyEventTraceText(data: Record<string, unknown>): string {
  const event = objectArray(data.storyEvents)
    .map((item) =>
      firstText(text(item, "summary"), text(item, "title"), text(item, "sourceExcerpt"), text(item, "eventId")),
    )
    .find(Boolean);

  return event ? `Event: ${event}` : "";
}

function characterStageReferenceText(data: Record<string, unknown>): string {
  const stageCount = objectArray(data.characterStageRefs).filter(
    (item) => text(item, "characterTempId") && text(item, "stageId"),
  ).length;
  if (stageCount === 0) {
    return "";
  }

  return `${stageCount} character stage ref${stageCount === 1 ? "" : "s"}`;
}

function lifecycleStageCountText(data: Record<string, unknown>): string {
  const stageCount = objectArray(data.lifecycleStages).filter((item) => text(item, "stageId")).length;
  if (stageCount === 0) {
    return "";
  }

  return `${stageCount} lifecycle stage${stageCount === 1 ? "" : "s"}`;
}

function activeLifecycleStageText(data: Record<string, unknown>): string {
  const activeStageId = text(data, "activeStageId");
  if (!activeStageId) {
    return "";
  }

  const activeStage = objectArray(data.lifecycleStages).find((stage) => text(stage, "stageId") === activeStageId);
  const label = activeStage ? firstText(text(activeStage, "label"), activeStageId) : activeStageId;
  return label ? `Active stage: ${label}` : "";
}

function characterLockText(data: Record<string, unknown>): string {
  const lockedFields = stringArray(data, "lockedFields");
  if (lockedFields.length > 0) {
    return `Locked: ${lockedFields.join(", ")}`;
  }

  return data.locked === true ? "Identity locked" : "";
}

function shotReferenceText(data: Record<string, unknown>): string {
  const characterCount = new Set(stringArray(data, "characterAssetIds")).size;
  const locationReference = text(data, "locationAssetId") ? "Location ref" : "";
  const characterReference =
    characterCount > 0 ? `${characterCount} character ref${characterCount === 1 ? "" : "s"}` : "";

  return compact([characterReference, locationReference], "");
}

function referenceAssetText(data: Record<string, unknown>): string {
  const referenceCount = new Set(stringArray(data, "referenceAssetIds")).size;
  if (referenceCount === 0) {
    return "";
  }

  return `${referenceCount} reference image${referenceCount === 1 ? "" : "s"}`;
}

function assetVariantText(data: Record<string, unknown>): string {
  const variantCount = objectArray(data.assetVariants).filter((item) => text(item, "variantId")).length;
  if (variantCount === 0) {
    return "";
  }
  return `${variantCount} variant${variantCount === 1 ? "" : "s"}`;
}

function assetSizeText(data: Record<string, unknown>): string {
  const value = data.sizeBytes;
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${Math.round(value / 102.4) / 10} KB`;
  }
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}

function mediaDimensionText(data: Record<string, unknown>): string {
  const width = data.width;
  const height = data.height;
  return typeof width === "number" &&
    Number.isFinite(width) &&
    typeof height === "number" &&
    Number.isFinite(height)
    ? `${width}x${height}`
    : "";
}

function mediaDurationText(data: Record<string, unknown>): string {
  const durationMs = data.durationMs;
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs <= 0) {
    return "";
  }
  return `${Math.round(durationMs / 100) / 10}s`;
}

function titleFromData(type: Phase3CanvasNodeType, data: Record<string, unknown>): string {
  switch (type) {
    case "source_text":
    case "source_image":
    case "source_video":
    case "source_audio":
      return text(data, "originalFilename");
    case "character_asset":
    case "location_asset":
    case "prop_asset":
      return text(data, "name");
    case "scene_frame":
      return text(data, "label");
    case "editor_package":
      return text(data, "packageName");
    default:
      return "";
  }
}

function summaryForNode(
  type: Phase3CanvasNodeType,
  data: Record<string, unknown>,
  fallback: string,
): string {
  switch (type) {
    case "novel":
      return firstText(text(data, "synopsis"), text(data, "sourceText"), fallback);
    case "source_text":
    case "source_image":
    case "source_video":
    case "source_audio":
      return firstText(text(data, "originalFilename"), text(data, "mimeType"), fallback);
    case "scene_frame":
      return firstText(storyEventTraceText(data), text(data, "description"), fallback);
    case "scene":
      return firstText(storyEventTraceText(data), text(data, "synopsis"), text(data, "mood"), fallback);
    case "shot":
      return firstText(
        storyEventTraceText(data),
        text(data, "visualDescription"),
        text(data, "action"),
        shotReferenceText(data),
        fallback,
      );
    case "character_asset":
      return firstText(lifecycleStageCountText(data), text(data, "appearance"), text(data, "role"), fallback);
    case "location_asset":
      return firstText(text(data, "environment"), text(data, "visualStyle"), fallback);
    case "prop_asset":
      return firstText(text(data, "description"), text(data, "visualStyle"), text(data, "category"), fallback);
    case "ai_text":
      return firstText(text(data, "outputText"), text(data, "prompt"), fallback);
    case "ai_audio":
      return firstText(text(data, "scriptText"), text(data, "prompt"), text(data, "assetId"), fallback);
    case "image":
      return firstText(text(data, "description"), text(data, "prompt"), fallback);
    case "video":
      return firstText(text(data, "description"), text(data, "prompt"), fallback);
    case "editor_package":
      return firstText(text(data, "notes"), text(data, "format"), fallback);
  }
}

function detailForNode(
  type: Phase3CanvasNodeType,
  data: Record<string, unknown>,
  fallback: string,
): string {
  switch (type) {
    case "novel":
      return firstText(text(data, "language"), fallback);
    case "source_text":
    case "source_image":
    case "source_video":
    case "source_audio":
      return compact(
        [
          text(data, "mimeType"),
          mediaDimensionText(data),
          mediaDurationText(data),
          assetSizeText(data),
          text(data, "assetId"),
        ],
        fallback,
      );
    case "scene_frame":
      return compact(
        [storyEventTraceText(data), numberText(data, "order", ""), text(data, "locationAssetId") ? "Location ref" : ""],
        fallback,
      );
    case "scene":
      return compact(
        [storyEventTraceText(data), text(data, "location"), text(data, "timeOfDay"), text(data, "mood")],
        fallback,
      );
    case "shot":
      return compact(
        [
          storyEventTraceText(data),
          characterStageReferenceText(data),
          shotReferenceText(data),
          text(data, "cameraMovement"),
          numberText(data, "durationSeconds", "s"),
          text(data, "promptNotes"),
        ],
        fallback,
      );
    case "character_asset":
      return compact(
        [
          lifecycleStageCountText(data),
          activeLifecycleStageText(data),
          characterLockText(data),
          text(data, "role"),
          text(data, "personality"),
          text(data, "identityPrompt"),
          text(data, "consistencyPrompt"),
          referenceAssetText(data),
          assetVariantText(data),
        ],
        fallback,
      );
    case "location_asset":
      return compact(
        [
          text(data, "mood"),
          text(data, "visualStyle"),
          text(data, "locationPrompt"),
          text(data, "consistencyPrompt"),
          referenceAssetText(data),
          assetVariantText(data),
        ],
        fallback,
      );
    case "prop_asset":
      return compact(
        [
          text(data, "category"),
          text(data, "propPrompt"),
          text(data, "consistencyPrompt"),
          referenceAssetText(data),
          assetVariantText(data),
        ],
        fallback,
      );
    case "ai_text":
      return compact(
        [
          text(data, "contextSummary"),
          text(data, "provider"),
          text(data, "model"),
          text(data, "generationOperation"),
        ],
        fallback,
      );
    case "ai_audio":
      return compact(
        [
          text(data, "contextSummary"),
          text(data, "assetId"),
          text(data, "provider"),
          text(data, "model"),
          text(data, "generationOperation"),
        ],
        fallback,
      );
    case "image":
      return compact([text(data, "assetId"), text(data, "prompt")], fallback);
    case "video":
      return compact([numberText(data, "durationSeconds", "s"), text(data, "assetId")], fallback);
    case "editor_package":
      return compact([text(data, "format"), text(data, "assetId")], fallback);
  }
}

function compact(values: string[], fallback: string): string {
  const result = values.filter(Boolean).join(" / ");
  return result ? truncate(result, 140) : fallback;
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}...`;
}
