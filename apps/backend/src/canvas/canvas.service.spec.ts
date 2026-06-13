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

type MockAsset = ReturnType<typeof asset>;
type MockCanvasEdge = ReturnType<typeof canvasEdge>;
type MockCanvasNode = ReturnType<typeof canvasNode>;
type MockFindArgs = { where: Record<string, unknown> };
type MockUpdateArgs = { where: { id: string }; data: Record<string, unknown> };
type MockCreateArgs = { data: Record<string, unknown> };

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
