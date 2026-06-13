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
    expect(packageOutput.clips.map((clip) => clip.filename)).toEqual([
      "clips/shot_001.mp4",
      "clips/shot_002.mp4",
      "clips/shot_003.mp4",
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
    includeStoryboardCsv: true,
    includeSubtitles: false,
    fps: 24,
    aspectRatio: "16:9",
    clips: [
      {
        videoNodeId: "video_1",
        videoNodeTitle: "Shot 001 video",
        videoAssetId: "asset_video_1",
        filename: "clips/shot_001.mp4",
        mimeType: "video/mp4",
        durationMs: 4000,
        shotNumber: "001",
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
