import { ProviderError, type ImageProvider, type VideoProvider } from "@guga-flow/provider-contracts";
import type {
  GenerationJobInput,
  GenerationJobRecord,
  ImageToVideoJobInput,
  ShotToImageJobInput,
} from "@guga-flow/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { GenerationWorkerClient } from "./generation-client";
import type { GenerationExecutorRegistry } from "./generation-executors";
import { runOneGenerationJob } from "./generation-runner";

function createClientMock(): GenerationWorkerClient {
  return {
    claimNextJob: vi.fn(async () => ({})),
    succeedJob: vi.fn(async () => jobRecord("job_done", shotInput())),
    failJob: vi.fn(async () => jobRecord("job_failed", shotInput(), { status: "failed" })),
  };
}

function createRegistryMock(): GenerationExecutorRegistry {
  return {
    image: {
      capability: {
        id: "mock-image",
        displayName: "Mock Image",
        requiresApiKey: false,
      },
      generateImage: vi.fn(async () => ({
        assetId: "provider_image_1",
        storageKey: "mock/images/provider_image_1.png",
        mimeType: "image/png",
        provider: "mock-image",
        model: "mock-image-v1",
        prompt: "Image prompt",
        referenceAssetIds: ["asset_ref_1"],
      })),
    } as ImageProvider,
    video: {
      capability: {
        id: "mock-video",
        displayName: "Mock Video",
        requiresApiKey: false,
      },
      generateVideo: vi.fn(async () => ({
        assetId: "provider_video_1",
        storageKey: "mock/videos/provider_video_1.mp4",
        mimeType: "video/mp4",
        provider: "mock-video",
        model: "mock-video-v1",
        prompt: "Video prompt",
        referenceAssetIds: ["asset_ref_1"],
      })),
    } as VideoProvider,
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
    expect(registry.image.generateImage).not.toHaveBeenCalled();
    expect(registry.video.generateVideo).not.toHaveBeenCalled();
    expect(client.succeedJob).not.toHaveBeenCalled();
    expect(client.failJob).not.toHaveBeenCalled();
  });

  it("executes claimed shot-to-image jobs and reports success", async () => {
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_image", shotInput()),
    });

    const result = await runOneGenerationJob({ client, registry });

    expect(registry.image.generateImage).toHaveBeenCalledWith({
      projectId: "project_1",
      prompt: "Image prompt",
      negativePrompt: "no text",
      referenceAssetIds: ["asset_ref_1"],
      forceFailure: undefined,
    });
    expect(client.succeedJob).toHaveBeenCalledWith(
      "job_image",
      expect.objectContaining({
        storageKey: "mock/images/provider_image_1.png",
        provider: "mock-image",
        prompt: "Image prompt",
      }),
    );
    expect(result).toEqual({ status: "succeeded", jobId: "job_image" });
  });

  it("executes claimed image-to-video jobs and reports success", async () => {
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_video", videoInput(), {
        operation: "image_to_video",
        provider: "mock-video",
      }),
    });

    const result = await runOneGenerationJob({ client, registry });

    expect(registry.video.generateVideo).toHaveBeenCalledWith({
      projectId: "project_1",
      prompt: "Video prompt",
      sourceImageAssetId: "asset_image_1",
      durationSec: 5,
      referenceAssetIds: ["asset_ref_1"],
      forceFailure: undefined,
    });
    expect(client.succeedJob).toHaveBeenCalledWith(
      "job_video",
      expect.objectContaining({
        storageKey: "mock/videos/provider_video_1.mp4",
        provider: "mock-video",
        prompt: "Video prompt",
      }),
    );
    expect(result).toEqual({ status: "succeeded", jobId: "job_video" });
  });

  it("reports provider failures back to the backend fail endpoint", async () => {
    vi.mocked(client.claimNextJob).mockResolvedValue({
      job: jobRecord("job_image", shotInput()),
    });
    vi.mocked(registry.image.generateImage).mockRejectedValue(
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
    parentShotNodeId: "shot_1",
    referenceAssetIds: ["asset_ref_1"],
    sourceNodeIds: ["image_1", "shot_1"],
    provider: "mock-video",
    model: "mock-video-v1",
  };
}

function jobRecord(
  id: string,
  inputJson: GenerationJobInput,
  overrides: Partial<GenerationJobRecord<GenerationJobInput>> = {},
): GenerationJobRecord<GenerationJobInput> {
  return {
    id,
    projectId: "project_1",
    operation: inputJson.operation,
    status: "running",
    provider: inputJson.provider,
    model: inputJson.model,
    sourceNodeId: inputJson.sourceNodeId,
    inputJson,
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}
