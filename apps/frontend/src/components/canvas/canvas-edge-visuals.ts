import type { CanvasEdgeRecord, CanvasNodeRecord } from "@guga-flow/shared-types";

import { getCanvasEdgeRelationLabel } from "./canvas-edge-data";

export interface CanvasEdgeArrowProjection {
  shape: CanvasEdgeArrowShapeProjection;
  bindings: CanvasEdgeArrowBindingProjection[];
}

export interface CanvasEdgeArrowShapeProjection {
  id: string;
  type: "arrow";
  x: number;
  y: number;
  props: {
    color: "blue";
    dash: "solid";
    size: "m";
    start: { x: number; y: number };
    end: { x: number; y: number };
    arrowheadStart: "none";
    arrowheadEnd: "arrow";
  };
}

export interface CanvasEdgeArrowBindingProjection {
  id: string;
  type: "arrow";
  fromId: string;
  toId: string;
  props: {
    terminal: "start" | "end";
    normalizedAnchor: { x: number; y: number };
    isExact: false;
    isPrecise: true;
  };
}

export function getCanvasEdgeVisualShapeId(edge: CanvasEdgeRecord): string {
  return edge.visualArrowShapeId ?? `shape:semantic-edge-${edge.id}`;
}

export function buildCanvasEdgeShapeIdMap(edges: CanvasEdgeRecord[]): Map<string, string> {
  return new Map(edges.map((edge) => [getCanvasEdgeVisualShapeId(edge), edge.id]));
}

export function findCanvasEdgeByVisualShapeId(
  edges: CanvasEdgeRecord[],
  shapeId: string,
): CanvasEdgeRecord | undefined {
  return edges.find((edge) => getCanvasEdgeVisualShapeId(edge) === shapeId);
}

export function buildCanvasEdgeArrowProjection(
  edge: CanvasEdgeRecord,
  nodes: CanvasNodeRecord[],
): CanvasEdgeArrowProjection | null {
  const sourceNode = nodes.find((node) => node.id === edge.sourceNodeId);
  const targetNode = nodes.find((node) => node.id === edge.targetNodeId);
  if (!sourceNode || !targetNode) {
    return null;
  }

  const sourceCenter = center(sourceNode);
  const targetCenter = center(targetNode);
  return {
    shape: {
      id: getCanvasEdgeVisualShapeId(edge),
      type: "arrow",
      x: sourceCenter.x,
      y: sourceCenter.y,
      props: {
        color: "blue",
        dash: "solid",
        size: "m",
        start: { x: 0, y: 0 },
        end: { x: targetCenter.x - sourceCenter.x, y: targetCenter.y - sourceCenter.y },
        arrowheadStart: "none",
        arrowheadEnd: "arrow",
      },
    },
    bindings: [
      bindingProjection(edge, "start", sourceNode.tldrawShapeId),
      bindingProjection(edge, "end", targetNode.tldrawShapeId),
    ],
  };
}

export function getCanvasEdgeVisualLabel(edge: CanvasEdgeRecord): string {
  return getCanvasEdgeRelationLabel(edge.relation);
}

function bindingProjection(
  edge: CanvasEdgeRecord,
  terminal: "start" | "end",
  targetShapeId: string,
): CanvasEdgeArrowBindingProjection {
  const arrowShapeId = getCanvasEdgeVisualShapeId(edge);
  return {
    id: `binding:${arrowShapeId.replace(/^shape:/, "")}-${terminal}`,
    type: "arrow",
    fromId: arrowShapeId,
    toId: targetShapeId,
    props: {
      terminal,
      normalizedAnchor: { x: 0.5, y: 0.5 },
      isExact: false,
      isPrecise: true,
    },
  };
}

function center(node: CanvasNodeRecord): { x: number; y: number } {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}
