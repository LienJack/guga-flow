import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaService } from "../prisma/prisma.service";
import { NovelsService } from "./novels.service";

const createdAt = new Date("2026-06-12T00:00:00.000Z");
const updatedAt = new Date("2026-06-12T00:10:00.000Z");

function novel(overrides: Record<string, unknown> = {}) {
  return {
    id: "novel_1",
    projectId: "project_1",
    title: "Rooftop Signal",
    content: "A hero watches the city lights.",
    sourceType: "paste",
    wordCount: 6,
    language: "en",
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function createPrismaMock() {
  return {
    project: {
      findUnique: vi.fn(async (): Promise<{ id: string } | null> => ({ id: "project_1" })),
    },
    novelDocument: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    canvasNode: {
      deleteMany: vi.fn(),
    },
    canvasEdge: {
      deleteMany: vi.fn(),
    },
    asset: {
      deleteMany: vi.fn(),
    },
  };
}

describe("NovelsService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: NovelsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new NovelsService(prisma as unknown as PrismaService);
  });

  it("creates pasted novel sources with normalized metadata", async () => {
    prisma.novelDocument.create.mockResolvedValue(novel());

    const result = await service.createNovel("project_1", {
      title: " Rooftop Signal ",
      content: " A hero watches the city lights. ",
    });

    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: "project_1" },
      select: { id: true },
    });
    expect(prisma.novelDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project_1",
          title: "Rooftop Signal",
          content: "A hero watches the city lights.",
          sourceType: "paste",
          wordCount: 6,
          language: "en",
        }),
      }),
    );
    expect(result.novel).toMatchObject({
      id: "novel_1",
      title: "Rooftop Signal",
      sourceType: "paste",
      language: "en",
      createdAt: createdAt.toISOString(),
    });
  });

  it("imports text and markdown source content as novel documents", async () => {
    prisma.novelDocument.create.mockResolvedValue(
      novel({
        sourceType: "md",
        title: "Imported Notes",
        content: "# Opening\nA character enters.",
        wordCount: 4,
      }),
    );

    const result = await service.importSource("project_1", {
      title: "Imported Notes",
      content: "# Opening\nA character enters.",
      sourceType: "md",
    });

    expect(prisma.novelDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceType: "md",
          wordCount: 4,
        }),
      }),
    );
    expect(result.novel.sourceType).toBe("md");
  });

  it("lists and updates novels inside one project scope", async () => {
    prisma.novelDocument.findMany.mockResolvedValue([novel()]);
    prisma.novelDocument.findFirst.mockResolvedValue(novel());
    prisma.novelDocument.update.mockResolvedValue(
      novel({
        title: "Signal Revised",
        content: "新的城市镜头",
        wordCount: 6,
        language: "zh",
      }),
    );

    await expect(service.listNovels("project_1")).resolves.toHaveLength(1);
    const result = await service.updateNovel("project_1", "novel_1", {
      title: "Signal Revised",
      content: "新的城市镜头",
    });

    expect(prisma.novelDocument.findMany).toHaveBeenCalledWith({
      where: { projectId: "project_1" },
      orderBy: { updatedAt: "desc" },
    });
    expect(prisma.novelDocument.findFirst).toHaveBeenCalledWith({
      where: { id: "novel_1", projectId: "project_1" },
    });
    expect(prisma.novelDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "novel_1" },
        data: expect.objectContaining({
          title: "Signal Revised",
          content: "新的城市镜头",
          wordCount: 6,
          language: "zh",
        }),
      }),
    );
    expect(result.novel.language).toBe("zh");
  });

  it("rejects invalid inputs and cross-project access", async () => {
    await expect(
      service.createNovel("project_1", { title: "Blank", content: "   " }),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.project.findUnique.mockResolvedValueOnce(null);
    await expect(
      service.createNovel("missing", { title: "Missing", content: "Story" }),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.novelDocument.findFirst.mockResolvedValueOnce(null);
    await expect(service.getNovel("project_1", "missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("deletes only the selected novel document", async () => {
    prisma.novelDocument.findFirst.mockResolvedValue(novel());
    prisma.novelDocument.delete.mockResolvedValue(novel());

    await expect(service.deleteNovel("project_1", "novel_1")).resolves.toEqual({
      deleted: true,
      novelId: "novel_1",
    });

    expect(prisma.novelDocument.delete).toHaveBeenCalledWith({ where: { id: "novel_1" } });
    expect(prisma.canvasNode.deleteMany).not.toHaveBeenCalled();
    expect(prisma.canvasEdge.deleteMany).not.toHaveBeenCalled();
    expect(prisma.asset.deleteMany).not.toHaveBeenCalled();
  });
});
