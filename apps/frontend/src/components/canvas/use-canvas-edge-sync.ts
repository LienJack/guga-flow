import type { CanvasEdgeRecord, CanvasNodeRecord } from "@guga-flow/shared-types";

import {
  buildCanvasEdgeArrowProjection,
  getCanvasEdgeVisualShapeId,
  type CanvasEdgeArrowBindingProjection,
  type CanvasEdgeArrowProjection,
  type CanvasEdgeArrowShapeProjection,
} from "./canvas-edge-visuals";

export interface CanvasEdgeSyncEditor {
  getShape(shapeId: string): CanvasEdgeSyncShape | undefined;
  createShape(shape: CanvasEdgeArrowShapeProjection): void;
  updateShape(shape: CanvasEdgeArrowShapeProjection): void;
  deleteShapes(shapeIds: string[]): void;
  createBindings(bindings: CanvasEdgeArrowBindingProjection[]): void;
  deleteBindings(bindings: CanvasEdgeSyncBinding[]): void;
  getBindingsFromShape(shapeId: string, type: "arrow"): CanvasEdgeSyncBinding[];
}

export interface CanvasEdgeSyncShape {
  id: string;
  type: string;
  x?: number;
  y?: number;
  props?: unknown;
}

export interface CanvasEdgeSyncBinding {
  id: string;
  type: string;
  fromId: string;
  toId: string;
  props?: unknown;
}

export interface CanvasEdgeSyncResult {
  nextKnownShapeIds: Set<string>;
  createdShapeIds: string[];
  updatedShapeIds: string[];
  removedShapeIds: string[];
  changed: boolean;
}

export function reconcileCanvasEdgeShapes(input: {
  editor: CanvasEdgeSyncEditor;
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
  knownShapeIds: ReadonlySet<string>;
}): CanvasEdgeSyncResult {
  const nodeById = new Map(input.nodes.map((node) => [node.id, node]));
  const nextKnownShapeIds = new Set<string>();
  const createdShapeIds: string[] = [];
  const updatedShapeIds: string[] = [];
  const removedShapeIds: string[] = [];

  for (const edge of input.edges) {
    const sourceNode = nodeById.get(edge.sourceNodeId);
    const targetNode = nodeById.get(edge.targetNodeId);
    if (!sourceNode || !targetNode) {
      continue;
    }
    if (!input.editor.getShape(sourceNode.tldrawShapeId) || !input.editor.getShape(targetNode.tldrawShapeId)) {
      continue;
    }

    const projection = buildCanvasEdgeArrowProjection(edge, input.nodes);
    if (!projection) {
      continue;
    }

    nextKnownShapeIds.add(projection.shape.id);
    const existingShape = input.editor.getShape(projection.shape.id);
    if (!existingShape) {
      input.editor.createShape(projection.shape);
      syncArrowBindings(input.editor, projection);
      createdShapeIds.push(projection.shape.id);
      continue;
    }

    if (!matchesProjection(existingShape, projection)) {
      input.editor.updateShape(projection.shape);
      updatedShapeIds.push(projection.shape.id);
    }
    if (!bindingsMatch(input.editor.getBindingsFromShape(projection.shape.id, "arrow"), projection)) {
      syncArrowBindings(input.editor, projection);
      if (!updatedShapeIds.includes(projection.shape.id)) {
        updatedShapeIds.push(projection.shape.id);
      }
    }
  }

  for (const shapeId of input.knownShapeIds) {
    if (nextKnownShapeIds.has(shapeId)) {
      continue;
    }

    const existingShape = input.editor.getShape(shapeId);
    if (existingShape?.type === "arrow") {
      input.editor.deleteShapes([shapeId]);
      removedShapeIds.push(shapeId);
    }
  }

  return {
    nextKnownShapeIds,
    createdShapeIds,
    updatedShapeIds,
    removedShapeIds,
    changed:
      createdShapeIds.length > 0 || updatedShapeIds.length > 0 || removedShapeIds.length > 0,
  };
}

export function connectedCanvasEdgeShapeIds(
  edges: CanvasEdgeRecord[],
  nodeId: string,
): string[] {
  return edges
    .filter((edge) => edge.sourceNodeId === nodeId || edge.targetNodeId === nodeId)
    .map((edge) => getCanvasEdgeVisualShapeId(edge));
}

function matchesProjection(
  shape: CanvasEdgeSyncShape,
  projection: CanvasEdgeArrowProjection,
): boolean {
  if (shape.type !== "arrow" || shape.x !== projection.shape.x || shape.y !== projection.shape.y) {
    return false;
  }

  const props = objectData(shape.props);
  return (
    props.color === projection.shape.props.color &&
    props.dash === projection.shape.props.dash &&
    props.size === projection.shape.props.size &&
    props.arrowheadStart === projection.shape.props.arrowheadStart &&
    props.arrowheadEnd === projection.shape.props.arrowheadEnd &&
    pointMatches(props.start, projection.shape.props.start) &&
    pointMatches(props.end, projection.shape.props.end)
  );
}

function pointMatches(value: unknown, point: { x: number; y: number }) {
  const data = objectData(value);
  return data.x === point.x && data.y === point.y;
}

function syncArrowBindings(editor: CanvasEdgeSyncEditor, projection: CanvasEdgeArrowProjection) {
  const existingBindings = editor.getBindingsFromShape(projection.shape.id, "arrow");
  if (existingBindings.length > 0) {
    editor.deleteBindings(existingBindings);
  }
  editor.createBindings(projection.bindings);
}

function bindingsMatch(
  existingBindings: CanvasEdgeSyncBinding[],
  projection: CanvasEdgeArrowProjection,
): boolean {
  if (existingBindings.length !== projection.bindings.length) {
    return false;
  }

  return projection.bindings.every((binding) => {
    const existing = existingBindings.find(
      (candidate) =>
        candidate.fromId === binding.fromId &&
        candidate.toId === binding.toId &&
        objectData(candidate.props).terminal === binding.props.terminal,
    );
    if (!existing) {
      return false;
    }

    const props = objectData(existing.props);
    const normalizedAnchor = objectData(props.normalizedAnchor);
    return (
      props.isExact === binding.props.isExact &&
      props.isPrecise === binding.props.isPrecise &&
      normalizedAnchor.x === binding.props.normalizedAnchor.x &&
      normalizedAnchor.y === binding.props.normalizedAnchor.y
    );
  });
}

function objectData(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
