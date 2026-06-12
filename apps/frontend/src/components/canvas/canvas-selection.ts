export type CanvasSelectionState =
  | { kind: "empty" }
  | { kind: "business-node"; nodeId: string }
  | { kind: "multi"; count: number }
  | { kind: "unsupported"; shapeId: string; shapeType: string };

export const EMPTY_CANVAS_SELECTION: CanvasSelectionState = { kind: "empty" };
