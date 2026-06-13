import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  CreativeAgentEntry,
  getImageNodeStorySeedCandidate,
  isStorySeedAsset,
  requiresCreativeCanvasImportConfirmation,
} from "./creative-agent-entry";

describe("CreativeAgentEntry", () => {
  it("renders the novice creative brief entry without advanced direction fields", () => {
    const html = renderToStaticMarkup(
      <CreativeAgentEntry
        projectId="project_1"
        onCreativeStoryboardCreated={vi.fn()}
      />,
    );

    expect(html).toContain("Creative brief");
    expect(html).toContain("Creative mode");
    expect(html).toContain("Idea");
    expect(html).toContain("Reference image");
    expect(html).toContain("Canvas draft");
    expect(html).toContain("Create draft");
    expect(html).not.toContain("Audience");
    expect(html).not.toContain("Seconds");
  });

  it("renders advanced direction fields when the entry starts in advanced mode", () => {
    const html = renderToStaticMarkup(
      <CreativeAgentEntry
        projectId="project_1"
        initialMode="advanced"
        onCreativeStoryboardCreated={vi.fn()}
      />,
    );

    expect(html).toContain("Audience");
    expect(html).toContain("Style");
    expect(html).toContain("Seconds");
    expect(html).toContain("aria-pressed=\"true\"");
  });

  it("requires confirmation only when sending a new canvas draft over a prior import", () => {
    expect(requiresCreativeCanvasImportConfirmation(true, true)).toBe(true);
    expect(requiresCreativeCanvasImportConfirmation(true, false)).toBe(false);
    expect(requiresCreativeCanvasImportConfirmation(false, true)).toBe(false);
  });

  it("detects selected ImageNodes and image assets as story seed references", () => {
    expect(
      getImageNodeStorySeedCandidate(
        [
          {
            id: "image_1",
            projectId: "project_1",
            canvasDocumentId: "canvas_1",
            tldrawShapeId: "shape:image-1",
            type: "image",
            title: "Hero seed",
            x: 0,
            y: 0,
            width: 320,
            height: 220,
            zIndex: 1,
            status: "succeeded",
            dataJson: { assetId: "asset_seed_1" },
            createdAt: "2026-06-13T00:00:00.000Z",
            updatedAt: "2026-06-13T00:00:00.000Z",
          },
        ],
        "image_1",
      ),
    ).toEqual({
      nodeId: "image_1",
      assetId: "asset_seed_1",
      title: "Hero seed",
    });
    expect(
      isStorySeedAsset({
        id: "asset_seed_1",
        projectId: "project_1",
        type: "image",
        purpose: "uploaded",
        storageKey: "seed.png",
        mimeType: "image/png",
        createdAt: "2026-06-13T00:00:00.000Z",
        previewKind: "image",
        previewUrl: "/asset_seed_1",
      }),
    ).toBe(true);
  });
});
