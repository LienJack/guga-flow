import { BadRequestException, NotFoundException } from "@nestjs/common";
import type {
  CanvasEdgeRecord,
  CanvasLoadResult,
  CanvasNodeRecord,
  ImageNodeData,
  ProviderFailure,
  ShotPromptCompositionResult,
  ShotNodeData,
} from "@guga-flow/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CanvasService } from "../canvas/canvas.service";
import { PrismaService } from "../prisma/prisma.service";
import { PromptService } from "../prompt/prompt.service";
import { GenerationService } from "./generation.service";

const createdAt = new Date("2026-06-12T00:00:00.000Z");
const updatedAt = new Date("2026-06-12T00:05:00.000Z");

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
    inputJson: shotToImageInput(),
    outputJson: null,
    errorMessage: null,
    createdAt,
    updatedAt,
    ...overrides,
  };
}

type MockGenerationJob = ReturnType<typeof generationJob>;
type MockFindArgs = { where?: Record<string, unknown>; select?: Record<string, unknown> };
type MockCreateArgs = { data: Record<string, unknown> };
type MockUpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };

function createPrismaMock() {
  const prisma = {
    generationJob: {
      create: vi.fn(async (args: MockCreateArgs): Promise<MockGenerationJob> =>
        generationJob({
          operation: args.data.operation,
          status: args.data.status,
          provider: args.data.provider,
          model: args.data.model,
          sourceNodeId: args.data.sourceNodeId,
          inputJson: args.data.inputJson,
        }),
      ),
      findMany: vi.fn(async (_args?: MockFindArgs): Promise<Array<MockGenerationJob | { status: string }>> => [
        { status: "queued" },
        { status: "running" },
        { status: "failed" },
      ]),
      findFirst: vi.fn(async (_args?: MockFindArgs): Promise<MockGenerationJob | null> => null),
      findUnique: vi.fn(async (_args?: MockFindArgs): Promise<MockGenerationJob | null> => null),
      updateMany: vi.fn(async (_args: MockUpdateArgs): Promise<{ count: number }> => ({ count: 1 })),
      update: vi.fn(async (args: MockUpdateArgs): Promise<MockGenerationJob> =>
        generationJob({
          id: args.where.id,
          status: args.data.status,
          errorMessage: args.data.errorMessage ?? null,
          outputJson: args.data.outputJson ?? null,
        }),
      ),
    },
    canvasNode: {
      update: vi.fn(async (_args: MockUpdateArgs) => ({})),
    },
  };

  return {
    ...prisma,
    $transaction: vi.fn(async <T>(callback: (tx: typeof prisma) => Promise<T>) =>
      callback(prisma),
    ),
  };
}

function createCanvasServiceMock() {
  return {
    getCanvas: vi.fn(async (): Promise<CanvasLoadResult> => generationCanvas()),
  };
}

function createPromptServiceMock() {
  return {
    composeShotPrompt: vi.fn(async (): Promise<ShotPromptCompositionResult> => composedShotPrompt()),
  };
}

describe("GenerationService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let canvasService: ReturnType<typeof createCanvasServiceMock>;
  let promptService: ReturnType<typeof createPromptServiceMock>;
  let service: GenerationService;

  beforeEach(() => {
    prisma = createPrismaMock();
    canvasService = createCanvasServiceMock();
    promptService = createPromptServiceMock();
    service = new GenerationService(
      prisma as unknown as PrismaService,
      canvasService as unknown as CanvasService,
      promptService as unknown as PromptService,
    );
  });

  it("creates a queued shot-to-image job from the canonical prompt composition", async () => {
    const result = await service.createJob("project_1", {
      operation: "shot_to_image",
      sourceNodeId: "shot_1",
      forceFailure: true,
    });

    expect(promptService.composeShotPrompt).toHaveBeenCalledWith("project_1", "shot_1");
    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        operation: "shot_to_image",
        status: "queued",
        provider: "mock-image",
        model: "mock-image-v1",
        sourceNodeId: "shot_1",
        inputJson: expect.objectContaining({
          prompt: "Image prompt: hero at console",
          negativePrompt: "no text",
          forceFailure: true,
        }),
      }),
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "shot_1" },
      data: { status: "queued" },
    });
    expect(result.job.inputJson).toMatchObject({
      operation: "shot_to_image",
      referenceAssetIds: ["asset_ref_1"],
    });
    expect(result.queueSummary).toMatchObject({ queued: 1, running: 1, failed: 1 });
  });

  it("creates an image-to-video job from an ImageNode and parent Shot context", async () => {
    const result = await service.createJob("project_1", {
      operation: "image_to_video",
      sourceNodeId: "image_1",
    });

    expect(canvasService.getCanvas).toHaveBeenCalledWith("project_1");
    expect(promptService.composeShotPrompt).toHaveBeenCalledWith("project_1", "shot_1");
    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operation: "image_to_video",
        provider: "mock-video",
        model: "mock-video-v1",
        sourceNodeId: "image_1",
        inputJson: expect.objectContaining({
          prompt: "Video prompt: slow push",
          sourceImageAssetId: "asset_image_1",
          parentShotNodeId: "shot_1",
          durationSeconds: 5,
        }),
      }),
    });
    expect(result.job.operation).toBe("image_to_video");
  });

  it("rejects invalid image-to-video source nodes", async () => {
    canvasService.getCanvas.mockResolvedValue(
      canvasLoadResult({
        nodes: [canvasNode<ShotNodeData>("shot_1", "shot", "Shot", { imagePrompt: "not image" })],
      }),
    );

    await expect(
      service.createJob("project_1", { operation: "image_to_video", sourceNodeId: "shot_1" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createJob("project_1", { operation: "image_to_video", sourceNodeId: "missing" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("lists project jobs with queue summary counts", async () => {
    prisma.generationJob.findMany.mockResolvedValueOnce([
      generationJob({ id: "job_2", status: "running" }),
      generationJob({ id: "job_1", status: "queued" }),
    ]);
    prisma.generationJob.findMany.mockResolvedValueOnce([
      { status: "queued" },
      { status: "running" },
      { status: "provider_waiting" },
      { status: "failed" },
    ]);

    const result = await service.listJobs("project_1");

    expect(result.jobs.map((job) => job.id)).toEqual(["job_2", "job_1"]);
    expect(result.queueSummary).toMatchObject({ queued: 1, running: 2, failed: 1 });
  });

  it("claims one queued job and marks its source node running", async () => {
    prisma.generationJob.findFirst.mockResolvedValue(generationJob({ status: "queued" }));
    prisma.generationJob.findUnique.mockResolvedValue(generationJob({ status: "running" }));

    const result = await service.claimNextJob();

    expect(prisma.generationJob.findFirst).toHaveBeenCalledWith({
      where: {
        status: "queued",
        operation: { in: ["shot_to_image", "image_to_video"] },
      },
      orderBy: { createdAt: "asc" },
    });
    expect(prisma.generationJob.updateMany).toHaveBeenCalledWith({
      where: { id: "job_1", status: "queued" },
      data: {
        status: "running",
        errorMessage: null,
        outputJson: expect.anything(),
      },
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "shot_1" },
      data: { status: "running" },
    });
    expect(result.job?.status).toBe("running");
  });

  it("marks active jobs failed without creating media side effects", async () => {
    const failure: ProviderFailure = {
      provider: "mock-image",
      code: "MOCK_PROVIDER_FAILURE",
      message: "mock failure requested",
      retryable: true,
    };
    prisma.generationJob.findUnique.mockResolvedValue(generationJob({ status: "running" }));

    const result = await service.failJob("job_1", failure);

    expect(prisma.generationJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: {
        status: "failed",
        errorMessage: "MOCK_PROVIDER_FAILURE: mock failure requested",
        outputJson: expect.objectContaining({
          error: expect.objectContaining({ code: "MOCK_PROVIDER_FAILURE" }),
        }),
      },
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "shot_1" },
      data: { status: "failed" },
    });
    expect(result.status).toBe("failed");
  });

  it("retries failed jobs by creating a new queued job", async () => {
    prisma.generationJob.findFirst.mockResolvedValue(
      generationJob({
        id: "failed_job",
        status: "failed",
        errorMessage: "provider failed",
      }),
    );
    prisma.generationJob.create.mockResolvedValue(
      generationJob({
        id: "retry_job",
        status: "queued",
      }),
    );

    const result = await service.retryJob("project_1", "failed_job");

    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        operation: "shot_to_image",
        status: "queued",
        sourceNodeId: "shot_1",
        inputJson: expect.objectContaining({ operation: "shot_to_image" }),
      }),
    });
    expect(result.originalJob.status).toBe("failed");
    expect(result.retryJob.id).toBe("retry_job");
    expect(result.retryJob.status).toBe("queued");
  });
});

function shotToImageInput() {
  return {
    operation: "shot_to_image",
    projectId: "project_1",
    sourceNodeId: "shot_1",
    shotNodeId: "shot_1",
    prompt: "Image prompt: hero at console",
    negativePrompt: "no text",
    referenceAssetIds: ["asset_ref_1"],
    sourceNodeIds: {
      shotNodeId: "shot_1",
      sceneNodeId: "scene_1",
      characterNodeIds: ["character_1"],
      locationNodeId: "location_1",
      referenceAssetIds: ["asset_ref_1"],
    },
    debugParts: [],
    missingContext: [],
    provider: "mock-image",
    model: "mock-image-v1",
    providerParams: {},
  };
}

function composedShotPrompt(): ShotPromptCompositionResult {
  return {
    shotNodeId: "shot_1",
    shotTitle: "Shot 01",
    sourceNodeIds: {
      shotNodeId: "shot_1",
      sceneNodeId: "scene_1",
      characterNodeIds: ["character_1"],
      locationNodeId: "location_1",
      referenceAssetIds: ["asset_ref_1"],
    },
    referenceAssetIds: ["asset_ref_1"],
    negativePrompt: "no text",
    image: {
      channel: "image",
      prompt: "Image prompt: hero at console",
      negativePrompt: "no text",
      parts: [],
      missingContext: [],
    },
    video: {
      channel: "video",
      prompt: "Video prompt: slow push",
      negativePrompt: "no text",
      parts: [],
      missingContext: [],
    },
    debugParts: [],
    missingContext: [],
  };
}

function generationCanvas(): CanvasLoadResult {
  return canvasLoadResult({
    nodes: [
      canvasNode<ShotNodeData>("shot_1", "shot", "Shot 01", {
        imagePrompt: "hero at console",
        videoPrompt: "slow push",
        durationSeconds: 5,
      }),
      canvasNode<ImageNodeData>("image_1", "image", "Generated Image", {
        assetId: "asset_image_1",
        prompt: "Image prompt: hero at console",
      }),
    ],
    edges: [canvasEdge("edge_generated_image", "shot_1", "image_1", "generated_image")],
  });
}

function canvasLoadResult(overrides: Partial<CanvasLoadResult> = {}): CanvasLoadResult {
  return {
    canvasDocument: {
      id: "canvas_1",
      projectId: "project_1",
      snapshotJson: {},
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    },
    nodes: [],
    edges: [],
    assets: [],
    ...overrides,
  };
}

function canvasNode<TData>(
  id: string,
  type: CanvasNodeRecord["type"],
  title: string,
  dataJson: TData,
): CanvasNodeRecord<TData> {
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
    dataJson,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

function canvasEdge(
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
  relation: CanvasEdgeRecord["relation"],
): CanvasEdgeRecord {
  return {
    id,
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    sourceNodeId,
    targetNodeId,
    relation,
    createdAt: createdAt.toISOString(),
  };
}
