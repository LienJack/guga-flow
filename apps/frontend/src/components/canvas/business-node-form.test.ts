import type { CanvasNodeRecord } from "@guga-flow/shared-types";
import { describe, expect, it } from "vitest";

import { dataJsonFromForm } from "./business-node-form";

const shotNode: CanvasNodeRecord = {
  id: "node_1",
  projectId: "project_1",
  canvasDocumentId: "canvas_1",
  tldrawShapeId: "shape:shot-1",
  type: "shot",
  title: "Shot 001",
  x: 10,
  y: 20,
  width: 360,
  height: 220,
  zIndex: 0,
  status: "draft",
  dataJson: {
    visualDescription: "Old visual",
    action: "Old action",
    characterAssetIds: ["character_1"],
    locationAssetId: "location_1",
    providerMeta: { requestId: "req_1", version: 2 },
    tags: ["night", "rooftop"],
  },
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
};

describe("dataJsonFromForm", () => {
  it("preserves non-form extension data while updating and clearing known fields", () => {
    expect(
      dataJsonFromForm(shotNode, {
        visualDescription: "New visual",
        action: "",
        durationSeconds: 12,
      }),
    ).toEqual({
      visualDescription: "New visual",
      durationSeconds: 12,
      characterAssetIds: ["character_1"],
      locationAssetId: "location_1",
      providerMeta: { requestId: "req_1", version: 2 },
      tags: ["night", "rooftop"],
    });
  });
});
