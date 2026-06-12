import type { CanvasNodeRecord } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CanvasInspector } from "./canvas-inspector";

vi.mock("../../lib/api", () => ({
  assetPreviewUrl: vi.fn((projectId: string, assetId: string) => `/assets/${projectId}/${assetId}`),
  deleteAsset: vi.fn(),
  getAsset: vi.fn(),
  listAssets: vi.fn(async () => []),
  updateCanvasNode: vi.fn(),
  uploadAsset: vi.fn(),
}));

const shotNode: CanvasNodeRecord = {
  id: "node_1",
  projectId: "project_1",
  canvasDocumentId: "canvas_1",
  tldrawShapeId: "shape:shot-1",
  type: "shot",
  title: "Shot 001",
  x: 10,
  y: 20,
  width: 360,
  height: 220,
  zIndex: 0,
  status: "draft",
  dataJson: {
    visualDescription: "Wide shot of the launch platform.",
    cameraMovement: "Slow push-in",
  },
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
};

describe("CanvasInspector", () => {
  it("renders empty, multi, and unsupported selection states", () => {
    expect(
      renderToStaticMarkup(
        <CanvasInspector
          projectId="project_1"
          nodes={[]}
          selection={{ kind: "empty" }}
          onNodeUpdated={vi.fn()}
        />,
      ),
    ).toContain("No selection");

    expect(
      renderToStaticMarkup(
        <CanvasInspector
          projectId="project_1"
          nodes={[]}
          selection={{ kind: "multi", count: 2 }}
          onNodeUpdated={vi.fn()}
        />,
      ),
    ).toContain("2 objects");

    expect(
      renderToStaticMarkup(
        <CanvasInspector
          projectId="project_1"
          nodes={[]}
          selection={{ kind: "unsupported", shapeId: "shape:geo-1", shapeType: "geo" }}
          onNodeUpdated={vi.fn()}
        />,
      ),
    ).toContain("geo");

    expect(
      renderToStaticMarkup(
        <CanvasInspector
          projectId="project_1"
          nodes={[]}
          selection={{ kind: "business-edge", edgeId: "edge_1" }}
          onNodeUpdated={vi.fn()}
        />,
      ),
    ).toContain("Semantic edge");
  });

  it("renders the Shot form and keeps the asset library available", () => {
    const html = renderToStaticMarkup(
      <CanvasInspector
        projectId="project_1"
        nodes={[shotNode]}
        selection={{ kind: "business-node", nodeId: shotNode.id }}
        onNodeUpdated={vi.fn()}
      />,
    );

    expect(html).toContain("Shot");
    expect(html).toContain("Visual Description");
    expect(html).toContain("Wide shot of the launch platform.");
    expect(html).toContain("Assets");
  });
});
