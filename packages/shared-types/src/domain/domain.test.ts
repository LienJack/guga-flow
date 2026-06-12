import { describe, expect, it } from "vitest";

import {
  ASSET_PREVIEW_KINDS,
  CANVAS_EDGE_RELATIONS,
  CANVAS_NODE_TYPES,
  CANVAS_SAVE_STATUSES,
  GENERATION_JOB_STATUSES,
  GENERATION_OPERATIONS,
  PROJECT_ASPECT_RATIOS,
  UPLOADABLE_ASSET_MIME_TYPES,
  type CanvasLoadResult,
  type SaveCanvasSnapshotInput,
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
});
