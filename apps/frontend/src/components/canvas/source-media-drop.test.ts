import { describe, expect, it } from "vitest";

import {
  sourceMediaCreateInput,
  sourceMediaNodeTypeForFile,
  validateSourceMediaDropFiles,
} from "./source-media-drop";

describe("source media drop helpers", () => {
  it("maps supported file kinds to source media node types", () => {
    expect(sourceMediaNodeTypeForFile(file("brief.md", "", 100))).toBe("source_text");
    expect(sourceMediaNodeTypeForFile(file("reference.png", "image/png", 100))).toBe("source_image");
    expect(sourceMediaNodeTypeForFile(file("clip.mp4", "video/mp4", 100))).toBe("source_video");
    expect(sourceMediaNodeTypeForFile(file("voice.wav", "audio/wav", 100))).toBe("source_audio");
    expect(sourceMediaNodeTypeForFile(file("archive.zip", "application/zip", 100))).toBeUndefined();
  });

  it("validates duplicate, oversized, and unsupported dropped files", () => {
    const first = file("reference.png", "image/png", 100, 1);
    const duplicate = file("reference.png", "image/png", 100, 1);
    const oversized = file("large.mp4", "video/mp4", 51 * 1024 * 1024, 2);
    const unsupported = file("archive.zip", "application/zip", 10, 3);

    const result = validateSourceMediaDropFiles([first, duplicate, oversized, unsupported]);

    expect(result.accepted).toEqual([{ file: first, nodeType: "source_image" }]);
    expect(result.errors.join(" ")).toContain("already in this drop batch");
    expect(result.errors.join(" ")).toContain("50 MB upload limit");
    expect(result.errors.join(" ")).toContain("not a supported text, image, video, or audio file");
  });

  it("builds Asset-backed source node create inputs", () => {
    const input = sourceMediaCreateInput({
      asset: {
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
      },
      nodeType: "source_image",
      tldrawShapeId: "shape:source-image-1",
      x: 10,
      y: 20,
      width: 360,
      height: 220,
      zIndex: 4,
    });

    expect(input).toMatchObject({
      tldrawShapeId: "shape:source-image-1",
      type: "source_image",
      title: "reference.png",
      x: 10,
      y: 20,
      zIndex: 4,
      status: "draft",
      dataJson: {
        assetId: "asset_image_1",
        mimeType: "image/png",
        importMethod: "drag_drop",
      },
    });
  });
});

function file(name: string, type: string, size: number, lastModified = 0): File {
  return { name, type, size, lastModified } as File;
}
