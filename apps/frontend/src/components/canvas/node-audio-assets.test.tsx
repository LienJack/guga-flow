import type { AssetListItem, CanvasNodeRecord } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  audioBindingConfigForNode,
  buildNodeAudioAssetUpdate,
  getNodeAudioAssetIds,
  isAudioBindableAsset,
  NodeAudioAssets,
  supportsNodeAudioAssets,
} from "./node-audio-assets";

vi.mock("../../lib/api", () => ({
  listAssets: vi.fn(async () => []),
  updateCanvasNode: vi.fn(),
  uploadAsset: vi.fn(),
}));

const characterNode: CanvasNodeRecord = {
  id: "character_1",
  projectId: "project_1",
  canvasDocumentId: "canvas_1",
  tldrawShapeId: "shape:character-1",
  type: "character_asset",
  title: "Ari",
  x: 10,
  y: 20,
  width: 260,
  height: 180,
  zIndex: 0,
  status: "draft",
  dataJson: {
    name: "Ari",
    voiceAssetIds: ["asset_voice_1", "asset_voice_1", 42],
    voiceReferences: [
      {
        assetId: "asset_voice_1",
        label: "Existing voice",
        role: "voice",
        sourceNodeId: "character_1",
      },
    ],
    lifecycleStages: [{ stageId: "adult", label: "Adult" }],
  },
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
};

const shotNode: CanvasNodeRecord = {
  ...characterNode,
  id: "shot_1",
  tldrawShapeId: "shape:shot-1",
  type: "shot",
  title: "Shot 001",
  dataJson: {
    shotNumber: "001",
    audioAssetIds: ["asset_audio_1"],
    audioReferences: [{ assetId: "asset_audio_1", role: "narration" }],
  },
};

const videoNode: CanvasNodeRecord = {
  ...characterNode,
  id: "video_1",
  tldrawShapeId: "shape:video-1",
  type: "video",
  title: "Shot 001 video",
  dataJson: {
    assetId: "asset_video_1",
    audioAssetIds: ["asset_audio_1"],
  },
};

const audioAsset: AssetListItem = {
  id: "asset_audio_1",
  projectId: "project_1",
  type: "audio",
  purpose: "shot_audio",
  storageKey: "project_1/ambience.mp3",
  mimeType: "audio/mpeg",
  originalFilename: "ambience.mp3",
  sizeBytes: 2048,
  durationMs: 7000,
  previewKind: "audio",
  previewUrl: "/assets/project_1/asset_audio_1",
  createdAt: "2026-06-12T00:00:00.000Z",
};

const imageAsset: AssetListItem = {
  ...audioAsset,
  id: "asset_image_1",
  type: "image",
  purpose: "character_reference",
  storageKey: "project_1/hero.png",
  mimeType: "image/png",
  originalFilename: "hero.png",
  previewKind: "image",
};

describe("NodeAudioAssets", () => {
  it("renders character voice bindings and available audio candidates", () => {
    const html = renderToStaticMarkup(
      <NodeAudioAssets
        projectId="project_1"
        node={characterNode}
        initialAssets={[
          { ...audioAsset, id: "asset_voice_1", originalFilename: "voice.mp3" },
          audioAsset,
          imageAsset,
        ]}
        onNodeUpdated={vi.fn()}
      />,
    );

    expect(html).toContain("Voice");
    expect(html).toContain("voice.mp3");
    expect(html).toContain("ambience.mp3");
    expect(html).toContain("Bind");
    expect(html).not.toContain("hero.png");
  });

  it("deduplicates ids and filters bindable assets", () => {
    expect(supportsNodeAudioAssets(characterNode)).toBe(true);
    expect(supportsNodeAudioAssets({ ...characterNode, type: "location_asset" })).toBe(false);
    expect(getNodeAudioAssetIds(characterNode)).toEqual(["asset_voice_1"]);
    expect(getNodeAudioAssetIds(shotNode)).toEqual(["asset_audio_1"]);
    expect(getNodeAudioAssetIds(videoNode)).toEqual(["asset_audio_1"]);
    expect(isAudioBindableAsset(audioAsset)).toBe(true);
    expect(isAudioBindableAsset(imageAsset)).toBe(false);
    expect(audioBindingConfigForNode(characterNode)?.uploadPurpose).toBe("voice_reference");
    expect(audioBindingConfigForNode(shotNode)?.uploadPurpose).toBe("shot_audio");
  });

  it("builds character voice updates without deleting unrelated JSON fields", () => {
    expect(
      buildNodeAudioAssetUpdate(characterNode, ["asset_voice_2", "asset_voice_2"], [
        { ...audioAsset, id: "asset_voice_2", originalFilename: "voice-two.wav", mimeType: "audio/wav" },
      ]),
    ).toEqual({
      dataJson: {
        name: "Ari",
        voiceAssetIds: ["asset_voice_2"],
        voiceReferences: [
          {
            assetId: "asset_voice_2",
            sourceNodeId: "character_1",
            role: "voice",
            label: "voice-two.wav",
            mimeType: "audio/wav",
            durationMs: 7000,
          },
        ],
        lifecycleStages: [{ stageId: "adult", label: "Adult" }],
      },
    });

    expect(buildNodeAudioAssetUpdate(characterNode, [])).toEqual({
      dataJson: {
        name: "Ari",
        lifecycleStages: [{ stageId: "adult", label: "Adult" }],
      },
    });
  });

  it("builds shot and video audio updates with clip audio defaults", () => {
    expect(buildNodeAudioAssetUpdate(shotNode, ["asset_audio_1"], [audioAsset])).toMatchObject({
      dataJson: {
        shotNumber: "001",
        audioAssetIds: ["asset_audio_1"],
        audioReferences: [
          {
            assetId: "asset_audio_1",
            sourceNodeId: "shot_1",
            role: "narration",
            label: "ambience.mp3",
          },
        ],
      },
    });
    expect(buildNodeAudioAssetUpdate(videoNode, ["asset_audio_1"], [audioAsset])).toMatchObject({
      dataJson: {
        assetId: "asset_video_1",
        audioAssetIds: ["asset_audio_1"],
        audioReferences: [
          {
            assetId: "asset_audio_1",
            sourceNodeId: "video_1",
            role: "clip_audio",
          },
        ],
      },
    });
  });
});
