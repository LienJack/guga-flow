import type { CanvasEdgeRecord, CanvasNodeRecord, PromptDebugPart, ShotPromptCompositionResult } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { buildPromptPreviewRefreshKey, ShotPromptPreview } from "./shot-prompt-preview";

vi.mock("../../lib/api", () => ({
  composeShotPrompt: vi.fn(),
}));

const shotNode: CanvasNodeRecord = {
  id: "shot_1",
  projectId: "project_1",
  canvasDocumentId: "canvas_1",
  tldrawShapeId: "shape:shot-1",
  type: "shot",
  title: "Shot 01",
  x: 10,
  y: 20,
  width: 320,
  height: 220,
  zIndex: 0,
  status: "draft",
  dataJson: {
    imagePrompt: "image prompt body",
  },
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
};

const characterNode: CanvasNodeRecord = {
  ...shotNode,
  id: "character_1",
  tldrawShapeId: "shape:character-1",
  type: "character_asset",
  title: "Ari",
  dataJson: {
    identityPrompt: "consistent Ari",
    referenceAssetIds: ["asset_1"],
  },
  updatedAt: "2026-06-12T00:01:00.000Z",
};

const edge: CanvasEdgeRecord = {
  id: "edge_1",
  projectId: "project_1",
  canvasDocumentId: "canvas_1",
  sourceNodeId: "character_1",
  targetNodeId: "shot_1",
  relation: "references_character",
  createdAt: "2026-06-12T00:00:00.000Z",
};

describe("ShotPromptPreview", () => {
  it("renders image/video prompts, negative prompt, missing context, and debug parts", () => {
    const html = renderToStaticMarkup(
      <ShotPromptPreview projectId="project_1" node={shotNode} initialResult={composedPrompt()} />,
    );

    expect(html).toContain("Prompt preview");
    expect(html).toContain("Image prompt");
    expect(html).toContain("image prompt body");
    expect(html).toContain("Video prompt");
    expect(html).toContain("video prompt body");
    expect(html).toContain("Negative");
    expect(html).toContain("no logos");
    expect(html).toContain("Debug parts");
    expect(html).toContain("Missing: Location");
  });

  it("does not render for non-Shot nodes", () => {
    const html = renderToStaticMarkup(
      <ShotPromptPreview projectId="project_1" node={characterNode} initialResult={composedPrompt()} />,
    );

    expect(html).toBe("");
  });

  it("changes refresh key when graph nodes, reference ids, or edges change", () => {
    const baseKey = buildPromptPreviewRefreshKey([shotNode, characterNode], [edge]);
    const changedReferenceKey = buildPromptPreviewRefreshKey(
      [
        shotNode,
        {
          ...characterNode,
          dataJson: { referenceAssetIds: ["asset_1", "asset_2"] },
        },
      ],
      [edge],
    );
    const changedEdgeKey = buildPromptPreviewRefreshKey(
      [shotNode, characterNode],
      [{ ...edge, relation: "references_location" }],
    );

    expect(changedReferenceKey).not.toBe(baseKey);
    expect(changedEdgeKey).not.toBe(baseKey);
  });
});

function composedPrompt(): ShotPromptCompositionResult {
  const scenePart: PromptDebugPart = {
    id: "scene:scene_1",
    kind: "scene",
    label: "Scene",
    text: "Scene: Opening",
    channels: ["image", "video"],
    sourceNodeIds: ["scene_1"],
  };

  return {
    shotNodeId: "shot_1",
    shotTitle: "Shot 01",
    sourceNodeIds: {
      shotNodeId: "shot_1",
      sceneNodeId: "scene_1",
      characterNodeIds: ["character_1"],
      referenceAssetIds: ["asset_1"],
    },
    referenceAssetIds: ["asset_1"],
    negativePrompt: "no logos",
    resolvedGenerationSettings: {
      project: {},
      shot: {},
      effective: {},
      sources: {},
    },
    image: {
      channel: "image",
      prompt: "image prompt body",
      negativePrompt: "no logos",
      parts: [scenePart],
      missingContext: [{ kind: "location", label: "Location", message: "No location" }],
    },
    video: {
      channel: "video",
      prompt: "video prompt body",
      negativePrompt: "no logos",
      parts: [scenePart],
      missingContext: [{ kind: "location", label: "Location", message: "No location" }],
    },
    debugParts: [scenePart],
    missingContext: [{ kind: "location", label: "Location", message: "No location" }],
  };
}
