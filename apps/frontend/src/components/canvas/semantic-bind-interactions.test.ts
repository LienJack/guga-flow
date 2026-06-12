import type { CanvasEdgeRecord, CanvasNodeRecord } from "@guga-flow/shared-types";
import { describe, expect, it } from "vitest";

import {
  buildSemanticBindCreateInput,
  canStartSemanticBind,
  findDirectSemanticDropTarget,
  getAvailableSemanticBindTargets,
  semanticBindKey,
} from "./semantic-bind-interactions";

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

describe("semantic bind interactions", () => {
  it("exposes bind targets for Character and Location sources only", () => {
    const character = node({ id: "character_1", type: "character_asset" });
    const location = node({ id: "location_1", type: "location_asset" });
    const shot = node({ id: "shot_1", type: "shot", title: "Shot 001" });
    const sceneFrame = node({ id: "frame_1", type: "scene_frame", title: "Frame 1" });

    expect(canStartSemanticBind(character)).toBe(true);
    expect(canStartSemanticBind(shot)).toBe(false);
    expect(getAvailableSemanticBindTargets(character, [character, location, shot, sceneFrame], [])).toEqual([
      expect.objectContaining({ node: shot, label: "Shot 001" }),
    ]);
    expect(getAvailableSemanticBindTargets(location, [character, location, shot, sceneFrame], [])).toEqual([
      expect.objectContaining({ node: shot }),
      expect.objectContaining({ node: sceneFrame }),
    ]);
  });

  it("filters targets already connected by an existing edge", () => {
    const character = node({ id: "character_1", type: "character_asset" });
    const shot = node({ id: "shot_1", type: "shot" });

    expect(getAvailableSemanticBindTargets(character, [character, shot], [edge()])).toEqual([]);
  });

  it("prefers Shot targets over containing SceneFrame targets for direct drop", () => {
    const location = node({
      id: "location_1",
      type: "location_asset",
      x: 180,
      y: 160,
      width: 120,
      height: 80,
    });
    const sceneFrame = node({
      id: "frame_1",
      type: "scene_frame",
      x: 100,
      y: 100,
      width: 500,
      height: 300,
    });
    const shot = node({
      id: "shot_1",
      type: "shot",
      x: 170,
      y: 140,
      width: 200,
      height: 140,
    });

    expect(findDirectSemanticDropTarget(location, [location, sceneFrame, shot], [])?.node.id).toBe(
      "shot_1",
    );
  });

  it("builds SceneFrame bind inputs with eligible shot ids", () => {
    const location = node({ id: "location_1", type: "location_asset" });
    const sceneFrame = node({
      id: "frame_1",
      type: "scene_frame",
      x: 100,
      y: 100,
      width: 500,
      height: 300,
    });
    const insideShot = node({
      id: "shot_inside",
      type: "shot",
      x: 150,
      y: 160,
      width: 120,
      height: 80,
    });
    const outsideShot = node({
      id: "shot_outside",
      type: "shot",
      x: 800,
      y: 160,
      width: 120,
      height: 80,
    });
    const [target] = getAvailableSemanticBindTargets(
      location,
      [location, sceneFrame, insideShot, outsideShot],
      [],
    );

    expect(target?.affectedShotNodeIds).toEqual(["shot_inside"]);
    expect(
      buildSemanticBindCreateInput({
        sourceNode: location,
        target: target!,
        visualArrowShapeId: "shape:arrow-location-frame",
      }),
    ).toMatchObject({
      sourceNodeId: "location_1",
      targetNodeId: "frame_1",
      relation: "references_location",
      affectedShotNodeIds: ["shot_inside"],
      visualArrowShapeId: "shape:arrow-location-frame",
    });
    expect(semanticBindKey("location_1", "frame_1")).toBe("location_1->frame_1");
  });
});
