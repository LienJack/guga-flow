import { BadRequestException, NotFoundException } from "@nestjs/common";
import type {
  CanvasEdgeRecord,
  CanvasLoadResult,
  CanvasNodeRecord,
  ImageProviderCatalogResult,
  ImageNodeData,
  ProviderFailure,
  ShotPromptCompositionResult,
  ShotNodeData,
  ShotToImageJobInput,
  VideoProviderCatalogResult,
} from "@guga-flow/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AssetsService } from "../assets/assets.service";
import { CanvasService } from "../canvas/canvas.service";
import { PrismaService } from "../prisma/prisma.service";
import { PromptService } from "../prompt/prompt.service";
import { ProvidersService } from "../providers/providers.service";
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
    project: {
      findUnique: vi.fn(async (): Promise<{ id: string } | null> => ({ id: "project_1" })),
    },
    asset: {
      create: vi.fn(),
    },
    canvasNode: {
      update: vi.fn(async (_args: MockUpdateArgs) => ({})),
      findFirst: vi.fn(async (_args?: MockFindArgs): Promise<CanvasNodeRecord | null> => null),
      create: vi.fn(async (_args: MockCreateArgs): Promise<CanvasNodeRecord> =>
        canvasNode<ImageNodeData>("image_1", "image", "Generated Image", {}),
      ),
    },
    canvasEdge: {
      create: vi.fn(async (_args: MockCreateArgs): Promise<CanvasEdgeRecord> =>
        canvasEdge("edge_1", "shot_1", "image_1", "generated_image"),
      ),
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

function createAssetsServiceMock() {
  let assetSequence = 1;
  return {
    createGeneratedAsset: vi.fn(
      async (_projectId: string, input: { providerOutput: { storageKey: string; mimeType: string } }) => {
        const id = `asset_generated_${assetSequence}`;
        assetSequence += 1;
        const isImage = input.providerOutput.mimeType.startsWith("image/");
        return {
          id,
          projectId: "project_1",
          type: isImage ? "image" : "video",
          purpose: isImage ? "shot_keyframe" : "shot_clip",
          storageKey: input.providerOutput.storageKey,
          mimeType: input.providerOutput.mimeType,
          originalFilename: input.providerOutput.storageKey.split("/").pop() ?? "generated",
          sizeBytes: 68,
          metadataJson: {},
          previewKind: isImage ? "image" : "video",
          previewUrl: `/api/v1/projects/project_1/assets/${id}/preview`,
          createdAt: createdAt.toISOString(),
        };
      },
    ),
  };
}

function createProvidersServiceMock() {
  return {
    getImageProviders: vi.fn(() => imageProviderCatalogFixture(false)),
    getVideoProviders: vi.fn(() => videoProviderCatalogFixture(false)),
  };
}

function enableImage2(providersService: ReturnType<typeof createProvidersServiceMock>) {
  providersService.getImageProviders.mockReturnValue(imageProviderCatalogFixture(true));
}

function enableSeedance(providersService: ReturnType<typeof createProvidersServiceMock>) {
  providersService.getVideoProviders.mockReturnValue(videoProviderCatalogFixture(true));
}

function imageProviderCatalogFixture(image2Enabled: boolean): ImageProviderCatalogResult {
  return {
    providers: [
      {
        id: "mock-image",
        displayName: "Mock Image",
        enabled: true,
        requiresApiKey: false,
        defaultModel: "mock-image-v1",
        models: [{ id: "mock-image-v1", displayName: "Mock Image v1", default: true }],
        supportedModes: ["text_to_image", "multi_reference"],
        supportsReferenceImages: true,
        maxReferenceImages: 99,
        supportsMultipleOutputs: false,
        maxOutputs: 1,
        defaultAspectRatio: "16:9",
        supportedAspectRatios: ["9:16", "16:9", "1:1"],
        parameters: [],
      },
      {
        id: "image2",
        displayName: "Image 2",
        enabled: image2Enabled,
        disabledReason: image2Enabled ? undefined : "Image 2 server-side key is not configured",
        requiresApiKey: true,
        defaultModel: "gpt-image-2",
        models: [{ id: "gpt-image-2", displayName: "GPT Image 2", default: true }],
        supportedModes: ["text_to_image", "multi_reference"],
        supportsReferenceImages: true,
        maxReferenceImages: 4,
        supportsMultipleOutputs: true,
        maxOutputs: 4,
        defaultAspectRatio: "16:9",
        supportedAspectRatios: ["9:16", "16:9", "1:1"],
        parameters: [
          {
            id: "quality",
            label: "Quality",
            type: "select",
            defaultValue: "medium",
            options: [
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ],
          },
        ],
      },
    ],
  };
}

function videoProviderCatalogFixture(seedanceEnabled: boolean): VideoProviderCatalogResult {
  return {
    providers: [
      {
        id: "mock-video",
        displayName: "Mock Video",
        enabled: true,
        requiresApiKey: false,
        defaultModel: "mock-video-v1",
        models: [{ id: "mock-video-v1", displayName: "Mock Video v1", default: true }],
        supportedModes: ["image_to_video"],
        supportsFirstFrame: true,
        supportsLastFrame: false,
        supportsReferenceImages: true,
        maxReferenceImages: 99,
        supportsCancel: true,
        defaultDurationSeconds: 4,
        supportedDurationSeconds: [4, 5, 6, 8, 10],
        defaultResolution: "720p",
        supportedResolutions: ["720p"],
        defaultAspectRatio: "16:9",
        supportedAspectRatios: ["9:16", "16:9", "1:1"],
        parameters: [],
      },
      {
        id: "seedance",
        displayName: "Seedance",
        enabled: seedanceEnabled,
        disabledReason: seedanceEnabled ? undefined : "Seedance server-side key is not configured",
        requiresApiKey: true,
        defaultModel: "seedance-1-0-pro",
        models: [{ id: "seedance-1-0-pro", displayName: "Seedance 1.0 Pro", default: true }],
        supportedModes: ["text_to_video", "image_to_video"],
        supportsFirstFrame: true,
        supportsLastFrame: false,
        supportsReferenceImages: true,
        maxReferenceImages: 1,
        supportsCancel: true,
        defaultDurationSeconds: 5,
        supportedDurationSeconds: [5, 10],
        defaultResolution: "720p",
        supportedResolutions: ["720p", "1080p"],
        defaultAspectRatio: "16:9",
        supportedAspectRatios: ["9:16", "16:9", "1:1"],
        parameters: [
          {
            id: "cameraFixed",
            label: "Camera fixed",
            type: "boolean",
            defaultValue: false,
          },
        ],
      },
    ],
  };
}

describe("GenerationService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let assetsService: ReturnType<typeof createAssetsServiceMock>;
  let canvasService: ReturnType<typeof createCanvasServiceMock>;
  let promptService: ReturnType<typeof createPromptServiceMock>;
  let providersService: ReturnType<typeof createProvidersServiceMock>;
  let service: GenerationService;

  beforeEach(() => {
    prisma = createPrismaMock();
    assetsService = createAssetsServiceMock();
    canvasService = createCanvasServiceMock();
    promptService = createPromptServiceMock();
    providersService = createProvidersServiceMock();
    service = new GenerationService(
      prisma as unknown as PrismaService,
      assetsService as unknown as AssetsService,
      canvasService as unknown as CanvasService,
      promptService as unknown as PromptService,
      providersService as unknown as ProvidersService,
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

  it("rejects disabled real image providers without mutating jobs or node state", async () => {
    await expect(
      service.createJob("project_1", {
        operation: "shot_to_image",
        sourceNodeId: "shot_1",
        provider: "image2",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.generationJob.create).not.toHaveBeenCalled();
    expect(prisma.canvasNode.update).not.toHaveBeenCalled();
  });

  it("stores selected image provider settings in shot-to-image job input", async () => {
    enableImage2(providersService);

    await service.createJob("project_1", {
      operation: "shot_to_image",
      sourceNodeId: "shot_1",
      provider: "image2",
      model: "gpt-image-2",
      aspectRatio: "9:16",
      count: 3,
      providerParams: { quality: "high", ignored: "secretless" },
    });

    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "image2",
        model: "gpt-image-2",
        inputJson: expect.objectContaining({
          provider: "image2",
          model: "gpt-image-2",
          aspectRatio: "9:16",
          count: 3,
          providerParams: { quality: "high" },
        }),
      }),
    });
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
          aspectRatio: "16:9",
          resolution: "720p",
        }),
      }),
    });
    expect(result.job.operation).toBe("image_to_video");
  });

  it("creates an image-to-video job with enabled real video provider settings", async () => {
    enableSeedance(providersService);

    await service.createJob("project_1", {
      operation: "image_to_video",
      sourceNodeId: "image_1",
      videoProvider: "seedance",
      videoModel: "seedance-1-0-pro",
      videoAspectRatio: "9:16",
      durationSeconds: 10,
      resolution: "1080p",
      videoProviderParams: {
        cameraFixed: true,
        ignored: "not persisted",
      },
    });

    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "seedance",
        model: "seedance-1-0-pro",
        inputJson: expect.objectContaining({
          provider: "seedance",
          model: "seedance-1-0-pro",
          aspectRatio: "9:16",
          durationSeconds: 10,
          resolution: "1080p",
          providerParams: { cameraFixed: true },
          referenceAssetIds: ["asset_ref_1"],
        }),
      }),
    });
  });

  it("rejects disabled or unsupported video provider settings", async () => {
    await expect(
      service.createJob("project_1", {
        operation: "image_to_video",
        sourceNodeId: "image_1",
        videoProvider: "seedance",
      }),
    ).rejects.toThrow("Seedance server-side key is not configured");

    await expect(
      service.createJob("project_1", {
        operation: "image_to_video",
        sourceNodeId: "image_1",
        durationSeconds: 15,
      }),
    ).rejects.toThrow("Duration 15s is not available for Mock Video");
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
    expect(result.queueSummary).toMatchObject({
      queued: 1,
      running: 2,
      providerWaiting: 1,
      succeeded: 0,
      failed: 1,
      cancelled: 0,
    });
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

  it("completes shot-to-image jobs with generated asset, node, edge, and output trace", async () => {
    prisma.generationJob.findUnique.mockResolvedValue(generationJob({ status: "running" }));
    prisma.canvasNode.findFirst.mockResolvedValue(
      canvasNode<ShotNodeData>("shot_1", "shot", "Shot 01", {
        imagePrompt: "hero at console",
      }),
    );
    prisma.canvasNode.create.mockResolvedValue(
      canvasNode<ImageNodeData>("image_1", "image", "Shot 01 Image", {
        assetId: "asset_generated_1",
      }),
    );
    prisma.canvasEdge.create.mockResolvedValue(
      canvasEdge("edge_generated_image_1", "shot_1", "image_1", "generated_image"),
    );
    prisma.generationJob.update.mockResolvedValue(
      generationJob({
        status: "succeeded",
        targetNodeId: "image_1",
        outputJson: {
          operation: "shot_to_image",
          assetId: "asset_generated_1",
          targetNodeId: "image_1",
          edgeId: "edge_generated_image_1",
        },
      }),
    );

    const result = await service.succeedJob("job_1", {
      assetId: "provider_asset_1",
      storageKey: "mock/images/provider_asset_1.png",
      mimeType: "image/png",
      provider: "mock-image",
      model: "mock-image-v1",
      prompt: "Image prompt: hero at console",
      referenceAssetIds: ["asset_ref_1"],
    });

    expect(assetsService.createGeneratedAsset).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        purpose: "shot_keyframe",
        providerOutput: expect.objectContaining({
          storageKey: "mock/images/provider_asset_1.png",
        }),
        metadataJson: expect.objectContaining({
          generationJobId: "job_1",
          operation: "shot_to_image",
          sourceNodeId: "shot_1",
        }),
      }),
      expect.any(Object),
    );
    expect(prisma.canvasNode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        canvasDocumentId: "canvas_1",
        type: "image",
        title: "Shot 01 Image",
        status: "succeeded",
        dataJson: expect.objectContaining({
          assetId: "asset_generated_1",
          generationJobId: "job_1",
          generationOperation: "shot_to_image",
          generatedFromNodeId: "shot_1",
        }),
      }),
    });
    expect(prisma.canvasEdge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceNodeId: "shot_1",
        targetNodeId: "image_1",
        relation: "generated_image",
        dataJson: expect.objectContaining({
          generationJobId: "job_1",
          assetId: "asset_generated_1",
        }),
      }),
    });
    expect(prisma.generationJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        status: "succeeded",
        targetNodeId: "image_1",
        errorMessage: null,
        outputJson: expect.objectContaining({
          operation: "shot_to_image",
          targetNodeId: "image_1",
          assetId: "asset_generated_1",
          edgeId: "edge_generated_image_1",
        }),
      }),
    });
    expect(result.status).toBe("succeeded");
    expect(result.targetNodeId).toBe("image_1");
  });

  it("completes multi-output shot-to-image jobs with one asset, node, and edge per output", async () => {
    const image2Input = shotToImageInput({
      provider: "image2",
      model: "gpt-image-2",
      aspectRatio: "16:9",
      count: 3,
      providerParams: { quality: "high" },
    });
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        status: "running",
        provider: "image2",
        model: "gpt-image-2",
        inputJson: image2Input,
      }),
    );
    prisma.canvasNode.findFirst.mockResolvedValue(
      canvasNode<ShotNodeData>("shot_1", "shot", "Shot 01", {
        imagePrompt: "hero at console",
      }),
    );
    prisma.canvasNode.create
      .mockResolvedValueOnce(canvasNode<ImageNodeData>("image_1", "image", "Shot 01 Image", {}))
      .mockResolvedValueOnce(canvasNode<ImageNodeData>("image_2", "image", "Shot 01 Image 2", {}))
      .mockResolvedValueOnce(canvasNode<ImageNodeData>("image_3", "image", "Shot 01 Image 3", {}));
    prisma.canvasEdge.create
      .mockResolvedValueOnce(canvasEdge("edge_1", "shot_1", "image_1", "generated_image"))
      .mockResolvedValueOnce(canvasEdge("edge_2", "shot_1", "image_2", "generated_image"))
      .mockResolvedValueOnce(canvasEdge("edge_3", "shot_1", "image_3", "generated_image"));
    prisma.generationJob.update.mockImplementation(async (args: MockUpdateArgs) =>
      generationJob({
        id: args.where.id,
        status: args.data.status,
        targetNodeId: args.data.targetNodeId,
        outputJson: args.data.outputJson,
      }),
    );
    const providerOutputs = [1, 2, 3].map((index) => ({
      assetId: `provider_asset_${index}`,
      storageKey: `providers/image2/project_1/generated_${index}.png`,
      mimeType: "image/png",
      provider: "image2",
      model: "gpt-image-2",
      prompt: `Image prompt ${index}`,
      referenceAssetIds: ["asset_ref_1"],
      bytesBase64: Buffer.from(`image-${index}`).toString("base64"),
    }));

    const result = await service.succeedJob("job_1", providerOutputs[0]!, providerOutputs);

    expect(assetsService.createGeneratedAsset).toHaveBeenCalledTimes(3);
    expect(prisma.canvasNode.create).toHaveBeenCalledTimes(3);
    expect(prisma.canvasEdge.create).toHaveBeenCalledTimes(3);
    expect(prisma.canvasNode.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          tldrawShapeId: "shape:generated-job_1-image-2",
          title: "Shot 01 Image 2",
          x: 800,
          y: 40,
        }),
      }),
    );

    const updateCall = prisma.generationJob.update.mock.calls.at(-1)?.[0] as MockUpdateArgs;
    expect(updateCall.data).toMatchObject({
      status: "succeeded",
      targetNodeId: "image_1",
    });
    expect(updateCall.data.outputJson).toMatchObject({
      operation: "shot_to_image",
      targetNodeId: "image_1",
      assetId: "asset_generated_1",
      edgeId: "edge_1",
      targets: [
        expect.objectContaining({ targetNodeId: "image_1", assetId: "asset_generated_1" }),
        expect.objectContaining({ targetNodeId: "image_2", assetId: "asset_generated_2" }),
        expect.objectContaining({ targetNodeId: "image_3", assetId: "asset_generated_3" }),
      ],
    });
    expect(result.targetNodeId).toBe("image_1");
  });

  it("rejects completion when generated asset persistence fails without graph side effects", async () => {
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        status: "running",
        provider: "image2",
        model: "gpt-image-2",
        inputJson: shotToImageInput({ provider: "image2", model: "gpt-image-2" }),
      }),
    );
    prisma.canvasNode.findFirst.mockResolvedValue(
      canvasNode<ShotNodeData>("shot_1", "shot", "Shot 01", {
        imagePrompt: "hero at console",
      }),
    );
    assetsService.createGeneratedAsset.mockRejectedValueOnce(
      new BadRequestException("Generated asset remote download failed with 404"),
    );

    await expect(
      service.succeedJob("job_1", {
        storageKey: "providers/image2/project_1/remote.png",
        mimeType: "image/png",
        provider: "image2",
        model: "gpt-image-2",
        prompt: "remote image",
        referenceAssetIds: [],
        remoteUrl: "https://cdn.example.test/missing.png",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.canvasNode.create).not.toHaveBeenCalled();
    expect(prisma.canvasEdge.create).not.toHaveBeenCalled();
    expect(prisma.generationJob.update).not.toHaveBeenCalled();
  });

  it("rejects shot image completions with more outputs than the requested count", async () => {
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        status: "running",
        provider: "image2",
        model: "gpt-image-2",
        inputJson: shotToImageInput({ provider: "image2", model: "gpt-image-2", count: 1 }),
      }),
    );
    const providerOutputs = [1, 2].map((index) => ({
      storageKey: `providers/image2/project_1/generated_${index}.png`,
      mimeType: "image/png",
      provider: "image2",
      model: "gpt-image-2",
      prompt: `Image prompt ${index}`,
      referenceAssetIds: [],
    }));

    await expect(service.succeedJob("job_1", providerOutputs[0]!, providerOutputs)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(assetsService.createGeneratedAsset).not.toHaveBeenCalled();
    expect(prisma.canvasNode.create).not.toHaveBeenCalled();
  });

  it("rejects provider outputs that do not match the active job operation", async () => {
    prisma.generationJob.findUnique.mockResolvedValue(generationJob({ status: "running" }));

    await expect(
      service.succeedJob("job_1", {
        storageKey: "mock/videos/wrong.mp4",
        mimeType: "video/mp4",
        provider: "mock-image",
        model: "mock-image-v1",
        prompt: "wrong kind",
        referenceAssetIds: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(assetsService.createGeneratedAsset).not.toHaveBeenCalled();
  });

  it("retries failed jobs by creating a new queued job", async () => {
    const failedInput = shotToImageInput({
      provider: "image2",
      model: "gpt-image-2",
      aspectRatio: "9:16",
      count: 3,
      providerParams: { quality: "high" },
    });
    prisma.generationJob.findFirst.mockResolvedValue(
      generationJob({
        id: "failed_job",
        status: "failed",
        provider: "image2",
        model: "gpt-image-2",
        inputJson: failedInput,
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
        inputJson: expect.objectContaining({
          operation: "shot_to_image",
          provider: "image2",
          model: "gpt-image-2",
          aspectRatio: "9:16",
          count: 3,
          providerParams: { quality: "high" },
        }),
      }),
    });
    expect(result.originalJob.status).toBe("failed");
    expect(result.retryJob.id).toBe("retry_job");
    expect(result.retryJob.status).toBe("queued");
  });
});

function shotToImageInput(overrides: Partial<ShotToImageJobInput> = {}): ShotToImageJobInput {
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
    ...overrides,
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
