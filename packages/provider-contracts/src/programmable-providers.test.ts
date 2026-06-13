import { describe, expect, it, vi } from "vitest";
import type { ProgrammableProviderManifest } from "@guga-flow/shared-types";

import { ProgrammableImageProvider, ProgrammableVideoProvider } from "./programmable-providers";

const imageManifest: ProgrammableProviderManifest = {
  id: "custom:atlas-cloud",
  kind: "image",
  displayName: "Atlas Cloud",
  credentials: [{ key: "apiKey", label: "API Key", type: "password", required: true }],
  models: [{ id: "atlas-image-v1", displayName: "Atlas Image v1", default: true }],
  defaultModel: "atlas-image-v1",
  supportedModes: ["text_to_image"],
  defaultAspectRatio: "16:9",
  supportedAspectRatios: ["16:9"],
  parameters: [],
  image: {
    supportsReferenceImages: false,
    maxReferenceImages: 0,
    supportsMultipleOutputs: false,
    maxOutputs: 1,
    action: {
      request: {
        method: "POST",
        url: "https://api.example.test/images",
        headers: { Authorization: "Bearer {{credential.apiKey}}" },
        bodyJson: { prompt: "{{input.prompt}}", model: "{{input.model}}" },
      },
      output: { source: "url", path: "data.url", mimeType: "image/png" },
    },
  },
};

const videoManifest: ProgrammableProviderManifest = {
  id: "custom:motion-cloud",
  kind: "video",
  displayName: "Motion Cloud",
  credentials: [{ key: "apiKey", label: "API Key", type: "password", required: true }],
  models: [{ id: "motion-video-v1", displayName: "Motion Video v1", default: true }],
  defaultModel: "motion-video-v1",
  supportedModes: ["image_to_video"],
  defaultAspectRatio: "16:9",
  supportedAspectRatios: ["16:9"],
  parameters: [],
  video: {
    supportsFirstFrame: true,
    supportsLastFrame: false,
    supportsReferenceImages: true,
    maxReferenceImages: 2,
    supportsCancel: true,
    defaultDurationSeconds: 5,
    supportedDurationSeconds: [5],
    defaultResolution: "720p",
    supportedResolutions: ["720p"],
    action: {
      request: {
        method: "POST",
        url: "https://api.example.test/videos",
        headers: { Authorization: "Bearer {{credential.apiKey}}" },
        bodyJson: { prompt: "{{input.prompt}}", image: "{{input.sourceImageAssetId}}" },
      },
      task: {
        idPath: "data.taskId",
        statusPath: "data.status",
        succeededValues: ["succeeded"],
        failedValues: ["failed"],
        output: { source: "url", path: "data.videoUrl", mimeType: "video/mp4" },
        errorPath: "data.error",
        pollRequest: {
          method: "GET",
          url: "https://api.example.test/videos/{{task.providerTaskId}}",
        },
      },
    },
  },
};

describe("programmable providers", () => {
  it("executes image manifests through guarded request templates", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: { url: "https://cdn.example.test/generated.png" } })),
    );
    const provider = new ProgrammableImageProvider(imageManifest, {
      credentials: { apiKey: "sk-secret-provider-key" },
      fetchImpl,
    });

    const result = await provider.generateImage({
      projectId: "project_1",
      prompt: "neon rooftop",
      model: "atlas-image-v1",
      aspectRatio: "16:9",
      referenceAssetIds: ["asset_ref_1"],
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/images",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-secret-provider-key",
          "content-type": "application/json",
        }),
        body: JSON.stringify({ prompt: "neon rooftop", model: "atlas-image-v1" }),
      }),
    );
    expect(result.outputs[0]).toMatchObject({
      provider: "custom:atlas-cloud",
      model: "atlas-image-v1",
      prompt: "neon rooftop",
      remoteUrl: "https://cdn.example.test/generated.png",
      mimeType: "image/png",
      referenceAssetIds: ["asset_ref_1"],
    });
  });

  it("executes async video task manifests through create and poll mappings", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { taskId: "task_123" } })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { status: "succeeded", videoUrl: "https://cdn.example.test/video.mp4" } })),
      );
    const provider = new ProgrammableVideoProvider(videoManifest, {
      credentials: { apiKey: "sk-secret-provider-key" },
      fetchImpl,
    });

    const created = await provider.createTask({
      projectId: "project_1",
      prompt: "pan across rooftop",
      model: "motion-video-v1",
      sourceImageAssetId: "asset_image_1",
      aspectRatio: "16:9",
      durationSec: 5,
      resolution: "720p",
    });
    const polled = await provider.getTask("task_123");

    expect(created).toMatchObject({
      status: "provider_waiting",
      providerTaskId: "task_123",
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://api.example.test/videos/task_123",
      expect.objectContaining({ method: "GET" }),
    );
    expect(polled).toMatchObject({
      status: "succeeded",
      providerTaskId: "task_123",
      output: {
        provider: "custom:motion-cloud",
        remoteUrl: "https://cdn.example.test/video.mp4",
        mimeType: "video/mp4",
      },
    });
  });

  it("blocks non-public provider URLs before fetch", async () => {
    const provider = new ProgrammableImageProvider(
      {
        ...imageManifest,
        image: {
          ...imageManifest.image!,
          action: {
            ...imageManifest.image!.action,
            request: {
              ...imageManifest.image!.action.request,
              url: "https://127.0.0.1/images",
            },
          },
        },
      },
      {
        credentials: { apiKey: "sk-secret-provider-key" },
        fetchImpl: vi.fn(),
      },
    );

    await expect(
      provider.generateImage({
        projectId: "project_1",
        prompt: "blocked",
        model: "atlas-image-v1",
      }),
    ).rejects.toMatchObject({
      code: "PROGRAMMABLE_PROVIDER_URL_BLOCKED",
    });
  });

  it("blocks bracketed IPv6 and IPv4-mapped local provider URLs before fetch", async () => {
    for (const url of ["https://[::1]/images", "https://[fd00::1]/images", "https://[::ffff:127.0.0.1]/images"]) {
      const fetchImpl = vi.fn();
      const provider = new ProgrammableImageProvider(
        {
          ...imageManifest,
          image: {
            ...imageManifest.image!,
            action: {
              ...imageManifest.image!.action,
              request: {
                ...imageManifest.image!.action.request,
                url,
              },
            },
          },
        },
        {
          credentials: { apiKey: "sk-secret-provider-key" },
          fetchImpl,
        },
      );

      await expect(
        provider.generateImage({
          projectId: "project_1",
          prompt: "blocked",
          model: "atlas-image-v1",
        }),
      ).rejects.toMatchObject({
        code: "PROGRAMMABLE_PROVIDER_URL_BLOCKED",
      });
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it("sanitizes provider error messages before surfacing them", async () => {
    const provider = new ProgrammableImageProvider(imageManifest, {
      credentials: { apiKey: "sk-secret-provider-key" },
      fetchImpl: vi.fn(async () =>
        new Response(JSON.stringify({ error: "Bearer sk-secret-provider-key failed" }), { status: 500 }),
      ),
    });

    await expect(
      provider.generateImage({
        projectId: "project_1",
        prompt: "fail",
        model: "atlas-image-v1",
      }),
    ).rejects.toMatchObject({
      code: "PROGRAMMABLE_PROVIDER_HTTP_ERROR",
      message: "Bearer [redacted] failed",
    });
  });
});
