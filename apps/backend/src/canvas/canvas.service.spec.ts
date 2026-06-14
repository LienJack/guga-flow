import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { StoryboardResult } from "@guga-flow/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaService } from "../prisma/prisma.service";
import { CanvasService } from "./canvas.service";

const createdAt = new Date("2026-06-12T00:00:00.000Z");
const updatedAt = new Date("2026-06-12T00:05:00.000Z");

function canvasDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: "canvas_1",
    projectId: "project_1",
    snapshotJson: {},
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function canvasNode(overrides: Record<string, unknown> = {}) {
  return {
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
    },
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function canvasEdge(overrides: Record<string, unknown> = {}) {
  return {
    id: "edge_1",
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    sourceNodeId: "character_1",
    targetNodeId: "shot_1",
    sourceShapeId: "shape:character-1",
    targetShapeId: "shape:shot-1",
    visualArrowShapeId: "shape:arrow-1",
    relation: "references_character",
    dataJson: null,
    createdAt,
    ...overrides,
  };
}

function asset(overrides: Record<string, unknown> = {}) {
  return {
    id: "asset_1",
    projectId: "project_1",
    type: "image",
    purpose: "uploaded",
    storageKey: "project_1/hero.png",
    mimeType: "image/png",
    originalFilename: "hero.png",
    sizeBytes: 1024,
    width: null,
    height: null,
    durationMs: null,
    metadataJson: null,
    createdAt,
    ...overrides,
  };
}

function storyboardDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: "draft_1",
    projectId: "project_1",
    novelDocumentId: "novel_1",
    status: "ready",
    storyboardJson: importStoryboard(),
    readyForImport: true,
    ...overrides,
  };
}

function generationJob(overrides: Record<string, unknown> = {}) {
  return {
    id: "job_1",
    projectId: "project_1",
    operation: "shot_to_image",
    status: "queued",
    provider: "mock-image",
    model: "mock-image-v1",
    sourceNodeId: "shot_1",
    targetNodeId: null,
    providerTaskId: null,
    inputJson: {},
    outputJson: null,
    errorMessage: null,
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function scriptDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: "script_1",
    projectId: "project_1",
    novelDocumentId: "novel_1",
    version: 2,
    title: "Signal Script",
    strategy: "visual_first",
    status: "draft",
    scriptJson: {
      storySkeleton: {
        title: "Signal Script",
        logline: "A hidden signal changes the plan.",
        sourceChapterIndexes: [1],
        sourceEventIds: ["event_1"],
        beats: [
          {
            beatId: "beat_1",
            orderIndex: 1,
            title: "Signal",
            summary: "The hero finds the signal.",
            eventIds: ["event_1"],
          },
        ],
      },
      adaptationStrategy: {
        strategy: "visual_first",
        summary: "Prioritize readable visual beats.",
        targetFormat: "short drama",
        revisionNotes: "Keep the signal visible.",
      },
      script: {
        title: "Signal Script",
        logline: "A hidden signal changes the plan.",
        strategy: "visual_first",
        scenes: [
          {
            sceneId: "scene_script_1",
            orderIndex: 1,
            title: "Control Room",
            summary: "The hero enters.",
            beats: [],
          },
        ],
      },
    },
    createdAt,
    updatedAt,
    ...overrides,
  };
}

type MockAsset = ReturnType<typeof asset>;
type MockCanvasEdge = ReturnType<typeof canvasEdge>;
type MockCanvasNode = ReturnType<typeof canvasNode>;
type MockFindArgs = { where: Record<string, unknown> };
type MockUpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type MockCreateArgs = { data: Record<string, unknown> };

function recordMatchesWhere(record: Record<string, unknown>, where: Record<string, unknown> = {}): boolean {
  return Object.entries(where).every(([key, expected]) => {
    if (expected && typeof expected === "object" && !Array.isArray(expected) && "in" in expected) {
      const values = (expected as { in?: unknown[] }).in ?? [];
      return values.includes(record[key]);
    }
    return record[key] === expected;
  });
}

function installCanvasGraphMocks(
  prisma: ReturnType<typeof createPrismaMock>,
  initialNodes: MockCanvasNode[],
  initialEdges: MockCanvasEdge[] = [],
) {
  const nodes = [...initialNodes];
  const edges = [...initialEdges];
  let nodeSequence = 1;
  let edgeSequence = 1;

  prisma.canvasDocument.upsert.mockResolvedValue(canvasDocument());
  prisma.canvasNode.findMany.mockImplementation(async (args?: MockFindArgs) =>
    nodes.filter((node) => recordMatchesWhere(node, args?.where)),
  );
  prisma.canvasNode.findFirst.mockImplementation(async (args: MockFindArgs) =>
    nodes.find((node) => recordMatchesWhere(node, args.where)) ?? null,
  );
  prisma.canvasNode.create.mockImplementation(async ({ data }: MockCreateArgs) => {
    const node = canvasNode({
      id: `created_node_${nodeSequence++}`,
      ...data,
    });
    nodes.push(node);
    return node;
  });
  prisma.canvasNode.update.mockImplementation(async ({ where, data }: MockUpdateArgs) => {
    const index = nodes.findIndex((node) => node.id === where.id);
    const updated = canvasNode({
      ...(index >= 0 ? nodes[index] : { id: where.id }),
      ...data,
    });
    if (index >= 0) {
      nodes[index] = updated;
    } else {
      nodes.push(updated);
    }
    return updated;
  });
  prisma.canvasNode.delete.mockImplementation(async ({ where }: { where: { id: string } }) => {
    const index = nodes.findIndex((node) => node.id === where.id);
    const deleted = nodes[index] ?? canvasNode({ id: where.id });
    if (index >= 0) {
      nodes.splice(index, 1);
    }
    return deleted;
  });
  prisma.canvasEdge.findMany.mockImplementation(async (args?: MockFindArgs) =>
    edges.filter((edge) => recordMatchesWhere(edge, args?.where)),
  );
  prisma.canvasEdge.create.mockImplementation(async ({ data }: MockCreateArgs) => {
    const edge = canvasEdge({
      id: `created_edge_${edgeSequence++}`,
      ...data,
    });
    edges.push(edge);
    return edge;
  });
  prisma.canvasEdge.deleteMany.mockImplementation(async ({ where }: MockFindArgs) => {
    const deleted = edges.filter((edge) => recordMatchesWhere(edge, where));
    for (const edge of deleted) {
      const index = edges.findIndex((candidate) => candidate.id === edge.id);
      if (index >= 0) {
        edges.splice(index, 1);
      }
    }
    return { count: deleted.length };
  });

  return { nodes, edges };
}

function createPrismaMock() {
  const prisma = {
    project: {
      findUnique: vi.fn(async (): Promise<{ id: string } | null> => ({ id: "project_1" })),
    },
    canvasDocument: {
      upsert: vi.fn(),
    },
    canvasNode: {
      findMany: vi.fn(async (_args?: MockFindArgs): Promise<MockCanvasNode[]> => []),
      findFirst: vi.fn(async (_args: MockFindArgs): Promise<MockCanvasNode | null> => null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    canvasEdge: {
      findMany: vi.fn(async (_args?: MockFindArgs): Promise<MockCanvasEdge[]> => []),
      findFirst: vi.fn(async (_args: MockFindArgs): Promise<MockCanvasEdge | null> => null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    storyboardDraft: {
      findFirst: vi.fn(async (_args: MockFindArgs): Promise<ReturnType<typeof storyboardDraft> | null> => null),
    },
    scriptDraft: {
      findFirst: vi.fn(async (_args: MockFindArgs): Promise<ReturnType<typeof scriptDraft> | null> => null),
    },
    generationJob: {
      findMany: vi.fn(async (_args?: MockFindArgs): Promise<Array<ReturnType<typeof generationJob>>> => []),
    },
    asset: {
      findMany: vi.fn(async (): Promise<MockAsset[]> => []),
      delete: vi.fn(),
    },
  };

  return {
    ...prisma,
    $transaction: vi.fn(async <T>(callback: (tx: typeof prisma) => Promise<T>) =>
      callback(prisma),
    ),
  };
}

describe("CanvasService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: CanvasService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new CanvasService(prisma as unknown as PrismaService);
  });

  it("creates a project-scoped canvas document on first load", async () => {
    prisma.canvasDocument.upsert.mockResolvedValue(canvasDocument());

    const result = await service.getCanvas("project_1");

    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: "project_1" },
      select: { id: true },
    });
    expect(prisma.canvasDocument.upsert).toHaveBeenCalledWith({
      where: { projectId: "project_1" },
      update: {},
      create: { projectId: "project_1" },
    });
    expect(result.canvasDocument).toMatchObject({
      id: "canvas_1",
      projectId: "project_1",
      snapshotJson: {},
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    });
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.assets).toEqual([]);
  });

  it("projects a production workspace from script, canvas, assets, and jobs", async () => {
    prisma.canvasDocument.upsert.mockResolvedValue(canvasDocument());
    prisma.canvasNode.findMany.mockResolvedValue([
      canvasNode({
        id: "scene_1",
        type: "scene",
        title: "Control Room",
        dataJson: { synopsis: "Screens glow." },
        updatedAt,
      }),
      canvasNode({
        id: "shot_1",
        type: "shot",
        title: "Shot 001",
        dataJson: {
          shotNumber: "001",
          storyboardOrder: 1,
          visualDescription: "Hero studies a blinking console.",
          action: "Hero finds the signal.",
          imagePrompt: "hero console image",
          videoPrompt: "slow push toward console",
          durationSeconds: 4,
          storyEventIds: ["event_1"],
          referenceAssetIds: ["asset_ref_1"],
          selectedImageNodeId: "image_1",
          selectedVideoNodeId: "video_1",
        },
        updatedAt,
      }),
      canvasNode({
        id: "image_1",
        type: "image",
        title: "Shot 001 image",
        dataJson: { assetId: "asset_image_1" },
        updatedAt,
      }),
      canvasNode({
        id: "video_1",
        type: "video",
        title: "Shot 001 video",
        dataJson: { assetId: "asset_video_1" },
        updatedAt,
      }),
      canvasNode({
        id: "character_1",
        type: "character_asset",
        title: "Hero",
        dataJson: {
          name: "Hero",
          referenceAssetIds: ["asset_ref_1"],
          assetVariants: [{ variantId: "hero_v1", status: "selected", assetId: "asset_variant_1" }],
          scriptAssetSource: { scriptDraftId: "script_1" },
        },
        updatedAt,
      }),
    ]);
    prisma.canvasEdge.findMany.mockResolvedValue([
      canvasEdge({
        id: "edge_scene",
        sourceNodeId: "shot_1",
        targetNodeId: "scene_1",
        relation: "belongs_to_scene",
      }),
    ]);
    prisma.asset.findMany.mockResolvedValue([asset({ id: "asset_ref_1" })]);
    prisma.generationJob.findMany.mockResolvedValue([generationJob()]);
    prisma.scriptDraft.findFirst.mockResolvedValue(scriptDraft());

    const result = await service.getProductionWorkspace("project_1");

    expect(result.scriptPlan).toMatchObject({
      scriptDraftId: "script_1",
      title: "Signal Script",
      sceneCount: 1,
      beatCount: 1,
      sourceEventIds: ["event_1"],
    });
    expect(result.storyboardTable[0]).toMatchObject({
      shotNodeId: "shot_1",
      sceneNodeId: "scene_1",
      orderIndex: 1,
      title: "Shot 001",
      imagePrompt: "hero console image",
      imageNodeId: "image_1",
      videoNodeId: "video_1",
      sourceScriptDraftId: "script_1",
    });
    expect(result.videoTracks[0]).toMatchObject({
      trackId: "shot_1",
      selectedVideoNodeId: "video_1",
      candidates: [
        expect.objectContaining({
          videoNodeId: "video_1",
          isSelected: true,
          videoAssetId: "asset_video_1",
        }),
      ],
    });
    expect(result.assets[0]).toMatchObject({
      nodeId: "character_1",
      variantCount: 1,
      referenceAssetIds: ["asset_ref_1", "asset_variant_1"],
    });
    expect(result.summary.generationQueue.queued).toBe(1);
    expect(result.agentContext.storyboardTableSummary).toContain("1 shots");
  });

  it("updates production storyboard items by writing back to Shot node data", async () => {
    prisma.canvasDocument.upsert.mockResolvedValue(canvasDocument());
    const existing = canvasNode({
      id: "shot_1",
      type: "shot",
      title: "Shot 001",
      dataJson: {
        visualDescription: "Old summary",
        imagePrompt: "old image",
        videoPrompt: "old video",
        durationSeconds: 4,
      },
    });
    const updated = canvasNode({
      ...existing,
      title: "Shot 001 revised",
      dataJson: {
        visualDescription: "New summary",
        imagePrompt: "new image",
        videoPrompt: "new video",
        durationSeconds: 6,
      },
    });
    prisma.canvasNode.findFirst.mockResolvedValue(existing);
    prisma.canvasNode.update.mockResolvedValue(updated);
    prisma.canvasNode.findMany.mockResolvedValue([updated]);

    const result = await service.updateProductionWorkspaceItem("project_1", "shot_1", {
      itemType: "storyboard_item",
      title: "Shot 001 revised",
      summary: "New summary",
      imagePrompt: "new image",
      videoPrompt: "new video",
      durationSeconds: 6,
    });

    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "shot_1" },
      data: {
        title: "Shot 001 revised",
        dataJson: {
          visualDescription: "New summary",
          imagePrompt: "new image",
          videoPrompt: "new video",
          durationSeconds: 6,
        },
      },
    });
    expect(result.updatedNode.title).toBe("Shot 001 revised");
    expect(result.workspace.storyboardItems[0]?.summary).toBe("New summary");
  });

  it("creates production storyboard items and rebuilds sequence edges", async () => {
    installCanvasGraphMocks(prisma, [
      canvasNode({
        id: "shot_1",
        title: "Shot 001",
        dataJson: { storyboardOrder: 1, shotNumber: "001", visualDescription: "Opening shot" },
      }),
    ]);

    const result = await service.createProductionStoryboardItems("project_1", {
      count: 2,
      titlePrefix: "Panel",
    });

    expect(prisma.canvasNode.create).toHaveBeenCalledTimes(2);
    expect(prisma.canvasEdge.deleteMany).toHaveBeenCalledWith({
      where: { projectId: "project_1", canvasDocumentId: "canvas_1", relation: "sequence_next" },
    });
    expect(prisma.canvasEdge.create).toHaveBeenCalledTimes(2);
    expect(result.focusNodeId).toBe("created_node_1");
    expect(result.nodes.map((node) => node.dataJson)).toEqual([
      expect.objectContaining({ storyboardOrder: 1, shotNumber: "001" }),
      expect.objectContaining({ storyboardOrder: 2, shotNumber: "002" }),
      expect.objectContaining({ storyboardOrder: 3, shotNumber: "003" }),
    ]);
    expect(result.workspace.storyboardItems.map((item) => item.orderIndex)).toEqual([1, 2, 3]);
  });

  it("reorders production storyboard items and keeps sequence_next edges in sync", async () => {
    installCanvasGraphMocks(prisma, [
      canvasNode({
        id: "shot_1",
        title: "Shot 001",
        dataJson: { storyboardOrder: 1, shotNumber: "001", visualDescription: "First" },
      }),
      canvasNode({
        id: "shot_2",
        title: "Shot 002",
        dataJson: { storyboardOrder: 2, shotNumber: "002", visualDescription: "Second" },
        zIndex: 1,
      }),
      canvasNode({
        id: "shot_3",
        title: "Shot 003",
        dataJson: { storyboardOrder: 3, shotNumber: "003", visualDescription: "Third" },
        zIndex: 2,
      }),
    ]);

    const result = await service.reorderProductionStoryboardItems("project_1", {
      itemIds: ["shot_2", "shot_1", "shot_3"],
    });

    expect(result.nodes.map((node) => [node.id, node.dataJson])).toEqual([
      ["shot_2", expect.objectContaining({ storyboardOrder: 1, shotNumber: "001" })],
      ["shot_1", expect.objectContaining({ storyboardOrder: 2, shotNumber: "002" })],
      ["shot_3", expect.objectContaining({ storyboardOrder: 3, shotNumber: "003" })],
    ]);
    expect(result.edges).toEqual([
      expect.objectContaining({
        sourceNodeId: "shot_2",
        targetNodeId: "shot_1",
        relation: "sequence_next",
        dataJson: expect.objectContaining({ orderIndex: 1 }),
      }),
      expect.objectContaining({
        sourceNodeId: "shot_1",
        targetNodeId: "shot_3",
        relation: "sequence_next",
        dataJson: expect.objectContaining({ orderIndex: 2 }),
      }),
    ]);
  });

  it("deletes production storyboard items and resequences remaining shots", async () => {
    installCanvasGraphMocks(prisma, [
      canvasNode({
        id: "shot_1",
        title: "Shot 001",
        dataJson: { storyboardOrder: 1, shotNumber: "001", visualDescription: "First" },
      }),
      canvasNode({
        id: "shot_2",
        title: "Shot 002",
        dataJson: { storyboardOrder: 2, shotNumber: "002", visualDescription: "Second" },
        zIndex: 1,
      }),
      canvasNode({
        id: "shot_3",
        title: "Shot 003",
        dataJson: { storyboardOrder: 3, shotNumber: "003", visualDescription: "Third" },
        zIndex: 2,
      }),
    ]);

    const result = await service.deleteProductionStoryboardItems("project_1", {
      itemIds: ["shot_2", "shot_3"],
    });

    expect(prisma.canvasNode.delete).toHaveBeenCalledTimes(2);
    expect(result.deletedNodeIds).toEqual(["shot_2", "shot_3"]);
    expect(result.nodes).toEqual([
      expect.objectContaining({
        id: "shot_1",
        dataJson: expect.objectContaining({ storyboardOrder: 1, shotNumber: "001" }),
      }),
    ]);
    expect(result.edges).toEqual([]);
    expect(result.workspace.storyboardItems).toHaveLength(1);
  });

  it("creates storyboard media board nodes from production storyboard items", async () => {
    installCanvasGraphMocks(prisma, [
      canvasNode({
        id: "shot_1",
        title: "Shot 001",
        dataJson: {
          storyboardOrder: 1,
          shotNumber: "001",
          visualDescription: "Hero studies a blinking console.",
          selectedImageNodeId: "image_1",
          selectedVideoNodeId: "video_1",
        },
      }),
      canvasNode({
        id: "image_1",
        type: "image",
        title: "Image 001",
        dataJson: { assetId: "asset_image_1" },
      }),
      canvasNode({
        id: "video_1",
        type: "video",
        title: "Video 001",
        dataJson: { assetId: "asset_video_1" },
      }),
    ]);

    const result = await service.createStoryboardMediaBoard("project_1", {
      itemIds: ["shot_1"],
      title: "Board A",
      columns: 3,
    });

    expect(result.boardNode).toMatchObject({
      type: "scene_frame",
      title: "Board A",
      dataJson: expect.objectContaining({
        storyboardBoard: expect.objectContaining({
          title: "Board A",
          columns: 3,
          items: [
            expect.objectContaining({
              orderIndex: 1,
              shotNodeId: "shot_1",
              imageNodeId: "image_1",
              videoNodeId: "video_1",
              assetId: "asset_video_1",
            }),
          ],
        }),
      }),
    });
    expect(result.focusNodeId).toBe(result.boardNode.id);
  });

  it("selects primary videos for production tracks", async () => {
    installCanvasGraphMocks(prisma, [
      canvasNode({
        id: "shot_1",
        type: "shot",
        title: "Shot 001",
        dataJson: { storyboardOrder: 1, shotNumber: "001", videoPrompt: "slow push" },
      }),
      canvasNode({
        id: "video_1",
        type: "video",
        title: "Video A",
        dataJson: { assetId: "asset_video_1", generatedFromNodeId: "shot_1", durationSeconds: 5 },
      }),
    ]);

    const result = await service.selectProductionTrackVideo("project_1", "shot_1", {
      videoNodeId: "video_1",
    });

    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "shot_1" },
      data: {
        dataJson: {
          storyboardOrder: 1,
          shotNumber: "001",
          videoPrompt: "slow push",
          selectedVideoNodeId: "video_1",
        },
      },
    });
    expect(result.updatedNode.dataJson).toMatchObject({ selectedVideoNodeId: "video_1" });
    expect(result.workspace.videoTracks[0]).toMatchObject({
      trackId: "shot_1",
      selectedVideoNodeId: "video_1",
    });
  });

  it("creates MediaClip editor package nodes from selected video tracks", async () => {
    installCanvasGraphMocks(
      prisma,
      [
        canvasNode({
          id: "shot_1",
          type: "shot",
          title: "Shot 001",
          dataJson: {
            storyboardOrder: 1,
            shotNumber: "001",
            selectedVideoNodeId: "video_1",
          },
        }),
        canvasNode({
          id: "video_1",
          type: "video",
          title: "Video A",
          dataJson: {
            assetId: "asset_video_1",
            generatedFromNodeId: "shot_1",
            durationSeconds: 5,
            audioReferences: [{ assetId: "asset_audio_1", role: "bgm", label: "Cue" }],
          },
        }),
      ],
      [
        canvasEdge({
          id: "edge_video_1",
          sourceNodeId: "shot_1",
          targetNodeId: "video_1",
          relation: "generated_video",
        }),
      ],
    );

    const result = await service.createProductionMediaClip("project_1", {
      trackIds: ["shot_1"],
      title: "Clip A",
      trimStartMs: 100,
      trimEndMs: 4500,
    });

    expect(result.mediaClipNode).toMatchObject({
      type: "editor_package",
      title: "Clip A",
      dataJson: expect.objectContaining({
        format: "media_clip",
        selectedVideoNodeIds: ["video_1"],
        mediaClip: expect.objectContaining({
          selectedVideoNodeIds: ["video_1"],
          shotNodeIds: ["shot_1"],
          segments: [
            expect.objectContaining({
              sourceNodeId: "video_1",
              assetId: "asset_video_1",
              durationMs: 5000,
              trimStartMs: 100,
              trimEndMs: 4500,
            }),
          ],
          audioReferences: [expect.objectContaining({ assetId: "asset_audio_1" })],
        }),
      }),
    });
    expect(result.edges).toContainEqual(
      expect.objectContaining({
        sourceNodeId: "video_1",
        targetNodeId: result.mediaClipNode.id,
        relation: "sent_to_editor",
      }),
    );
  });

  it("saves snapshots and returns the updated canvas document", async () => {
    const snapshotJson = { document: { records: [] }, session: { camera: { x: 0, y: 0, z: 1 } } };
    prisma.canvasDocument.upsert.mockResolvedValue(
      canvasDocument({
        snapshotJson,
      }),
    );

    const result = await service.saveSnapshot("project_1", { snapshotJson });

    expect(prisma.canvasDocument.upsert).toHaveBeenCalledWith({
      where: { projectId: "project_1" },
      update: { snapshotJson },
      create: { projectId: "project_1", snapshotJson },
    });
    expect(result.canvasDocument.snapshotJson).toEqual(snapshotJson);
  });

  it("creates project-scoped business canvas nodes", async () => {
    const dataJson = {
      visualDescription: "Wide shot of the launch platform.",
      cameraMovement: "Slow push-in",
    };
    prisma.canvasDocument.upsert.mockResolvedValue(canvasDocument());
    prisma.canvasNode.create.mockResolvedValue(
      canvasNode({
        dataJson,
      }),
    );

    const result = await service.createNode("project_1", {
      tldrawShapeId: "shape:shot-1",
      type: "shot",
      title: " Shot 001 ",
      x: 10,
      y: 20,
      width: 360,
      height: 220,
      dataJson,
    });

    expect(prisma.canvasDocument.upsert).toHaveBeenCalledWith({
      where: { projectId: "project_1" },
      update: {},
      create: { projectId: "project_1" },
    });
    expect(prisma.canvasNode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
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
        dataJson,
      }),
    });
    expect(result.node.dataJson).toEqual(dataJson);
  });

  it("creates Asset-backed source media canvas nodes", async () => {
    const dataJson = {
      assetId: "asset_image_1",
      mimeType: "image/png",
      originalFilename: "reference.png",
      sizeBytes: 2048,
      width: 1080,
      height: 1920,
      source: "asset",
      importMethod: "drag_drop",
      previewKind: "image",
      previewUrl: "/api/v1/projects/project_1/assets/asset_image_1/preview",
    };
    prisma.canvasDocument.upsert.mockResolvedValue(canvasDocument());
    prisma.canvasNode.create.mockResolvedValue(
      canvasNode({
        id: "source_image_1",
        tldrawShapeId: "shape:source-image-1",
        type: "source_image",
        title: "reference.png",
        dataJson,
      }),
    );

    const result = await service.createNode("project_1", {
      tldrawShapeId: "shape:source-image-1",
      type: "source_image",
      title: "reference.png",
      x: 24,
      y: 48,
      width: 320,
      height: 220,
      dataJson,
    });

    expect(prisma.canvasNode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        canvasDocumentId: "canvas_1",
        tldrawShapeId: "shape:source-image-1",
        type: "source_image",
        title: "reference.png",
        x: 24,
        y: 48,
        width: 320,
        height: 220,
        status: "draft",
        dataJson,
      }),
    });
    expect(result.node.type).toBe("source_image");
    expect(result.node.dataJson).toEqual(dataJson);
  });

  it("updates business fields for project-scoped canvas nodes", async () => {
    const dataJson = {
      visualDescription: "Closer shot with brighter practical lights.",
      action: "Ari tightens the cable.",
    };
    prisma.canvasNode.findFirst.mockResolvedValue(canvasNode());
    prisma.canvasNode.update.mockResolvedValue(
      canvasNode({
        title: "Shot 001A",
        status: "succeeded",
        dataJson,
      }),
    );

    const result = await service.updateNode("project_1", "node_1", {
      title: "Shot 001A",
      status: "succeeded",
      dataJson,
    });

    expect(prisma.canvasNode.findFirst).toHaveBeenCalledWith({
      where: { id: "node_1", projectId: "project_1" },
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "node_1" },
      data: {
        title: "Shot 001A",
        status: "succeeded",
        dataJson,
      },
    });
    expect(result.node.title).toBe("Shot 001A");
    expect(result.node.dataJson).toEqual(dataJson);
  });

  it("updates business node geometry and validates finite positive dimensions", async () => {
    prisma.canvasNode.findFirst.mockResolvedValue(canvasNode());
    prisma.canvasNode.update.mockResolvedValue(
      canvasNode({
        x: 100,
        y: 120,
        width: 400,
        height: 260,
        zIndex: 4,
      }),
    );

    const result = await service.updateNodeGeometry("project_1", "node_1", {
      x: 100,
      y: 120,
      width: 400,
      height: 260,
      zIndex: 4,
    });

    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "node_1" },
      data: {
        x: 100,
        y: 120,
        width: 400,
        height: 260,
        zIndex: 4,
      },
    });
    expect(result.node).toMatchObject({ x: 100, y: 120, width: 400, height: 260 });

    await expect(
      service.updateNodeGeometry("project_1", "node_1", {
        x: 0,
        y: 0,
        width: 0,
        height: 220,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("deletes business nodes without deleting unrelated assets", async () => {
    prisma.canvasNode.findFirst.mockResolvedValue(canvasNode());
    prisma.canvasNode.delete.mockResolvedValue(canvasNode());

    const result = await service.deleteNode("project_1", "node_1");

    expect(prisma.canvasNode.delete).toHaveBeenCalledWith({ where: { id: "node_1" } });
    expect(prisma.asset.delete).not.toHaveBeenCalled();
    expect(result).toEqual({ deleted: true, nodeId: "node_1" });
  });

  it("creates character reference edges and syncs shot data", async () => {
    const characterNode = canvasNode({
      id: "character_1",
      tldrawShapeId: "shape:character-1",
      type: "character_asset",
      title: "Ari",
      dataJson: { name: "Ari" },
    });
    const shotNode = canvasNode({
      id: "shot_1",
      dataJson: { visualDescription: "Wide shot of the launch platform." },
    });
    prisma.canvasNode.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === "character_1") {
        return characterNode;
      }
      if (where.id === "shot_1") {
        return shotNode;
      }
      return null;
    });
    prisma.canvasEdge.create.mockResolvedValue(
      canvasEdge({
        id: "edge_1",
        sourceNodeId: "character_1",
        targetNodeId: "shot_1",
        relation: "references_character",
      }),
    );
    prisma.canvasNode.update.mockResolvedValue(
      canvasNode({
        id: "shot_1",
        dataJson: {
          visualDescription: "Wide shot of the launch platform.",
          characterAssetIds: ["character_1"],
        },
      }),
    );

    const result = await service.createEdge("project_1", {
      sourceNodeId: "character_1",
      targetNodeId: "shot_1",
      relation: "references_character",
      sourceShapeId: "shape:character-1",
      targetShapeId: "shape:shot-1",
      visualArrowShapeId: "shape:arrow-1",
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.canvasEdge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        canvasDocumentId: "canvas_1",
        sourceNodeId: "character_1",
        targetNodeId: "shot_1",
        relation: "references_character",
      }),
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "shot_1" },
      data: {
        dataJson: {
          visualDescription: "Wide shot of the launch platform.",
          characterAssetIds: ["character_1"],
        },
      },
    });
    expect(result.edge.relation).toBe("references_character");
    expect(result.updatedNodes[0]?.dataJson).toMatchObject({
      characterAssetIds: ["character_1"],
    });
  });

  it("reuses existing semantic edges instead of duplicating them", async () => {
    const characterNode = canvasNode({
      id: "character_1",
      tldrawShapeId: "shape:character-1",
      type: "character_asset",
    });
    const shotNode = canvasNode({
      id: "shot_1",
      dataJson: { characterAssetIds: ["character_1"] },
    });
    prisma.canvasNode.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === "character_1") {
        return characterNode;
      }
      if (where.id === "shot_1") {
        return shotNode;
      }
      return null;
    });
    prisma.canvasEdge.findFirst.mockResolvedValue(canvasEdge({ id: "edge_existing" }));
    prisma.canvasEdge.update.mockResolvedValue(canvasEdge({ id: "edge_existing" }));
    prisma.canvasNode.update.mockResolvedValue(shotNode);

    const result = await service.createEdge("project_1", {
      sourceNodeId: "character_1",
      targetNodeId: "shot_1",
      relation: "references_character",
    });

    expect(prisma.canvasEdge.create).not.toHaveBeenCalled();
    expect(prisma.canvasEdge.update).toHaveBeenCalledWith({
      where: { id: "edge_existing" },
      data: expect.objectContaining({
        sourceShapeId: "shape:character-1",
        targetShapeId: "shape:shot-1",
      }),
    });
    expect(result.edge.id).toBe("edge_existing");
  });

  it("creates scene-frame location batch edges and syncs affected shots", async () => {
    const locationNode = canvasNode({
      id: "location_1",
      tldrawShapeId: "shape:location-1",
      type: "location_asset",
      dataJson: { name: "Launch Site" },
    });
    const sceneFrameNode = canvasNode({
      id: "frame_1",
      tldrawShapeId: "shape:frame-1",
      type: "scene_frame",
      dataJson: { label: "Scene 1" },
    });
    const shotOne = canvasNode({
      id: "shot_1",
      tldrawShapeId: "shape:shot-1",
      dataJson: { visualDescription: "Wide shot" },
    });
    const shotTwo = canvasNode({
      id: "shot_2",
      tldrawShapeId: "shape:shot-2",
      dataJson: { visualDescription: "Close shot" },
    });
    let edgeSequence = 1;
    prisma.canvasNode.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === "location_1") {
        return locationNode;
      }
      if (where.id === "frame_1") {
        return sceneFrameNode;
      }
      return null;
    });
    prisma.canvasNode.findMany.mockResolvedValue([shotOne, shotTwo]);
    prisma.canvasEdge.create.mockImplementation(async ({ data }: MockCreateArgs) =>
      canvasEdge({
        id: `edge_${edgeSequence++}`,
        ...data,
      }),
    );
    prisma.canvasEdge.update.mockImplementation(async ({ where, data }: MockUpdateArgs) =>
      canvasEdge({
        id: where.id,
        sourceNodeId: "location_1",
        targetNodeId: "frame_1",
        relation: "references_location",
        dataJson: data.dataJson,
      }),
    );
    prisma.canvasNode.update.mockImplementation(async ({ where, data }: MockUpdateArgs) =>
      canvasNode({
        id: where.id,
        dataJson: data.dataJson,
      }),
    );

    const result = await service.createEdge("project_1", {
      sourceNodeId: "location_1",
      targetNodeId: "frame_1",
      relation: "references_location",
      sourceShapeId: "shape:location-1",
      targetShapeId: "shape:frame-1",
      visualArrowShapeId: "shape:arrow-location-frame",
      affectedShotNodeIds: ["shot_1", "shot_2"],
    });

    expect(prisma.canvasEdge.create).toHaveBeenCalledTimes(3);
    expect(prisma.canvasEdge.update).toHaveBeenCalledWith({
      where: { id: "edge_1" },
      data: {
        dataJson: {
          appliedShotNodeIds: ["shot_1", "shot_2"],
          childEdgeIds: ["edge_2", "edge_3"],
        },
      },
    });
    expect(result.edges).toHaveLength(3);
    expect(result.appliedShotCount).toBe(2);
    expect(result.updatedNodes).toEqual([
      expect.objectContaining({
        id: "shot_1",
        dataJson: expect.objectContaining({ locationAssetId: "location_1" }),
      }),
      expect.objectContaining({
        id: "shot_2",
        dataJson: expect.objectContaining({ locationAssetId: "location_1" }),
      }),
    ]);
  });

  it("creates storyboard import nodes and semantic edges from a ready draft", async () => {
    let nodeSequence = 1;
    let edgeSequence = 1;
    prisma.canvasDocument.upsert.mockResolvedValue(canvasDocument());
    prisma.storyboardDraft.findFirst.mockResolvedValue(storyboardDraft());
    prisma.canvasNode.findMany.mockResolvedValue([]);
    prisma.canvasNode.create.mockImplementation(async ({ data }: MockCreateArgs) =>
      canvasNode({
        id: `node_${nodeSequence++}`,
        ...data,
      }),
    );
    prisma.canvasEdge.findFirst.mockResolvedValue(null);
    prisma.canvasEdge.create.mockImplementation(async ({ data }: MockCreateArgs) =>
      canvasEdge({
        id: `edge_${edgeSequence++}`,
        ...data,
      }),
    );
    prisma.canvasNode.update.mockImplementation(async ({ where, data }: MockUpdateArgs) =>
      canvasNode({
        id: where.id,
        dataJson: data.dataJson,
      }),
    );

    const result = await service.importStoryboard("project_1", {
      novelDocumentId: "novel_1",
      storyboardDraftId: "draft_1",
      duplicatePolicy: "new_version",
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.summary).toMatchObject({
      sceneCount: 2,
      shotCount: 6,
      characterCount: 2,
      locationCount: 1,
      createdNodeCount: 14,
      reusedNodeCount: 0,
      version: 1,
    });
    expect(result.nodes.map((node) => node.type)).toEqual(
      expect.arrayContaining([
        "novel",
        "scene_frame",
        "scene",
        "shot",
        "character_asset",
        "location_asset",
      ]),
    );
    expect(result.edges.map((edge) => edge.relation)).toEqual(
      expect.arrayContaining(["belongs_to_scene", "references_character", "references_location"]),
    );
    const updatedShot = result.nodes.find(
      (node) =>
        node.type === "shot" &&
        Array.isArray((node.dataJson as { characterAssetIds?: unknown }).characterAssetIds),
    );
    expect(updatedShot?.dataJson).toMatchObject({
      characterAssetIds: expect.arrayContaining(["node_2", "node_3"]),
      locationAssetId: "node_4",
    });
  });

  it("creates story seed edges from existing ImageNodes during storyboard import", async () => {
    let nodeSequence = 1;
    let edgeSequence = 1;
    const seedImageNode = canvasNode({
      id: "image_seed_1",
      tldrawShapeId: "shape:image-seed-1",
      type: "image",
      title: "Seed image",
      dataJson: { assetId: "asset_seed_1" },
    });
    prisma.canvasDocument.upsert.mockResolvedValue(canvasDocument());
    prisma.storyboardDraft.findFirst.mockResolvedValue(
      storyboardDraft({ storyboardJson: importStoryboardWithStorySeed() }),
    );
    prisma.canvasNode.findMany.mockResolvedValue([seedImageNode]);
    prisma.canvasNode.create.mockImplementation(async ({ data }: MockCreateArgs) =>
      canvasNode({
        id: `node_${nodeSequence++}`,
        ...data,
      }),
    );
    prisma.canvasEdge.findFirst.mockResolvedValue(null);
    prisma.canvasEdge.create.mockImplementation(async ({ data }: MockCreateArgs) =>
      canvasEdge({
        id: `edge_${edgeSequence++}`,
        ...data,
      }),
    );
    prisma.canvasNode.update.mockImplementation(async ({ where, data }: MockUpdateArgs) =>
      canvasNode({
        id: where.id,
        dataJson: data.dataJson,
      }),
    );

    const result = await service.importStoryboard("project_1", {
      novelDocumentId: "novel_1",
      storyboardDraftId: "draft_1",
      duplicatePolicy: "new_version",
    });

    expect(result.edges).toContainEqual(
      expect.objectContaining({
        sourceNodeId: "image_seed_1",
        targetNodeId: "node_1",
        relation: "story_seed",
        dataJson: expect.objectContaining({
          storySeed: expect.objectContaining({
            assetId: "asset_seed_1",
            imageNodeId: "image_seed_1",
          }),
        }),
      }),
    );
    expect(result.summary.createdEdgeCount).toBeGreaterThan(importStoryboard().scenes.length);
  });

  it("reuses matching character nodes during storyboard import", async () => {
    let sequence = 1;
    const existingCharacter = canvasNode({
      id: "existing_character",
      type: "character_asset",
      tldrawShapeId: "shape:existing-character",
      dataJson: { name: "Hero", role: "protagonist" },
    });
    prisma.canvasDocument.upsert.mockResolvedValue(canvasDocument());
    prisma.storyboardDraft.findFirst.mockResolvedValue(storyboardDraft());
    prisma.canvasNode.findMany.mockResolvedValue([existingCharacter]);
    prisma.canvasNode.create.mockImplementation(async ({ data }: MockCreateArgs) =>
      canvasNode({
        id: `created_${sequence++}`,
        ...data,
      }),
    );
    prisma.canvasEdge.findFirst.mockResolvedValue(null);
    prisma.canvasEdge.create.mockImplementation(async ({ data }: MockCreateArgs) =>
      canvasEdge({
        id: `edge_${sequence++}`,
        ...data,
      }),
    );
    prisma.canvasNode.update.mockImplementation(async ({ where, data }: MockUpdateArgs) => {
      if (where.id === existingCharacter.id) {
        return {
          ...existingCharacter,
          dataJson: data.dataJson,
        };
      }
      return canvasNode({
        id: where.id,
        dataJson: data.dataJson,
      });
    });

    const result = await service.importStoryboard("project_1", {
      novelDocumentId: "novel_1",
      storyboardDraftId: "draft_1",
    });

    expect(result.summary.reusedNodeCount).toBe(1);
    expect(result.nodes).toContainEqual(expect.objectContaining({ id: "existing_character" }));
    expect(result.edges).toContainEqual(
      expect.objectContaining({
        sourceNodeId: "existing_character",
        relation: "references_character",
      }),
    );
  });

  it("merges lifecycle trace into reusable locked character nodes without overwriting identity fields", async () => {
    let sequence = 1;
    const existingCharacter = canvasNode({
      id: "existing_character",
      type: "character_asset",
      title: "Hero",
      tldrawShapeId: "shape:existing-character",
      dataJson: {
        name: "Hero",
        role: "protagonist",
        appearance: "User edited silver coat",
        identityPrompt: "locked user hero identity",
        lifecycleStages: [],
        locked: true,
        lockedFields: ["appearance", "identityPrompt"],
      },
    });
    prisma.canvasDocument.upsert.mockResolvedValue(canvasDocument());
    prisma.storyboardDraft.findFirst.mockResolvedValue(
      storyboardDraft({ storyboardJson: importStoryboardWithBlueprint() }),
    );
    prisma.canvasNode.findMany.mockResolvedValue([existingCharacter]);
    prisma.canvasNode.create.mockImplementation(async ({ data }: MockCreateArgs) =>
      canvasNode({
        id: `created_${sequence++}`,
        ...data,
      }),
    );
    prisma.canvasEdge.findFirst.mockResolvedValue(null);
    prisma.canvasEdge.create.mockImplementation(async ({ data }: MockCreateArgs) =>
      canvasEdge({
        id: `edge_${sequence++}`,
        ...data,
      }),
    );
    prisma.canvasNode.update.mockImplementation(async ({ where, data }: MockUpdateArgs) => {
      if (where.id === existingCharacter.id) {
        return {
          ...existingCharacter,
          dataJson: data.dataJson,
        };
      }
      return canvasNode({
        id: where.id,
        dataJson: data.dataJson,
      });
    });

    const result = await service.importStoryboard("project_1", {
      novelDocumentId: "novel_1",
      storyboardDraftId: "draft_1",
    });

    const reusedCharacter = result.nodes.find((node) => node.id === "existing_character");
    expect(result.summary.reusedNodeCount).toBe(1);
    expect(reusedCharacter?.dataJson).toMatchObject({
      appearance: "User edited silver coat",
      identityPrompt: "locked user hero identity",
      locked: true,
      lockedFields: ["appearance", "identityPrompt"],
      lifecycleStages: [
        expect.objectContaining({
          stageId: "stage_alert",
          identityPrompt: "alert hero in dark coat",
        }),
      ],
    });
    expect(result.edges).toContainEqual(
      expect.objectContaining({
        sourceNodeId: "existing_character",
        targetNodeId: expect.any(String),
        relation: "references_character",
      }),
    );
  });

  it("rejects storyboard imports when the draft is not ready", async () => {
    prisma.canvasDocument.upsert.mockResolvedValue(canvasDocument());
    prisma.storyboardDraft.findFirst.mockResolvedValue(
      storyboardDraft({ status: "valid", readyForImport: false }),
    );

    await expect(
      service.importStoryboard("project_1", {
        novelDocumentId: "novel_1",
        storyboardDraftId: "draft_1",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.canvasNode.create).not.toHaveBeenCalled();
    expect(prisma.canvasEdge.create).not.toHaveBeenCalled();
  });

  it("creates scene membership edges without mutating shot asset references", async () => {
    const sceneNode = canvasNode({
      id: "scene_1",
      tldrawShapeId: "shape:scene-1",
      type: "scene",
    });
    const frameNode = canvasNode({
      id: "frame_1",
      tldrawShapeId: "shape:frame-1",
      type: "scene_frame",
    });
    prisma.canvasNode.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === "scene_1") {
        return sceneNode;
      }
      if (where.id === "frame_1") {
        return frameNode;
      }
      return null;
    });
    prisma.canvasEdge.create.mockResolvedValue(
      canvasEdge({
        id: "edge_scene_frame",
        sourceNodeId: "scene_1",
        targetNodeId: "frame_1",
        relation: "belongs_to_scene",
      }),
    );

    const result = await service.createEdge("project_1", {
      sourceNodeId: "scene_1",
      targetNodeId: "frame_1",
      relation: "belongs_to_scene",
    });

    expect(result.updatedNodes).toEqual([]);
    expect(prisma.canvasNode.update).not.toHaveBeenCalled();
  });

  it("creates generated media semantic edges without mutating source node data", async () => {
    const shotNode = canvasNode({
      id: "shot_1",
      tldrawShapeId: "shape:shot-1",
      type: "shot",
    });
    const imageNode = canvasNode({
      id: "image_1",
      tldrawShapeId: "shape:image-1",
      type: "image",
    });
    prisma.canvasNode.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === "shot_1") {
        return shotNode;
      }
      if (where.id === "image_1") {
        return imageNode;
      }
      return null;
    });
    prisma.canvasEdge.create.mockResolvedValue(
      canvasEdge({
        id: "edge_generated_image",
        sourceNodeId: "shot_1",
        targetNodeId: "image_1",
        relation: "generated_image",
      }),
    );

    const result = await service.createEdge("project_1", {
      sourceNodeId: "shot_1",
      targetNodeId: "image_1",
      relation: "generated_image",
    });

    expect(result.edge.relation).toBe("generated_image");
    expect(result.updatedNodes).toEqual([]);
    expect(prisma.canvasNode.update).not.toHaveBeenCalled();
  });

  it("creates derived-from variant edges between matching node types", async () => {
    const sourceShot = canvasNode({
      id: "shot_1",
      tldrawShapeId: "shape:shot-1",
      type: "shot",
    });
    const variantShot = canvasNode({
      id: "shot_2",
      tldrawShapeId: "shape:shot-2",
      type: "shot",
    });
    prisma.canvasNode.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === "shot_1") {
        return sourceShot;
      }
      if (where.id === "shot_2") {
        return variantShot;
      }
      return null;
    });
    prisma.canvasEdge.create.mockResolvedValue(
      canvasEdge({
        id: "edge_variant",
        sourceNodeId: "shot_1",
        targetNodeId: "shot_2",
        relation: "derived_from",
      }),
    );

    const result = await service.createEdge("project_1", {
      sourceNodeId: "shot_1",
      targetNodeId: "shot_2",
      relation: "derived_from",
    });

    expect(result.edge.relation).toBe("derived_from");
    expect(result.updatedNodes).toEqual([]);
    expect(prisma.canvasNode.update).not.toHaveBeenCalled();
  });

  it("creates source media upstream edges without mutating target node data", async () => {
    const sourceImage = canvasNode({
      id: "source_image_1",
      tldrawShapeId: "shape:source-image-1",
      type: "source_image",
    });
    const imageNode = canvasNode({
      id: "image_1",
      tldrawShapeId: "shape:image-1",
      type: "image",
    });
    prisma.canvasNode.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === "source_image_1") {
        return sourceImage;
      }
      if (where.id === "image_1") {
        return imageNode;
      }
      return null;
    });
    prisma.canvasEdge.create.mockImplementation(async ({ data }: MockCreateArgs) =>
      canvasEdge({
        id: "edge_source_image",
        ...data,
      }),
    );

    const result = await service.createEdge("project_1", {
      sourceNodeId: "source_image_1",
      targetNodeId: "image_1",
      relation: "derived_from",
    });

    expect(result.edge.relation).toBe("derived_from");
    expect(result.edge.dataJson).toMatchObject({
      slotId: "reference_image",
      inputKind: "image",
      inputRole: "reference_image",
      order: 0,
    });
    expect(prisma.canvasEdge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dataJson: {
          slotId: "reference_image",
          inputKind: "image",
          inputRole: "reference_image",
          order: 0,
        },
      }),
    });
    expect(result.updatedNodes).toEqual([]);
    expect(prisma.canvasNode.update).not.toHaveBeenCalled();
  });

  it("rejects source media upstream edges that fail input slot policy", async () => {
    const sourceImage = canvasNode({
      id: "source_image_5",
      tldrawShapeId: "shape:source-image-5",
      type: "source_image",
    });
    const sourceAudio = canvasNode({
      id: "source_audio_1",
      tldrawShapeId: "shape:source-audio-1",
      type: "source_audio",
    });
    const imageNode = canvasNode({
      id: "image_1",
      tldrawShapeId: "shape:image-1",
      type: "image",
    });
    prisma.canvasNode.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === "source_image_5") {
        return sourceImage;
      }
      if (where.id === "source_audio_1") {
        return sourceAudio;
      }
      if (where.id === "image_1") {
        return imageNode;
      }
      return null;
    });

    await expect(
      service.createEdge("project_1", {
        sourceNodeId: "source_audio_1",
        targetNodeId: "image_1",
        relation: "derived_from",
      }),
    ).rejects.toThrow("image does not accept source audio input.");

    prisma.canvasEdge.findMany.mockResolvedValue(
      Array.from({ length: 4 }, (_, index) =>
        canvasEdge({
          id: `edge_reference_${index}`,
          sourceNodeId: `source_image_${index + 1}`,
          targetNodeId: "image_1",
          relation: "derived_from",
          dataJson: {
            slotId: "reference_image",
            inputKind: "image",
            inputRole: "reference_image",
            order: index,
          },
        }),
      ),
    );

    await expect(
      service.createEdge("project_1", {
        sourceNodeId: "source_image_5",
        targetNodeId: "image_1",
        relation: "derived_from",
      }),
    ).rejects.toThrow("Reference image accepts at most 4 connections.");
    expect(prisma.canvasEdge.create).not.toHaveBeenCalled();
  });

  it("rejects source media upstream edges across canvas documents", async () => {
    const sourceImage = canvasNode({
      id: "source_image_1",
      tldrawShapeId: "shape:source-image-1",
      type: "source_image",
      canvasDocumentId: "canvas_1",
    });
    const imageNode = canvasNode({
      id: "image_1",
      tldrawShapeId: "shape:image-1",
      type: "image",
      canvasDocumentId: "canvas_2",
    });
    prisma.canvasNode.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === "source_image_1") {
        return sourceImage;
      }
      if (where.id === "image_1") {
        return imageNode;
      }
      return null;
    });

    await expect(
      service.createEdge("project_1", {
        sourceNodeId: "source_image_1",
        targetNodeId: "image_1",
        relation: "derived_from",
      }),
    ).rejects.toThrow("Canvas edge nodes must belong to the same canvas");
    expect(prisma.canvasEdge.findMany).not.toHaveBeenCalled();
    expect(prisma.canvasEdge.create).not.toHaveBeenCalled();
  });

  it("rejects invalid derived-from variant edges", async () => {
    const shotNode = canvasNode({
      id: "shot_1",
      type: "shot",
    });
    const imageNode = canvasNode({
      id: "image_1",
      type: "image",
    });
    prisma.canvasNode.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === "shot_1") {
        return shotNode;
      }
      if (where.id === "image_1") {
        return imageNode;
      }
      return null;
    });

    await expect(
      service.createEdge("project_1", {
        sourceNodeId: "shot_1",
        targetNodeId: "shot_1",
        relation: "derived_from",
      }),
    ).rejects.toThrow("Variant edges cannot reference the same node");

    await expect(
      service.createEdge("project_1", {
        sourceNodeId: "shot_1",
        targetNodeId: "image_1",
        relation: "derived_from",
      }),
    ).rejects.toThrow("Variant edges must connect nodes of the same type");
  });

  it("deletes semantic edges and rolls back shot references", async () => {
    const characterNode = canvasNode({
      id: "character_1",
      type: "character_asset",
    });
    const shotNode = canvasNode({
      id: "shot_1",
      dataJson: { characterAssetIds: ["character_1", "character_2"] },
    });
    prisma.canvasEdge.findFirst.mockResolvedValue(
      canvasEdge({
        id: "edge_1",
        sourceNodeId: "character_1",
        targetNodeId: "shot_1",
        relation: "references_character",
      }),
    );
    prisma.canvasNode.findFirst.mockImplementation(async ({ where }) => {
      if (where.id === "character_1") {
        return characterNode;
      }
      if (where.id === "shot_1") {
        return shotNode;
      }
      return null;
    });
    prisma.canvasNode.update.mockResolvedValue(
      canvasNode({
        id: "shot_1",
        dataJson: { characterAssetIds: ["character_2"] },
      }),
    );
    prisma.canvasEdge.delete.mockResolvedValue(canvasEdge({ id: "edge_1" }));

    const result = await service.deleteEdge("project_1", "edge_1");

    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "shot_1" },
      data: { dataJson: { characterAssetIds: ["character_2"] } },
    });
    expect(prisma.canvasEdge.delete).toHaveBeenCalledWith({ where: { id: "edge_1" } });
    expect(result).toMatchObject({
      deleted: true,
      edgeId: "edge_1",
      deletedEdgeIds: ["edge_1"],
    });
  });

  it("returns project assets using public preview metadata", async () => {
    prisma.canvasDocument.upsert.mockResolvedValue(canvasDocument());
    prisma.asset.findMany.mockResolvedValue([asset()]);

    const result = await service.getCanvas("project_1");

    expect(result.assets).toEqual([
      expect.objectContaining({
        id: "asset_1",
        projectId: "project_1",
        previewKind: "image",
        previewUrl: "/api/v1/projects/project_1/assets/asset_1/preview",
      }),
    ]);
    expect(JSON.stringify(result.assets)).not.toContain("/tmp");
  });

  it("reports missing projects", async () => {
    prisma.project.findUnique.mockResolvedValue(null);

    await expect(service.getCanvas("missing")).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.saveSnapshot("missing", { snapshotJson: {} })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.createNode("missing", {
        tldrawShapeId: "shape:shot-1",
        type: "shot",
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.updateNode("missing", "node_1", { title: "Nope" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejects invalid snapshot payloads", async () => {
    await expect(
      service.saveSnapshot("project_1", { snapshotJson: undefined as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.saveSnapshot("project_1", { snapshotJson: { broken: undefined } as never }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.saveSnapshot("project_1", { snapshotJson: null }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("rejects invalid business node payloads", async () => {
    prisma.canvasDocument.upsert.mockResolvedValue(canvasDocument());
    prisma.canvasNode.findFirst.mockResolvedValue(canvasNode());

    await expect(
      service.createNode("project_1", {
        tldrawShapeId: "shape:shot-1",
        type: "style_asset" as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createNode("project_1", {
        tldrawShapeId: "shape:shot-1",
        type: "shot",
        dataJson: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.updateNode("project_1", "node_1", {
        dataJson: { broken: undefined } as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function importStoryboard(): StoryboardResult {
  return {
    title: "Storyboard Import",
    logline: "Two scenes for import.",
    characters: [
      {
        tempId: "char_hero",
        name: "Hero",
        role: "protagonist",
        appearance: "A consistent lead.",
        personality: "Focused.",
        identityPrompt: "consistent hero",
      },
      {
        tempId: "char_friend",
        name: "Friend",
        role: "support",
        appearance: "A calm companion.",
        personality: "Practical.",
        identityPrompt: "consistent friend",
      },
    ],
    locations: [
      {
        tempId: "loc_city",
        name: "City Rooftop",
        type: "exterior",
        description: "A rooftop at dusk.",
        lighting: "soft evening",
        atmosphere: "quiet",
        locationPrompt: "cinematic rooftop",
      },
    ],
    scenes: [1, 2].map((sceneIndex) => ({
      tempId: `scene_${sceneIndex}`,
      title: `Scene ${sceneIndex}`,
      sourceExcerpt: `Scene ${sceneIndex} source.`,
      summary: `Scene ${sceneIndex} summary.`,
      mood: "focused",
      characterTempIds: ["char_hero", "char_friend"],
      locationTempId: "loc_city",
      shots: [1, 2, 3].map((shotIndex) => ({
        tempId: `shot_${sceneIndex}_${shotIndex}`,
        shotIndex,
        title: `Shot ${sceneIndex}.${shotIndex}`,
        durationSec: 4,
        visualDescription: `Visual ${sceneIndex}.${shotIndex}`,
        action: `Action ${sceneIndex}.${shotIndex}`,
        cameraMovement: "slow push in",
        characterTempIds: ["char_hero", "char_friend"],
        locationTempId: "loc_city",
        imagePrompt: `image prompt ${sceneIndex}.${shotIndex}`,
        videoPrompt: `video prompt ${sceneIndex}.${shotIndex}`,
      })),
    })),
  };
}

function importStoryboardWithStorySeed(): StoryboardResult {
  const storyboard = importStoryboard();
  storyboard.storySeedReferences = [
    {
      assetId: "asset_seed_1",
      imageNodeId: "image_seed_1",
      label: "Seed image",
      prompt: "keep the same subject silhouette",
    },
  ];
  storyboard.characters[0]!.referenceAssetIds = ["asset_seed_1"];
  storyboard.locations[0]!.referenceAssetIds = ["asset_seed_1"];
  storyboard.scenes.forEach((scene) => {
    scene.shots.forEach((shot) => {
      shot.referenceAssetIds = ["asset_seed_1"];
    });
  });
  return storyboard;
}

function importStoryboardWithBlueprint(): StoryboardResult {
  const storyboard = importStoryboard();
  storyboard.storyBlueprint = {
    worldSummary: "A city where rooftop signals reveal hidden alliances.",
    timelineEvents: [
      {
        eventId: "event_opening",
        title: "Signal discovered",
        orderIndex: 1,
        sourceExcerpt: "Scene 1 source.",
        summary: "The hero notices the hidden signal and chooses to act.",
        characters: ["char_hero"],
        emotion: "anticipation",
      },
    ],
    characterRelationships: [
      {
        relationshipId: "rel_hero_friend",
        characterTempIds: ["char_hero", "char_friend"],
        type: "allies",
        summary: "Hero and Friend coordinate under pressure.",
      },
    ],
  };
  storyboard.characters[0] = {
    ...storyboard.characters[0]!,
    lifecycleStages: [
      {
        stageId: "stage_alert",
        label: "Signal alert",
        ageRange: "late 20s",
        costume: "dark utility coat",
        identityPrompt: "alert hero in dark coat",
      },
    ],
  };
  storyboard.scenes = storyboard.scenes.map((scene) => ({
    ...scene,
    storyEventIds: ["event_opening"],
    shots: scene.shots.map((shot) => ({
      ...shot,
      storyEventIds: ["event_opening"],
      characterStageRefs: [{ characterTempId: "char_hero", stageId: "stage_alert" }],
    })),
  }));
  return storyboard;
}
