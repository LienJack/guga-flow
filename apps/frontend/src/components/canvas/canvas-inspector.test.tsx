import type { CanvasEdgeRecord, CanvasNodeRecord } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CanvasInspector } from "./canvas-inspector";
import { deleteCanvasEdgeSelection } from "./canvas-edge-inspector";

vi.mock("../../lib/api", () => ({
  assetPreviewUrl: vi.fn((projectId: string, assetId: string) => `/assets/${projectId}/${assetId}`),
  deleteAsset: vi.fn(),
  deleteCanvasEdge: vi.fn(),
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

const characterNode: CanvasNodeRecord = {
  ...shotNode,
  id: "character_1",
  tldrawShapeId: "shape:character-1",
  type: "character_asset",
  title: "Ari",
  dataJson: { name: "Ari" },
};

const edge: CanvasEdgeRecord = {
  id: "edge_1",
  projectId: "project_1",
  canvasDocumentId: "canvas_1",
  sourceNodeId: "character_1",
  targetNodeId: "node_1",
  relation: "references_character",
  createdAt: "2026-06-12T00:00:00.000Z",
};

function renderInspector(input: {
  nodes?: CanvasNodeRecord[];
  edges?: CanvasEdgeRecord[];
  selection: Parameters<typeof CanvasInspector>[0]["selection"];
}) {
  return renderToStaticMarkup(
    <CanvasInspector
      edges={input.edges ?? []}
      projectId="project_1"
      nodes={input.nodes ?? []}
      selection={input.selection}
      onGraphUpdated={vi.fn()}
      onNodeUpdated={vi.fn()}
      onSelectionChange={vi.fn()}
    />,
  );
}

describe("CanvasInspector", () => {
  it("renders empty, multi, and unsupported selection states", () => {
    expect(renderInspector({ selection: { kind: "empty" } })).toContain("No selection");

    expect(renderInspector({ selection: { kind: "multi", count: 2 } })).toContain("2 objects");

    expect(
      renderInspector({ selection: { kind: "unsupported", shapeId: "shape:geo-1", shapeType: "geo" } }),
    ).toContain("geo");

    expect(
      renderInspector({ selection: { kind: "business-edge", edgeId: "edge_missing" } }),
    ).toContain("Edge unavailable");
  });

  it("renders the Shot form and keeps the asset library available", () => {
    const html = renderInspector({
      nodes: [shotNode],
      selection: { kind: "business-node", nodeId: shotNode.id },
    });

    expect(html).toContain("Shot");
    expect(html).toContain("Visual Description");
    expect(html).toContain("Wide shot of the launch platform.");
    expect(html).toContain("Assets");
  });

  it("renders Character prompt fields and node reference image controls", () => {
    const html = renderInspector({
      nodes: [
        {
          ...characterNode,
          dataJson: {
            name: "Ari",
            identityPrompt: "consistent Ari identity",
          },
        },
      ],
      selection: { kind: "business-node", nodeId: characterNode.id },
    });

    expect(html).toContain("Identity Prompt");
    expect(html).toContain("consistent Ari identity");
    expect(html).toContain("Reference images");
  });

  it("renders selected edge relation and endpoints while keeping assets available", () => {
    const html = renderInspector({
      nodes: [characterNode, shotNode],
      edges: [edge],
      selection: { kind: "business-edge", edgeId: edge.id },
    });

    expect(html).toContain("Character reference");
    expect(html).toContain("Ari");
    expect(html).toContain("Shot 001");
    expect(html).toContain("Delete");
    expect(html).toContain("Assets");
  });

  it("renders missing edge endpoints as recoverable labels", () => {
    const html = renderInspector({
      nodes: [characterNode],
      edges: [edge],
      selection: { kind: "business-edge", edgeId: edge.id },
    });

    expect(html).toContain("Ari");
    expect(html).toContain("Missing node");
  });

  it("merges graph state and clears selection after edge delete success", async () => {
    const onGraphUpdated = vi.fn();
    const onSelectionChange = vi.fn();
    const updatedShot = {
      ...shotNode,
      dataJson: {},
    };

    const graph = await deleteCanvasEdgeSelection({
      projectId: "project_1",
      edge,
      nodes: [characterNode, shotNode],
      edges: [edge],
      deleteEdge: vi.fn(async () => ({
        deleted: true as const,
        edgeId: edge.id,
        deletedEdgeIds: [edge.id],
        updatedNodes: [updatedShot],
      })),
      onGraphUpdated,
      onSelectionChange,
    });

    expect(graph.edges).toEqual([]);
    expect(graph.nodes).toContain(updatedShot);
    expect(onGraphUpdated).toHaveBeenCalledWith(graph);
    expect(onSelectionChange).toHaveBeenCalledWith({ kind: "empty" });
  });

  it("leaves graph callbacks untouched when edge delete fails", async () => {
    const onGraphUpdated = vi.fn();
    const onSelectionChange = vi.fn();

    await expect(
      deleteCanvasEdgeSelection({
        projectId: "project_1",
        edge,
        nodes: [characterNode, shotNode],
        edges: [edge],
        deleteEdge: vi.fn(async () => {
          throw new Error("offline");
        }),
        onGraphUpdated,
        onSelectionChange,
      }),
    ).rejects.toThrow("offline");

    expect(onGraphUpdated).not.toHaveBeenCalled();
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});
