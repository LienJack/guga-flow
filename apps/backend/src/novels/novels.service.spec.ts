import { BadRequestException, NotFoundException } from "@nestjs/common";
import { MockLlmProvider } from "@guga-flow/provider-contracts";
import type { StoryboardResult } from "@guga-flow/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

function storyboardDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: "draft_1",
    projectId: "project_1",
    novelDocumentId: "novel_1",
    status: "valid",
    storyboardJson: validStoryboard(),
    validationIssuesJson: [],
    provider: "mock-llm",
    model: "mock-storyboard",
    errorMessage: null,
    readyForImport: false,
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
    storyboardDraft: {
      create: vi.fn(async ({ data }) => storyboardDraft(data)),
      findFirst: vi.fn(),
      update: vi.fn(async ({ data }) => storyboardDraft(data)),
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

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("generates and stores validated mock storyboard drafts", async () => {
    prisma.novelDocument.findFirst.mockResolvedValue(novel());

    const result = await service.generateStoryboard("project_1", "novel_1");

    expect(result.validation.success).toBe(true);
    expect(prisma.storyboardDraft.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project_1",
          novelDocumentId: "novel_1",
          status: "valid",
          provider: "mock-llm",
          model: "mock-storyboard",
          readyForImport: false,
        }),
      }),
    );
    expect(result.draft?.storyboard?.scenes[0]?.shots[0]?.imagePrompt).toContain("rooftop");
  });

  it("updates storyboard drafts and marks valid drafts ready for import", async () => {
    prisma.novelDocument.findFirst.mockResolvedValue(novel());
    prisma.storyboardDraft.findFirst.mockResolvedValue(storyboardDraft());
    prisma.storyboardDraft.update
      .mockResolvedValueOnce(
        storyboardDraft({
          storyboardJson: {
            ...validStoryboard(),
            logline: "Edited logline",
          },
        }),
      )
      .mockResolvedValueOnce(
        storyboardDraft({
          status: "ready",
          readyForImport: true,
        }),
      );

    const updated = await service.updateStoryboardDraft("project_1", "novel_1", "draft_1", {
      storyboard: {
        ...validStoryboard(),
        logline: "Edited logline",
      },
    });
    const ready = await service.markStoryboardDraftReady("project_1", "novel_1", "draft_1");

    expect(updated.draft.storyboard?.logline).toBe("Edited logline");
    expect(prisma.storyboardDraft.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: "draft_1" },
        data: expect.objectContaining({
          status: "valid",
          readyForImport: false,
        }),
      }),
    );
    expect(ready.draft.status).toBe("ready");
    expect(ready.draft.readyForImport).toBe(true);
  });

  it("rejects invalid edited storyboard drafts", async () => {
    prisma.novelDocument.findFirst.mockResolvedValue(novel());
    prisma.storyboardDraft.findFirst.mockResolvedValue(storyboardDraft());

    await expect(
      service.updateStoryboardDraft("project_1", "novel_1", "draft_1", {
        storyboard: { ...validStoryboard(), scenes: [] } as StoryboardResult,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.storyboardDraft.update).not.toHaveBeenCalled();
  });

  it("does not write a storyboard draft when the mock provider fails", async () => {
    prisma.novelDocument.findFirst.mockResolvedValue(novel());
    vi.spyOn(MockLlmProvider.prototype, "generateStoryboard").mockRejectedValue(
      new Error("mock llm down"),
    );

    await expect(service.generateStoryboard("project_1", "novel_1")).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(prisma.storyboardDraft.create).not.toHaveBeenCalled();
  });
});

function validStoryboard(): StoryboardResult {
  return {
    title: "Local Mock Storyboard",
    logline: "A mock storyboard generated from a local excerpt.",
    characters: [
      {
        tempId: "char_hero",
        name: "Hero",
        role: "protagonist",
        appearance: "A consistent lead character for mock generation.",
        personality: "Determined and observant.",
        identityPrompt: "consistent protagonist, cinematic character reference",
      },
    ],
    locations: [
      {
        tempId: "loc_city",
        name: "City Rooftop",
        type: "exterior",
        description: "A simple rooftop location used by the mock storyboard.",
        lighting: "soft evening light",
        atmosphere: "quiet and expectant",
        locationPrompt: "cinematic rooftop, soft evening light",
      },
    ],
    scenes: [
      {
        tempId: "scene_1",
        title: "Opening Beat",
        sourceExcerpt: "A hero watches the city lights before choosing the next shot.",
        summary: "The story opens with a clear visual action.",
        mood: "anticipatory",
        timeOfDay: "evening",
        characterTempIds: ["char_hero"],
        locationTempId: "loc_city",
        shots: [
          {
            tempId: "shot_1",
            shotIndex: 1,
            title: "Hero establishes the scene",
            durationSec: 4,
            visualDescription: "The hero steps into frame and surveys the city.",
            action: "walks to the edge of the rooftop",
            cameraMovement: "slow push in",
            mood: "focused",
            characterTempIds: ["char_hero"],
            locationTempId: "loc_city",
            imagePrompt: "hero on a cinematic rooftop, evening, slow push in",
            videoPrompt: "slow push in on hero overlooking the city",
          },
        ],
      },
    ],
  };
}
