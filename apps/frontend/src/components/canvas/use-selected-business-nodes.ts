import type { CanvasSelectionState } from "./canvas-selection";
import { EMPTY_CANVAS_SELECTION } from "./canvas-selection";
import { isBusinessNodeShapeType } from "./business-node-shape";

interface ShapeSelectionLike {
  id: string;
  type: string;
  props?: unknown;
}

export function selectionFromShapes(shapes: ShapeSelectionLike[]): CanvasSelectionState {
  if (shapes.length === 0) {
    return EMPTY_CANVAS_SELECTION;
  }
  if (shapes.length > 1) {
    return { kind: "multi", count: shapes.length };
  }

  const [shape] = shapes;
  const nodeId = nodeIdFromProps(shape?.props);
  if (shape && isBusinessNodeShapeType(shape.type) && nodeId) {
    return { kind: "business-node", nodeId };
  }

  return {
    kind: "unsupported",
    shapeId: shape?.id ?? "unknown",
    shapeType: shape?.type ?? "unknown",
  };
}

function nodeIdFromProps(props: unknown): string | undefined {
  if (typeof props !== "object" || props === null || !("nodeId" in props)) {
    return undefined;
  }

  const nodeId = (props as { nodeId?: unknown }).nodeId;
  return typeof nodeId === "string" ? nodeId : undefined;
}
