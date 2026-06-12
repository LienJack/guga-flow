import type { CanvasNodeRecord, UpdateCanvasNodeGeometryInput } from "@guga-flow/shared-types";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createBusinessNodeGeometryScheduler } from "./use-business-node-sync";
import { selectionFromShapes } from "./use-selected-business-nodes";

describe("business node selection helpers", () => {
  it("maps tldraw selections into Inspector states", () => {
    expect(selectionFromShapes([])).toEqual({ kind: "empty" });
    expect(
      selectionFromShapes([
        {
          id: "shape:shot-1",
          type: "business_shot",
          props: { nodeId: "node_1" },
        },
      ]),
    ).toEqual({ kind: "business-node", nodeId: "node_1" });
    expect(
      selectionFromShapes([
        { id: "shape:shot-1", type: "business_shot", props: { nodeId: "node_1" } },
        { id: "shape:shot-2", type: "business_shot", props: { nodeId: "node_2" } },
      ]),
    ).toEqual({ kind: "multi", count: 2, nodeIds: ["node_1", "node_2"] });
    expect(selectionFromShapes([{ id: "shape:geo-1", type: "geo" }])).toEqual({
      kind: "unsupported",
      shapeId: "shape:geo-1",
      shapeType: "geo",
    });
    expect(
      selectionFromShapes([{ id: "shape:arrow-edge-1", type: "arrow" }], {
        edgeShapeToEdgeId: new Map([["shape:arrow-edge-1", "edge_1"]]),
      }),
    ).toEqual({ kind: "business-edge", edgeId: "edge_1" });
    expect(selectionFromShapes([{ id: "shape:user-arrow", type: "arrow" }])).toEqual({
      kind: "unsupported",
      shapeId: "shape:user-arrow",
      shapeType: "arrow",
    });
  });
});

describe("business node geometry scheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces geometry patches and flushes the latest value", async () => {
    vi.useFakeTimers();
    const onGeometrySaved = vi.fn();
    const patchGeometry = vi.fn(
      async (
        projectId: string,
        nodeId: string,
        input: UpdateCanvasNodeGeometryInput,
      ) => ({
        node: nodeFromGeometry(projectId, nodeId, input),
      }),
    );
    const scheduler = createBusinessNodeGeometryScheduler({
      projectId: "project_1",
      delayMs: 100,
      patchGeometry,
      onGeometrySaved,
    });

    scheduler.schedule("node_1", { x: 0, y: 0, width: 360, height: 220 });
    scheduler.schedule("node_1", { x: 20, y: 30, width: 380, height: 240 });

    await vi.advanceTimersByTimeAsync(100);

    expect(patchGeometry).toHaveBeenCalledTimes(1);
    expect(patchGeometry).toHaveBeenCalledWith("project_1", "node_1", {
      x: 20,
      y: 30,
      width: 380,
      height: 240,
    });
    expect(onGeometrySaved).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "node_1",
        projectId: "project_1",
        x: 20,
        y: 30,
        width: 380,
        height: 240,
      }),
    );
  });

  it("reports geometry patch failures", async () => {
    const onError = vi.fn();
    const scheduler = createBusinessNodeGeometryScheduler({
      projectId: "project_1",
      patchGeometry: vi.fn(async () => {
        throw new Error("offline");
      }),
      onError,
    });

    scheduler.schedule("node_1", { x: 0, y: 0, width: 360, height: 220 });
    await scheduler.flush();

    expect(onError).toHaveBeenCalledWith("offline");
  });
});

function nodeFromGeometry(
  projectId: string,
  nodeId: string,
  input: UpdateCanvasNodeGeometryInput,
): CanvasNodeRecord {
  return {
    id: nodeId,
    projectId,
    canvasDocumentId: "canvas_1",
    tldrawShapeId: "shape:shot-1",
    type: "shot",
    title: "Shot",
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    zIndex: input.zIndex ?? 0,
    status: "draft",
    dataJson: {},
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
  };
}
