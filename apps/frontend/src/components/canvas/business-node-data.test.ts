import type { CanvasNodeRecord } from "@guga-flow/shared-types";
import { PHASE_3_CANVAS_NODE_TYPES } from "@guga-flow/shared-types";
import { describe, expect, it } from "vitest";

import {
  buildBusinessNodeCardModel,
  createBusinessCanvasNodeInput,
  createDefaultBusinessNodeData,
  getBusinessNodeDefinition,
  isPhase3CanvasNodeType,
} from "./business-node-data";

const baseNode = {
  id: "node_1",
  projectId: "project_1",
  canvasDocumentId: "canvas_1",
  tldrawShapeId: "shape:node-1",
  x: 10,
  y: 20,
  width: 360,
  height: 220,
  zIndex: 0,
  status: "draft",
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
} satisfies Omit<CanvasNodeRecord, "type" | "dataJson">;

describe("business node data helpers", () => {
  it("creates default data and create inputs for every Phase 3 node type", () => {
    for (const type of PHASE_3_CANVAS_NODE_TYPES) {
      const data = createDefaultBusinessNodeData(type);
      const input = createBusinessCanvasNodeInput(type, {
        tldrawShapeId: `shape:${type}`,
        x: 12,
        y: 24,
      });

      expect(isPhase3CanvasNodeType(type)).toBe(true);
      expect(Object.keys(data).length).toBeGreaterThan(0);
      expect(input).toMatchObject({
        tldrawShapeId: `shape:${type}`,
        type,
        title: getBusinessNodeDefinition(type).defaultTitle,
        x: 12,
        y: 24,
        status: "draft",
      });
    }
  });

  it("summarizes Shot production fields for cards", () => {
    const model = buildBusinessNodeCardModel({
      ...baseNode,
      type: "shot",
      title: "Shot 001",
      dataJson: {
        visualDescription: "Wide shot of the launch platform at sunrise.",
        action: "Ari tightens the final cable.",
        cameraMovement: "Slow push-in",
        durationSeconds: 4,
        promptNotes: "cinematic practical lights",
      },
    });

    expect(model.title).toBe("Shot 001");
    expect(model.summary).toContain("launch platform");
    expect(model.detail).toContain("Slow push-in");
    expect(model.detail).toContain("4s");
    expect(model.detail).toContain("cinematic");
  });

  it("surfaces Shot semantic reference state without requiring form fields", () => {
    const model = buildBusinessNodeCardModel({
      ...baseNode,
      type: "shot",
      title: "Shot 002",
      dataJson: {
        characterAssetIds: ["character_1", "character_2", "character_1"],
        locationAssetId: "location_1",
      },
    });

    expect(model.summary).toContain("2 character refs");
    expect(model.detail).toContain("2 character refs");
    expect(model.detail).toContain("Location ref");
  });

  it("surfaces SceneFrame location reference state", () => {
    const model = buildBusinessNodeCardModel({
      ...baseNode,
      type: "scene_frame",
      title: "Frame 1",
      dataJson: {
        order: 2,
        locationAssetId: "location_1",
      },
    });

    expect(model.detail).toContain("2");
    expect(model.detail).toContain("Location ref");
  });

  it("keeps Character and Location consistency fields available", () => {
    const character = createDefaultBusinessNodeData("character_asset");
    const location = createDefaultBusinessNodeData("location_asset");

    expect(character).toHaveProperty("consistencyPrompt");
    expect(character).toHaveProperty("appearance");
    expect(location).toHaveProperty("consistencyPrompt");
    expect(location).toHaveProperty("visualStyle");
  });

  it("tolerates partially populated data from older records", () => {
    const model = buildBusinessNodeCardModel({
      ...baseNode,
      type: "video",
      title: undefined,
      dataJson: {},
    });

    expect(model.title).toBe("Video Node");
    expect(model.summary).toBe("Generated or uploaded clip");
    expect(model.detail).toBe("Prompt, duration, and asset link");
  });
});
