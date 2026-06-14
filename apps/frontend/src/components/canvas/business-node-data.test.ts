import type { CanvasNodeRecord } from "@guga-flow/shared-types";
import { getCanvasNodeRegistryItem, PHASE_3_CANVAS_NODE_TYPES } from "@guga-flow/shared-types";
import { describe, expect, it } from "vitest";

import {
  buildBusinessNodeCardModel,
  createBusinessCanvasNodeInput,
  createDefaultBusinessNodeData,
  createSourceMediaNodeData,
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
      const definition = getBusinessNodeDefinition(type);
      const registry = getCanvasNodeRegistryItem(type);
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
      expect(definition.family).toBe(registry.family);
      expect(definition.familyLabel).toBe(registry.familyLabel);
      expect(definition.capabilities).toEqual(registry.capabilities);
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

  it("surfaces imported event and lifecycle trace on cards", () => {
    const shot = buildBusinessNodeCardModel({
      ...baseNode,
      type: "shot",
      title: "Shot 003",
      dataJson: {
        storyEvents: [
          {
            eventId: "event_opening",
            summary: "Ari spots the hidden launch signal.",
          },
        ],
        characterStageRefs: [{ characterTempId: "character_1", stageId: "stage_alert" }],
      },
    });
    const character = buildBusinessNodeCardModel({
      ...baseNode,
      type: "character_asset",
      title: "Ari",
      dataJson: {
        lifecycleStages: [
          {
            stageId: "stage_alert",
            label: "Alert",
            identityPrompt: "alert Ari identity",
          },
          {
            stageId: "stage_resolved",
            label: "Resolved",
          },
        ],
        activeStageId: "stage_alert",
        lockedFields: ["appearance", "identityPrompt"],
      },
    });

    expect(shot.summary).toContain("Ari spots the hidden launch signal");
    expect(shot.detail).toContain("1 character stage ref");
    expect(character.summary).toContain("2 lifecycle stages");
    expect(character.detail).toContain("Active stage: Alert");
    expect(character.detail).toContain("Locked: appearance, identityPrompt");
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

  it("builds compact card props for collapsed SceneFrames", () => {
    const data = createDefaultBusinessNodeData("scene_frame");
    const model = buildBusinessNodeCardModel({
      ...baseNode,
      type: "scene_frame",
      title: "Frame 1",
      dataJson: {
        ...data,
        collapsed: true,
      },
    });

    expect(data.collapsed).toBe(false);
    expect(model.collapsed).toBe(true);
    expect(model.h).toBeLessThan(baseNode.height);
  });

  it("keeps Character and Location consistency fields available", () => {
    const character = createDefaultBusinessNodeData("character_asset");
    const location = createDefaultBusinessNodeData("location_asset");
    const prop = createDefaultBusinessNodeData("prop_asset");

    expect(character).toHaveProperty("consistencyPrompt");
    expect(character).toHaveProperty("identityPrompt");
    expect(character).toHaveProperty("referenceAssetIds");
    expect(character).toHaveProperty("appearance");
    expect(location).toHaveProperty("consistencyPrompt");
    expect(location).toHaveProperty("locationPrompt");
    expect(location).toHaveProperty("referenceAssetIds");
    expect(location).toHaveProperty("visualStyle");
    expect(prop).toHaveProperty("propPrompt");
    expect(prop).toHaveProperty("assetVariants");
  });

  it("surfaces Character and Location prompt/reference state on cards", () => {
    const character = buildBusinessNodeCardModel({
      ...baseNode,
      type: "character_asset",
      title: "Ari",
      dataJson: {
        role: "Pilot",
        identityPrompt: "consistent pilot identity",
        referenceAssetIds: ["asset_1", "asset_1", "asset_2"],
      },
    });
    const location = buildBusinessNodeCardModel({
      ...baseNode,
      type: "location_asset",
      title: "Launch Site",
      dataJson: {
        locationPrompt: "neon launch pad at dawn",
        referenceAssetIds: ["asset_3"],
      },
    });

    expect(character.detail).toContain("consistent pilot identity");
    expect(character.detail).toContain("2 reference images");
    expect(location.detail).toContain("neon launch pad");
    expect(location.detail).toContain("1 reference image");
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

  it("surfaces AI Text output and context on cards", () => {
    const data = createDefaultBusinessNodeData("ai_text");
    const model = buildBusinessNodeCardModel({
      ...baseNode,
      type: "ai_text",
      title: "Scene outline",
      dataJson: {
        ...data,
        prompt: "Write a two-beat sequence.",
        outputText: "Beat 1: Ari sees the relay fail.",
        contextSummary: "Shot 01 (shot), Ari (character_asset)",
        provider: "mock-llm",
        model: "mock-storyboard",
      },
    });

    expect(data).toHaveProperty("prompt");
    expect(data).toHaveProperty("outputText");
    expect(model.summary).toContain("Beat 1");
    expect(model.detail).toContain("Shot 01");
    expect(model.detail).toContain("mock-llm");
  });

  it("builds source media node data from Asset records", () => {
    const data = createSourceMediaNodeData({
      id: "asset_image_1",
      projectId: "project_1",
      type: "image",
      purpose: "uploaded",
      storageKey: "project_1/reference.png",
      mimeType: "image/png",
      originalFilename: "reference.png",
      sizeBytes: 2048,
      width: 1080,
      height: 1920,
      createdAt: "2026-06-14T00:00:00.000Z",
      previewKind: "image",
      previewUrl: "/api/v1/projects/project_1/assets/asset_image_1/preview",
    });
    const model = buildBusinessNodeCardModel({
      ...baseNode,
      type: "source_image",
      title: undefined,
      dataJson: data,
    });

    expect(data).toMatchObject({
      assetId: "asset_image_1",
      mimeType: "image/png",
      originalFilename: "reference.png",
      source: "asset",
      importMethod: "drag_drop",
    });
    expect(model.title).toBe("reference.png");
    expect(model.summary).toBe("reference.png");
    expect(model.detail).toContain("image/png");
    expect(model.detail).toContain("1080x1920");
  });
});
