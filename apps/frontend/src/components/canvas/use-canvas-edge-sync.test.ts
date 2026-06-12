import type { CanvasEdgeRecord, CanvasNodeRecord } from "@guga-flow/shared-types";
import { describe, expect, it, vi } from "vitest";

import {
  connectedCanvasEdgeShapeIds,
  reconcileCanvasEdgeShapes,
  type CanvasEdgeSyncBinding,
  type CanvasEdgeSyncShape,
} from "./use-canvas-edge-sync";

const baseNode = {
  projectId: "project_1",
  canvasDocumentId: "canvas_1",
  title: "Node",
  width: 200,
  height: 120,
  zIndex: 0,
  status: "draft",
  dataJson: {},
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
} satisfies Omit<CanvasNodeRecord, "id" | "type" | "tldrawShapeId" | "x" | "y">;

function node(overrides: Partial<CanvasNodeRecord> & Pick<CanvasNodeRecord, "id" | "type">) {
  return {
    ...baseNode,
    tldrawShapeId: `shape:${overrides.id}`,
    x: 0,
    y: 0,
    ...overrides,
  } satisfies CanvasNodeRecord;
}

function edge(overrides: Partial<CanvasEdgeRecord> = {}) {
  return {
    id: "edge_1",
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    sourceNodeId: "character_1",
    targetNodeId: "shot_1",
    relation: "references_character",
    createdAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  } satisfies CanvasEdgeRecord;
}

function createEditor(initialShapes: CanvasEdgeSyncShape[] = []) {
  const shapes = new Map(initialShapes.map((shape) => [shape.id, shape]));
  const bindings: CanvasEdgeSyncBinding[] = [];
  return {
    getShape: vi.fn((shapeId: string) => shapes.get(shapeId)),
    createShape: vi.fn((shape: CanvasEdgeSyncShape) => {
      shapes.set(shape.id, shape);
    }),
    updateShape: vi.fn((shape: CanvasEdgeSyncShape) => {
      shapes.set(shape.id, shape);
    }),
    deleteShapes: vi.fn((shapeIds: string[]) => {
      for (const shapeId of shapeIds) {
        shapes.delete(shapeId);
      }
    }),
    createBindings: vi.fn((nextBindings: CanvasEdgeSyncBinding[]) => {
      bindings.push(...nextBindings);
    }),
    deleteBindings: vi.fn((removedBindings: CanvasEdgeSyncBinding[]) => {
      for (const removedBinding of removedBindings) {
        const index = bindings.findIndex((binding) => binding.id === removedBinding.id);
        if (index !== -1) {
          bindings.splice(index, 1);
        }
      }
    }),
    getBindingsFromShape: vi.fn((shapeId: string, type: "arrow") =>
      bindings.filter((binding) => binding.fromId === shapeId && binding.type === type),
    ),
    shapes,
    bindings,
  };
}

describe("canvas edge sync", () => {
  it("creates missing normalized edge arrows after endpoint shapes exist", () => {
    const character = node({ id: "character_1", type: "character_asset" });
    const shot = node({ id: "shot_1", type: "shot", x: 400 });
    const editor = createEditor([
      { id: character.tldrawShapeId, type: "guga_character_asset" },
      { id: shot.tldrawShapeId, type: "guga_shot" },
    ]);

    const result = reconcileCanvasEdgeShapes({
      editor,
      nodes: [character, shot],
      edges: [edge()],
      knownShapeIds: new Set(),
    });

    expect(editor.createShape).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "shape:semantic-edge-edge_1",
        type: "arrow",
      }),
    );
    expect(editor.createBindings).toHaveBeenCalledWith([
      expect.objectContaining({ fromId: "shape:semantic-edge-edge_1", toId: "shape:character_1" }),
      expect.objectContaining({ fromId: "shape:semantic-edge-edge_1", toId: "shape:shot_1" }),
    ]);
    expect(result.createdShapeIds).toEqual(["shape:semantic-edge-edge_1"]);
    expect(result.changed).toBe(true);
  });

  it("updates stale known arrows and removes only known semantic arrows", () => {
    const character = node({ id: "character_1", type: "character_asset" });
    const shot = node({ id: "shot_1", type: "shot", x: 400 });
    const editor = createEditor([
      { id: character.tldrawShapeId, type: "guga_character_asset" },
      { id: shot.tldrawShapeId, type: "guga_shot" },
      {
        id: "shape:semantic-edge-edge_1",
        type: "arrow",
        x: 0,
        y: 0,
        props: { color: "black" },
      },
      { id: "shape:user-arrow", type: "arrow" },
      { id: "shape:semantic-edge-old", type: "arrow" },
    ]);

    const result = reconcileCanvasEdgeShapes({
      editor,
      nodes: [character, shot],
      edges: [edge()],
      knownShapeIds: new Set(["shape:semantic-edge-edge_1", "shape:semantic-edge-old"]),
    });

    expect(editor.updateShape).toHaveBeenCalledWith(
      expect.objectContaining({ id: "shape:semantic-edge-edge_1" }),
    );
    expect(editor.deleteShapes).toHaveBeenCalledWith(["shape:semantic-edge-old"]);
    expect(editor.shapes.has("shape:user-arrow")).toBe(true);
    expect(result.updatedShapeIds).toEqual(["shape:semantic-edge-edge_1"]);
    expect(result.removedShapeIds).toEqual(["shape:semantic-edge-old"]);
  });

  it("finds connected semantic arrow ids for node cascade cleanup", () => {
    expect(
      connectedCanvasEdgeShapeIds(
        [
          edge({ id: "edge_1", sourceNodeId: "character_1", targetNodeId: "shot_1" }),
          edge({ id: "edge_2", sourceNodeId: "location_1", targetNodeId: "shot_1" }),
          edge({ id: "edge_3", sourceNodeId: "location_1", targetNodeId: "shot_2" }),
        ],
        "shot_1",
      ),
    ).toEqual(["shape:semantic-edge-edge_1", "shape:semantic-edge-edge_2"]);
  });
});
