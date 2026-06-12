import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaService } from "../prisma/prisma.service";
import { LocalStorageService } from "../storage/local-storage.service";
import { ProjectsService } from "./projects.service";

const createdAt = new Date("2026-06-12T00:00:00.000Z");
const updatedAt = new Date("2026-06-12T00:10:00.000Z");

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: "project_1",
    ownerUserId: "default-user",
    title: "Demo Project",
    description: null,
    defaultAspectRatio: "9:16",
    createdAt,
    updatedAt,
    _count: { assets: 0 },
    ...overrides,
  };
}

function createPrismaMock() {
  return {
    user: {
      upsert: vi.fn(async () => ({ id: "default-user" })),
    },
    project: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    asset: {
      findMany: vi.fn(),
    },
  };
}

function createStorageMock() {
  return {
    deleteObject: vi.fn(async () => undefined),
  };
}

describe("ProjectsService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let storage: ReturnType<typeof createStorageMock>;
  let service: ProjectsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    storage = createStorageMock();
    service = new ProjectsService(
      prisma as unknown as PrismaService,
      storage as unknown as LocalStorageService,
    );
  });

  it("creates projects for the default owner and normalizes output", async () => {
    prisma.project.create.mockResolvedValue(project());

    const result = await service.createProject({
      title: " Demo Project ",
      defaultAspectRatio: "9:16",
    });

    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "default-user" },
      }),
    );
    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerUserId: "default-user",
          title: "Demo Project",
        }),
      }),
    );
    expect(result).toMatchObject({
      id: "project_1",
      title: "Demo Project",
      defaultAspectRatio: "9:16",
      assetCount: 0,
      createdAt: createdAt.toISOString(),
    });
  });

  it("rejects blank project titles", async () => {
    await expect(service.createProject({ title: "   " })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("duplicates basic project metadata without carrying asset counts", async () => {
    prisma.project.findUnique.mockResolvedValue(
      project({
        title: "Original",
        description: "A short description",
        defaultAspectRatio: "16:9",
        _count: { assets: 2 },
      }),
    );
    prisma.project.create.mockResolvedValue(
      project({
        id: "project_2",
        title: "Original Copy",
        description: "A short description",
        defaultAspectRatio: "16:9",
        _count: { assets: 0 },
      }),
    );

    const result = await service.duplicateProject("project_1");

    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Original Copy",
          description: "A short description",
          defaultAspectRatio: "16:9",
        }),
      }),
    );
    expect(result.id).toBe("project_2");
    expect(result.assetCount).toBe(0);
  });

  it("throws not found for missing projects", async () => {
    prisma.project.findUnique.mockResolvedValue(null);

    await expect(service.getProject("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("cleans up asset objects before deleting a project", async () => {
    prisma.project.findUnique.mockResolvedValue(project());
    prisma.asset.findMany.mockResolvedValue([
      { storageKey: "project_1/hero.png" },
      { storageKey: "project_1/notes.md" },
    ]);
    prisma.project.delete.mockResolvedValue(project());

    await expect(service.deleteProject("project_1")).resolves.toEqual({ deleted: true });

    expect(prisma.asset.findMany).toHaveBeenCalledWith({
      where: { projectId: "project_1" },
      select: { storageKey: true },
    });
    expect(storage.deleteObject).toHaveBeenNthCalledWith(1, "project_1/hero.png");
    expect(storage.deleteObject).toHaveBeenNthCalledWith(2, "project_1/notes.md");
    expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: "project_1" } });
  });
});
