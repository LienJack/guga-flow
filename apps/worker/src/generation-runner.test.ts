import { ProviderError, type ImageProvider, type VideoProvider } from "@guga-flow/provider-contracts";
import type {
  AssetAnalysisJobInput,
  CharacterToImageJobInput,
  EditorExportJobInput,
  GenerationJobRecord,
  ImageRefinementJobInput,
  ImageToVideoJobInput,
  ShotToImageJobInput,
} from "@guga-flow/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GenerationWorkerClient } from "./generation-client";
import type { GenerationExecutorRegistry } from "./generation-executors";
import { runOneGenerationJob } from "./generation-runner";

type WorkerGenerationJobInput =
  | ShotToImageJobInput
  | CharacterToImageJobInput
  | AssetAnalysisJobInput
  | ImageRefinementJobInput
  | ImageToVideoJobInput
  | EditorExportJobInput;

function createClientMock(): GenerationWorkerClient {
  return {
    claimNextJob: vi.fn(async () => ({})),
    getProviderRuntimeConfig: vi.fn(async (_projectId, kind, provider) => ({
      kind,
      provider,
      env: {},
    })),
    getAssetBytes: vi.fn(async (_projectId: string, assetId: string) => ({
      body: Buffer.from(`clip:${assetId}`),
      mimeType: "video/mp4",
    })),
    succeedJob: vi.fn(async () => jobRecord("job_done", shotInput())),
    succeedAssetAnalysisJob: vi.fn(async () => jobRecord("job_analysis_done", {
      operation: "asset_caption",
      projectId: "project_1",
      assetIds: ["asset_1"],
      provider: "mock-vision",
      model: "mock-vision-v1",
    })),
    succeedEditorExportJob: vi.fn(async () => jobRecord("job_export_done", editorExportInput())),
    waitJob: vi.fn(async () => jobRecord("job_waiting", videoInput(), { status: "provider_waiting" })),
    failJob: vi.fn(async () => jobRecord("job_failed", shotInput(), { status: "failed" })),
  };
}

function createRegistryMock(): GenerationExecutorRegistry {
  const videoOutput = {
    assetId: "provider_video_1",
    storageKey: "mock/videos/provider_video_1.mp4",
    mimeType: "video/mp4",
    provider: "mock-video",
    model: "mock-video-v1",
    prompt: "Video prompt",
    referenceAssetIds: ["asset_ref_1"],
  };
  const imageProvider = {
    capability: {
      id: "mock-image",
      displayName: "Mock Image",
      requiresApiKey: false,
    },
    generateImage: vi.fn(async () => ({
      outputs: [
        {
          assetId: "provider_image_1",
          storageKey: "mock/images/provider_image_1.png",
          mimeType: "image/png",
          provider: "mock-image",
          model: "mock-image-v1",
          prompt: "Image prompt",
          referenceAssetIds: ["asset_ref_1"],
        },
        {
          assetId: "provider_image_2",
          storageKey: "mock/images/provider_image_2.png",
          mimeType: "image/png",
          provider: "mock-image",
          model: "mock-image-v1",
          prompt: "Image prompt",
          referenceAssetIds: ["asset_ref_1"],
        },
      ],
    })),
  } as ImageProvider;

  const videoProvider = {
    capability: {
      id: "mock-video",
      displayName: "Mock Video",
      requiresApiKey: false,
    },
    createTask: vi.fn(async () => ({
      status: "succeeded",
      providerTaskId: "provider_task_1",
      output: {
        ...videoOutput,
        providerTaskId: "provider_task_1",
      },
    })),
    getTask: vi.fn(async () => ({
      status: "succeeded",
      providerTaskId: "provider_task_1",
      output: {
        ...videoOutput,
        providerTaskId: "provider_task_1",
      },
    })),
    cancelTask: vi.fn(async () => ({
      status: "cancelled",
      providerTaskId: "provider_task_1",
    })),
    generateVideo: vi.fn(async () => videoOutput),
  } as VideoProvider;

  return {
    imageProviders: {
      get: vi.fn(() => imageProvider),
      list: vi.fn(() => [imageProvider]),
    },
    videoProviders: {
      get: vi.fn(() => videoProvider),
      list: vi.fn(() => [videoProvider]),
    },
  };
}

describe("generation worker runner", () => {
  let client: GenerationWorkerClient;
  let registry: GenerationExecutorRegistry;

  beforeEach(() => {
    client = createClientMock();
    registry = createRegistryMock();
  });

  it("exits one-shot mode without provider calls when no job is claimed", async () => {
    const result = await runOneGenerationJob({ client, registry });

    expect(result).toEqual({ status: "idle" });
    expect(registry.imageProviders.get).not.toHaveBeenCalled();
    expect(registry.videoProviders.get).not.toHaveBeenCalled();
    expect(client.succeedJob).not.toHaveBeenCalled();
    expect(client.waitJob).not.toHaveBeenCalled();
    expect(client.failJob).not.toHaveBeenCalled();
  });

  it("executes claimed shot-to-image jobs and reports success", async () => {
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_image", shotInput()),
    });

    const result = await runOneGenerationJob({ client, registry });

    const imageProvider = registry.imageProviders.get("mock-image");
    expect(registry.imageProviders.get).toHaveBeenCalledWith("mock-image");
    expect(imageProvider.generateImage).toHaveBeenCalledWith({
      projectId: "project_1",
      prompt: "Image prompt",
      negativePrompt: "no text",
      model: "mock-image-v1",
      aspectRatio: "16:9",
      count: 2,
      referenceAssetIds: ["asset_ref_1"],
      providerParams: { quality: "high" },
      forceFailure: undefined,
    });
    expect(client.succeedJob).toHaveBeenCalledWith(
      "job_image",
      expect.objectContaining({
        storageKey: "mock/images/provider_image_1.png",
        provider: "mock-image",
        prompt: "Image prompt",
      }),
      [
        expect.objectContaining({
          storageKey: "mock/images/provider_image_1.png",
        }),
        expect.objectContaining({
          storageKey: "mock/images/provider_image_2.png",
        }),
      ],
    );
    expect(result).toEqual({ status: "succeeded", jobId: "job_image" });
  });

  it("fetches project runtime provider config when using the default registry", async () => {
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_image", shotInput()),
    });

    const result = await runOneGenerationJob({ client });

    expect(client.getProviderRuntimeConfig).toHaveBeenCalledWith("project_1", "image", "mock-image");
    expect(client.succeedJob).toHaveBeenCalledWith(
      "job_image",
      expect.objectContaining({
        provider: "mock-image",
      }),
      undefined,
    );
    expect(result).toEqual({ status: "succeeded", jobId: "job_image" });
  });

  it("executes claimed character reference image jobs and reports success", async () => {
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_character", characterInput(), {
        operation: "character_to_image",
        provider: "mock-image",
      }),
    });

    const result = await runOneGenerationJob({ client, registry });
    const imageProvider = registry.imageProviders.get("mock-image");

    expect(registry.imageProviders.get).toHaveBeenCalledWith("mock-image");
    expect(imageProvider.generateImage).toHaveBeenCalledWith({
      projectId: "project_1",
      prompt: "Character reference prompt",
      mode: "text_to_image",
      model: "mock-image-v1",
      aspectRatio: "1:1",
      count: 1,
      referenceAssetIds: ["asset_character_ref"],
      providerParams: { quality: "medium" },
      forceFailure: undefined,
    });
    expect(client.succeedJob).toHaveBeenCalledWith(
      "job_character",
      expect.objectContaining({
        storageKey: "mock/images/provider_image_1.png",
        provider: "mock-image",
        prompt: "Image prompt",
      }),
      undefined,
    );
    expect(result).toEqual({ status: "succeeded", jobId: "job_character" });
  });

  it("executes claimed image-to-video jobs and reports success", async () => {
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_video", videoInput(), {
        operation: "image_to_video",
        provider: "mock-video",
      }),
    });

    const result = await runOneGenerationJob({ client, registry });
    const videoProvider = registry.videoProviders.get("mock-video");

    expect(registry.videoProviders.get).toHaveBeenCalledWith("mock-video");
    expect(videoProvider.createTask).toHaveBeenCalledWith({
      projectId: "project_1",
      prompt: "Video prompt",
      mode: "image_to_video",
      model: "mock-video-v1",
      sourceImageAssetId: "asset_image_1",
      firstFrameAssetId: "asset_image_1",
      lastFrameAssetId: undefined,
      durationSec: 5,
      aspectRatio: "16:9",
      resolution: "720p",
      referenceAssetIds: ["asset_ref_1"],
      referenceMedia: [
        { assetId: "asset_image_1", role: "first_frame", sourceNodeId: "image_1" },
        { assetId: "asset_ref_1", role: "reference_image" },
      ],
      providerParams: { cameraFixed: false },
      forceFailure: undefined,
    });
    expect(client.succeedJob).toHaveBeenCalledWith(
      "job_video",
      expect.objectContaining({
        storageKey: "mock/videos/provider_video_1.mp4",
        provider: "mock-video",
        prompt: "Video prompt",
      }),
      undefined,
    );
    expect(result).toEqual({ status: "succeeded", jobId: "job_video" });
  });

  it("executes claimed image refinement jobs and reports success", async () => {
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_refine", imageRefinementInput(), {
        operation: "image_refinement",
        provider: "mock-image",
      }),
    });

    const result = await runOneGenerationJob({ client, registry });
    const imageProvider = registry.imageProviders.get("mock-image");

    expect(registry.imageProviders.get).toHaveBeenCalledWith("mock-image");
    expect(imageProvider.generateImage).toHaveBeenCalledWith({
      projectId: "project_1",
      prompt: "Refine image lighting",
      mode: "image_to_image",
      model: "mock-image-v1",
      aspectRatio: "16:9",
      count: 1,
      sourceImageAssetId: "asset_image_1",
      sourceImageNodeId: "image_1",
      referenceAssetIds: ["asset_ref_1"],
      providerParams: { strength: "medium" },
      forceFailure: undefined,
    });
    expect(client.succeedJob).toHaveBeenCalledWith(
      "job_refine",
      expect.objectContaining({
        storageKey: "mock/images/provider_image_1.png",
        provider: "mock-image",
        prompt: "Image prompt",
      }),
      undefined,
    );
    expect(result).toEqual({ status: "succeeded", jobId: "job_refine" });
  });

  it("marks submitted image-to-video jobs as waiting when provider task is still running", async () => {
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_video", videoInput(), {
        operation: "image_to_video",
        provider: "mock-video",
      }),
    });
    const videoProvider = registry.videoProviders.get("mock-video");
    vi.mocked(videoProvider.createTask).mockResolvedValue({
      status: "provider_waiting",
      providerTaskId: "provider_task_waiting",
      rawJson: { providerTaskId: "provider_task_waiting" },
    });

    const result = await runOneGenerationJob({ client, registry });

    expect(client.waitJob).toHaveBeenCalledWith("job_video", {
      providerTaskId: "provider_task_waiting",
      provider: "mock-video",
      model: "mock-video-v1",
      rawJson: { providerTaskId: "provider_task_waiting" },
    });
    expect(client.succeedJob).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "waiting",
      jobId: "job_video",
      providerTaskId: "provider_task_waiting",
    });
  });

  it("polls provider-waiting image-to-video jobs and reports success", async () => {
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_video", videoInput(), {
        operation: "image_to_video",
        provider: "mock-video",
        providerTaskId: "provider_task_1",
      }),
    });
    const videoProvider = registry.videoProviders.get("mock-video");

    const result = await runOneGenerationJob({ client, registry });

    expect(videoProvider.createTask).not.toHaveBeenCalled();
    expect(videoProvider.getTask).toHaveBeenCalledWith("provider_task_1");
    expect(client.succeedJob).toHaveBeenCalledWith(
      "job_video",
      expect.objectContaining({
        providerTaskId: "provider_task_1",
        storageKey: "mock/videos/provider_video_1.mp4",
      }),
      undefined,
    );
    expect(result).toEqual({ status: "succeeded", jobId: "job_video" });
  });

  it("packages claimed editor export jobs without provider calls", async () => {
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_export", editorExportInput(), {
        operation: "editor_export",
        provider: "mock-editor",
        model: "zip-v1",
      }),
    });

    const result = await runOneGenerationJob({ client, registry });

    expect(client.getAssetBytes).toHaveBeenCalledTimes(2);
    expect(client.getAssetBytes).toHaveBeenCalledWith("project_1", "asset_video_1");
    expect(client.succeedEditorExportJob).toHaveBeenCalledWith(
      "job_export",
      expect.objectContaining({
        mimeType: "application/zip",
        timeline: expect.objectContaining({
          editorExportId: "export_1",
        }),
        clips: expect.arrayContaining([
          expect.objectContaining({
            videoNodeId: "video_1",
            videoAssetId: "asset_video_1",
          }),
        ]),
      }),
    );
    expect(registry.imageProviders.get).not.toHaveBeenCalled();
    expect(registry.videoProviders.get).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "succeeded", jobId: "job_export" });
  });

  it("executes claimed asset analysis jobs and reports analysis output", async () => {
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_caption", assetCaptionInput(), {
        operation: "asset_caption",
        provider: "mock-vision",
      }),
    });

    const result = await runOneGenerationJob({ client, registry });

    expect(client.succeedAssetAnalysisJob).toHaveBeenCalledWith(
      "job_caption",
      expect.objectContaining({
        operation: "asset_caption",
        provider: "mock-vision",
        overwrite: false,
        results: [
          expect.objectContaining({
            assetId: "asset_1",
            caption: expect.stringContaining("asset_1"),
          }),
        ],
      }),
    );
    expect(registry.imageProviders.get).not.toHaveBeenCalled();
    expect(registry.videoProviders.get).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "succeeded", jobId: "job_caption" });
  });

  it("reports provider failures back to the backend fail endpoint", async () => {
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_image", shotInput()),
    });
    const imageProvider = registry.imageProviders.get("mock-image");
    vi.mocked(imageProvider.generateImage).mockRejectedValue(
      new ProviderError({
        provider: "mock-image",
        code: "MOCK_PROVIDER_FAILURE",
        message: "mock image failure",
        retryable: true,
      }),
    );

    const result = await runOneGenerationJob({ client, registry });

    expect(client.succeedJob).not.toHaveBeenCalled();
    expect(client.failJob).toHaveBeenCalledWith(
      "job_image",
      expect.objectContaining({
        provider: "mock-image",
        code: "MOCK_PROVIDER_FAILURE",
        message: "mock image failure",
        retryable: true,
      }),
    );
    expect(result).toMatchObject({
      status: "failed",
      jobId: "job_image",
      error: {
        code: "MOCK_PROVIDER_FAILURE",
      },
    });
  });

  it("does not throw when a terminal update is rejected after cancellation", async () => {
    const logger = {
      info: vi.fn(),
      error: vi.fn(),
    };
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_video", videoInput(), {
        operation: "image_to_video",
        provider: "mock-video",
      }),
    });
    vi.mocked(client.succeedJob).mockRejectedValueOnce(
      new Error("Worker API /worker/generation/jobs/job_video/succeed failed with 400"),
    );
    vi.mocked(client.failJob).mockRejectedValueOnce(
      new Error("Worker API /worker/generation/jobs/job_video/fail failed with 400"),
    );

    const result = await runOneGenerationJob({ client, registry, logger });

    expect(client.failJob).toHaveBeenCalledWith(
      "job_video",
      expect.objectContaining({
        provider: "mock-video",
        code: "WORKER_EXECUTOR_ERROR",
      }),
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("failure report was rejected"),
    );
    expect(result).toMatchObject({
      status: "failed",
      jobId: "job_video",
      error: {
        code: "WORKER_EXECUTOR_ERROR",
      },
    });
  });
});

function shotInput(): ShotToImageJobInput {
  return {
    operation: "shot_to_image",
    projectId: "project_1",
    sourceNodeId: "shot_1",
    shotNodeId: "shot_1",
    prompt: "Image prompt",
    negativePrompt: "no text",
    referenceAssetIds: ["asset_ref_1"],
    sourceNodeIds: {
      shotNodeId: "shot_1",
      characterNodeIds: [],
      referenceAssetIds: ["asset_ref_1"],
    },
    debugParts: [],
    missingContext: [],
    provider: "mock-image",
    model: "mock-image-v1",
    aspectRatio: "16:9",
    count: 2,
    providerParams: { quality: "high" },
  };
}

function characterInput(): CharacterToImageJobInput {
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
    providerParams: { quality: "medium" },
    assetPurpose: "character_reference",
  };
}

function videoInput(): ImageToVideoJobInput {
  return {
    operation: "image_to_video",
    projectId: "project_1",
    sourceNodeId: "image_1",
    imageNodeId: "image_1",
    sourceImageAssetId: "asset_image_1",
    prompt: "Video prompt",
    durationSeconds: 5,
    aspectRatio: "16:9",
    resolution: "720p",
    parentShotNodeId: "shot_1",
    referenceAssetIds: ["asset_ref_1"],
    referenceMedia: [
      { assetId: "asset_image_1", role: "first_frame", sourceNodeId: "image_1" },
      { assetId: "asset_ref_1", role: "reference_image" },
    ],
    sourceNodeIds: ["image_1", "shot_1"],
    provider: "mock-video",
    model: "mock-video-v1",
    providerParams: { cameraFixed: false },
  };
}

function imageRefinementInput(): ImageRefinementJobInput {
  return {
    operation: "image_refinement",
    projectId: "project_1",
    sourceNodeId: "image_1",
    imageNodeId: "image_1",
    sourceImageAssetId: "asset_image_1",
    prompt: "Refine image lighting",
    referenceAssetIds: ["asset_ref_1"],
    sourceNodeIds: ["image_1", "shot_1"],
    parentShotNodeId: "shot_1",
    provider: "mock-image",
    model: "mock-image-v1",
    aspectRatio: "16:9",
    providerParams: { strength: "medium" },
  };
}

function editorExportInput(): EditorExportJobInput {
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
    clips: [
      {
        videoNodeId: "video_1",
        videoAssetId: "asset_video_1",
        filename: "clips/shot_001.mp4",
        mimeType: "video/mp4",
        durationMs: 4000,
      },
      {
        videoNodeId: "video_2",
        videoAssetId: "asset_video_2",
        filename: "clips/shot_002.mp4",
        mimeType: "video/mp4",
        durationMs: 5000,
      },
    ],
  };
}

function assetCaptionInput(): AssetAnalysisJobInput {
  return {
    operation: "asset_caption",
    projectId: "project_1",
    assetIds: ["asset_1"],
    provider: "mock-vision",
    model: "mock-vision-v1",
  };
}

function jobRecord(
  id: string,
  inputJson: WorkerGenerationJobInput,
  overrides: Partial<GenerationJobRecord<WorkerGenerationJobInput>> = {},
): GenerationJobRecord<WorkerGenerationJobInput> {
  return {
    id,
    projectId: "project_1",
    operation: inputJson.operation,
    status: "running",
    provider: inputJson.operation === "editor_export" ? "mock-editor" : inputJson.provider,
    model: inputJson.operation === "editor_export" ? "zip-v1" : inputJson.model,
    sourceNodeId: "sourceNodeId" in inputJson ? inputJson.sourceNodeId : undefined,
    inputJson,
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}
