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

function generationJob(overrides: Record<string, unknown> = {}) {
  return {
    id: "job_1",
    projectId: "project_1",
    operation: "novel_to_storyboard",
    status: "running",
    provider: "mock-llm",
    model: "mock-storyboard",
    sourceNodeId: null,
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

function novelEventGraph(overrides: Record<string, unknown> = {}) {
  return {
    id: "event_graph_1",
    projectId: "project_1",
    novelDocumentId: "novel_1",
    chaptersJson: [
      {
        chapterIndex: 1,
        title: "Chapter 1",
        startOffset: 0,
        endOffset: 80,
        wordCount: 12,
        summary: "The hero finds the signal.",
      },
    ],
    eventsJson: [
      {
        eventId: "chapter_1_event_1",
        title: "Chapter 1 Event 1",
        orderIndex: 1,
        chapterIndex: 1,
        sourceExcerpt: "The hero finds the signal under the rain.",
        summary: "The hero finds the signal under the rain.",
      },
    ],
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
    version: 1,
    title: "Rooftop Signal Script v1",
    strategy: "short_drama",
    status: "draft",
    scriptJson: {
      title: "Rooftop Signal Script v1",
      logline: "Short-drama adaptation of Rooftop Signal across 1 scene.",
      strategy: "short_drama",
      scenes: [
        {
          sceneId: "script_scene_1",
          orderIndex: 1,
          title: "Scene 1: Chapter 1 Event 1",
          summary: "The hero finds the signal under the rain.",
          beats: [
            {
              beatId: "beat_1",
              orderIndex: 1,
              title: "Chapter 1 Event 1",
              summary: "The hero finds the signal under the rain.",
              sourceExcerpt: "The hero finds the signal under the rain.",
              eventIds: ["chapter_1_event_1"],
            },
          ],
          dialogue: "Narration: The hero finds the signal under the rain.",
          shotHint: "Convert each beat into one clear visual shot.",
        },
      ],
    },
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
    generationJob: {
      create: vi.fn(async ({ data }) => generationJob(data)),
      update: vi.fn(async ({ data }) => generationJob(data)),
    },
    novelEventGraph: {
      create: vi.fn(async ({ data }) => novelEventGraph(data)),
      findFirst: vi.fn(
        async (): Promise<ReturnType<typeof novelEventGraph> | null> => null,
      ),
    },
    scriptDraft: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(async ({ data }) => scriptDraft(data)),
      update: vi.fn(async ({ data }) => scriptDraft(data)),
    },
    canvasNode: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    canvasEdge: {
      deleteMany: vi.fn(),
    },
    asset: {
      findMany: vi.fn(),
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

  it("extracts deterministic chapter event graphs from long novel sources", async () => {
    prisma.novelDocument.findFirst.mockResolvedValue(
      novel({
        content:
          "Chapter 1 Signal\nThe courier finds a blue signal under the rainy overpass.\n\nThe rival arrives with a warning.\n\nChapter 2 Choice\nThe courier chooses to follow the signal.",
        wordCount: 27,
      }),
    );
    prisma.novelEventGraph.create.mockImplementation(async ({ data }) =>
      novelEventGraph({
        chaptersJson: data.chaptersJson,
        eventsJson: data.eventsJson,
      }),
    );

    const result = await service.extractChapterEvents("project_1", "novel_1");

    expect(prisma.novelEventGraph.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project_1",
          novelDocumentId: "novel_1",
        }),
      }),
    );
    expect(result.eventGraph.chapters.map((chapter) => chapter.title)).toEqual([
      "Chapter 1 Signal",
      "Chapter 2 Choice",
    ]);
    expect(result.eventGraph.events[0]).toMatchObject({
      eventId: "chapter_1_event_1",
      chapterIndex: 1,
      sourceExcerpt: expect.stringContaining("blue signal"),
    });
  });

  it("creates script drafts from the latest chapter event graph", async () => {
    prisma.novelDocument.findFirst.mockResolvedValue(novel());
    prisma.novelEventGraph.findFirst.mockResolvedValue(novelEventGraph());
    prisma.scriptDraft.findMany.mockResolvedValue([]);
    prisma.scriptDraft.create.mockImplementation(async ({ data }) =>
      scriptDraft({
        ...data,
        id: "script_1",
        scriptJson: data.scriptJson,
      }),
    );

    const result = await service.createScriptDraft("project_1", "novel_1", {
      strategy: "short_drama",
    });

    expect(prisma.scriptDraft.findMany).toHaveBeenCalledWith({
      where: { projectId: "project_1", novelDocumentId: "novel_1" },
      orderBy: { version: "desc" },
      take: 1,
    });
    expect(prisma.scriptDraft.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project_1",
          novelDocumentId: "novel_1",
          version: 1,
          strategy: "short_drama",
          status: "draft",
        }),
      }),
    );
    expect(result.scriptDraft.script.scenes[0]?.beats[0]?.eventIds).toEqual([
      "chapter_1_event_1",
    ]);
  });

  it("exports script drafts as plain text and marks them exported", async () => {
    prisma.novelDocument.findFirst.mockResolvedValue(novel());
    prisma.scriptDraft.findFirst.mockResolvedValue(scriptDraft());

    const result = await service.exportScriptDraft("project_1", "novel_1", "script_1");

    expect(result.filename).toBe("rooftop-signal-script-v1-v1.txt");
    expect(result.content).toContain("# Rooftop Signal Script v1");
    expect(result.content).toContain("Chapter 1 Event 1");
    expect(prisma.scriptDraft.update).toHaveBeenCalledWith({
      where: { id: "script_1" },
      data: { status: "exported" },
    });
  });

  it("creates a storyboard draft from a selected script draft", async () => {
    prisma.novelDocument.findFirst.mockResolvedValue(novel());
    prisma.scriptDraft.findFirst.mockResolvedValue(scriptDraft());
    prisma.storyboardDraft.create.mockImplementation(async ({ data }) =>
      storyboardDraft({
        ...data,
        id: "draft_from_script",
        storyboardJson: data.storyboardJson,
      }),
    );

    const result = await service.generateStoryboardFromScriptDraft(
      "project_1",
      "novel_1",
      "script_1",
    );

    expect(result.validation.success).toBe(true);
    expect(result.draft?.provider).toBe("local-script-workbench");
    expect(result.draft?.storyboard?.storyBlueprint?.timelineEvents?.[0]?.eventId).toBe(
      "chapter_1_event_1",
    );
    expect(result.draft?.storyboard?.scenes[0]?.shots[0]?.storyEventIds).toEqual([
      "chapter_1_event_1",
    ]);
    expect(prisma.scriptDraft.update).toHaveBeenCalledWith({
      where: { id: "script_1" },
      data: { status: "selected" },
    });
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
    prisma.novelEventGraph.findFirst.mockResolvedValue(novelEventGraph());

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
    expect(result.draft?.storyboard?.storyBlueprint?.timelineEvents?.[0]?.eventId).toBe(
      "chapter_1_event_1",
    );
    expect(result.draft?.storyboard?.scenes[0]?.shots[0]?.storyEventIds).toEqual([
      "chapter_1_event_1",
    ]);
  });

  it("creates a ready storyboard draft from a creative brief with a succeeded audit job", async () => {
    prisma.novelDocument.create.mockResolvedValue(
      novel({
        id: "novel_creative",
        title: "A courier finds a glowing signal...",
        content:
          "Creative idea: A courier finds a glowing signal under a rainy overpass.\nAudience: short drama viewers\nStyle: rainy neon thriller\nTarget duration: 45 seconds\nInteraction layer: advanced",
        wordCount: 26,
        language: "en",
      }),
    );
    prisma.storyboardDraft.create.mockResolvedValue(
      storyboardDraft({
        id: "draft_creative",
        novelDocumentId: "novel_creative",
        status: "ready",
        readyForImport: true,
      }),
    );
    prisma.generationJob.update.mockResolvedValue(
      generationJob({
        status: "succeeded",
        inputJson: {
          operation: "novel_to_storyboard",
          projectId: "project_1",
          idea: "A courier finds a glowing signal under a rainy overpass.",
          mode: "advanced",
          audience: "short drama viewers",
          stylePrompt: "rainy neon thriller",
          targetDurationSeconds: 45,
          provider: "mock-llm",
          model: "mock-storyboard",
        },
        outputJson: {
          operation: "novel_to_storyboard",
          novelDocumentId: "novel_creative",
          storyboardDraftId: "draft_creative",
          provider: "mock-llm",
          model: "mock-storyboard",
          completedAt: "2026-06-12T00:10:00.000Z",
        },
      }),
    );

    const result = await service.createCreativeStoryboard("project_1", {
      idea: " A courier finds a glowing signal under a rainy overpass. ",
      mode: "advanced",
      audience: " short drama viewers ",
      stylePrompt: " rainy neon thriller ",
      targetDurationSeconds: 45,
    });

    expect(prisma.novelDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project_1",
          sourceType: "paste",
          content: expect.stringContaining("Creative idea: A courier finds a glowing signal"),
        }),
      }),
    );
    expect(prisma.generationJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operation: "novel_to_storyboard",
          status: "running",
          provider: "mock-llm",
          inputJson: expect.objectContaining({
            mode: "advanced",
            audience: "short drama viewers",
            stylePrompt: "rainy neon thriller",
            targetDurationSeconds: 45,
          }),
        }),
      }),
    );
    expect(prisma.storyboardDraft.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          novelDocumentId: "novel_creative",
          status: "ready",
          readyForImport: true,
        }),
      }),
    );
    expect(prisma.generationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job_1" },
        data: expect.objectContaining({
          status: "succeeded",
          outputJson: expect.objectContaining({
            novelDocumentId: "novel_creative",
            storyboardDraftId: "draft_creative",
          }),
        }),
      }),
    );
    expect(result.novel.id).toBe("novel_creative");
    expect(result.draft.readyForImport).toBe(true);
    expect(result.job.status).toBe("succeeded");
  });

  it("resolves reference ImageNodes into story seed assets for creative storyboard drafts", async () => {
    prisma.canvasNode.findMany.mockResolvedValue([
      {
        id: "image_seed_1",
        title: "Raincoat reference",
        type: "image",
        dataJson: { assetId: "asset_seed_1" },
      },
    ]);
    prisma.asset.findMany.mockResolvedValue([
      {
        id: "asset_seed_1",
        type: "image",
        mimeType: "image/png",
        originalFilename: "raincoat.png",
      },
    ]);
    prisma.novelDocument.create.mockResolvedValue(
      novel({
        id: "novel_creative",
        content:
          "Creative idea: Build around the raincoat subject\nReference image assets: asset_seed_1\nReference image nodes: image_seed_1\nReference instruction: preserve the yellow raincoat\nInteraction layer: novice",
      }),
    );
    prisma.storyboardDraft.create.mockImplementation(async ({ data }) =>
      storyboardDraft({
        ...data,
        id: "draft_creative",
        novelDocumentId: "novel_creative",
      }),
    );
    prisma.generationJob.update.mockImplementation(async ({ data }) =>
      generationJob({
        ...data,
        status: "succeeded",
        inputJson: {
          operation: "novel_to_storyboard",
          projectId: "project_1",
          idea: "Build around the raincoat subject",
          mode: "novice",
          referenceAssetIds: ["asset_seed_1"],
          referenceImageNodeIds: ["image_seed_1"],
          referencePrompt: "preserve the yellow raincoat",
          provider: "mock-llm",
          model: "mock-storyboard",
        },
      }),
    );

    const result = await service.createCreativeStoryboard("project_1", {
      idea: "Build around the raincoat subject",
      referenceImageNodeIds: ["image_seed_1"],
      referencePrompt: "preserve the yellow raincoat",
    });

    expect(prisma.generationJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceNodeId: "image_seed_1",
          inputJson: expect.objectContaining({
            referenceAssetIds: ["asset_seed_1"],
            referenceImageNodeIds: ["image_seed_1"],
            referencePrompt: "preserve the yellow raincoat",
          }),
        }),
      }),
    );
    const createdDraftData = prisma.storyboardDraft.create.mock.calls[0]?.[0].data;
    expect(createdDraftData).toMatchObject({
      storyboardJson: expect.objectContaining({
        storySeedReferences: [
          expect.objectContaining({
            assetId: "asset_seed_1",
            imageNodeId: "image_seed_1",
          }),
        ],
      }),
    });
    expect(result.draft.storyboard?.characters[0]?.referenceAssetIds).toEqual(["asset_seed_1"]);
    expect(result.job.inputJson.referenceAssetIds).toEqual(["asset_seed_1"]);
    expect(result.job.outputJson?.referenceImageNodeIds).toEqual(["image_seed_1"]);
  });

  it("rejects missing reference ImageNodes before creating creative jobs", async () => {
    prisma.canvasNode.findMany.mockResolvedValue([]);

    await expect(
      service.createCreativeStoryboard("project_1", {
        idea: "Build around a missing reference",
        referenceImageNodeIds: ["image_missing"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.generationJob.create).not.toHaveBeenCalled();
    expect(prisma.novelDocument.create).not.toHaveBeenCalled();
  });

  it("rejects blank creative briefs before creating jobs or drafts", async () => {
    await expect(
      service.createCreativeStoryboard("project_1", { idea: "   " }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.novelDocument.create).not.toHaveBeenCalled();
    expect(prisma.generationJob.create).not.toHaveBeenCalled();
    expect(prisma.storyboardDraft.create).not.toHaveBeenCalled();
  });

  it("marks creative brief jobs failed when storyboard generation fails", async () => {
    prisma.novelDocument.create.mockResolvedValue(
      novel({
        id: "novel_creative",
        content: "Creative idea: Failure path\nInteraction layer: novice",
      }),
    );

    await expect(
      service.createCreativeStoryboard("project_1", {
        idea: "Failure path",
        forceFailure: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.generationJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "running",
          inputJson: expect.objectContaining({
            operation: "novel_to_storyboard",
            forceFailure: true,
          }),
        }),
      }),
    );
    expect(prisma.storyboardDraft.create).not.toHaveBeenCalled();
    expect(prisma.generationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job_1" },
        data: expect.objectContaining({
          status: "failed",
          errorMessage: expect.stringContaining("mock failure requested"),
        }),
      }),
    );
  });

  it("marks creative brief jobs failed when generated source persistence fails", async () => {
    prisma.novelDocument.create.mockRejectedValue(new Error("database unavailable"));

    await expect(
      service.createCreativeStoryboard("project_1", {
        idea: "A generated source write fails",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.generationJob.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "running",
          inputJson: expect.objectContaining({
            operation: "novel_to_storyboard",
          }),
        }),
      }),
    );
    expect(prisma.storyboardDraft.create).not.toHaveBeenCalled();
    expect(prisma.generationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "job_1" },
        data: expect.objectContaining({
          status: "failed",
          errorMessage: "database unavailable",
        }),
      }),
    );
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
