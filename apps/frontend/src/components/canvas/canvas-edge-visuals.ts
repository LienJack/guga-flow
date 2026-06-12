import type { CanvasEdgeRecord, CanvasNodeRecord } from "@guga-flow/shared-types";

import { getCanvasEdgeRelationLabel } from "./canvas-edge-data";

export interface CanvasEdgeArrowProjection {
  id: string;
  type: "arrow";
  x: number;
  y: number;
  props: {
    color: "blue";
    dash: "solid";
    size: "m";
    start: CanvasEdgeArrowTerminal;
    end: CanvasEdgeArrowTerminal;
    arrowheadStart: "none";
    arrowheadEnd: "arrow";
  };
}

interface CanvasEdgeArrowTerminal {
  type: "binding";
  boundShapeId: string;
  normalizedAnchor: { x: number; y: number };
  isExact: false;
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
    id: getCanvasEdgeVisualShapeId(edge),
    type: "arrow",
    x: sourceCenter.x,
    y: sourceCenter.y,
    props: {
      color: "blue",
      dash: "solid",
      size: "m",
      start: bindingTerminal(sourceNode.tldrawShapeId),
      end: bindingTerminal(targetNode.tldrawShapeId),
      arrowheadStart: "none",
      arrowheadEnd: "arrow",
    },
  };
}

export function getCanvasEdgeVisualLabel(edge: CanvasEdgeRecord): string {
  return getCanvasEdgeRelationLabel(edge.relation);
}

function bindingTerminal(shapeId: string): CanvasEdgeArrowTerminal {
  return {
    type: "binding",
    boundShapeId: shapeId,
    normalizedAnchor: { x: 0.5, y: 0.5 },
    isExact: false,
  };
}

function center(node: CanvasNodeRecord): { x: number; y: number } {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}
