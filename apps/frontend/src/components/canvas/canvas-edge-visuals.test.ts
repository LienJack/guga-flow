import type { CanvasEdgeRecord, CanvasNodeRecord } from "@guga-flow/shared-types";
import { describe, expect, it } from "vitest";

import {
  buildCanvasEdgeArrowProjection,
  buildCanvasEdgeShapeIdMap,
  findCanvasEdgeByVisualShapeId,
  getCanvasEdgeVisualLabel,
  getCanvasEdgeVisualShapeId,
} from "./canvas-edge-visuals";

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

describe("canvas edge visuals", () => {
  it("uses backend visual shape ids when present and stable fallback ids otherwise", () => {
    expect(getCanvasEdgeVisualShapeId(edge({ visualArrowShapeId: "shape:arrow-1" }))).toBe(
      "shape:arrow-1",
    );
    expect(getCanvasEdgeVisualShapeId(edge({ id: "edge_generated" }))).toBe(
      "shape:semantic-edge-edge_generated",
    );
  });

  it("builds a stable arrow projection from source and target business nodes", () => {
    const character = node({
      id: "character_1",
      type: "character_asset",
      tldrawShapeId: "shape:character-1",
      x: 100,
      y: 120,
      width: 220,
      height: 180,
    });
    const shot = node({
      id: "shot_1",
      type: "shot",
      tldrawShapeId: "shape:shot-1",
      x: 500,
      y: 200,
      width: 300,
      height: 200,
    });

    expect(buildCanvasEdgeArrowProjection(edge(), [character, shot])).toEqual({
      shape: {
        id: "shape:semantic-edge-edge_1",
        type: "arrow",
        x: 210,
        y: 210,
        props: {
          color: "blue",
          dash: "solid",
          size: "m",
          start: { x: 0, y: 0 },
          end: { x: 440, y: 90 },
          arrowheadStart: "none",
          arrowheadEnd: "arrow",
        },
      },
      bindings: [
        {
          id: "binding:semantic-edge-edge_1-start",
          type: "arrow",
          fromId: "shape:semantic-edge-edge_1",
          toId: "shape:character-1",
          props: {
            terminal: "start",
            normalizedAnchor: { x: 0.5, y: 0.5 },
            isExact: false,
            isPrecise: true,
          },
        },
        {
          id: "binding:semantic-edge-edge_1-end",
          type: "arrow",
          fromId: "shape:semantic-edge-edge_1",
          toId: "shape:shot-1",
          props: {
            terminal: "end",
            normalizedAnchor: { x: 0.5, y: 0.5 },
            isExact: false,
            isPrecise: true,
          },
        },
      ],
    });
  });

  it("skips projections when normalized edge endpoints are missing", () => {
    expect(
      buildCanvasEdgeArrowProjection(edge(), [node({ id: "character_1", type: "character_asset" })]),
    ).toBeNull();
  });

  it("maps visual arrow ids back to normalized edges", () => {
    const edges = [
      edge({ id: "edge_1", visualArrowShapeId: "shape:arrow-1" }),
      edge({ id: "edge_2", visualArrowShapeId: undefined }),
    ];
    const shapeIdMap = buildCanvasEdgeShapeIdMap(edges);

    expect(shapeIdMap.get("shape:arrow-1")).toBe("edge_1");
    expect(shapeIdMap.get("shape:semantic-edge-edge_2")).toBe("edge_2");
    expect(findCanvasEdgeByVisualShapeId(edges, "shape:arrow-1")?.id).toBe("edge_1");
    expect(getCanvasEdgeVisualLabel(edges[0]!)).toBe("Character reference");
  });
});
