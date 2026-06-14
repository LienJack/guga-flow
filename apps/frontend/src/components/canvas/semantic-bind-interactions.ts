import type {
  CanvasEdgeData,
  CanvasEdgeRecord,
  CanvasNodeRecord,
  CreateCanvasEdgeInput,
} from "@guga-flow/shared-types";

import {
  buildSemanticCanvasEdgeInput,
  findSceneFrameEligibleShotNodes,
  getSemanticBindingRelation,
  hasExistingCanvasEdge,
} from "./canvas-edge-data";

export interface SemanticBindTarget {
  node: CanvasNodeRecord;
  label: string;
  affectedShotNodeIds: string[];
}

export function canStartSemanticBind(
  sourceNode: CanvasNodeRecord | undefined,
): sourceNode is CanvasNodeRecord {
  return Boolean(
    sourceNode &&
      (sourceNode.type === "character_asset" ||
        sourceNode.type === "location_asset" ||
        sourceNode.type === "source_text" ||
        sourceNode.type === "source_image" ||
        sourceNode.type === "source_video" ||
        sourceNode.type === "source_audio"),
  );
}

export function getAvailableSemanticBindTargets(
  sourceNode: CanvasNodeRecord | undefined,
  nodes: CanvasNodeRecord[],
  edges: CanvasEdgeRecord[],
): SemanticBindTarget[] {
  if (!canStartSemanticBind(sourceNode)) {
    return [];
  }

  return nodes.flatMap((node) => {
    if (node.id === sourceNode.id) {
      return [];
    }

    const relation = getSemanticBindingRelation(sourceNode, node);
    if (!relation || hasExistingCanvasEdge(edges, {
      sourceNodeId: sourceNode.id,
      targetNodeId: node.id,
      relation,
    })) {
      return [];
    }

    return [
      {
        node,
        label: semanticTargetLabel(node),
        affectedShotNodeIds:
          relation === "references_location" && node.type === "scene_frame"
            ? findSceneFrameEligibleShotNodes(node, nodes).map((shotNode) => shotNode.id)
            : [],
      },
    ];
  });
}

export function findDirectSemanticDropTarget(
  sourceNode: CanvasNodeRecord,
  nodes: CanvasNodeRecord[],
  edges: CanvasEdgeRecord[],
): SemanticBindTarget | null {
  const sourceCenter = center(sourceNode);
  const candidates = getAvailableSemanticBindTargets(sourceNode, nodes, edges).filter((target) =>
    containsPoint(target.node, sourceCenter),
  );

  candidates.sort((left, right) => {
    if (left.node.type === "shot" && right.node.type !== "shot") {
      return -1;
    }
    if (left.node.type !== "shot" && right.node.type === "shot") {
      return 1;
    }
    return area(left.node) - area(right.node);
  });

  return candidates[0] ?? null;
}

export function buildSemanticBindCreateInput(input: {
  sourceNode: CanvasNodeRecord;
  target: SemanticBindTarget;
  sourceShapeId?: string;
  targetShapeId?: string;
  visualArrowShapeId?: string;
}): CreateCanvasEdgeInput<CanvasEdgeData> | null {
  return buildSemanticCanvasEdgeInput({
    sourceNode: input.sourceNode,
    targetNode: input.target.node,
    sourceShapeId: input.sourceShapeId ?? input.sourceNode.tldrawShapeId,
    targetShapeId: input.targetShapeId ?? input.target.node.tldrawShapeId,
    visualArrowShapeId: input.visualArrowShapeId,
    affectedShotNodeIds: input.target.affectedShotNodeIds,
  });
}

export function semanticBindKey(sourceNodeId: string, targetNodeId: string): string {
  return `${sourceNodeId}->${targetNodeId}`;
}

function semanticTargetLabel(node: CanvasNodeRecord): string {
  const title = node.title?.trim();
  return title || node.type;
}

function containsPoint(node: CanvasNodeRecord, point: { x: number; y: number }): boolean {
  return (
    point.x >= node.x &&
    point.x <= node.x + node.width &&
    point.y >= node.y &&
    point.y <= node.y + node.height
  );
}

function center(node: CanvasNodeRecord): { x: number; y: number } {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

function area(node: CanvasNodeRecord): number {
  return node.width * node.height;
}
