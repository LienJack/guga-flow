import type {
  CanvasEdgeData,
  CanvasEdgeRecord,
  CanvasEdgeRelation,
  CanvasInputSlotEdgeData,
  CanvasNodeRecord,
  CanvasSnapshotJson,
  CreateCanvasEdgeInput,
  CreateCanvasEdgeResult,
  DeleteCanvasEdgeResult,
} from "@guga-flow/shared-types";
import { resolveCanvasInputSlot, validateCanvasInputConnection } from "@guga-flow/shared-types";

import { buildBusinessNodeCardModel, isPhase3CanvasNodeType } from "./business-node-data";

export type SemanticCanvasEdgeRelation =
  | "derived_from"
  | "references_character"
  | "references_location";

export interface CanvasGraphState {
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
}

export interface ShotReferenceState {
  characterAssetIds: string[];
  locationAssetId?: string;
}

export const CANVAS_EDGE_RELATION_LABELS = {
  derived_from: "Derived from",
  story_seed: "Story seed",
  belongs_to_scene: "Belongs to scene",
  references_character: "Character reference",
  references_location: "Location reference",
  references_style: "Style reference",
  references_prop: "Prop reference",
  generated_image: "Generated image",
  generated_video: "Generated video",
  first_frame_for: "First frame",
  selected_version_for: "Selected version",
  sent_to_editor: "Sent to editor",
  sequence_next: "Next in sequence",
} as const satisfies Record<CanvasEdgeRelation, string>;

export function getCanvasEdgeRelationLabel(relation: CanvasEdgeRelation): string {
  return CANVAS_EDGE_RELATION_LABELS[relation];
}

export function getCanvasEdgeEndpointLabel(node: CanvasNodeRecord | undefined): string {
  if (!node) {
    return "Missing node";
  }
  if (isPhase3CanvasNodeType(node.type)) {
    return buildBusinessNodeCardModel(node).title;
  }

  return node.title?.trim() || node.type;
}

export function getSemanticBindingRelation(
  sourceNode: CanvasNodeRecord,
  targetNode: CanvasNodeRecord,
): SemanticCanvasEdgeRelation | null {
  if (
    isSourceMediaNodeType(sourceNode.type) &&
    resolveCanvasInputSlot({ sourceType: sourceNode.type, targetType: targetNode.type })
  ) {
    return "derived_from";
  }
  if (sourceNode.type === "character_asset" && targetNode.type === "shot") {
    return "references_character";
  }
  if (
    sourceNode.type === "location_asset" &&
    (targetNode.type === "shot" || targetNode.type === "scene_frame")
  ) {
    return "references_location";
  }

  return null;
}

export function canCreateSemanticBinding(
  sourceNode: CanvasNodeRecord | undefined,
  targetNode: CanvasNodeRecord | undefined,
): sourceNode is CanvasNodeRecord {
  return Boolean(sourceNode && targetNode && getSemanticBindingRelation(sourceNode, targetNode));
}

export function buildSemanticCanvasEdgeInput(input: {
  sourceNode: CanvasNodeRecord;
  targetNode: CanvasNodeRecord;
  sourceShapeId?: string;
  targetShapeId?: string;
  visualArrowShapeId?: string;
  affectedShotNodeIds?: string[];
  existingEdges?: readonly CanvasEdgeRecord[];
  slotEdgeData?: CanvasInputSlotEdgeData;
}): CreateCanvasEdgeInput<CanvasEdgeData> | null {
  const relation = getSemanticBindingRelation(input.sourceNode, input.targetNode);
  if (!relation) {
    return null;
  }

  const slotValidation =
    relation === "derived_from" && !input.slotEdgeData
      ? validateCanvasInputConnection({
          sourceNode: input.sourceNode,
          targetNode: input.targetNode,
          existingEdges: input.existingEdges ?? [],
        })
      : null;

  if (slotValidation && !slotValidation.ok) {
    return null;
  }

  const slotEdgeData = input.slotEdgeData ?? (slotValidation?.ok ? slotValidation.edgeData : undefined);

  const edgeInput: CreateCanvasEdgeInput<CanvasEdgeData> = {
    sourceNodeId: input.sourceNode.id,
    targetNodeId: input.targetNode.id,
    relation,
    sourceShapeId: input.sourceShapeId,
    targetShapeId: input.targetShapeId,
    visualArrowShapeId: input.visualArrowShapeId,
    affectedShotNodeIds:
      relation === "references_location" && input.targetNode.type === "scene_frame"
        ? uniqueStrings(input.affectedShotNodeIds ?? [])
        : undefined,
  };

  if (slotEdgeData) {
    edgeInput.dataJson = slotEdgeData;
  }

  return edgeInput;
}

function isSourceMediaNodeType(sourceType: string): boolean {
  if (
    sourceType !== "source_text" &&
    sourceType !== "source_image" &&
    sourceType !== "source_video" &&
    sourceType !== "source_audio"
  ) {
    return false;
  }
  return true;
}

export function findExistingCanvasEdge(
  edges: CanvasEdgeRecord[],
  input: Pick<CreateCanvasEdgeInput, "sourceNodeId" | "targetNodeId" | "relation">,
): CanvasEdgeRecord | undefined {
  return edges.find(
    (edge) =>
      edge.sourceNodeId === input.sourceNodeId &&
      edge.targetNodeId === input.targetNodeId &&
      edge.relation === input.relation,
  );
}

export function hasExistingCanvasEdge(
  edges: CanvasEdgeRecord[],
  input: Pick<CreateCanvasEdgeInput, "sourceNodeId" | "targetNodeId" | "relation">,
): boolean {
  return Boolean(findExistingCanvasEdge(edges, input));
}

export function findSceneFrameEligibleShotNodes(
  sceneFrameNode: CanvasNodeRecord,
  nodes: CanvasNodeRecord[],
): CanvasNodeRecord[] {
  if (sceneFrameNode.type !== "scene_frame") {
    return [];
  }

  return nodes.filter(
    (node) => node.type === "shot" && isNodeCenterInsideFrame(node, sceneFrameNode),
  );
}

export function isNodeCenterInsideFrame(
  node: CanvasNodeRecord,
  frameNode: CanvasNodeRecord,
): boolean {
  if (frameNode.width <= 0 || frameNode.height <= 0 || node.width <= 0 || node.height <= 0) {
    return false;
  }

  const centerX = node.x + node.width / 2;
  const centerY = node.y + node.height / 2;
  return (
    centerX >= frameNode.x &&
    centerX <= frameNode.x + frameNode.width &&
    centerY >= frameNode.y &&
    centerY <= frameNode.y + frameNode.height
  );
}

export function getShotReferenceState(node: CanvasNodeRecord | undefined): ShotReferenceState {
  if (!node || node.type !== "shot") {
    return { characterAssetIds: [] };
  }

  const data = objectData(node.dataJson);
  return {
    characterAssetIds: stringArray(data.characterAssetIds),
    locationAssetId: typeof data.locationAssetId === "string" ? data.locationAssetId : undefined,
  };
}

export function mergeCanvasNodes(
  nodes: CanvasNodeRecord[],
  updatedNodes: CanvasNodeRecord[],
): CanvasNodeRecord[] {
  return mergeById(nodes, updatedNodes);
}

export function mergeCanvasEdges(
  edges: CanvasEdgeRecord[],
  updatedEdges: CanvasEdgeRecord[],
): CanvasEdgeRecord[] {
  return mergeById(edges, updatedEdges);
}

export function mergeCanvasEdgeCreateResult(
  state: CanvasGraphState,
  result: CreateCanvasEdgeResult,
): CanvasGraphState {
  return {
    nodes: mergeCanvasNodes(state.nodes, result.updatedNodes),
    edges: mergeCanvasEdges(state.edges, result.edges),
  };
}

export function mergeCanvasEdgeDeleteResult(
  state: CanvasGraphState,
  result: DeleteCanvasEdgeResult,
): CanvasGraphState {
  const deletedEdgeIds = new Set(result.deletedEdgeIds);
  return {
    nodes: mergeCanvasNodes(state.nodes, result.updatedNodes),
    edges: state.edges.filter((edge) => !deletedEdgeIds.has(edge.id)),
  };
}

function mergeById<TItem extends { id: string }>(items: TItem[], updates: TItem[]): TItem[] {
  if (updates.length === 0) {
    return items;
  }

  const updateById = new Map(updates.map((item) => [item.id, item]));
  const merged = items.map((item) => updateById.get(item.id) ?? item);
  const existingIds = new Set(items.map((item) => item.id));
  for (const update of updates) {
    if (!existingIds.has(update.id)) {
      merged.push(update);
    }
  }

  return merged;
}

function objectData(value: unknown): { [key: string]: CanvasSnapshotJson } {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as { [key: string]: CanvasSnapshotJson };
  }

  return {};
}

function stringArray(value: CanvasSnapshotJson | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStrings(value.filter((item): item is string => typeof item === "string"));
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}
