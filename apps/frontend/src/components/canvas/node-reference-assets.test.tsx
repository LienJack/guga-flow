import type { AssetListItem, CanvasNodeRecord } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  buildNodeReferenceAssetUpdate,
  getNodeReferenceAssetIds,
  isReferenceBindableAsset,
  NodeReferenceAssets,
  referencePurposeForNode,
  supportsNodeReferenceAssets,
} from "./node-reference-assets";

vi.mock("../../lib/api", () => ({
  assetPreviewUrl: vi.fn((projectId: string, assetId: string) => `/assets/${projectId}/${assetId}`),
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
    identityPrompt: "consistent Ari",
    referenceAssetIds: ["asset_1", "asset_1", 42],
    storyboardImport: {
      batchId: "batch_1",
      draftId: "draft_1",
      novelDocumentId: "novel_1",
      entityKind: "character_asset",
      version: 1,
    },
  },
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
};

const imageAsset: AssetListItem = {
  id: "asset_1",
  projectId: "project_1",
  type: "image",
  purpose: "character_reference",
  storageKey: "project_1/hero.png",
  mimeType: "image/png",
  originalFilename: "hero.png",
  previewKind: "image",
  previewUrl: "/assets/project_1/asset_1",
  createdAt: "2026-06-12T00:00:00.000Z",
};

const videoAsset: AssetListItem = {
  ...imageAsset,
  id: "asset_video",
  type: "video",
  mimeType: "video/mp4",
  originalFilename: "clip.mp4",
  previewKind: "video",
};

describe("NodeReferenceAssets", () => {
  it("renders selected reference images and bindable image candidates", () => {
    const html = renderToStaticMarkup(
      <NodeReferenceAssets
        projectId="project_1"
        node={characterNode}
        initialAssets={[
          imageAsset,
          { ...imageAsset, id: "asset_2", originalFilename: "profile.png" },
          videoAsset,
        ]}
        onNodeUpdated={vi.fn()}
      />,
    );

    expect(html).toContain("Reference images");
    expect(html).toContain("hero.png");
    expect(html).toContain("profile.png");
    expect(html).toContain("Bind");
    expect(html).not.toContain("clip.mp4");
  });

  it("deduplicates node reference ids and filters bindable assets", () => {
    expect(supportsNodeReferenceAssets(characterNode)).toBe(true);
    expect(getNodeReferenceAssetIds(characterNode)).toEqual(["asset_1"]);
    expect(isReferenceBindableAsset(imageAsset)).toBe(true);
    expect(isReferenceBindableAsset(videoAsset)).toBe(false);
    expect(referencePurposeForNode(characterNode)).toBe("character_reference");
    expect(referencePurposeForNode({ ...characterNode, type: "location_asset" })).toBe(
      "location_reference",
    );
  });

  it("builds node updates without deleting provenance or unrelated JSON fields", () => {
    expect(buildNodeReferenceAssetUpdate(characterNode, ["asset_2", "asset_2"])).toEqual({
      dataJson: {
        name: "Ari",
        identityPrompt: "consistent Ari",
        referenceAssetIds: ["asset_2"],
        storyboardImport: {
          batchId: "batch_1",
          draftId: "draft_1",
          novelDocumentId: "novel_1",
          entityKind: "character_asset",
          version: 1,
        },
      },
    });

    expect(buildNodeReferenceAssetUpdate(characterNode, [])).toEqual({
      dataJson: {
        name: "Ari",
        identityPrompt: "consistent Ari",
        storyboardImport: {
          batchId: "batch_1",
          draftId: "draft_1",
          novelDocumentId: "novel_1",
          entityKind: "character_asset",
          version: 1,
        },
      },
    });
  });
});
