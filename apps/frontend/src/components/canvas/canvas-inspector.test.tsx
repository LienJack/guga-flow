import type {
  CanvasEdgeRecord,
  CanvasNodeRecord,
  GenerationJobRecord,
  ProjectDetail,
} from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CanvasInspector } from "./canvas-inspector";
import { deleteCanvasEdgeSelection } from "./canvas-edge-inspector";

vi.mock("../../lib/api", () => ({
  assetPreviewUrl: vi.fn((projectId: string, assetId: string) => `/assets/${projectId}/${assetId}`),
  composeShotPrompt: vi.fn(),
  createBatchImagesToVideosJobs: vi.fn(),
  createBatchShotsToImagesJobs: vi.fn(),
  createCanvasEdge: vi.fn(),
  createCanvasNode: vi.fn(),
  createEditorExport: vi.fn(),
  createGenerationJob: vi.fn(),
  deleteAsset: vi.fn(),
  deleteCanvasEdge: vi.fn(),
  editorExportDownloadUrl: vi.fn((projectId: string, exportId: string) => `/exports/${projectId}/${exportId}.zip`),
  getAsset: vi.fn(),
  getImageProviderCatalog: vi.fn(async () => ({ providers: [] })),
  listAssets: vi.fn(async () => []),
  listEditorExports: vi.fn(async () => ({ exports: [] })),
  retryGenerationJob: vi.fn(),
  sendEditorExportToLocalEditor: vi.fn(),
  updateCanvasNode: vi.fn(),
  updateProject: vi.fn(),
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

const videoNode: CanvasNodeRecord = {
  ...shotNode,
  id: "video_1",
  tldrawShapeId: "shape:video-1",
  type: "video",
  title: "Shot 001 Video",
  dataJson: { assetId: "asset_video_1", durationSeconds: 5 },
};

const secondVideoNode: CanvasNodeRecord = {
  ...videoNode,
  id: "video_2",
  tldrawShapeId: "shape:video-2",
  title: "Shot 002 Video",
  dataJson: { assetId: "asset_video_2", durationSeconds: 4 },
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

const project: ProjectDetail = {
  id: "project_1",
  ownerUserId: "default-user",
  title: "Demo Project",
  defaultAspectRatio: "9:16",
  generationSettings: {
    visualStyle: "project cinematic noir",
    aspectRatio: "16:9",
    visualManual: {
      artStyle: "project rainy noir",
      palette: "cyan shadows and amber signals",
    },
    directorManual: {
      pacing: "project slow-burn",
      cameraLanguage: "project controlled push-ins",
    },
    subtitle: { status: "requested_unresolved", label: "Captions" },
    viralReference: { hook: "Manual safe hook", complianceNote: "Manual input only" },
    continuity: { mode: "match_cut", transitionPrompt: "Match flash to thunder" },
    talkingPhoto: {
      enabled: true,
      consentConfirmed: true,
      sourceAssetId: "asset_portrait_1",
      scriptPrompt: "Presenter teaser",
    },
    marketing: {
      cover: { label: "Episode cover" },
      callToAction: "Watch next",
    },
  },
  assetCount: 0,
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
};

function renderInspector(input: {
  nodes?: CanvasNodeRecord[];
  edges?: CanvasEdgeRecord[];
  generationJobs?: GenerationJobRecord[];
  project?: ProjectDetail | null;
  selection: Parameters<typeof CanvasInspector>[0]["selection"];
}) {
  return renderToStaticMarkup(
    <CanvasInspector
      edges={input.edges ?? []}
      projectId="project_1"
      project={input.project}
      nodes={input.nodes ?? []}
      generationJobs={input.generationJobs ?? []}
      selection={input.selection}
      onGraphUpdated={vi.fn()}
      onNodeUpdated={vi.fn()}
      onProjectUpdated={vi.fn()}
      onSelectionChange={vi.fn()}
    />,
  );
}

describe("CanvasInspector", () => {
  it("renders empty, multi, and unsupported selection states", () => {
    expect(renderInspector({ selection: { kind: "empty" } })).toContain("No selection");

    expect(renderInspector({ selection: { kind: "multi", count: 2, nodeIds: [] } })).toContain("2 objects");

    expect(
      renderInspector({ selection: { kind: "unsupported", shapeId: "shape:geo-1", shapeType: "geo" } }),
    ).toContain("geo");

    expect(
      renderInspector({ selection: { kind: "business-edge", edgeId: "edge_missing" } }),
    ).toContain("Edge unavailable");
  });

  it("renders a compact queue summary with failed job details", () => {
    const html = renderInspector({
      generationJobs: [
        generationJob("job_queued", "queued"),
        generationJob("job_running", "running"),
        generationJob("job_waiting", "provider_waiting"),
        generationJob("job_failed", "failed", "Provider timeout"),
      ],
      selection: { kind: "empty" },
    });

    expect(html).toContain("Queue summary");
    expect(html).toContain("Provider timeout");
    expect(html).toContain("shot_to_image");
    expect(html).toContain("Recent failures");
  });

  it("renders the Shot form and keeps the asset library available", () => {
    const html = renderInspector({
      project,
      nodes: [shotNode],
      selection: { kind: "business-node", nodeId: shotNode.id },
    });

    expect(html).toContain("Project defaults");
    expect(html).toContain("Shot");
    expect(html).toContain("Visual Description");
    expect(html).toContain("Wide shot of the launch platform.");
    expect(html).toContain("Shot overrides");
    expect(html).toContain("Prompt preview");
    expect(html).toContain("Generate Image");
    expect(html).toContain("Assets");
  });

  it("renders project generation defaults and Shot-level overrides", () => {
    const shotWithOverrides: CanvasNodeRecord = {
      ...shotNode,
      dataJson: {
        visualDescription: "Wide shot of the launch platform.",
        cameraMovement: "Slow push-in",
        generationSettings: {
          visualStyle: "shot rainy realism",
          visualManual: {
            lens: "shot long lens",
          },
          directorManual: {
            cameraLanguage: "shot surveillance angle",
          },
          bgm: { status: "absent" },
          continuity: { mode: "one_take", adjacentShotPrompt: "Continue the umbrella motion" },
          marketing: { poster: { label: "Shot poster" } },
        },
      },
    };
    const html = renderInspector({
      project,
      nodes: [shotWithOverrides],
      selection: { kind: "business-node", nodeId: shotWithOverrides.id },
    });

    expect(html).toContain("Project defaults");
    expect(html).toContain("project cinematic noir");
    expect(html).toContain("Visual manual");
    expect(html).toContain("project rainy noir");
    expect(html).toContain("cyan shadows and amber signals");
    expect(html).toContain("Director manual");
    expect(html).toContain("project slow-burn");
    expect(html).toContain("shot long lens");
    expect(html).toContain("shot surveillance angle");
    expect(html).toContain("Captions");
    expect(html).toContain("Shot overrides");
    expect(html).toContain("shot rainy realism");
    expect(html).toContain("BGM");
    expect(html).toContain("absent");
    expect(html).toContain("Manual safe hook");
    expect(html).toContain("Manual input only");
    expect(html).toContain("one_take");
    expect(html).toContain("Continue the umbrella motion");
    expect(html).toContain("asset_portrait_1");
    expect(html).toContain("Episode cover");
    expect(html).toContain("Shot poster");
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

  it("renders imported story event and lifecycle trace in the Inspector", () => {
    const tracedCharacter = {
      ...characterNode,
      dataJson: {
        name: "Ari",
        lifecycleStages: [
          {
            stageId: "stage_alert",
            label: "Alert",
            ageRange: "late 20s",
            costume: "dark utility coat",
            identityPrompt: "alert Ari stage identity",
          },
        ],
        locked: true,
        lockedFields: ["appearance", "identityPrompt"],
      },
    };
    const tracedShot = {
      ...shotNode,
      dataJson: {
        storyEvents: [
          {
            eventId: "event_opening",
            title: "Opening signal",
            summary: "Ari spots the hidden launch signal.",
            emotion: "urgent focus",
          },
        ],
        characterStageRefs: [{ characterTempId: "character_1", stageId: "stage_alert" }],
      },
    };
    const shotHtml = renderInspector({
      nodes: [tracedCharacter, tracedShot],
      selection: { kind: "business-node", nodeId: tracedShot.id },
    });
    const characterHtml = renderInspector({
      nodes: [tracedCharacter, tracedShot],
      selection: { kind: "business-node", nodeId: tracedCharacter.id },
    });

    expect(shotHtml).toContain("Story trace");
    expect(shotHtml).toContain("Opening signal");
    expect(shotHtml).toContain("Ari spots the hidden launch signal.");
    expect(shotHtml).toContain("Alert");
    expect(shotHtml).toContain("alert Ari stage identity");
    expect(characterHtml).toContain("Lifecycle");
    expect(characterHtml).toContain("Locked identity");
    expect(characterHtml).toContain("appearance, identityPrompt");
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

  it("renders editor export controls for selected VideoNodes", () => {
    const html = renderInspector({
      nodes: [videoNode, secondVideoNode],
      selection: { kind: "multi", count: 2, nodeIds: ["video_1", "video_2"] },
    });

    expect(html).toContain("Editor Export");
    expect(html).toContain("2 videos selected");
    expect(html).toContain("Queue Export");
    expect(html).toContain("Assets");
  });

  it("renders batch image controls for selected Shot nodes", () => {
    const secondShotNode = {
      ...shotNode,
      id: "node_2",
      tldrawShapeId: "shape:shot-2",
      title: "Shot 002",
    };
    const html = renderInspector({
      nodes: [shotNode, secondShotNode],
      selection: { kind: "multi", count: 2, nodeIds: ["node_1", "node_2"] },
    });

    expect(html).toContain("Batch Image");
    expect(html).toContain("2/2");
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

function generationJob(
  id: string,
  status: GenerationJobRecord["status"],
  errorMessage?: string,
): GenerationJobRecord {
  return {
    id,
    projectId: "project_1",
    operation: "shot_to_image",
    status,
    provider: "mock-image",
    sourceNodeId: "node_1",
    inputJson: {},
    errorMessage,
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
  };
}
