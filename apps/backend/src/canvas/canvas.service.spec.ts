import { BadRequestException, NotFoundException } from "@nestjs/common";
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

type MockAsset = ReturnType<typeof asset>;
type MockCanvasNode = ReturnType<typeof canvasNode>;

function createPrismaMock() {
  return {
    project: {
      findUnique: vi.fn(async (): Promise<{ id: string } | null> => ({ id: "project_1" })),
    },
    canvasDocument: {
      upsert: vi.fn(),
    },
    canvasNode: {
      findMany: vi.fn(async (): Promise<MockCanvasNode[]> => []),
      findFirst: vi.fn(async (): Promise<MockCanvasNode | null> => null),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    canvasEdge: {
      findMany: vi.fn(async () => []),
    },
    asset: {
      findMany: vi.fn(async (): Promise<MockAsset[]> => []),
      delete: vi.fn(),
    },
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
