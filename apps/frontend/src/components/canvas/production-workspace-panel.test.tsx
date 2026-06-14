import type { CanvasNodeRecord, ProductionWorkspaceProjection } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { ProductionWorkspacePanel } from "./production-workspace-panel";

describe("ProductionWorkspacePanel", () => {
  it("renders script plan, storyboard rows, and editable item fields", () => {
    const html = renderToStaticMarkup(
      <ProductionWorkspacePanel
        initialWorkspace={workspace()}
        nodes={[node("shot_1", "shot", "Shot 001")]}
        projectId="project_1"
        selectedNodeId="shot_1"
        onItemUpdated={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    );

    expect(html).toContain("Production");
    expect(html).toContain("Signal Script");
    expect(html).toContain("1 shots across 1 scene containers");
    expect(html).toContain("Shot 001");
    expect(html).toContain("hero console image");
    expect(html).toContain("slow push toward console");
    expect(html).toContain("Save item");
  });
});

function workspace(): ProductionWorkspaceProjection {
  return {
    projectId: "project_1",
    scriptPlan: {
      scriptDraftId: "script_1",
      version: 2,
      title: "Signal Script",
      logline: "A hidden signal changes the plan.",
      strategy: "visual_first",
      sceneCount: 1,
      beatCount: 1,
      sourceEventIds: ["event_1"],
    },
    storyboardTable: [
      {
        itemId: "shot_1",
        shotNodeId: "shot_1",
        sceneNodeId: "scene_1",
        sceneTitle: "Control Room",
        shotNumber: "001",
        title: "Shot 001",
        summary: "Hero studies a blinking console.",
        durationSeconds: 4,
        imagePrompt: "hero console image",
        videoPrompt: "slow push toward console",
        status: "draft",
        storyEventIds: ["event_1"],
        referenceAssetIds: ["asset_ref_1"],
        sourceScriptDraftId: "script_1",
        updatedAt: "2026-06-14T00:00:00.000Z",
      },
    ],
    storyboardItems: [
      {
        itemId: "shot_1",
        shotNodeId: "shot_1",
        sceneNodeId: "scene_1",
        sceneTitle: "Control Room",
        title: "Shot 001",
        summary: "Hero studies a blinking console.",
        durationSeconds: 4,
        imagePrompt: "hero console image",
        videoPrompt: "slow push toward console",
        status: "draft",
        storyEventIds: ["event_1"],
        referenceAssetIds: ["asset_ref_1"],
        updatedAt: "2026-06-14T00:00:00.000Z",
      },
    ],
    assets: [],
    summary: {
      shotCount: 1,
      assetCount: 0,
      referenceAssetCount: 1,
      latestUpdatedAt: "2026-06-14T00:00:00.000Z",
      generationQueue: {
        counts: {
          queued: 0,
          running: 0,
          provider_waiting: 0,
          succeeded: 0,
          failed: 0,
          cancelled: 0,
        },
        queued: 0,
        running: 0,
        providerWaiting: 0,
        succeeded: 0,
        failed: 0,
        cancelled: 0,
      },
    },
    agentContext: {
      scriptPlanSummary: "Signal Script v2: 1 scenes, 1 beats, strategy visual_first.",
      storyboardTableSummary: "1 shots across 1 scene containers.",
      storyboardSummary: "Shot 001: Hero studies a blinking console.",
      assetSummary: "0 production assets, 0 visual variants.",
      generationSummary: "0 active generation jobs, 0 failed jobs.",
    },
  };
}

function node(id: string, type: CanvasNodeRecord["type"], title: string): CanvasNodeRecord {
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
    dataJson: {},
    createdAt: "2026-06-14T00:00:00.000Z",
    updatedAt: "2026-06-14T00:00:00.000Z",
  };
}
