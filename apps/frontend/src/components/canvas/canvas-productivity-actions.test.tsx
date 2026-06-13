import type { CanvasEdgeRecord, CanvasNodeRecord } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  buildSelectedShotMediaData,
  buildVariantCanvasNodeInput,
  CanvasProductivityActions,
  duplicateNodeAsVariant,
  findGeneratedMediaCandidates,
  toggleSceneFrameCollapsedData,
} from "./canvas-productivity-actions";

describe("CanvasProductivityActions", () => {
  it("builds collapsed SceneFrame data without losing fields", () => {
    expect(
      toggleSceneFrameCollapsedData({
        label: "Scene 1",
        order: 1,
        collapsed: false,
        shotNodeIds: ["shot_1"],
      }),
    ).toEqual({
      label: "Scene 1",
      order: 1,
      collapsed: true,
      shotNodeIds: ["shot_1"],
    });
  });

  it("discovers generated image and video candidates for a Shot", () => {
    const candidates = findGeneratedMediaCandidates(shotNode, [shotNode, imageNode, videoNode], [
      edge("edge_image", "shot_1", "image_1", "generated_image"),
      edge("edge_video", "image_1", "video_1", "generated_video"),
    ]);

    expect(candidates.images.map((node) => node.id)).toEqual(["image_1"]);
    expect(candidates.videos.map((node) => node.id)).toEqual(["video_1"]);
  });

  it("sets and clears preferred Shot media ids", () => {
    expect(
      buildSelectedShotMediaData({ imagePrompt: "frame" }, { selectedImageNodeId: "image_1" }),
    ).toMatchObject({
      imagePrompt: "frame",
      selectedImageNodeId: "image_1",
    });
    expect(
      buildSelectedShotMediaData(
        { imagePrompt: "frame", selectedImageNodeId: "image_1" },
        { selectedImageNodeId: undefined },
      ),
    ).toEqual({ imagePrompt: "frame" });
  });

  it("builds nearby variant node create inputs", () => {
    expect(
      buildVariantCanvasNodeInput(shotNode, {
        shapeId: "shape:variant-shot-1",
        offset: 40,
      }),
    ).toMatchObject({
      tldrawShapeId: "shape:variant-shot-1",
      type: "shot",
      title: "Shot 001 Variant",
      x: 50,
      y: 60,
      zIndex: 1,
      dataJson: {
        imagePrompt: "rain alley",
        variantOfNodeId: "shot_1",
      },
    });
  });

  it("duplicates a node and appends a derived-from edge", async () => {
    const createdVariant = {
      ...shotNode,
      id: "shot_variant",
      tldrawShapeId: "shape:variant-shot-1",
      title: "Shot 001 Variant",
      x: 46,
      y: 56,
    };
    const graph = await duplicateNodeAsVariant({
      projectId: "project_1",
      node: shotNode,
      nodes: [shotNode],
      edges: [],
      createNode: vi.fn(async () => ({ node: createdVariant })),
      createEdge: vi.fn(async () => ({
        edge: edge("edge_variant", "shot_1", "shot_variant", "derived_from"),
        edges: [edge("edge_variant", "shot_1", "shot_variant", "derived_from")],
        updatedNodes: [],
      })),
    });

    expect(graph.nodes.map((node) => node.id)).toEqual(["shot_1", "shot_variant"]);
    expect(graph.edges[0]?.relation).toBe("derived_from");
  });

  it("renders SceneFrame and Shot productivity controls", () => {
    const frameHtml = renderToStaticMarkup(
      <CanvasProductivityActions
        edges={[]}
        node={frameNode}
        nodes={[frameNode]}
        projectId="project_1"
        onGraphUpdated={vi.fn()}
        onNodeUpdated={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );
    const shotHtml = renderToStaticMarkup(
      <CanvasProductivityActions
        edges={[
          edge("edge_image", "shot_1", "image_1", "generated_image"),
          edge("edge_video", "image_1", "video_1", "generated_video"),
        ]}
        node={shotNode}
        nodes={[shotNode, imageNode, videoNode]}
        projectId="project_1"
        onGraphUpdated={vi.fn()}
        onNodeUpdated={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    expect(frameHtml).toContain("Collapse Frame");
    expect(frameHtml).toContain("Duplicate Variant");
    expect(shotHtml).toContain("Preferred Image");
    expect(shotHtml).toContain("Shot 001 Image");
    expect(shotHtml).toContain("Preferred Video");
    expect(shotHtml).toContain("Shot 001 Video");
  });
});

const shotNode = node("shot_1", "shot", "Shot 001", {
  imagePrompt: "rain alley",
});

const frameNode = node("frame_1", "scene_frame", "Frame 1", {
  label: "Frame 1",
  collapsed: false,
});

const imageNode = node("image_1", "image", "Shot 001 Image", {
  assetId: "asset_image_1",
  generatedFromNodeId: "shot_1",
});

const videoNode = node("video_1", "video", "Shot 001 Video", {
  assetId: "asset_video_1",
  generatedFromNodeId: "image_1",
});

function node(
  id: string,
  type: CanvasNodeRecord["type"],
  title: string,
  dataJson: Record<string, unknown>,
): CanvasNodeRecord {
  return {
    id,
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    tldrawShapeId: `shape:${id}`,
    type,
    title,
    x: 10,
    y: 20,
    width: 360,
    height: 220,
    zIndex: 0,
    status: "draft",
    dataJson,
    createdAt: "2026-06-13T00:00:00.000Z",
    updatedAt: "2026-06-13T00:00:00.000Z",
  };
}

function edge(
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
  relation: CanvasEdgeRecord["relation"],
): CanvasEdgeRecord {
  return {
    id,
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    sourceNodeId,
    targetNodeId,
    relation,
    createdAt: "2026-06-13T00:00:00.000Z",
  };
}
