export type CanvasSelectionState =
  | { kind: "empty" }
  | { kind: "business-node"; nodeId: string }
  | { kind: "business-edge"; edgeId: string }
  | { kind: "multi"; count: number; nodeIds: string[] }
  | { kind: "unsupported"; shapeId: string; shapeType: string };

export const EMPTY_CANVAS_SELECTION: CanvasSelectionState = { kind: "empty" };
