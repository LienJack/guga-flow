import type { PromptDebugPart, ShotPromptCompositionResult } from "@guga-flow/shared-types";
import { describe, expect, it } from "vitest";

import {
  formatPromptDebugPart,
  getPromptPreviewChannels,
  summarizePromptMissingContext,
  summarizeReferenceAssetIds,
} from "./prompt-preview-data";

describe("prompt preview data helpers", () => {
  it("builds image and video channel view models from a composed Shot prompt", () => {
    const channels = getPromptPreviewChannels(composedPrompt());

    expect(channels).toHaveLength(2);
    expect(channels[0]).toMatchObject({
      channel: "image",
      title: "Image prompt",
      prompt: "image prompt body",
      negativePrompt: "no logos",
      hasPrompt: true,
      missingContextLabel: "No missing context",
      referenceAssetLabel: "2 reference images: asset_1, asset_2",
    });
    expect(channels[0]?.parts[0]).toMatchObject({
      id: "scene:scene_1",
      kindLabel: "Scene",
      sourceNodeLabel: "1 source node: scene_1",
    });
    expect(channels[1]).toMatchObject({
      channel: "video",
      title: "Video prompt",
      prompt: "video prompt body",
    });
  });

  it("summarizes missing context and reference images compactly", () => {
    expect(
      summarizePromptMissingContext([
        { kind: "scene", label: "Scene", message: "No scene" },
        { kind: "scene", label: "Scene", message: "Still no scene" },
        { kind: "location", label: "Location", message: "No location" },
      ]),
    ).toBe("Missing: Scene, Location");
    expect(summarizeReferenceAssetIds([])).toBe("No reference images");
    expect(summarizeReferenceAssetIds(["asset_1", "asset_1"])).toBe("1 reference image: asset_1");
  });

  it("formats debug parts with kind, source node, and reference labels", () => {
    expect(
      formatPromptDebugPart({
        id: "character:node_1",
        kind: "character",
        label: "Character",
        text: "Character: Hero",
        channels: ["image", "video"],
        sourceNodeIds: ["node_1", "node_1"],
        referenceAssetIds: ["asset_1"],
      }),
    ).toMatchObject({
      kindLabel: "Character",
      sourceNodeLabel: "1 source node: node_1",
      referenceAssetLabel: "1 reference image: asset_1",
    });
    expect(
      formatPromptDebugPart({
        id: "visual-manual:shot_1",
        kind: "visual_manual",
        label: "Visual manual",
        text: "Palette: cyan shadows",
        channels: ["image", "video"],
      }),
    ).toMatchObject({
      kindLabel: "Visual manual",
      referenceAssetLabel: "No reference images",
    });
  });

  it("returns no channels before a compose result is loaded", () => {
    expect(getPromptPreviewChannels(undefined)).toEqual([]);
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
  const imagePart: PromptDebugPart = {
    id: "shot:image:shot_1",
    kind: "shot",
    label: "Shot image prompt",
    text: "Image prompt: image prompt body",
    channels: ["image"],
    sourceNodeIds: ["shot_1"],
  };
  const videoPart: PromptDebugPart = {
    id: "shot:video:shot_1",
    kind: "shot",
    label: "Shot video prompt",
    text: "Video prompt: video prompt body",
    channels: ["video"],
    sourceNodeIds: ["shot_1"],
  };

  return {
    shotNodeId: "shot_1",
    shotTitle: "Shot 01",
    sourceNodeIds: {
      shotNodeId: "shot_1",
      sceneNodeId: "scene_1",
      characterNodeIds: ["character_1"],
      referenceAssetIds: ["asset_1", "asset_2"],
    },
    referenceAssetIds: ["asset_1", "asset_2"],
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
      parts: [scenePart, imagePart],
      missingContext: [],
    },
    video: {
      channel: "video",
      prompt: "video prompt body",
      negativePrompt: "no logos",
      parts: [scenePart, videoPart],
      missingContext: [],
    },
    debugParts: [scenePart, imagePart, videoPart],
    missingContext: [],
  };
}
