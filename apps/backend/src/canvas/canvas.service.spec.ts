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

function createPrismaMock() {
  return {
    project: {
      findUnique: vi.fn(async (): Promise<{ id: string } | null> => ({ id: "project_1" })),
    },
    canvasDocument: {
      upsert: vi.fn(),
    },
    canvasNode: {
      findMany: vi.fn(async () => []),
    },
    canvasEdge: {
      findMany: vi.fn(async () => []),
    },
    asset: {
      findMany: vi.fn(async (): Promise<MockAsset[]> => []),
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
});
