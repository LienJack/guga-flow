import { BadRequestException, NotFoundException } from "@nestjs/common";
import type {
  AiAudioGenerationJobInput,
  AiAudioNodeData,
  AiTextGenerationJobInput,
  AiTextGenerationJobOutput,
  AiTextNodeData,
  AssetAnalysisJobInput,
  AssetAnalysisJobOutput,
  CanvasEdgeRecord,
  CanvasLoadResult,
  CanvasNodeRecord,
  CharacterAssetNodeData,
  CharacterToImageJobInput,
  EditorExportJobInput,
  EditorExportPackageOutput,
  GeneratedMediaProviderOutput,
  ImageProviderCatalogResult,
  ImageRefinementJobInput,
  ImageNodeData,
  ImageToVideoJobInput,
  LocationAssetNodeData,
  LlmProviderCatalogResult,
  ProviderFailure,
  ResolvedGenerationSettings,
  ShotPromptCompositionResult,
  ShotNodeData,
  ShotToImageJobInput,
  VideoNodeData,
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
          targetNodeId: args.data.targetNodeId ?? null,
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
      findFirst: vi.fn(async (_args?: MockFindArgs) => ({
        id: "asset_1",
        metadataJson: { generatedAssetIds: ["asset_existing_generated"] },
      })),
      update: vi.fn(async (_args: MockUpdateArgs) => ({})),
    },
    canvasNode: {
      update: vi.fn(async (_args: MockUpdateArgs) => ({})),
      findFirst: vi.fn(async (_args?: MockFindArgs): Promise<CanvasNodeRecord | null> => null),
      findMany: vi.fn(async (_args?: MockFindArgs): Promise<CanvasNodeRecord[]> => []),
      create: vi.fn(async (_args: MockCreateArgs): Promise<CanvasNodeRecord> =>
        canvasNode<ImageNodeData>("image_1", "image", "Generated Image", {}),
      ),
    },
    canvasEdge: {
      create: vi.fn(async (_args: MockCreateArgs): Promise<CanvasEdgeRecord> =>
        canvasEdge("edge_1", "shot_1", "image_1", "generated_image"),
      ),
    },
    editorExport: {
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
    composeShotPrompt: vi.fn(
      async (_projectId: string, _shotNodeId: string): Promise<ShotPromptCompositionResult> =>
        composedShotPrompt(),
    ),
  };
}

function assetTypeForId(assetId: string): "image" | "video" | "audio" {
  if (/audio|voice|bgm|music/i.test(assetId)) {
    return "audio";
  }
  return assetId.includes("video") ? "video" : "image";
}

function assetMimeTypeForId(assetId: string): "image/png" | "video/mp4" | "audio/mpeg" {
  const type = assetTypeForId(assetId);
  if (type === "audio") {
    return "audio/mpeg";
  }
  return type === "video" ? "video/mp4" : "image/png";
}

function createAssetsServiceMock() {
  let assetSequence = 1;
  return {
    getAsset: vi.fn(async (_projectId: string, assetId: string) => ({
      id: assetId,
      projectId: "project_1",
      type: assetTypeForId(assetId),
      purpose: assetTypeForId(assetId) === "audio" ? "voice_reference" : "uploaded",
      storageKey: `project_1/${assetId}.${assetTypeForId(assetId) === "audio" ? "mp3" : assetId.includes("video") ? "mp4" : "png"}`,
      mimeType: assetMimeTypeForId(assetId),
      originalFilename: `${assetId}.${assetTypeForId(assetId) === "audio" ? "mp3" : assetId.includes("video") ? "mp4" : "png"}`,
      sizeBytes: 68,
      metadataJson: {},
      previewKind: assetTypeForId(assetId),
      previewUrl: `/api/v1/projects/project_1/assets/${assetId}/preview`,
      createdAt: createdAt.toISOString(),
    })),
    createGeneratedAsset: vi.fn(
      async (
        _projectId: string,
        input: { providerOutput: { storageKey: string; mimeType: string }; purpose?: string },
      ) => {
        const id = `asset_generated_${assetSequence}`;
        assetSequence += 1;
        const isImage = input.providerOutput.mimeType.startsWith("image/");
        const isAudio = input.providerOutput.mimeType.startsWith("audio/");
        return {
          id,
          projectId: "project_1",
          type: isAudio ? "audio" : isImage ? "image" : "video",
          purpose: input.purpose ?? (isAudio ? "shot_audio" : isImage ? "shot_keyframe" : "shot_clip"),
          storageKey: input.providerOutput.storageKey,
          mimeType: input.providerOutput.mimeType,
          originalFilename: input.providerOutput.storageKey.split("/").pop() ?? "generated",
          sizeBytes: 68,
          metadataJson: {},
          previewKind: isAudio ? "audio" : isImage ? "image" : "video",
          previewUrl: `/api/v1/projects/project_1/assets/${id}/preview`,
          createdAt: createdAt.toISOString(),
        };
      },
    ),
    createPackageAsset: vi.fn(async (_projectId: string, input: { packageOutput: EditorExportPackageOutput }) => ({
      id: "asset_package_1",
      projectId: "project_1",
      type: "package",
      purpose: "editor_package",
      storageKey: input.packageOutput.storageKey,
      mimeType: input.packageOutput.mimeType,
      originalFilename: input.packageOutput.storageKey.split("/").pop() ?? "export.zip",
      sizeBytes: input.packageOutput.sizeBytes ?? 256,
      metadataJson: {},
      previewKind: "metadata",
      previewUrl: `/api/v1/projects/project_1/assets/asset_package_1/preview`,
      createdAt: createdAt.toISOString(),
    })),
    applyAssetAnalysis: vi.fn(async () => []),
    applyMediaMetadata: vi.fn(async () => []),
    applyAssetPromptPolish: vi.fn(async () => []),
  };
}

function createProvidersServiceMock() {
  return {
    getImageProviders: vi.fn(() => imageProviderCatalogFixture(false)),
    getVideoProviders: vi.fn(() => videoProviderCatalogFixture(false)),
    getProjectLlmProviders: vi.fn(async () => llmProviderCatalogFixture(false)),
    getProjectImageProviders: vi.fn(async () => imageProviderCatalogFixture(false)),
    getProjectVideoProviders: vi.fn(async () => videoProviderCatalogFixture(false)),
    getRuntimeProviderConfig: vi.fn(async () => ({
      kind: "image",
      provider: "mock-image",
      env: {},
    })),
  };
}

function enableImage2(providersService: ReturnType<typeof createProvidersServiceMock>) {
  providersService.getImageProviders.mockReturnValue(imageProviderCatalogFixture(true));
  providersService.getProjectImageProviders.mockResolvedValue(imageProviderCatalogFixture(true));
}

function enableSeedance(providersService: ReturnType<typeof createProvidersServiceMock>) {
  providersService.getVideoProviders.mockReturnValue(videoProviderCatalogFixture(true));
  providersService.getProjectVideoProviders.mockResolvedValue(videoProviderCatalogFixture(true));
}

function enableProgrammableImage(providersService: ReturnType<typeof createProvidersServiceMock>) {
  providersService.getProjectImageProviders.mockResolvedValue({
    providers: [
      ...imageProviderCatalogFixture(false).providers,
      {
        id: "custom:atlas-cloud",
        providerVersionId: "programmable_version_1",
        displayName: "Atlas Cloud",
        enabled: true,
        requiresApiKey: true,
        defaultModel: "atlas-image-v1",
        models: [{ id: "atlas-image-v1", displayName: "Atlas Image v1", default: true }],
        supportedModes: ["text_to_image"],
        supportsReferenceImages: false,
        maxReferenceImages: 0,
        supportsMultipleOutputs: false,
        maxOutputs: 1,
        defaultAspectRatio: "16:9",
        supportedAspectRatios: ["16:9"],
        parameters: [],
      },
    ],
  });
}

function llmProviderCatalogFixture(genericEnabled: boolean): LlmProviderCatalogResult {
  return {
    providers: [
      {
        id: "mock-llm",
        displayName: "Mock LLM",
        enabled: true,
        requiresApiKey: false,
        defaultModel: "mock-storyboard",
        models: [{ id: "mock-storyboard", displayName: "Mock Storyboard", default: true }],
        supportedModes: ["chat", "json"],
        supportsJsonMode: true,
        supportsToolCalls: false,
        supportsVision: false,
        defaultContextWindowTokens: 32000,
        maxOutputTokens: 4096,
        parameters: [],
      },
      {
        id: "generic-llm",
        displayName: "Generic LLM Provider",
        enabled: genericEnabled,
        disabledReason: genericEnabled ? undefined : "Generic LLM Provider server-side key is not configured",
        requiresApiKey: true,
        defaultModel: "chat-model",
        models: [{ id: "chat-model", displayName: "Chat model", default: true }],
        supportedModes: ["chat", "text", "json"],
        supportsJsonMode: true,
        supportsToolCalls: true,
        supportsVision: false,
        parameters: [],
      },
    ],
  };
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
        supportedModes: ["text_to_image", "image_to_image", "multi_reference"],
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
        supportedModes: ["text_to_image", "image_to_image", "multi_reference"],
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
        models: [
          { id: "mock-video-v1", displayName: "Mock Video v1", default: true, modes: ["image_to_video"] },
        ],
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
        models: [
          {
            id: "seedance-1-0-pro",
            displayName: "Seedance 1.0 Pro",
            default: true,
            modes: ["text_to_video", "image_to_video"],
          },
          {
            id: "seedance-text-only",
            displayName: "Seedance Text Only",
            modes: ["text_to_video"],
          },
        ],
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
          generationSettings: expect.objectContaining({
            sources: expect.objectContaining({
              visualStyle: "project",
              aspectRatio: "shot",
              visualManual: "shot",
              directorManual: "shot",
            }),
          }),
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
      generationSettings: {
        effective: expect.objectContaining({
          visualStyle: "project cinematic noir",
          aspectRatio: "16:9",
          visualManual: expect.objectContaining({
            artStyle: "project rainy noir",
            lens: "shot long lens",
          }),
          directorManual: expect.objectContaining({
            pacing: "project slow-burn",
            cameraLanguage: "shot surveillance angle",
          }),
        }),
      },
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

  it("stores programmable image provider version metadata without credentials in job input", async () => {
    enableProgrammableImage(providersService);

    await service.createJob("project_1", {
      operation: "shot_to_image",
      sourceNodeId: "shot_1",
      provider: "custom:atlas-cloud",
      model: "atlas-image-v1",
    });

    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "custom:atlas-cloud",
        model: "atlas-image-v1",
        inputJson: expect.objectContaining({
          provider: "custom:atlas-cloud",
          providerVersionId: "programmable_version_1",
          model: "atlas-image-v1",
          referenceAssetIds: [],
        }),
      }),
    });
    expect(JSON.stringify(vi.mocked(prisma.generationJob.create).mock.calls)).not.toContain("sk-secret");
  });

  it("creates a character reference image job from Character node data", async () => {
    const result = await service.createJob("project_1", {
      operation: "character_to_image",
      sourceNodeId: "character_1",
      provider: "mock-image",
      aspectRatio: "1:1",
    });

    expect(canvasService.getCanvas).toHaveBeenCalledWith("project_1");
    expect(promptService.composeShotPrompt).not.toHaveBeenCalled();
    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operation: "character_to_image",
        provider: "mock-image",
        model: "mock-image-v1",
        sourceNodeId: "character_1",
        inputJson: expect.objectContaining({
          operation: "character_to_image",
          characterNodeId: "character_1",
          prompt: expect.stringContaining("consistent hero character reference"),
          referenceAssetIds: ["asset_character_ref"],
          assetPurpose: "character_reference",
        }),
      }),
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "character_1" },
      data: { status: "queued" },
    });
    expect(result.job.operation).toBe("character_to_image");
  });

  it("creates a location reference image job from Location node data", async () => {
    const result = await service.createJob("project_1", {
      operation: "location_to_image",
      sourceNodeId: "location_1",
      provider: "mock-image",
      aspectRatio: "16:9",
    });

    expect(canvasService.getCanvas).toHaveBeenCalledWith("project_1");
    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operation: "location_to_image",
        provider: "mock-image",
        model: "mock-image-v1",
        sourceNodeId: "location_1",
        inputJson: expect.objectContaining({
          operation: "location_to_image",
          locationNodeId: "location_1",
          prompt: expect.stringContaining("rooftop control room with glowing signal screens"),
          referenceAssetIds: ["asset_location_ref"],
          assetPurpose: "location_reference",
        }),
      }),
    });
    expect(result.job.operation).toBe("location_to_image");
  });

  it("rejects character reference generation from the wrong node type", async () => {
    await expect(
      service.createJob("project_1", {
        operation: "character_to_image",
        sourceNodeId: "location_1",
      }),
    ).rejects.toThrow("Character reference generation requires a Character node");
    expect(prisma.generationJob.create).not.toHaveBeenCalled();
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
          referenceMedia: [
            { assetId: "asset_image_1", role: "first_frame", sourceNodeId: "image_1" },
            { assetId: "asset_ref_1", role: "reference_image" },
          ],
          videoProviderMode: "image_to_video",
          videoPromptMode: "generic_multi_reference",
          videoPromptDebugSummary: {
            mode: "generic_multi_reference",
            providerMode: "image_to_video",
            provider: "mock-video",
            model: "mock-video-v1",
            supportedModes: ["image_to_video"],
            modelSupportedModes: ["image_to_video"],
            referenceMediaRoles: ["first_frame", "reference_image"],
            debugPartKinds: [],
            missingContextKinds: [],
            checks: [
              {
                code: "missing_dialogue",
                severity: "warning",
                message: "The parent Shot has no dialogue; the video prompt will rely on visual/action context.",
                sourceNodeId: "shot_1",
              },
            ],
          },
          generationSettings: expect.objectContaining({
            effective: expect.objectContaining({
              visualStyle: "project cinematic noir",
              aspectRatio: "16:9",
            }),
          }),
        }),
      }),
    });
    expect(result.job.operation).toBe("image_to_video");
    expect(assetsService.getAsset).toHaveBeenCalledWith("project_1", "asset_image_1");
    expect(assetsService.getAsset).toHaveBeenCalledWith("project_1", "asset_ref_1");
  });

  it("creates an AI text job from upstream canvas text context", async () => {
    canvasService.getCanvas.mockResolvedValue(
      canvasLoadResult({
        nodes: [
          canvasNode<AiTextNodeData>("ai_text_1", "ai_text", "AI Outline", {
            prompt: "Draft a quiet thriller outline.",
          }),
          canvasNode("source_text_1", "source_text", "Source excerpt", {
            textPreview: "The station clock stops at midnight.",
            originalFilename: "chapter-01.txt",
          }),
          canvasNode<ShotNodeData>("shot_1", "shot", "Shot 01", {
            shotNumber: "001",
            visualDescription: "Ari watches signal lights blink out.",
            dialogue: "The relay is gone.",
          }),
          canvasNode<CharacterAssetNodeData>("character_1", "character_asset", "Ari", {
            name: "Ari",
            role: "signal analyst",
            appearance: "rain-damp hair and a dark utility coat",
          }),
          canvasNode<LocationAssetNodeData>("location_1", "location_asset", "Control Room", {
            name: "Control Room",
            environment: "near-future rooftop control room",
            mood: "tense and rainy",
          }),
        ],
        edges: [
          canvasEdge("edge_source_text", "source_text_1", "ai_text_1", "derived_from"),
          canvasEdge("edge_shot", "shot_1", "ai_text_1", "derived_from"),
          canvasEdge("edge_character", "character_1", "ai_text_1", "derived_from"),
          canvasEdge("edge_location", "location_1", "ai_text_1", "derived_from"),
        ],
      }),
    );

    const result = await service.createJob("project_1", {
      operation: "ai_text_generation",
      sourceNodeId: "ai_text_1",
      textPrompt: "Write a two-beat sequence.",
      llmProvider: "mock-llm",
      skillTemplateIds: ["preset_text_1"],
    });

    expect(providersService.getProjectLlmProviders).toHaveBeenCalledWith("project_1");
    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        operation: "ai_text_generation",
        status: "queued",
        provider: "mock-llm",
        model: "mock-storyboard",
        sourceNodeId: "ai_text_1",
        inputJson: expect.objectContaining({
          operation: "ai_text_generation",
          prompt: "Write a two-beat sequence.",
          aiTextNodeId: "ai_text_1",
          skillTemplateIds: ["preset_text_1"],
          sourceNodeIds: ["ai_text_1", "source_text_1", "shot_1", "character_1", "location_1"],
          context: [
            expect.objectContaining({
              nodeId: "source_text_1",
              text: expect.stringContaining("The station clock stops at midnight."),
            }),
            expect.objectContaining({
              nodeId: "shot_1",
              text: expect.stringContaining("Visual description: Ari watches signal lights blink out."),
            }),
            expect.objectContaining({
              nodeId: "character_1",
              text: expect.stringContaining("Role: signal analyst"),
            }),
            expect.objectContaining({
              nodeId: "location_1",
              text: expect.stringContaining("Environment: near-future rooftop control room"),
            }),
          ],
        }),
      }),
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "ai_text_1" },
      data: { status: "queued" },
    });
    expect(result.job.operation).toBe("ai_text_generation");
  });

  it("creates a queued AI audio generation job with voice and shot audio context", async () => {
    canvasService.getCanvas.mockResolvedValue(
      canvasLoadResult({
        nodes: [
          canvasNode<AiAudioNodeData>("ai_audio_1", "ai_audio", "Ari Narration", {
            prompt: "Record Ari's narration.",
            voiceReferenceAssetIds: ["asset_voice_seed"],
            durationSeconds: 6,
          }),
          canvasNode<CharacterAssetNodeData>("character_1", "character_asset", "Ari", {
            name: "Ari",
            role: "signal analyst",
            appearance: "rain-damp hair and a dark utility coat",
            voiceAssetIds: ["asset_voice_1"],
          }),
          canvasNode<ShotNodeData>("shot_1", "shot", "Shot 01", {
            shotNumber: "001",
            visualDescription: "Ari watches signal lights blink out.",
            dialogue: "We move now.",
            audioReferences: [{ assetId: "asset_audio_1", role: "clip_audio", label: "Temp cut" }],
          }),
        ],
        edges: [
          canvasEdge("edge_character_audio", "character_1", "ai_audio_1", "derived_from"),
          canvasEdge("edge_shot_audio", "shot_1", "ai_audio_1", "derived_from"),
        ],
      }),
    );

    const result = await service.createJob("project_1", {
      operation: "ai_audio_generation",
      sourceNodeId: "ai_audio_1",
      audioPrompt: "Read Ari's line as a tense whisper.",
      audioDurationSeconds: 8,
      skillTemplateIds: ["preset_audio_1"],
    });

    expect(assetsService.getAsset).toHaveBeenCalledWith("project_1", "asset_voice_seed");
    expect(assetsService.getAsset).toHaveBeenCalledWith("project_1", "asset_voice_1");
    expect(assetsService.getAsset).toHaveBeenCalledWith("project_1", "asset_audio_1");
    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        operation: "ai_audio_generation",
        status: "queued",
        provider: "mock-audio",
        model: "mock-tts-v1",
        sourceNodeId: "ai_audio_1",
        inputJson: expect.objectContaining({
          operation: "ai_audio_generation",
          aiAudioNodeId: "ai_audio_1",
          prompt: "Read Ari's line as a tense whisper.",
          scriptText: "Read Ari's line as a tense whisper.",
          durationSeconds: 8,
          skillTemplateIds: ["preset_audio_1"],
          sourceNodeIds: ["ai_audio_1", "character_1", "shot_1"],
          referenceAssetIds: ["asset_voice_seed", "asset_voice_1", "asset_audio_1"],
          context: [
            expect.objectContaining({
              nodeId: "character_1",
              text: expect.stringContaining("Role: signal analyst"),
            }),
            expect.objectContaining({
              nodeId: "character_1",
              assetId: "asset_voice_1",
              role: "voice",
            }),
            expect.objectContaining({
              nodeId: "shot_1",
              text: expect.stringContaining("Dialogue: We move now."),
            }),
            expect.objectContaining({
              nodeId: "shot_1",
              assetId: "asset_audio_1",
              role: "clip_audio",
              label: "Temp cut",
            }),
          ],
        }),
      }),
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "ai_audio_1" },
      data: { status: "queued" },
    });
    expect(result.job.operation).toBe("ai_audio_generation");
  });

  it("rejects disabled LLM providers before queuing AI text jobs", async () => {
    canvasService.getCanvas.mockResolvedValue(
      canvasLoadResult({
        nodes: [
          canvasNode<AiTextNodeData>("ai_text_1", "ai_text", "AI Outline", {
            prompt: "Draft a quiet thriller outline.",
          }),
        ],
      }),
    );

    await expect(
      service.createJob("project_1", {
        operation: "ai_text_generation",
        sourceNodeId: "ai_text_1",
        textPrompt: "Write a beat sheet.",
        llmProvider: "generic-llm",
      }),
    ).rejects.toThrow("Generic LLM Provider server-side key is not configured");

    expect(prisma.generationJob.create).not.toHaveBeenCalled();
    expect(prisma.canvasNode.update).not.toHaveBeenCalled();
  });

  it("creates a queued asset analysis job after validating and deduping assets", async () => {
    const result = await service.createAssetAnalysisJob("project_1", {
      operation: "asset_caption",
      assetIds: ["asset_1", "asset_1"],
      prompt: "Describe production details",
      overwrite: true,
    });

    expect(assetsService.getAsset).toHaveBeenCalledTimes(1);
    expect(assetsService.getAsset).toHaveBeenCalledWith("project_1", "asset_1");
    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        operation: "asset_caption",
        status: "queued",
        provider: "mock-vision",
        model: "mock-vision-v1",
        inputJson: expect.objectContaining({
          operation: "asset_caption",
          assetIds: ["asset_1"],
          prompt: "Describe production details",
          overwrite: true,
        }),
      }),
    });
    expect(result.job.inputJson).toMatchObject({
      operation: "asset_caption",
      assetIds: ["asset_1"],
    });
  });

  it("creates a queued media metadata job under the worker asset classification operation", async () => {
    const result = await service.createMediaMetadataJob("project_1", {
      operation: "media_metadata",
      assetIds: ["asset_video_1", "asset_video_1"],
      createThumbnail: true,
    });

    expect(assetsService.getAsset).toHaveBeenCalledTimes(1);
    expect(assetsService.getAsset).toHaveBeenCalledWith("project_1", "asset_video_1");
    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        operation: "asset_classification",
        status: "queued",
        provider: "mock-media",
        model: "metadata-v1",
        inputJson: expect.objectContaining({
          operation: "media_metadata",
          assetIds: ["asset_video_1"],
          createThumbnail: true,
          overwrite: false,
        }),
      }),
    });
    expect(result.job.operation).toBe("asset_classification");
    expect(result.job.inputJson).toMatchObject({
      operation: "media_metadata",
      assetIds: ["asset_video_1"],
    });
  });

  it("rejects media metadata jobs for non-media assets", async () => {
    await expect(
      service.createMediaMetadataJob("project_1", {
        operation: "media_metadata",
        assetIds: ["asset_1"],
      }),
    ).rejects.toThrow("Media metadata jobs support only video or audio assets");

    expect(prisma.generationJob.create).not.toHaveBeenCalled();
  });

  it("creates a queued asset prompt polish job under the asset caption operation", async () => {
    const result = await service.createAssetPromptPolishJob("project_1", {
      operation: "asset_prompt_polish",
      assetIds: ["asset_1", "asset_1"],
    });

    expect(assetsService.getAsset).toHaveBeenCalledWith("project_1", "asset_1");
    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        operation: "asset_caption",
        status: "queued",
        provider: "mock-llm",
        model: "mock-polish-v1",
        inputJson: expect.objectContaining({
          operation: "asset_prompt_polish",
          assetIds: ["asset_1"],
          items: [
            expect.objectContaining({
              assetId: "asset_1",
              prompt: expect.stringContaining("asset_1.png"),
            }),
          ],
        }),
      }),
    });
    expect(result.job.operation).toBe("asset_caption");
    expect(result.job.inputJson.operation).toBe("asset_prompt_polish");
  });

  it("creates a queued asset image generation job from polished asset prompts", async () => {
    assetsService.getAsset.mockResolvedValueOnce({
      id: "asset_1",
      projectId: "project_1",
      type: "image",
      purpose: "uploaded",
      storageKey: "project_1/asset_1.png",
      mimeType: "image/png",
      originalFilename: "asset_1.png",
      sizeBytes: 68,
      metadataJson: { polishedPrompt: "Polished hero prompt" },
      previewKind: "image",
      previewUrl: "/api/v1/projects/project_1/assets/asset_1/preview",
      createdAt: createdAt.toISOString(),
    });

    const result = await service.createAssetImageGenerationJob("project_1", {
      operation: "asset_image_generation",
      assetIds: ["asset_1"],
      provider: "mock-image",
      count: 1,
    });

    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        operation: "shot_to_image",
        status: "queued",
        provider: "mock-image",
        model: "mock-image-v1",
        inputJson: expect.objectContaining({
          operation: "asset_image_generation",
          assetIds: ["asset_1"],
          items: [{ assetId: "asset_1", prompt: "Polished hero prompt" }],
          aspectRatio: "16:9",
          count: 1,
        }),
      }),
    });
    expect(result.job.operation).toBe("shot_to_image");
    expect(result.job.inputJson.operation).toBe("asset_image_generation");
  });

  it("creates an image refinement job from an ImageNode asset and prompt", async () => {
    const result = await service.createJob("project_1", {
      operation: "image_refinement",
      sourceNodeId: "image_1",
      refinementPrompt: "make the lighting warmer",
      provider: "mock-image",
      aspectRatio: "16:9",
      providerParams: {},
    });

    expect(canvasService.getCanvas).toHaveBeenCalledWith("project_1");
    expect(promptService.composeShotPrompt).toHaveBeenCalledWith("project_1", "shot_1");
    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operation: "image_refinement",
        provider: "mock-image",
        model: "mock-image-v1",
        sourceNodeId: "image_1",
        inputJson: expect.objectContaining({
          operation: "image_refinement",
          imageNodeId: "image_1",
          sourceImageAssetId: "asset_image_1",
          prompt: "make the lighting warmer",
          sourceNodeIds: ["image_1", "shot_1", "scene_1", "character_1", "location_1"],
          generationSettings: expect.objectContaining({
            effective: expect.objectContaining({
              visualStyle: "project cinematic noir",
              visualManual: expect.objectContaining({
                artStyle: "project rainy noir",
                lens: "shot long lens",
              }),
              directorManual: expect.objectContaining({
                cameraLanguage: "shot surveillance angle",
              }),
            }),
          }),
        }),
      }),
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "image_1" },
      data: { status: "queued" },
    });
    expect(result.job.operation).toBe("image_refinement");
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
          videoProviderMode: "image_to_video",
          videoPromptMode: "generic_multi_reference",
          videoPromptDebugSummary: expect.objectContaining({
            provider: "seedance",
            model: "seedance-1-0-pro",
            supportedModes: ["text_to_video", "image_to_video"],
            modelSupportedModes: ["text_to_video", "image_to_video"],
            referenceMediaRoles: ["first_frame", "reference_image"],
          }),
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

    enableSeedance(providersService);
    await expect(
      service.createJob("project_1", {
        operation: "image_to_video",
        sourceNodeId: "image_1",
        videoProvider: "seedance",
        videoModel: "seedance-text-only",
      }),
    ).rejects.toThrow("Seedance seedance-text-only does not support image-to-video generation");
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

  it("rejects image refinement before the source ImageNode has an asset", async () => {
    canvasService.getCanvas.mockResolvedValue(
      canvasLoadResult({
        nodes: [canvasNode<ImageNodeData>("image_1", "image", "Generated Image", {})],
      }),
    );

    await expect(
      service.createJob("project_1", {
        operation: "image_refinement",
        sourceNodeId: "image_1",
        refinementPrompt: "make it warmer",
      }),
    ).rejects.toThrow("Image node must have an image asset before refinement");
    expect(prisma.generationJob.create).not.toHaveBeenCalled();
  });

  it("creates batch image-to-video child jobs and reports skipped nodes", async () => {
    const result = await service.createBatchImagesToVideosJobs("project_1", {
      operation: "batch_images_to_videos",
      sourceNodeIds: ["image_1", "missing_image"],
      durationSeconds: 5,
      resolution: "720p",
    });

    expect(prisma.generationJob.create).toHaveBeenCalledTimes(1);
    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operation: "image_to_video",
        status: "queued",
        provider: "mock-video",
        model: "mock-video-v1",
        sourceNodeId: "image_1",
        inputJson: expect.objectContaining({
          operation: "image_to_video",
          sourceImageAssetId: "asset_image_1",
          durationSeconds: 5,
          resolution: "720p",
        }),
      }),
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "image_1" },
      data: { status: "queued" },
    });
    expect(result.jobs).toHaveLength(1);
    expect(result.skipped).toEqual([
      expect.objectContaining({
        nodeId: "missing_image",
        reason: expect.stringContaining("Image node not found"),
      }),
    ]);
  });

  it("creates batch shot-to-image child jobs and reports skipped nodes", async () => {
    promptService.composeShotPrompt.mockImplementation(async (_projectId, shotNodeId) => {
      if (shotNodeId === "missing_shot") {
        throw new NotFoundException("Shot node not found");
      }
      return composedShotPrompt();
    });

    const result = await service.createBatchShotsToImagesJobs("project_1", {
      operation: "batch_shots_to_images",
      sourceNodeIds: ["shot_1", "missing_shot", "shot_1"],
      provider: "mock-image",
      aspectRatio: "16:9",
      count: 1,
      providerParams: {},
    });

    expect(promptService.composeShotPrompt).toHaveBeenCalledTimes(2);
    expect(prisma.generationJob.create).toHaveBeenCalledTimes(1);
    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operation: "shot_to_image",
        status: "queued",
        provider: "mock-image",
        model: "mock-image-v1",
        sourceNodeId: "shot_1",
        inputJson: expect.objectContaining({
          operation: "shot_to_image",
          shotNodeId: "shot_1",
          prompt: "Image prompt: hero at console",
          aspectRatio: "16:9",
          count: 1,
        }),
      }),
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "shot_1" },
      data: { status: "queued" },
    });
    expect(result.jobs).toHaveLength(1);
    expect(result.skipped).toEqual([
      expect.objectContaining({
        nodeId: "missing_shot",
        reason: expect.stringContaining("Shot node not found"),
      }),
    ]);
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
        status: { in: ["queued", "provider_waiting"] },
        operation: {
          in: [
            "shot_to_image",
            "character_to_image",
            "location_to_image",
            "image_refinement",
            "image_to_video",
            "ai_text_generation",
            "ai_audio_generation",
            "asset_caption",
            "asset_classification",
            "workflow_run",
            "editor_export",
          ],
        },
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

  it("claims queued editor export jobs and marks the export running", async () => {
    prisma.generationJob.findFirst.mockResolvedValue(
      generationJob({
        operation: "editor_export",
        status: "queued",
        provider: "mock-editor",
        model: "zip-v1",
        sourceNodeId: null,
        inputJson: editorExportInput(),
      }),
    );
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "editor_export",
        status: "running",
        provider: "mock-editor",
        model: "zip-v1",
        sourceNodeId: null,
        inputJson: editorExportInput(),
      }),
    );

    const result = await service.claimNextJob();

    expect(prisma.editorExport.update).toHaveBeenCalledWith({
      where: { id: "export_1" },
      data: { status: "running", errorMessage: null },
    });
    expect(prisma.canvasNode.update).not.toHaveBeenCalledWith({
      where: { id: expect.any(String) },
      data: { status: "running" },
    });
    expect(result.job?.operation).toBe("editor_export");
    expect(result.job?.status).toBe("running");
  });

  it("marks running video jobs as waiting for provider completion", async () => {
    prisma.generationJob.findUnique
      .mockResolvedValueOnce(
        generationJob({
          operation: "image_to_video",
          status: "running",
          provider: "seedance",
          model: "seedance-1-0-pro",
          sourceNodeId: "image_1",
          inputJson: {
            ...videoInput(),
            provider: "seedance",
            model: "seedance-1-0-pro",
          },
        }),
      )
      .mockResolvedValueOnce(
        generationJob({
          operation: "image_to_video",
          status: "provider_waiting",
          provider: "seedance",
          model: "seedance-1-0-pro",
          providerTaskId: "seedance_task_1",
        }),
      );

    const result = await service.waitJob("job_1", {
      provider: "seedance",
      model: "seedance-1-0-pro",
      providerTaskId: "seedance_task_1",
      rawJson: { providerTaskId: "seedance_task_1" },
    });

    expect(prisma.generationJob.updateMany).toHaveBeenCalledWith({
      where: { id: "job_1", status: { in: ["running", "provider_waiting"] } },
      data: {
        status: "provider_waiting",
        providerTaskId: "seedance_task_1",
        model: "seedance-1-0-pro",
        outputJson: expect.objectContaining({
          providerTaskId: "seedance_task_1",
          provider: "seedance",
        }),
        errorMessage: null,
      },
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "image_1" },
      data: { status: "provider_waiting" },
    });
    expect(result.status).toBe("provider_waiting");
  });

  it("cancels active image-to-video jobs and marks the source node cancelled", async () => {
    prisma.generationJob.findFirst.mockResolvedValue(
      generationJob({
        operation: "image_to_video",
        status: "provider_waiting",
        provider: "mock-video",
        model: "mock-video-v1",
        providerTaskId: "provider_task_1",
        sourceNodeId: "image_1",
        inputJson: videoInput(),
      }),
    );
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "image_to_video",
        status: "cancelled",
        provider: "mock-video",
        model: "mock-video-v1",
        providerTaskId: "provider_task_1",
        sourceNodeId: "image_1",
        inputJson: videoInput(),
      }),
    );

    const result = await service.cancelJob("project_1", "job_1");

    expect(prisma.generationJob.updateMany).toHaveBeenCalledWith({
      where: { id: "job_1", status: { in: ["queued", "running", "provider_waiting"] } },
      data: {
        status: "cancelled",
        outputJson: expect.objectContaining({
          providerTaskId: "provider_task_1",
          providerCancelError: null,
        }),
        errorMessage: null,
      },
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "image_1" },
      data: { status: "cancelled" },
    });
    expect(result.status).toBe("cancelled");
  });

  it("cancels editor export jobs and marks the export failed without touching media nodes", async () => {
    prisma.generationJob.findFirst.mockResolvedValue(
      generationJob({
        operation: "editor_export",
        status: "running",
        provider: "mock-editor",
        model: "zip-v1",
        sourceNodeId: null,
        inputJson: editorExportInput(),
      }),
    );
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "editor_export",
        status: "cancelled",
        provider: "mock-editor",
        model: "zip-v1",
        sourceNodeId: null,
        inputJson: editorExportInput(),
      }),
    );

    const result = await service.cancelJob("project_1", "job_1");

    expect(prisma.editorExport.update).toHaveBeenCalledWith({
      where: { id: "export_1" },
      data: {
        status: "failed",
        errorMessage: "EXPORT_CANCELLED: Editor export was cancelled",
      },
    });
    expect(prisma.canvasNode.update).not.toHaveBeenCalled();
    expect(result.status).toBe("cancelled");
  });

  it("does not cancel jobs that leave active state before the cancel transaction", async () => {
    prisma.generationJob.findFirst.mockResolvedValue(
      generationJob({
        operation: "image_to_video",
        status: "provider_waiting",
        provider: "mock-video",
        model: "mock-video-v1",
        providerTaskId: "provider_task_1",
        sourceNodeId: "image_1",
        inputJson: videoInput(),
      }),
    );
    prisma.generationJob.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(service.cancelJob("project_1", "job_1")).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.generationJob.update).not.toHaveBeenCalled();
    expect(prisma.canvasNode.update).not.toHaveBeenCalled();
  });

  it("marks active jobs failed without creating media side effects", async () => {
    const failure: ProviderFailure = {
      provider: "mock-image",
      code: "MOCK_PROVIDER_FAILURE",
      message: "mock failure requested",
      retryable: true,
    };
    prisma.generationJob.findUnique
      .mockResolvedValueOnce(generationJob({ status: "running" }))
      .mockResolvedValueOnce(
        generationJob({
          status: "failed",
          errorMessage: "MOCK_PROVIDER_FAILURE: mock failure requested",
          outputJson: { error: failure },
        }),
      );

    const result = await service.failJob("job_1", failure);

    expect(prisma.generationJob.updateMany).toHaveBeenCalledWith({
      where: { id: "job_1", status: { in: ["running", "provider_waiting"] } },
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

  it("marks editor export jobs failed without touching media node state", async () => {
    const failure: ProviderFailure = {
      provider: "mock-editor",
      code: "ZIP_FAILED",
      message: "zip failed",
      retryable: false,
    };
    prisma.generationJob.findUnique
      .mockResolvedValueOnce(
        generationJob({
          operation: "editor_export",
          status: "running",
          provider: "mock-editor",
          model: "zip-v1",
          sourceNodeId: null,
          inputJson: editorExportInput(),
        }),
      )
      .mockResolvedValueOnce(
        generationJob({
          operation: "editor_export",
          status: "failed",
          provider: "mock-editor",
          model: "zip-v1",
          sourceNodeId: null,
          errorMessage: "ZIP_FAILED: zip failed",
          inputJson: editorExportInput(),
          outputJson: { error: failure },
        }),
      );

    const result = await service.failJob("job_1", failure);

    expect(prisma.editorExport.update).toHaveBeenCalledWith({
      where: { id: "export_1" },
      data: {
        status: "failed",
        errorMessage: "ZIP_FAILED: zip failed",
      },
    });
    expect(prisma.canvasNode.update).not.toHaveBeenCalledWith({
      where: { id: expect.any(String) },
      data: { status: "failed" },
    });
    expect(result.status).toBe("failed");
  });

  it("completes asset analysis jobs by applying metadata and storing output", async () => {
    const input = assetAnalysisInput();
    const output: AssetAnalysisJobOutput = {
      operation: "asset_caption",
      provider: "mock-vision",
      model: "mock-vision-v1",
      overwrite: false,
      results: [
        {
          assetId: "asset_1",
          caption: "Hero keyframe with console light.",
        },
      ],
      completedAt: "2026-06-12T00:10:00.000Z",
    };
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "asset_caption",
        status: "running",
        provider: "mock-vision",
        model: "mock-vision-v1",
        sourceNodeId: null,
        inputJson: input,
      }),
    );
    prisma.generationJob.update.mockResolvedValue(
      generationJob({
        operation: "asset_caption",
        status: "succeeded",
        provider: "mock-vision",
        model: "mock-vision-v1",
        sourceNodeId: null,
        inputJson: input,
        outputJson: output,
      }),
    );

    const result = await service.succeedJob("job_1", undefined, undefined, undefined, output);

    expect(prisma.generationJob.updateMany).toHaveBeenCalledWith({
      where: { id: "job_1", status: { in: ["running", "provider_waiting"] } },
      data: { errorMessage: null },
    });
    expect(assetsService.applyAssetAnalysis).toHaveBeenCalledWith("project_1", output);
    expect(prisma.generationJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: {
        status: "succeeded",
        outputJson: output,
        errorMessage: null,
      },
    });
    expect(result.outputJson).toEqual(output);
  });

  it("completes media metadata jobs by applying derivative metadata to selected assets", async () => {
    const input = {
      operation: "media_metadata" as const,
      projectId: "project_1",
      assetIds: ["asset_video_1"],
      provider: "mock-media",
      model: "metadata-v1",
      createThumbnail: true,
      overwrite: false,
    };
    const output = {
      operation: "media_metadata" as const,
      provider: "mock-media",
      model: "metadata-v1",
      overwrite: false,
      createThumbnail: true,
      results: [
        {
          assetId: "asset_video_1",
          mediaInfo: {
            container: "mp4",
            durationMs: 4200,
            width: 1280,
            height: 720,
            hasVideo: true,
            hasAudio: false,
          },
          thumbnail: {
            kind: "thumbnail" as const,
            status: "ready" as const,
            mimeType: "image/png",
            width: 480,
            height: 270,
            sourceAssetId: "asset_video_1",
            rebuildStrategy: "mock_media_metadata" as const,
          },
          strategy: ["no_audio_stream_marked_hasAudio_false"],
        },
      ],
      completedAt: "2026-06-14T00:00:00.000Z",
    };
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "asset_classification",
        status: "running",
        provider: "mock-media",
        model: "metadata-v1",
        sourceNodeId: null,
        inputJson: input,
      }),
    );
    prisma.generationJob.update.mockResolvedValue(
      generationJob({
        operation: "asset_classification",
        status: "succeeded",
        provider: "mock-media",
        model: "metadata-v1",
        sourceNodeId: null,
        inputJson: input,
        outputJson: { ...output, generationJobId: "job_1" },
      }),
    );

    const result = await service.succeedJob("job_1", undefined, undefined, undefined, undefined, output);

    expect(assetsService.applyMediaMetadata).toHaveBeenCalledWith("project_1", {
      ...output,
      generationJobId: "job_1",
    });
    expect(prisma.generationJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: {
        status: "succeeded",
        outputJson: { ...output, generationJobId: "job_1" },
        errorMessage: null,
      },
    });
    expect(result.outputJson).toEqual({ ...output, generationJobId: "job_1" });
  });

  it("completes asset prompt polish jobs by applying prompt metadata", async () => {
    const input = {
      operation: "asset_prompt_polish" as const,
      projectId: "project_1",
      assetIds: ["asset_1"],
      items: [{ assetId: "asset_1", prompt: "rough asset prompt" }],
      provider: "mock-llm",
      model: "mock-polish-v1",
      overwrite: false,
    };
    const output = {
      operation: "asset_prompt_polish" as const,
      provider: "mock-llm",
      model: "mock-polish-v1",
      overwrite: false,
      results: [
        {
          assetId: "asset_1",
          sourcePrompt: "rough asset prompt",
          polishedPrompt: "Production-ready polished prompt",
        },
      ],
      completedAt: "2026-06-14T00:00:00.000Z",
    };
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "asset_caption",
        status: "running",
        provider: "mock-llm",
        model: "mock-polish-v1",
        sourceNodeId: null,
        inputJson: input,
      }),
    );
    prisma.generationJob.update.mockResolvedValue(
      generationJob({
        operation: "asset_caption",
        status: "succeeded",
        provider: "mock-llm",
        model: "mock-polish-v1",
        sourceNodeId: null,
        inputJson: input,
        outputJson: { ...output, generationJobId: "job_1" },
      }),
    );

    const result = await service.succeedJob("job_1", undefined, undefined, undefined, undefined, undefined, output);

    expect(assetsService.applyAssetPromptPolish).toHaveBeenCalledWith("project_1", {
      ...output,
      generationJobId: "job_1",
    });
    expect(result.outputJson).toEqual({ ...output, generationJobId: "job_1" });
  });

  it("completes asset image generation jobs by creating generated assets and source lineage", async () => {
    const input = {
      operation: "asset_image_generation" as const,
      projectId: "project_1",
      assetIds: ["asset_1"],
      items: [{ assetId: "asset_1", prompt: "Polished hero prompt" }],
      provider: "mock-image" as const,
      model: "mock-image-v1",
      aspectRatio: "16:9" as const,
      count: 1,
      overwrite: false,
    };
    const output = {
      operation: "asset_image_generation" as const,
      provider: "mock-image",
      model: "mock-image-v1",
      overwrite: false,
      results: [
        {
          sourceAssetId: "asset_1",
          prompt: "Polished hero prompt",
          providerOutput: {
            assetId: "provider_asset_1",
            storageKey: "project_1/asset-generations/job_1-1.png",
            mimeType: "image/png",
            provider: "mock-image",
            model: "mock-image-v1",
            prompt: "Polished hero prompt",
            referenceAssetIds: ["asset_1"],
          },
        },
      ],
      completedAt: "2026-06-14T00:00:00.000Z",
    };
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "shot_to_image",
        status: "running",
        provider: "mock-image",
        model: "mock-image-v1",
        sourceNodeId: null,
        inputJson: input,
      }),
    );
    const result = await service.succeedJob(
      "job_1",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      output,
    );

    expect(assetsService.createGeneratedAsset).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        purpose: "shot_keyframe",
        providerOutput: output.results[0]?.providerOutput,
        metadataJson: expect.objectContaining({
          operation: "asset_image_generation",
          sourceAssetId: "asset_1",
          prompt: "Polished hero prompt",
        }),
      }),
      expect.any(Object),
    );
    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: "asset_1" },
      data: {
        metadataJson: expect.objectContaining({
          assetPrompt: "Polished hero prompt",
          generatedAssetIds: ["asset_existing_generated", "asset_generated_1"],
          lastGeneratedAssetId: "asset_generated_1",
          lastAssetImageGenerationJobId: "job_1",
        }),
      },
    });
    expect(result.outputJson).toMatchObject({
      operation: "asset_image_generation",
      generationJobId: "job_1",
      results: [expect.objectContaining({ assetId: "asset_generated_1" })],
    });
  });

  it("completes AI text jobs by writing output back to the target node", async () => {
    const input = aiTextInput();
    const output = aiTextOutput();
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "ai_text_generation",
        status: "running",
        provider: "mock-llm",
        model: "mock-storyboard",
        sourceNodeId: "ai_text_1",
        inputJson: input,
      }),
    );
    prisma.canvasNode.findFirst.mockResolvedValue(
      canvasNode<AiTextNodeData>("ai_text_1", "ai_text", "AI Outline", {
        prompt: "Write a two-beat sequence.",
      }),
    );
    prisma.generationJob.update.mockResolvedValue(
      generationJob({
        operation: "ai_text_generation",
        status: "succeeded",
        provider: "mock-llm",
        model: "mock-storyboard",
        sourceNodeId: "ai_text_1",
        targetNodeId: "ai_text_1",
        inputJson: input,
        outputJson: output,
      }),
    );

    const result = await service.succeedJob(
      "job_1",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      output,
    );

    expect(assetsService.createGeneratedAsset).not.toHaveBeenCalled();
    expect(prisma.canvasNode.create).not.toHaveBeenCalled();
    expect(prisma.canvasEdge.create).not.toHaveBeenCalled();
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "ai_text_1" },
      data: {
        status: "succeeded",
        dataJson: expect.objectContaining({
          prompt: "Write a two-beat sequence.",
          outputText: expect.stringContaining("Beat 1"),
          contextSummary: "Shot 01 (shot), Ari (character_asset)",
          provider: "mock-llm",
          model: "mock-storyboard",
          generationJobId: "job_1",
          generationOperation: "ai_text_generation",
          generatedFromNodeId: "ai_text_1",
          sourceNodeIds: ["ai_text_1", "shot_1", "character_1"],
          inputJson: input,
          outputJson: output,
        }),
      },
    });
    expect(prisma.generationJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: {
        status: "succeeded",
        targetNodeId: "ai_text_1",
        outputJson: output,
        errorMessage: null,
      },
    });
    expect(result.outputJson).toEqual(output);
    expect(result.targetNodeId).toBe("ai_text_1");
  });

  it("completes AI audio jobs by creating an audio asset and updating the source node", async () => {
    const input = aiAudioInput();
    const providerOutput = aiAudioProviderOutput();
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "ai_audio_generation",
        status: "running",
        provider: "mock-audio",
        model: "mock-tts-v1",
        sourceNodeId: "ai_audio_1",
        inputJson: input,
      }),
    );
    prisma.canvasNode.findFirst.mockResolvedValue(
      canvasNode<AiAudioNodeData>("ai_audio_1", "ai_audio", "Ari Narration", {
        prompt: "Read Ari's line as a tense whisper.",
        voiceReferenceAssetIds: ["asset_voice_1"],
      }),
    );
    prisma.generationJob.update.mockResolvedValue(
      generationJob({
        operation: "ai_audio_generation",
        status: "succeeded",
        provider: "mock-audio",
        model: "mock-tts-v1",
        sourceNodeId: "ai_audio_1",
        targetNodeId: "ai_audio_1",
        inputJson: input,
        outputJson: {
          operation: "ai_audio_generation",
          assetId: "asset_generated_1",
          targetNodeId: "ai_audio_1",
        },
      }),
    );

    const result = await service.succeedJob("job_1", providerOutput);

    expect(assetsService.createGeneratedAsset).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        purpose: "shot_audio",
        providerOutput,
        metadataJson: expect.objectContaining({
          generationJobId: "job_1",
          operation: "ai_audio_generation",
          sourceNodeId: "ai_audio_1",
          context: input.context,
        }),
      }),
      expect.any(Object),
    );
    expect(prisma.canvasNode.create).not.toHaveBeenCalled();
    expect(prisma.canvasEdge.create).not.toHaveBeenCalled();
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "ai_audio_1" },
      data: {
        status: "succeeded",
        dataJson: expect.objectContaining({
          assetId: "asset_generated_1",
          prompt: "Read Ari's line as a tense whisper.",
          scriptText: "Read Ari's line as a tense whisper.",
          durationSeconds: 8,
          contextSummary: "Shot 01 (shot), Ari (audio:asset_voice_1)",
          provider: "mock-audio",
          model: "mock-tts-v1",
          generationJobId: "job_1",
          generationOperation: "ai_audio_generation",
          generatedFromNodeId: "ai_audio_1",
          sourceNodeIds: ["ai_audio_1", "shot_1", "character_1"],
          referenceAssetIds: ["asset_voice_1"],
          voiceReferenceAssetIds: ["asset_voice_1"],
          inputJson: input,
          outputJson: expect.objectContaining({
            operation: "ai_audio_generation",
            assetId: "asset_generated_1",
            providerOutput,
          }),
        }),
      },
    });
    expect(prisma.generationJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: {
        status: "succeeded",
        targetNodeId: "ai_audio_1",
        outputJson: expect.objectContaining({
          operation: "ai_audio_generation",
          assetId: "asset_generated_1",
          providerOutput,
        }),
        errorMessage: null,
      },
    });
    expect(result.targetNodeId).toBe("ai_audio_1");
  });

  it("does not complete jobs that leave active state before media side effects", async () => {
    prisma.generationJob.findUnique.mockResolvedValue(generationJob({ status: "running" }));
    prisma.generationJob.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.succeedJob("job_1", {
        assetId: "provider_asset_1",
        storageKey: "mock/images/provider_asset_1.png",
        mimeType: "image/png",
        provider: "mock-image",
        model: "mock-image-v1",
        prompt: "Image prompt: hero at console",
        referenceAssetIds: ["asset_ref_1"],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(assetsService.createGeneratedAsset).not.toHaveBeenCalled();
    expect(prisma.canvasNode.create).not.toHaveBeenCalled();
    expect(prisma.canvasEdge.create).not.toHaveBeenCalled();
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
          generationSettings: expect.objectContaining({
            effective: expect.objectContaining({
              visualStyle: "project cinematic noir",
            }),
          }),
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
          generationSettings: expect.objectContaining({
            sources: expect.objectContaining({
              visualStyle: "project",
              visualManual: "shot",
              directorManual: "shot",
            }),
          }),
        }),
      }),
    });
    expect(result.status).toBe("succeeded");
    expect(result.targetNodeId).toBe("image_1");
  });

  it("completes character reference image jobs by binding the generated Asset to the source node", async () => {
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "character_to_image",
        status: "running",
        provider: "mock-image",
        model: "mock-image-v1",
        sourceNodeId: "character_1",
        inputJson: characterInput(),
      }),
    );
    prisma.canvasNode.findFirst.mockResolvedValue(
      canvasNode<CharacterAssetNodeData>("character_1", "character_asset", "Hero", {
        appearance: "rain-damp hair and a dark utility coat",
        locked: true,
        lockedFields: ["appearance"],
        referenceAssetIds: ["asset_character_ref"],
      }),
    );
    prisma.generationJob.update.mockResolvedValue(
      generationJob({
        operation: "character_to_image",
        status: "succeeded",
        sourceNodeId: "character_1",
        outputJson: {
          operation: "character_to_image",
          assetId: "asset_generated_1",
        },
      }),
    );

    const result = await service.succeedJob("job_1", {
      assetId: "provider_character_ref_1",
      storageKey: "mock/images/provider_character_ref_1.png",
      mimeType: "image/png",
      provider: "mock-image",
      model: "mock-image-v1",
      prompt: "Character reference prompt",
      referenceAssetIds: ["asset_character_ref"],
    });

    expect(assetsService.createGeneratedAsset).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        purpose: "character_reference",
        providerOutput: expect.objectContaining({
          storageKey: "mock/images/provider_character_ref_1.png",
        }),
        metadataJson: expect.objectContaining({
          generationJobId: "job_1",
          operation: "character_to_image",
          sourceNodeId: "character_1",
        }),
      }),
      expect.any(Object),
    );
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "character_1" },
      data: {
        status: "succeeded",
        dataJson: expect.objectContaining({
          appearance: "rain-damp hair and a dark utility coat",
          locked: true,
          lockedFields: ["appearance"],
          referenceAssetIds: ["asset_character_ref", "asset_generated_1"],
        }),
      },
    });
    expect(prisma.canvasNode.create).not.toHaveBeenCalled();
    expect(prisma.canvasEdge.create).not.toHaveBeenCalled();
    expect(prisma.generationJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        status: "succeeded",
        outputJson: expect.objectContaining({
          operation: "character_to_image",
          sourceNodeId: "character_1",
          assetId: "asset_generated_1",
          referenceAssetIds: ["asset_character_ref"],
        }),
      }),
    });
    expect(result.status).toBe("succeeded");
    expect(result.targetNodeId).toBeUndefined();
  });

  it("completes image refinement jobs with a refined ImageNode and derived_from edge", async () => {
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "image_refinement",
        status: "running",
        provider: "mock-image",
        model: "mock-image-v1",
        sourceNodeId: "image_1",
        inputJson: imageRefinementInput(),
      }),
    );
    prisma.canvasNode.findFirst.mockResolvedValue(
      canvasNode<ImageNodeData>("image_1", "image", "Generated Image", {
        assetId: "asset_image_1",
        prompt: "Image prompt: hero at console",
      }),
    );
    prisma.canvasNode.create.mockResolvedValue(
      canvasNode<ImageNodeData>("image_refined_1", "image", "Generated Image Refined Image", {
        assetId: "asset_generated_1",
      }),
    );
    prisma.canvasEdge.create.mockResolvedValue(
      canvasEdge("edge_refined_image_1", "image_1", "image_refined_1", "derived_from"),
    );
    prisma.generationJob.update.mockResolvedValue(
      generationJob({
        operation: "image_refinement",
        status: "succeeded",
        targetNodeId: "image_refined_1",
        outputJson: {
          operation: "image_refinement",
          assetId: "asset_generated_1",
          targetNodeId: "image_refined_1",
          edgeId: "edge_refined_image_1",
        },
      }),
    );

    const result = await service.succeedJob("job_1", {
      assetId: "provider_asset_refined_1",
      storageKey: "mock/images/provider_asset_refined_1.png",
      mimeType: "image/png",
      provider: "mock-image",
      model: "mock-image-v1",
      prompt: "make the lighting warmer",
      referenceAssetIds: ["asset_image_1", "asset_ref_1"],
    });

    expect(assetsService.createGeneratedAsset).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        purpose: "shot_keyframe",
        providerOutput: expect.objectContaining({
          storageKey: "mock/images/provider_asset_refined_1.png",
        }),
        metadataJson: expect.objectContaining({
          generationJobId: "job_1",
          operation: "image_refinement",
          sourceNodeId: "image_1",
        }),
      }),
      expect.any(Object),
    );
    expect(prisma.canvasNode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "image",
        title: "Generated Image Refined Image",
        dataJson: expect.objectContaining({
          assetId: "asset_generated_1",
          generationOperation: "image_refinement",
          generatedFromNodeId: "image_1",
          sourceNodeIds: ["image_1", "shot_1"],
          referenceAssetIds: ["asset_image_1", "asset_ref_1"],
        }),
      }),
    });
    expect(prisma.canvasEdge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sourceNodeId: "image_1",
        targetNodeId: "image_refined_1",
        relation: "derived_from",
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
        targetNodeId: "image_refined_1",
        outputJson: expect.objectContaining({
          operation: "image_refinement",
          sourceNodeId: "image_1",
          targetNodeId: "image_refined_1",
          assetId: "asset_generated_1",
          edgeId: "edge_refined_image_1",
        }),
      }),
    });
    expect(result.status).toBe("succeeded");
    expect(result.targetNodeId).toBe("image_refined_1");
  });

  it("completes editor export jobs with package asset, package node, and editor edges", async () => {
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "editor_export",
        status: "running",
        provider: "mock-editor",
        model: "zip-v1",
        sourceNodeId: null,
        inputJson: editorExportInput(),
      }),
    );
    prisma.canvasNode.findMany.mockResolvedValue([
      {
        ...canvasNode<VideoNodeData>("video_1", "video", "Shot 001 video", {
          assetId: "asset_video_1",
        }),
        x: 120,
        y: 40,
        width: 320,
        height: 180,
        zIndex: 2,
      },
      {
        ...canvasNode<VideoNodeData>("video_2", "video", "Shot 002 video", {
          assetId: "asset_video_2",
        }),
        x: 480,
        y: 80,
        width: 320,
        height: 180,
        zIndex: 3,
      },
    ]);
    prisma.canvasNode.create.mockResolvedValue(
      canvasNode("package_node_1", "editor_package", "Editor Package export_1", {
        packageAssetId: "asset_package_1",
      }),
    );
    prisma.canvasEdge.create
      .mockResolvedValueOnce(canvasEdge("edge_editor_1", "video_1", "package_node_1", "sent_to_editor"))
      .mockResolvedValueOnce(canvasEdge("edge_editor_2", "video_2", "package_node_1", "sent_to_editor"));
    prisma.generationJob.update.mockImplementation(async (args: MockUpdateArgs) =>
      generationJob({
        id: args.where.id,
        operation: "editor_export",
        status: args.data.status,
        provider: "mock-editor",
        model: "zip-v1",
        targetNodeId: args.data.targetNodeId,
        inputJson: editorExportInput(),
        outputJson: args.data.outputJson,
      }),
    );

    const result = await service.succeedJob("job_1", undefined, undefined, editorExportPackageOutput());

    expect(assetsService.createPackageAsset).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        packageOutput: expect.objectContaining({
          storageKey: "project_1/editor-exports/export_1.zip",
          mimeType: "application/zip",
        }),
        metadataJson: expect.objectContaining({
          generationJobId: "job_1",
          editorExportId: "export_1",
          selectedVideoNodeIds: ["video_1", "video_2"],
          sortMode: "manual",
          exportPreset: "standard_zip",
          generationSettings: expect.objectContaining({
            effective: expect.objectContaining({
              visualStyle: "project cinematic noir",
            }),
          }),
          packagingReferences: expect.objectContaining({
            bgm: expect.objectContaining({ assetId: "asset_bgm_1" }),
          }),
        }),
      }),
      expect.any(Object),
    );
    expect(prisma.canvasNode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "editor_package",
        status: "succeeded",
        x: 940,
        y: 40,
        dataJson: expect.objectContaining({
          editorExportId: "export_1",
          packageAssetId: "asset_package_1",
          selectedVideoNodeIds: ["video_1", "video_2"],
          exportPreset: "standard_zip",
          clipCount: 2,
          generationSettings: expect.objectContaining({
            sources: expect.objectContaining({
              visualStyle: "project",
            }),
          }),
          packagingReferences: expect.objectContaining({
            bgm: expect.objectContaining({ status: "available" }),
          }),
        }),
      }),
    });
    expect(prisma.canvasEdge.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          sourceNodeId: "video_1",
          targetNodeId: "package_node_1",
          relation: "sent_to_editor",
        }),
      }),
    );
    expect(prisma.editorExport.update).toHaveBeenCalledWith({
      where: { id: "export_1" },
      data: expect.objectContaining({
        status: "succeeded",
        packageAssetId: "asset_package_1",
        storyboardCsv: "index,filename\n1,clips/shot_001.mp4\n2,clips/shot_002.mp4\n",
        errorMessage: null,
      }),
    });
    expect(prisma.generationJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        status: "succeeded",
        targetNodeId: "package_node_1",
        outputJson: expect.objectContaining({
          operation: "editor_export",
          editorExportId: "export_1",
          packageAssetId: "asset_package_1",
          edgeIds: ["edge_editor_1", "edge_editor_2"],
        }),
        errorMessage: null,
      }),
    });
    expect(result.status).toBe("succeeded");
    expect(result.targetNodeId).toBe("package_node_1");
  });

  it("rejects editor export completion when package clips do not match the claimed input", async () => {
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "editor_export",
        status: "running",
        provider: "mock-editor",
        model: "zip-v1",
        sourceNodeId: null,
        inputJson: editorExportInput(),
      }),
    );
    const badPackage = editorExportPackageOutput({
      clips: [
        {
          index: 1,
          filename: "clips/shot_001.mp4",
          videoNodeId: "video_other",
          videoAssetId: "asset_video_1",
          durationMs: 5000,
        },
        {
          index: 2,
          filename: "clips/shot_002.mp4",
          videoNodeId: "video_2",
          videoAssetId: "asset_video_2",
          durationMs: 4000,
        },
      ],
    });

    await expect(service.succeedJob("job_1", undefined, undefined, badPackage)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(assetsService.createPackageAsset).not.toHaveBeenCalled();
    expect(prisma.canvasNode.create).not.toHaveBeenCalled();
    expect(prisma.editorExport.update).not.toHaveBeenCalled();
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

  it("retries failed editor export jobs and restores the export queue state", async () => {
    const failedInput = editorExportInput({ sortMode: "canvas_x" });
    prisma.generationJob.findFirst.mockResolvedValue(
      generationJob({
        id: "failed_export_job",
        operation: "editor_export",
        status: "failed",
        provider: "mock-editor",
        model: "zip-v1",
        sourceNodeId: null,
        inputJson: failedInput,
        errorMessage: "zip failed",
      }),
    );
    prisma.generationJob.create.mockResolvedValue(
      generationJob({
        id: "retry_export_job",
        operation: "editor_export",
        status: "queued",
        provider: "mock-editor",
        model: "zip-v1",
        sourceNodeId: null,
        inputJson: failedInput,
      }),
    );

    const result = await service.retryJob("project_1", "failed_export_job");

    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        operation: "editor_export",
        status: "queued",
        sourceNodeId: null,
        inputJson: expect.objectContaining({
          operation: "editor_export",
          editorExportId: "export_1",
          sortMode: "canvas_x",
        }),
      }),
    });
    expect(prisma.editorExport.update).toHaveBeenCalledWith({
      where: { id: "export_1" },
      data: { status: "queued", errorMessage: null },
    });
    expect(result.retryJob.id).toBe("retry_export_job");
  });

  it("rejects editor export completion when the package preset differs from the job", async () => {
    prisma.generationJob.findUnique.mockResolvedValue(
      generationJob({
        operation: "editor_export",
        status: "running",
        provider: "mock-editor",
        model: "zip-v1",
        sourceNodeId: null,
        inputJson: editorExportInput({ exportPreset: "hd_1080p" }),
      }),
    );

    await expect(
      service.succeedJob("job_1", undefined, undefined, editorExportPackageOutput()),
    ).rejects.toThrow("Editor export package preset does not match the claimed job");
    expect(prisma.generationJob.updateMany).not.toHaveBeenCalled();
  });
});

function aiTextInput(overrides: Partial<AiTextGenerationJobInput> = {}): AiTextGenerationJobInput {
  return {
    operation: "ai_text_generation",
    projectId: "project_1",
    sourceNodeId: "ai_text_1",
    aiTextNodeId: "ai_text_1",
    prompt: "Write a two-beat sequence.",
    context: [
      {
        nodeId: "shot_1",
        nodeType: "shot",
        title: "Shot 01",
        text: "Visual description: Ari watches signal lights blink out.",
      },
      {
        nodeId: "character_1",
        nodeType: "character_asset",
        title: "Ari",
        text: "Role: signal analyst",
      },
    ],
    sourceNodeIds: ["ai_text_1", "shot_1", "character_1"],
    provider: "mock-llm",
    model: "mock-storyboard",
    skillTemplateIds: ["preset_text_1"],
    ...overrides,
  };
}

function aiTextOutput(overrides: Partial<AiTextGenerationJobOutput> = {}): AiTextGenerationJobOutput {
  return {
    operation: "ai_text_generation",
    sourceNodeId: "ai_text_1",
    targetNodeId: "ai_text_1",
    provider: "mock-llm",
    model: "mock-storyboard",
    prompt: "Write a two-beat sequence.",
    text: "Beat 1: Ari sees the relay fail.\nBeat 2: She chooses the rooftop route.",
    context: aiTextInput().context,
    sourceNodeIds: ["ai_text_1", "shot_1", "character_1"],
    completedAt: "2026-06-12T00:10:00.000Z",
    ...overrides,
  };
}

function aiAudioInput(overrides: Partial<AiAudioGenerationJobInput> = {}): AiAudioGenerationJobInput {
  return {
    operation: "ai_audio_generation",
    projectId: "project_1",
    sourceNodeId: "ai_audio_1",
    aiAudioNodeId: "ai_audio_1",
    prompt: "Read Ari's line as a tense whisper.",
    scriptText: "Read Ari's line as a tense whisper.",
    context: [
      {
        nodeId: "shot_1",
        nodeType: "shot",
        title: "Shot 01",
        text: "Dialogue: We move now.",
      },
      {
        nodeId: "character_1",
        nodeType: "character_asset",
        title: "Ari",
        assetId: "asset_voice_1",
        label: "Ari voice",
        role: "voice",
      },
    ],
    sourceNodeIds: ["ai_audio_1", "shot_1", "character_1"],
    referenceAssetIds: ["asset_voice_1"],
    provider: "mock-audio",
    model: "mock-tts-v1",
    durationSeconds: 8,
    providerParams: {},
    skillTemplateIds: ["preset_audio_1"],
    ...overrides,
  };
}

function aiAudioProviderOutput(
  overrides: Partial<GeneratedMediaProviderOutput> = {},
): GeneratedMediaProviderOutput {
  return {
    assetId: "provider_audio_1",
    storageKey: "mock/audio/provider_audio_1.mp3",
    mimeType: "audio/mpeg",
    provider: "mock-audio",
    model: "mock-tts-v1",
    prompt: "Read Ari's line as a tense whisper.",
    referenceAssetIds: ["asset_voice_1"],
    ...overrides,
  };
}

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
    generationSettings: resolvedGenerationSettings(),
    ...overrides,
  };
}

function characterInput(overrides: Partial<CharacterToImageJobInput> = {}): CharacterToImageJobInput {
  return {
    operation: "character_to_image",
    projectId: "project_1",
    sourceNodeId: "character_1",
    characterNodeId: "character_1",
    prompt: "Character reference prompt",
    referenceAssetIds: ["asset_character_ref"],
    sourceNodeIds: ["character_1"],
    provider: "mock-image",
    model: "mock-image-v1",
    aspectRatio: "1:1",
    providerParams: {},
    assetPurpose: "character_reference",
    ...overrides,
  };
}

function assetAnalysisInput(overrides: Partial<AssetAnalysisJobInput> = {}): AssetAnalysisJobInput {
  return {
    operation: "asset_caption",
    projectId: "project_1",
    assetIds: ["asset_1"],
    provider: "mock-vision",
    model: "mock-vision-v1",
    overwrite: false,
    ...overrides,
  };
}

function videoInput(overrides: Partial<ImageToVideoJobInput> = {}): ImageToVideoJobInput {
  return {
    operation: "image_to_video",
    projectId: "project_1",
    sourceNodeId: "image_1",
    imageNodeId: "image_1",
    sourceImageAssetId: "asset_image_1",
    prompt: "Video prompt: slow push",
    durationSeconds: 5,
    aspectRatio: "16:9",
    resolution: "720p",
    parentShotNodeId: "shot_1",
    referenceAssetIds: ["asset_ref_1"],
    sourceNodeIds: ["image_1", "shot_1"],
    provider: "mock-video",
    model: "mock-video-v1",
    providerParams: {},
    generationSettings: resolvedGenerationSettings(),
    ...overrides,
  };
}

function imageRefinementInput(overrides: Partial<ImageRefinementJobInput> = {}): ImageRefinementJobInput {
  return {
    operation: "image_refinement",
    projectId: "project_1",
    sourceNodeId: "image_1",
    imageNodeId: "image_1",
    sourceImageAssetId: "asset_image_1",
    prompt: "make the lighting warmer",
    referenceAssetIds: ["asset_ref_1"],
    sourceNodeIds: ["image_1", "shot_1"],
    parentShotNodeId: "shot_1",
    provider: "mock-image",
    model: "mock-image-v1",
    aspectRatio: "16:9",
    providerParams: {},
    generationSettings: resolvedGenerationSettings(),
    ...overrides,
  };
}

function resolvedGenerationSettings(): ResolvedGenerationSettings {
  return {
    project: {
      visualStyle: "project cinematic noir",
      aspectRatio: "9:16",
      visualManual: {
        artStyle: "project rainy noir",
        palette: "cyan shadows and amber signals",
        lighting: "practical console light",
      },
      directorManual: {
        pacing: "project slow-burn",
        cameraLanguage: "project controlled push-ins",
        performance: "quiet urgency",
      },
      subtitle: { status: "requested_unresolved", label: "Project captions" },
    },
    shot: {
      aspectRatio: "16:9",
      narrationAccent: "warm narration",
      visualManual: {
        lens: "shot long lens",
      },
      directorManual: {
        cameraLanguage: "shot surveillance angle",
      },
    },
    effective: {
      visualStyle: "project cinematic noir",
      aspectRatio: "16:9",
      narrationAccent: "warm narration",
      visualManual: {
        artStyle: "project rainy noir",
        palette: "cyan shadows and amber signals",
        lighting: "practical console light",
        lens: "shot long lens",
      },
      directorManual: {
        pacing: "project slow-burn",
        cameraLanguage: "shot surveillance angle",
        performance: "quiet urgency",
      },
      subtitle: { status: "requested_unresolved", label: "Project captions" },
    },
    sources: {
      visualStyle: "project",
      aspectRatio: "shot",
      narrationAccent: "shot",
      visualManual: "shot",
      visualManualFields: {
        artStyle: "project",
        palette: "project",
        lighting: "project",
        lens: "shot",
      },
      directorManual: "shot",
      directorManualFields: {
        pacing: "project",
        cameraLanguage: "shot",
        performance: "project",
      },
      subtitle: "project",
    },
  };
}

function editorExportInput(overrides: Partial<EditorExportJobInput> = {}): EditorExportJobInput {
  return {
    operation: "editor_export",
    projectId: "project_1",
    editorExportId: "export_1",
    videoNodeIds: ["video_1", "video_2"],
    sortMode: "manual",
    exportPreset: "standard_zip",
    includeStoryboardCsv: true,
    includeSubtitles: false,
    fps: 24,
    aspectRatio: "16:9",
    generationSettings: resolvedGenerationSettings(),
    packagingReferences: {
      project: resolvedGenerationSettings(),
      bgm: { status: "available", assetId: "asset_bgm_1", label: "Main cue" },
      subtitle: { status: "requested_unresolved", label: "Project captions" },
    },
    clips: [
      {
        videoNodeId: "video_1",
        videoNodeTitle: "Shot 001 video",
        videoAssetId: "asset_video_1",
        storageKey: "project_1/clips/shot_001.mp4",
        mimeType: "video/mp4",
        filename: "clips/shot_001.mp4",
        durationMs: 5000,
        shotNodeId: "shot_1",
        shotNumber: "001",
        canvasX: 120,
        canvasY: 40,
      },
      {
        videoNodeId: "video_2",
        videoNodeTitle: "Shot 002 video",
        videoAssetId: "asset_video_2",
        storageKey: "project_1/clips/shot_002.mp4",
        mimeType: "video/mp4",
        filename: "clips/shot_002.mp4",
        durationMs: 4000,
        shotNodeId: "shot_2",
        shotNumber: "002",
        canvasX: 480,
        canvasY: 80,
      },
    ],
    ...overrides,
  };
}

function editorExportPackageOutput(
  overrides: Partial<EditorExportPackageOutput> = {},
): EditorExportPackageOutput {
  return {
    storageKey: "project_1/editor-exports/export_1.zip",
    mimeType: "application/zip",
    bytesBase64: Buffer.from("zip-bytes").toString("base64"),
    sizeBytes: 256,
    timeline: {
      version: "1.0",
      projectId: "project_1",
      editorExportId: "export_1",
      title: "Rain Night Chase",
      aspectRatio: "16:9",
      fps: 24,
      sortMode: "manual",
      exportPreset: "standard_zip",
      tracks: [
        {
          id: "track_video_1",
          type: "video",
          items: [
            {
              id: "item_video_1",
              assetId: "asset_video_1",
              sourceNodeId: "video_1",
              startMs: 0,
              durationMs: 5000,
            },
            {
              id: "item_video_2",
              assetId: "asset_video_2",
              sourceNodeId: "video_2",
              startMs: 5000,
              durationMs: 4000,
            },
          ],
        },
      ],
      assets: [
        {
          id: "asset_video_1",
          type: "video",
          url: "clips/shot_001.mp4",
          localPath: "clips/shot_001.mp4",
          mimeType: "video/mp4",
          durationMs: 5000,
        },
        {
          id: "asset_video_2",
          type: "video",
          url: "clips/shot_002.mp4",
          localPath: "clips/shot_002.mp4",
          mimeType: "video/mp4",
          durationMs: 4000,
        },
      ],
    },
    storyboardCsv: "index,filename\n1,clips/shot_001.mp4\n2,clips/shot_002.mp4\n",
    clips: [
      {
        index: 1,
        filename: "clips/shot_001.mp4",
        videoNodeId: "video_1",
        videoAssetId: "asset_video_1",
        durationMs: 5000,
      },
      {
        index: 2,
        filename: "clips/shot_002.mp4",
        videoNodeId: "video_2",
        videoAssetId: "asset_video_2",
        durationMs: 4000,
      },
    ],
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
    resolvedGenerationSettings: resolvedGenerationSettings(),
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
      canvasNode<CharacterAssetNodeData>("character_1", "character_asset", "Hero", {
        name: "Hero",
        role: "protagonist",
        appearance: "rain-damp hair and a dark utility coat",
        personality: "determined and observant",
        wardrobe: "dark utility coat",
        identityPrompt: "consistent hero character reference",
        consistencyPrompt: "preserve face, coat, and silhouette",
        locked: true,
        lockedFields: ["appearance", "wardrobe"],
        referenceAssetIds: ["asset_character_ref"],
      }),
      canvasNode<LocationAssetNodeData>("location_1", "location_asset", "Control Room", {
        name: "Control Room",
        environment: "near-future rooftop control room",
        mood: "tense and rainy",
        visualStyle: "cinematic neon noir",
        locationPrompt: "rooftop control room with glowing signal screens",
        referenceAssetIds: ["asset_location_ref"],
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
