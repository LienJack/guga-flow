import type {
  CanvasNodeRecord,
  CreateCanvasNodeInput,
  NodeStatus,
  Phase3CanvasNodeData,
  Phase3CanvasNodeType,
} from "@guga-flow/shared-types";
import { PHASE_3_CANVAS_NODE_TYPES } from "@guga-flow/shared-types";

export interface BusinessNodeDefinition {
  label: string;
  shortLabel: string;
  defaultTitle: string;
  summaryFallback: string;
  detailFallback: string;
  tone: "story" | "scene" | "shot" | "asset" | "media" | "export";
}

export interface BusinessNodeCardModel {
  nodeId: string;
  nodeType: Phase3CanvasNodeType;
  title: string;
  status: NodeStatus;
  summary: string;
  detail: string;
  w: number;
  h: number;
}

export const BUSINESS_NODE_DEFINITIONS = {
  novel: {
    label: "Novel",
    shortLabel: "Novel",
    defaultTitle: "Novel Source",
    summaryFallback: "Source manuscript",
    detailFallback: "Full text and synopsis",
    tone: "story",
  },
  scene_frame: {
    label: "Scene Frame",
    shortLabel: "Frame",
    defaultTitle: "Scene Frame",
    summaryFallback: "Scene grouping frame",
    detailFallback: "Organizes scenes and shots",
    tone: "scene",
  },
  scene: {
    label: "Scene",
    shortLabel: "Scene",
    defaultTitle: "Scene",
    summaryFallback: "Story scene",
    detailFallback: "Location, time, and mood",
    tone: "scene",
  },
  shot: {
    label: "Shot",
    shortLabel: "Shot",
    defaultTitle: "Shot",
    summaryFallback: "Visual beat",
    detailFallback: "Action, camera, and prompt notes",
    tone: "shot",
  },
  character_asset: {
    label: "Character",
    shortLabel: "Char",
    defaultTitle: "Character",
    summaryFallback: "Character reference",
    detailFallback: "Appearance and consistency",
    tone: "asset",
  },
  location_asset: {
    label: "Location",
    shortLabel: "Loc",
    defaultTitle: "Location",
    summaryFallback: "Location reference",
    detailFallback: "Environment and visual style",
    tone: "asset",
  },
  image: {
    label: "Image",
    shortLabel: "Image",
    defaultTitle: "Image Node",
    summaryFallback: "Generated or uploaded image",
    detailFallback: "Prompt and asset link",
    tone: "media",
  },
  video: {
    label: "Video",
    shortLabel: "Video",
    defaultTitle: "Video Node",
    summaryFallback: "Generated or uploaded clip",
    detailFallback: "Prompt, duration, and asset link",
    tone: "media",
  },
  editor_package: {
    label: "Editor Package",
    shortLabel: "Export",
    defaultTitle: "Editor Package",
    summaryFallback: "Timeline handoff package",
    detailFallback: "Export metadata",
    tone: "export",
  },
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
    case "scene_frame":
      return {
        label: "",
        order: 1,
        description: "",
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

export function buildBusinessNodeCardModel(node: CanvasNodeRecord): BusinessNodeCardModel {
  if (!isPhase3CanvasNodeType(node.type)) {
    throw new Error(`Unsupported business node type: ${node.type}`);
  }

  const definition = getBusinessNodeDefinition(node.type);
  const data = objectData(node.dataJson);
  const summary = summaryForNode(node.type, data, definition.summaryFallback);
  const detail = detailForNode(node.type, data, definition.detailFallback);

  return {
    nodeId: node.id,
    nodeType: node.type,
    title: firstText(node.title, titleFromData(node.type, data), definition.defaultTitle),
    status: node.status,
    summary,
    detail,
    w: node.width,
    h: node.height,
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

function titleFromData(type: Phase3CanvasNodeType, data: Record<string, unknown>): string {
  switch (type) {
    case "character_asset":
    case "location_asset":
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
    case "scene_frame":
      return firstText(text(data, "description"), fallback);
    case "scene":
      return firstText(text(data, "synopsis"), text(data, "mood"), fallback);
    case "shot":
      return firstText(
        text(data, "visualDescription"),
        text(data, "action"),
        shotReferenceText(data),
        fallback,
      );
    case "character_asset":
      return firstText(text(data, "appearance"), text(data, "role"), fallback);
    case "location_asset":
      return firstText(text(data, "environment"), text(data, "visualStyle"), fallback);
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
    case "scene_frame":
      return compact(
        [numberText(data, "order", ""), text(data, "locationAssetId") ? "Location ref" : ""],
        fallback,
      );
    case "scene":
      return compact([text(data, "location"), text(data, "timeOfDay"), text(data, "mood")], fallback);
    case "shot":
      return compact(
        [
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
          text(data, "role"),
          text(data, "personality"),
          text(data, "identityPrompt"),
          text(data, "consistencyPrompt"),
          referenceAssetText(data),
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
