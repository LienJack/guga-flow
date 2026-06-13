import type { CanvasNodeRecord } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { AgentCanvasActionsPanel } from "./agent-canvas-actions-panel";

describe("AgentCanvasActionsPanel", () => {
  it("renders a compact agent action form with selected-node context", () => {
    const html = renderToStaticMarkup(
      <AgentCanvasActionsPanel
        nodes={[
          node("shot_1", "shot", "Rain reveal"),
          node("character_1", "character_asset", "Ari"),
        ]}
        projectId="project_1"
        selection={{ kind: "business-node", nodeId: "shot_1" }}
        onActionComplete={vi.fn()}
        onUndoComplete={vi.fn()}
      />,
    );

    expect(html).toContain("Agent");
    expect(html).toContain("Message");
    expect(html).toContain("Source");
    expect(html).toContain("Target");
    expect(html).toContain("create shot: rain reveal");
    expect(html).toContain("Rain reveal");
    expect(html).toContain("Run");
    expect(html).toContain("Memory");
    expect(html).toContain("Content");
    expect(html).toContain("Tags");
    expect(html).toContain("Add");
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
    x: 0,
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
