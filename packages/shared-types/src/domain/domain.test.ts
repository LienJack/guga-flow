import { describe, expect, it } from "vitest";

import {
  ASSET_PREVIEW_KINDS,
  CANVAS_EDGE_RELATIONS,
  CANVAS_NODE_TYPES,
  CANVAS_SAVE_STATUSES,
  GENERATION_JOB_STATUSES,
  GENERATION_OPERATIONS,
  PHASE_3_CANVAS_NODE_TYPES,
  PROJECT_ASPECT_RATIOS,
  UPLOADABLE_ASSET_MIME_TYPES,
  type CharacterAssetNodeData,
  type CanvasLoadResult,
  type CreateCanvasNodeInput,
  type DeleteCanvasNodeResult,
  type LocationAssetNodeData,
  type Phase3CanvasNodeRecord,
  type SaveCanvasSnapshotInput,
  type ShotNodeData,
  type UpdateCanvasNodeGeometryInput,
  type UpdateCanvasNodeInput,
} from "../index";

describe("shared domain constants", () => {
  it("includes MVP canvas node and edge concepts", () => {
    expect(CANVAS_NODE_TYPES).toContain("shot");
    expect(CANVAS_NODE_TYPES).toContain("editor_package");
    expect(CANVAS_EDGE_RELATIONS).toContain("generated_image");
    expect(CANVAS_EDGE_RELATIONS).toContain("generated_video");
    expect(CANVAS_EDGE_RELATIONS).toContain("sent_to_editor");
  });

  it("models worker-visible generation lifecycle states", () => {
    expect(GENERATION_JOB_STATUSES).toEqual(
      expect.arrayContaining(["queued", "running", "provider_waiting", "succeeded", "failed"]),
    );
    expect(GENERATION_OPERATIONS).toContain("novel_to_storyboard");
    expect(GENERATION_OPERATIONS).toContain("editor_export");
  });

  it("includes Phase 1 project and upload asset contracts", () => {
    expect(PROJECT_ASPECT_RATIOS).toEqual(["9:16", "16:9", "1:1"]);
    expect(UPLOADABLE_ASSET_MIME_TYPES).toEqual(
      expect.arrayContaining(["image/png", "video/mp4", "text/markdown"]),
    );
    expect(ASSET_PREVIEW_KINDS).toEqual(["image", "video", "text", "metadata"]);
  });

  it("exports Phase 2 canvas persistence contracts", () => {
    expect(CANVAS_SAVE_STATUSES).toEqual(["idle", "saving", "saved", "failed"]);

    const snapshot: SaveCanvasSnapshotInput = {
      snapshotJson: {
        document: {
          records: [],
        },
        session: null,
      },
    };

    const loadResult: CanvasLoadResult = {
      canvasDocument: {
        id: "canvas_1",
        projectId: "project_1",
        snapshotJson: snapshot.snapshotJson,
        createdAt: "2026-06-12T00:00:00.000Z",
        updatedAt: "2026-06-12T00:00:00.000Z",
      },
      nodes: [],
      edges: [],
      assets: [],
    };

    expect(loadResult.canvasDocument.snapshotJson).toEqual(snapshot.snapshotJson);
  });

  it("exports Phase 3 business canvas node contracts", () => {
    expect(PHASE_3_CANVAS_NODE_TYPES).toEqual([
      "novel",
      "scene_frame",
      "scene",
      "shot",
      "character_asset",
      "location_asset",
      "image",
      "video",
      "editor_package",
    ]);
    expect(CANVAS_NODE_TYPES).toEqual(expect.arrayContaining([...PHASE_3_CANVAS_NODE_TYPES]));

    const shotData: ShotNodeData = {
      visualDescription: "Wide shot of the launch platform at sunrise.",
      action: "The protagonist checks the final cable.",
      cameraMovement: "Slow push-in",
      durationSeconds: 4,
      promptNotes: "cinematic, practical lights",
      negativePromptNotes: "no logos",
    };
    const characterData: CharacterAssetNodeData = {
      name: "Ari",
      role: "Pilot",
      appearance: "Silver flight suit",
      consistencyPrompt: "same face and suit in every shot",
    };
    const locationData: LocationAssetNodeData = {
      name: "Orbital elevator base",
      environment: "coastal spaceport",
      visualStyle: "clean hard sci-fi",
      consistencyPrompt: "same tower silhouette",
    };

    const createInput: CreateCanvasNodeInput<ShotNodeData> = {
      tldrawShapeId: "shape:shot-1",
      type: "shot",
      title: "Shot 001",
      width: 360,
      height: 220,
      dataJson: shotData,
    };
    const updateInput: UpdateCanvasNodeInput<ShotNodeData> = {
      title: "Shot 001A",
      status: "draft",
      dataJson: shotData,
    };
    const geometryInput: UpdateCanvasNodeGeometryInput = {
      x: 20,
      y: 40,
      width: 360,
      height: 220,
    };
    const node: Phase3CanvasNodeRecord<"shot"> = {
      id: "node_1",
      projectId: "project_1",
      canvasDocumentId: "canvas_1",
      tldrawShapeId: createInput.tldrawShapeId,
      type: "shot",
      title: createInput.title,
      x: geometryInput.x,
      y: geometryInput.y,
      width: geometryInput.width,
      height: geometryInput.height,
      zIndex: 0,
      status: "draft",
      dataJson: shotData,
      createdAt: "2026-06-12T00:00:00.000Z",
      updatedAt: "2026-06-12T00:00:00.000Z",
    };
    const deleteResult: DeleteCanvasNodeResult = { deleted: true, nodeId: node.id };

    expect(node.dataJson.visualDescription).toContain("launch platform");
    expect(characterData.consistencyPrompt).toContain("same face");
    expect(locationData.visualStyle).toBe("clean hard sci-fi");
    expect(updateInput.status).toBe("draft");
    expect(deleteResult.nodeId).toBe("node_1");
  });
});
