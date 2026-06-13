import type { CanvasNodeRecord } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  CanvasProductivityPanel,
  groupCanvasOutline,
  isEditableShortcutTarget,
  nodeSearchText,
  searchCanvasNodes,
} from "./canvas-productivity-panel";

describe("CanvasProductivityPanel", () => {
  it("searches title, type, metadata fields, and media identifiers", () => {
    const nodes = [
      node("shot_1", "shot", "Shot 001", {
        imagePrompt: "rain alley keyframe",
        characterAssetIds: ["character_ari"],
      }),
      node("image_1", "image", "Generated Image", {
        assetId: "asset_image_1",
        generatedFromNodeId: "shot_1",
      }),
      node("video_1", "video", "Clip", {
        assetId: "asset_video_1",
      }),
    ];

    expect(searchCanvasNodes(nodes, "rain ari").map((item) => item.id)).toEqual(["shot_1"]);
    expect(searchCanvasNodes(nodes, "asset_video_1").map((item) => item.id)).toEqual(["video_1"]);
    expect(nodeSearchText(nodes[1] ?? nodes[0])).toContain("generatedfromnodeid");
  });

  it("groups outline rows by production node type", () => {
    const groups = groupCanvasOutline([
      node("video_1", "video", "Clip"),
      node("shot_1", "shot", "Shot"),
      node("character_1", "character_asset", "Ari"),
    ]);

    expect(groups.map((group) => group.label)).toEqual(["Shots", "Characters", "Videos"]);
    expect(groups[0]?.nodes[0]?.id).toBe("shot_1");
  });

  it("renders search and outline controls", () => {
    const html = renderToStaticMarkup(
      <CanvasProductivityPanel
        nodes={[
          node("frame_1", "scene_frame", "Opening Frame"),
          node("shot_1", "shot", "Shot 001"),
        ]}
        selectedNodeId="shot_1"
        onFitToContent={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    );

    expect(html).toContain("Navigator");
    expect(html).toContain("Search nodes");
    expect(html).toContain("Scene Frames");
    expect(html).toContain("Shot 001");
    expect(html).toContain("canvas-outline-row active");
  });

  it("does not treat text-entry targets as shortcut-safe", () => {
    expect(isEditableShortcutTarget({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true);
    expect(isEditableShortcutTarget({ tagName: "textarea" } as unknown as EventTarget)).toBe(true);
    expect(
      isEditableShortcutTarget({ tagName: "div", isContentEditable: true } as unknown as EventTarget),
    ).toBe(true);
    expect(isEditableShortcutTarget({ tagName: "button" } as unknown as EventTarget)).toBe(false);
    expect(isEditableShortcutTarget(null)).toBe(false);
  });
});

function node(
  id: string,
  type: CanvasNodeRecord["type"],
  title: string,
  dataJson: Record<string, unknown> = {},
): CanvasNodeRecord {
  return {
    id,
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    tldrawShapeId: `shape:${id}`,
    type,
    title,
    x: id.includes("shot") ? 20 : 100,
    y: 0,
    width: 320,
    height: 220,
    zIndex: 0,
    status: "draft",
    dataJson,
    createdAt: "2026-06-13T00:00:00.000Z",
    updatedAt: "2026-06-13T00:00:00.000Z",
  };
}
