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
    ).toEqual({ kind: "multi", count: 2 });
    expect(selectionFromShapes([{ id: "shape:geo-1", type: "geo" }])).toEqual({
      kind: "unsupported",
      shapeId: "shape:geo-1",
      shapeType: "geo",
    });
  });
});

describe("business node geometry scheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("debounces geometry patches and flushes the latest value", async () => {
    vi.useFakeTimers();
    const patchGeometry = vi.fn(async () => undefined);
    const scheduler = createBusinessNodeGeometryScheduler({
      projectId: "project_1",
      delayMs: 100,
      patchGeometry,
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
