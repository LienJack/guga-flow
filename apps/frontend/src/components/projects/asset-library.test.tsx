import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { AssetLibrary } from "./asset-library";

vi.mock("../../lib/api", () => ({
  assetPreviewUrl: (projectId: string, assetId: string) =>
    `http://localhost:3002/api/v1/projects/${projectId}/assets/${assetId}/preview`,
  batchAssets: vi.fn(),
  createAssetCollection: vi.fn(),
  createAssetTag: vi.fn(),
  deleteAsset: vi.fn(),
  getAsset: vi.fn(),
  listAssetCollections: vi.fn(async () => []),
  listAssets: vi.fn(async () => []),
  listAssetTags: vi.fn(async () => []),
  uploadAsset: vi.fn(),
}));

describe("AssetLibrary", () => {
  it("renders upload controls and image/video/audio/document asset rows", () => {
    const html = renderToStaticMarkup(
      <AssetLibrary
        projectId="project_1"
        initialAssets={[
          {
            id: "asset_1",
            projectId: "project_1",
            type: "image",
            purpose: "uploaded",
            storageKey: "project_1/hero.png",
            mimeType: "image/png",
            originalFilename: "hero.png",
            sizeBytes: 1200,
            createdAt: "2026-06-12T00:00:00.000Z",
            previewKind: "image",
            collection: {
              id: "collection_1",
              projectId: "project_1",
              name: "Characters",
              kind: "character",
              sortOrder: 0,
              createdAt: "2026-06-12T00:00:00.000Z",
              updatedAt: "2026-06-12T00:00:00.000Z",
            },
            tags: [
              {
                id: "tag_1",
                projectId: "project_1",
                name: "approved",
                createdAt: "2026-06-12T00:00:00.000Z",
              },
            ],
          },
          {
            id: "asset_2",
            projectId: "project_1",
            type: "video",
            purpose: "uploaded",
            storageKey: "project_1/clip.mp4",
            mimeType: "video/mp4",
            originalFilename: "clip.mp4",
            sizeBytes: 2400,
            createdAt: "2026-06-12T00:01:00.000Z",
            previewKind: "video",
          },
          {
            id: "asset_3",
            projectId: "project_1",
            type: "audio",
            purpose: "voice_reference",
            storageKey: "project_1/voice.mp3",
            mimeType: "audio/mpeg",
            originalFilename: "voice.mp3",
            sizeBytes: 3200,
            createdAt: "2026-06-12T00:02:00.000Z",
            previewKind: "audio",
          },
          {
            id: "asset_4",
            projectId: "project_1",
            type: "document",
            purpose: "uploaded",
            storageKey: "project_1/notes.md",
            mimeType: "text/markdown",
            originalFilename: "notes.md",
            sizeBytes: 80,
            createdAt: "2026-06-12T00:03:00.000Z",
            previewKind: "text",
          },
        ]}
      />,
    );

    expect(html).toContain("Assets");
    expect(html).toContain("Upload");
    expect(html).toContain("Search");
    expect(html).toContain("New collection");
    expect(html).toContain("New tag");
    expect(html).toContain("0 selected");
    expect(html).toContain("Apply");
    expect(html).toContain("hero.png");
    expect(html).toContain("clip.mp4");
    expect(html).toContain("voice.mp3");
    expect(html).toContain("notes.md");
    expect(html).toContain("Characters");
    expect(html).toContain("approved");
    expect(html).toContain("Voice ref");
    expect(html).toContain("Shot audio");
    expect(html).toContain("BGM");
  });

  it("renders an upload-first empty state", () => {
    const html = renderToStaticMarkup(<AssetLibrary projectId="project_1" initialAssets={[]} />);

    expect(html).toContain("No assets");
    expect(html).toContain("Upload references or source media.");
  });
});
