import type { CanvasEdgeRecord, CanvasNodeRecord } from "@guga-flow/shared-types";

import {
  buildCanvasEdgeArrowProjection,
  getCanvasEdgeVisualShapeId,
  type CanvasEdgeArrowProjection,
} from "./canvas-edge-visuals";

export interface CanvasEdgeSyncEditor {
  getShape(shapeId: string): CanvasEdgeSyncShape | undefined;
  createShape(shape: CanvasEdgeArrowProjection): void;
  updateShape(shape: CanvasEdgeArrowProjection): void;
  deleteShapes(shapeIds: string[]): void;
}

export interface CanvasEdgeSyncShape {
  id: string;
  type: string;
  x?: number;
  y?: number;
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

    nextKnownShapeIds.add(projection.id);
    const existingShape = input.editor.getShape(projection.id);
    if (!existingShape) {
      input.editor.createShape(projection);
      createdShapeIds.push(projection.id);
      continue;
    }

    if (!matchesProjection(existingShape, projection)) {
      input.editor.updateShape(projection);
      updatedShapeIds.push(projection.id);
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
  if (shape.type !== "arrow" || shape.x !== projection.x || shape.y !== projection.y) {
    return false;
  }

  const props = objectData(shape.props);
  return (
    props.color === projection.props.color &&
    props.dash === projection.props.dash &&
    props.size === projection.props.size &&
    props.arrowheadStart === projection.props.arrowheadStart &&
    props.arrowheadEnd === projection.props.arrowheadEnd &&
    terminalMatches(props.start, projection.props.start) &&
    terminalMatches(props.end, projection.props.end)
  );
}

function terminalMatches(value: unknown, terminal: CanvasEdgeArrowProjection["props"]["start"]) {
  const data = objectData(value);
  const normalizedAnchor = objectData(data.normalizedAnchor);
  return (
    data.type === terminal.type &&
    data.boundShapeId === terminal.boundShapeId &&
    data.isExact === terminal.isExact &&
    normalizedAnchor.x === terminal.normalizedAnchor.x &&
    normalizedAnchor.y === terminal.normalizedAnchor.y
  );
}

function objectData(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
