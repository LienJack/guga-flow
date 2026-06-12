import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { AssetLibrary } from "./asset-library";

vi.mock("../../lib/api", () => ({
  assetPreviewUrl: (projectId: string, assetId: string) =>
    `http://localhost:3002/api/v1/projects/${projectId}/assets/${assetId}/preview`,
  deleteAsset: vi.fn(),
  getAsset: vi.fn(),
  listAssets: vi.fn(async () => []),
  uploadAsset: vi.fn(),
}));

describe("AssetLibrary", () => {
  it("renders upload controls and image/video/document asset rows", () => {
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
            type: "document",
            purpose: "uploaded",
            storageKey: "project_1/notes.md",
            mimeType: "text/markdown",
            originalFilename: "notes.md",
            sizeBytes: 80,
            createdAt: "2026-06-12T00:02:00.000Z",
            previewKind: "text",
          },
        ]}
      />,
    );

    expect(html).toContain("Assets");
    expect(html).toContain("Upload");
    expect(html).toContain("hero.png");
    expect(html).toContain("clip.mp4");
    expect(html).toContain("notes.md");
  });

  it("renders an upload-first empty state", () => {
    const html = renderToStaticMarkup(<AssetLibrary projectId="project_1" initialAssets={[]} />);

    expect(html).toContain("No assets");
    expect(html).toContain("Upload references or source media.");
  });
});
