import type { EditorExportJobInput } from "@guga-flow/shared-types";
import { describe, expect, it } from "vitest";

import {
  buildEditorExportPackage,
  listStoredZipEntryNames,
  storyboardRowsToCsv,
} from "./editor-export-package";

describe("editor export package builder", () => {
  it("packages timeline, storyboard, and ordered clip files into a zip", async () => {
    const packageOutput = await buildEditorExportPackage(editorExportInput(), {
      readClip: async (clip) => ({
        body: Buffer.from(`clip:${clip.videoNodeId}`),
        mimeType: clip.mimeType,
      }),
    });
    const zip = Buffer.from(packageOutput.bytesBase64 ?? "", "base64");

    expect(packageOutput.mimeType).toBe("application/zip");
    expect(packageOutput.timeline.tracks[0]?.items.map((item) => item.sourceNodeId)).toEqual([
      "video_1",
      "video_2",
      "video_3",
    ]);
    expect(packageOutput.timeline.tracks[1]).toMatchObject({
      id: "track_audio_1",
      type: "audio",
      items: [
        expect.objectContaining({
          assetId: "asset_ambience_1",
          sourceNodeId: "shot_1",
          startMs: 0,
          durationMs: 4000,
          metadata: expect.objectContaining({
            role: "sound_effect",
            videoNodeId: "video_1",
          }),
        }),
        expect.objectContaining({
          assetId: "asset_voice_1",
          sourceNodeId: "character_1",
          startMs: 0,
          durationMs: 4000,
          metadata: expect.objectContaining({
            sourceNodeType: "character_asset",
            role: "voice",
          }),
        }),
      ],
    });
    expect(packageOutput.timeline.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "asset_ambience_1",
          type: "audio",
          url: "asset://asset_ambience_1",
          mimeType: "audio/wav",
          durationMs: 7000,
        }),
        expect.objectContaining({
          id: "asset_voice_1",
          type: "audio",
          url: "asset://asset_voice_1",
          mimeType: "audio/mpeg",
        }),
      ]),
    );
    expect(packageOutput.timeline.metadata).toMatchObject({
      exportPreset: "gif_preview",
      sourceEditorExportId: "export_previous",
      presetOutputs: ["timeline", "storyboard_csv", "gif_preview_request"],
      generationSettings: {
        effective: { visualStyle: "export noir" },
      },
      packagingReferences: {
        bgm: { status: "available", assetId: "asset_bgm_1" },
        cover: { status: "requested_unresolved", label: "Episode cover" },
      },
    });
    expect(packageOutput.timeline.tracks[0]?.items[0]?.metadata).toMatchObject({
      exportPreset: "gif_preview",
      generationSettings: {
        effective: { visualStyle: "generated clip style" },
      },
      packagingSettings: {
        effective: { aspectRatio: "1:1" },
      },
    });
    expect(packageOutput.clips.map((clip) => clip.filename)).toEqual([
      "clips/shot_001.mp4",
      "clips/shot_002.mp4",
      "clips/shot_003.mp4",
    ]);
    expect(packageOutput.clips[0]?.generationSettings?.effective.visualStyle).toBe(
      "generated clip style",
    );
    expect(packageOutput.clips[0]?.packagingSettings?.effective.aspectRatio).toBe("1:1");
    expect(packageOutput.clips[0]?.audioReferences?.map((reference) => reference.assetId)).toEqual([
      "asset_ambience_1",
      "asset_voice_1",
    ]);
    expect(packageOutput.storyboardCsv).toContain("Shot 001 video");
    expect(listStoredZipEntryNames(zip)).toEqual([
      "timeline.json",
      "storyboard.csv",
      "clips/shot_001.mp4",
      "clips/shot_002.mp4",
      "clips/shot_003.mp4",
    ]);
  });

  it("escapes storyboard csv cells", () => {
    const csv = storyboardRowsToCsv([
      {
        index: 1,
        filename: "clips/shot_001.mp4",
        videoNodeId: "video_1",
        videoNodeTitle: "Hero, close \"look\"",
        assetId: "asset_video_1",
        durationMs: 4000,
      },
    ]);

    expect(csv).toContain('"Hero, close ""look"""');
  });

  it("surfaces clip read failures as packaging errors", async () => {
    await expect(
      buildEditorExportPackage(editorExportInput(), {
        readClip: async () => {
          throw new Error("clip fetch failed");
        },
      }),
    ).rejects.toThrow("clip fetch failed");
  });

  it("normalizes unsafe zip entry paths before packaging clips", async () => {
    const packageOutput = await buildEditorExportPackage(
      editorExportInput({
        clips: [
          {
            videoNodeId: "video_1",
            videoAssetId: "asset_video_1",
            filename: "../clips/../unsafe.mp4",
            mimeType: "video/mp4",
          },
        ],
      }),
      {
        readClip: async () => ({
          body: Buffer.from("clip"),
          mimeType: "video/mp4",
        }),
      },
    );
    const zip = Buffer.from(packageOutput.bytesBase64 ?? "", "base64");

    expect(packageOutput.clips[0]?.filename).toBe("clips/unsafe.mp4");
    expect(listStoredZipEntryNames(zip)).toEqual(["timeline.json", "storyboard.csv", "clips/unsafe.mp4"]);
  });
});

function editorExportInput(overrides: Partial<EditorExportJobInput> = {}): EditorExportJobInput {
  return {
    operation: "editor_export",
    projectId: "project_1",
    editorExportId: "export_1",
    videoNodeIds: ["video_1", "video_2", "video_3"],
    sortMode: "manual",
    exportPreset: "gif_preview",
    sourceEditorExportId: "export_previous",
    includeStoryboardCsv: true,
    includeSubtitles: false,
    fps: 24,
    aspectRatio: "16:9",
    generationSettings: {
      project: { visualStyle: "export noir" },
      shot: {},
      effective: { visualStyle: "export noir" },
      sources: { visualStyle: "project" },
    },
    packagingReferences: {
      bgm: { status: "available", assetId: "asset_bgm_1", label: "Main cue" },
      cover: { status: "requested_unresolved", label: "Episode cover" },
    },
    clips: [
      {
        videoNodeId: "video_1",
        videoNodeTitle: "Shot 001 video",
        videoAssetId: "asset_video_1",
        filename: "clips/shot_001.mp4",
        mimeType: "video/mp4",
        durationMs: 4000,
        shotNumber: "001",
        generationSettings: {
          project: { visualStyle: "project at generation" },
          shot: { visualStyle: "generated clip style" },
          effective: { visualStyle: "generated clip style" },
          sources: { visualStyle: "shot" },
        },
        packagingSettings: {
          project: { aspectRatio: "16:9" },
          shot: { aspectRatio: "1:1" },
          effective: { aspectRatio: "1:1" },
          sources: { aspectRatio: "shot" },
        },
        audioReferences: [
          {
            assetId: "asset_ambience_1",
            sourceNodeId: "shot_1",
            sourceNodeType: "shot",
            role: "sound_effect",
            label: "Launch room hum",
            mimeType: "audio/wav",
            durationMs: 7000,
          },
          {
            assetId: "asset_voice_1",
            sourceNodeId: "character_1",
            sourceNodeType: "character_asset",
            role: "voice",
            label: "Ari voice",
            mimeType: "audio/mpeg",
            durationMs: 9000,
          },
        ],
      },
      {
        videoNodeId: "video_2",
        videoNodeTitle: "Shot 002 video",
        videoAssetId: "asset_video_2",
        filename: "clips/shot_002.mp4",
        mimeType: "video/mp4",
        durationSeconds: 5,
        shotNumber: "002",
      },
      {
        videoNodeId: "video_3",
        videoNodeTitle: "Shot 003 video",
        videoAssetId: "asset_video_3",
        filename: "clips/shot_003.mp4",
        mimeType: "video/mp4",
        shotNumber: "003",
      },
    ],
    ...overrides,
  };
}
