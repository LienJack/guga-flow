import { describe, expect, it, vi } from "vitest";

import { HttpGenerationWorkerClient, backendWorkerBaseUrlFromEnv } from "./generation-client";

describe("generation worker client configuration", () => {
  it("defaults to the backend development API port", () => {
    expect(backendWorkerBaseUrlFromEnv({})).toBe("http://localhost:3002/api/v1");
  });

  it("prefers explicit internal backend URLs over legacy backend URLs", () => {
    expect(
      backendWorkerBaseUrlFromEnv({
        BACKEND_INTERNAL_URL: "http://backend:3002/api/v1",
        BACKEND_URL: "http://localhost:3002/api/v1",
      }),
    ).toBe("http://backend:3002/api/v1");
  });

  it("fetches asset preview bytes for worker-side packaging", async () => {
    const fetchImpl = vi.fn(async () => new Response("clip-bytes", {
      headers: { "content-type": "video/mp4" },
    }));
    const client = new HttpGenerationWorkerClient(
      "http://localhost:3002/api/v1",
      fetchImpl as unknown as typeof fetch,
      "worker-secret",
    );

    const result = await client.getAssetBytes("project_1", "asset_video_1");

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3002/api/v1/projects/project_1/assets/asset_video_1/preview",
    );
    expect(result.body.toString("utf8")).toBe("clip-bytes");
    expect(result.mimeType).toBe("video/mp4");
  });

  it("posts editor export package success payloads", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: "job_export_1" })));
    const client = new HttpGenerationWorkerClient(
      "http://localhost:3002/api/v1",
      fetchImpl as unknown as typeof fetch,
      "worker-secret",
    );

    await client.succeedEditorExportJob("job_export_1", {
      storageKey: "project_1/editor-exports/export_1.zip",
      mimeType: "application/zip",
      bytesBase64: "UEsDBAo=",
      timeline: {
        version: "1.0",
        projectId: "project_1",
        editorExportId: "export_1",
        title: "Export",
        aspectRatio: "16:9",
        fps: 24,
        sortMode: "manual",
        exportPreset: "standard_zip",
        tracks: [],
        assets: [],
      },
      storyboardCsv: "index,filename\n",
      clips: [],
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3002/api/v1/worker/generation/jobs/job_export_1/succeed",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("packageOutput"),
      }),
    );
  });

  it("posts AI text generation success payloads", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: "job_text_1" })));
    const client = new HttpGenerationWorkerClient(
      "http://localhost:3002/api/v1",
      fetchImpl as unknown as typeof fetch,
      "worker-secret",
    );

    await client.succeedTextGenerationJob("job_text_1", {
      operation: "ai_text_generation",
      sourceNodeId: "ai_text_1",
      targetNodeId: "ai_text_1",
      provider: "mock-llm",
      model: "mock-storyboard",
      prompt: "Write a two-beat sequence.",
      text: "Beat 1: Ari sees the relay fail.",
      context: [],
      sourceNodeIds: ["ai_text_1"],
      completedAt: "2026-06-12T00:10:00.000Z",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3002/api/v1/worker/generation/jobs/job_text_1/succeed",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("textGenerationOutput"),
      }),
    );
  });

  it("posts media metadata success payloads", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: "job_media_1" })));
    const client = new HttpGenerationWorkerClient(
      "http://localhost:3002/api/v1",
      fetchImpl as unknown as typeof fetch,
      "worker-secret",
    );

    await client.succeedMediaMetadataJob("job_media_1", {
      operation: "media_metadata",
      provider: "mock-media",
      model: "metadata-v1",
      overwrite: false,
      createThumbnail: true,
      generationJobId: "job_media_1",
      results: [
        {
          assetId: "asset_video_1",
          mediaInfo: { durationMs: 4200, hasVideo: true, hasAudio: false },
          thumbnail: {
            kind: "thumbnail",
            status: "ready",
            mimeType: "image/png",
            rebuildStrategy: "mock_media_metadata",
          },
        },
      ],
      completedAt: "2026-06-14T00:00:00.000Z",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3002/api/v1/worker/generation/jobs/job_media_1/succeed",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("mediaMetadataOutput"),
      }),
    );
  });

  it("posts scene frame extraction success payloads", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: "job_scene_1" })));
    const client = new HttpGenerationWorkerClient(
      "http://localhost:3002/api/v1",
      fetchImpl as unknown as typeof fetch,
      "worker-secret",
    );

    await client.succeedSceneFrameExtractionJob("job_scene_1", {
      operation: "scene_frame_extraction",
      provider: "mock-scene-detector",
      model: "scene-frame-v1",
      sourceAssetId: "asset_video_1",
      sourceNodeId: "source_video_1",
      strategy: "scene_segments",
      frames: [
        {
          frameId: "frame-1",
          orderIndex: 0,
          timestampMs: 0,
          sceneIndex: 0,
          providerOutput: {
            assetId: "provider_frame_1",
            storageKey: "project_1/scene-frames/job_scene_1-1.png",
            mimeType: "image/png",
            provider: "mock-scene-detector",
            model: "scene-frame-v1",
            prompt: "Frame 1",
            referenceAssetIds: ["asset_video_1"],
          },
        },
      ],
      scenes: [
        {
          segmentId: "scene-0",
          orderIndex: 0,
          startMs: 0,
          endMs: 1200,
          representativeFrameId: "frame-1",
        },
      ],
      completedAt: "2026-06-14T00:00:00.000Z",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3002/api/v1/worker/generation/jobs/job_scene_1/succeed",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("sceneFrameExtractionOutput"),
      }),
    );
  });

  it("posts asset prompt polish and image generation success payloads", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: "job_asset_1" })));
    const client = new HttpGenerationWorkerClient(
      "http://localhost:3002/api/v1",
      fetchImpl as unknown as typeof fetch,
      "worker-secret",
    );

    await client.succeedAssetPromptPolishJob("job_polish_1", {
      operation: "asset_prompt_polish",
      provider: "mock-llm",
      model: "mock-polish-v1",
      overwrite: false,
      generationJobId: "job_polish_1",
      results: [
        {
          assetId: "asset_1",
          sourcePrompt: "rough prompt",
          polishedPrompt: "polished prompt",
        },
      ],
      completedAt: "2026-06-14T00:00:00.000Z",
    });
    await client.succeedAssetImageGenerationJob("job_generate_1", {
      operation: "asset_image_generation",
      provider: "mock-image",
      model: "mock-image-v1",
      overwrite: false,
      generationJobId: "job_generate_1",
      results: [
        {
          sourceAssetId: "asset_1",
          prompt: "polished prompt",
          providerOutput: {
            assetId: "provider_asset_1",
            storageKey: "project_1/asset-generations/job_generate_1.png",
            mimeType: "image/png",
            provider: "mock-image",
            model: "mock-image-v1",
            prompt: "polished prompt",
            referenceAssetIds: [],
          },
        },
      ],
      completedAt: "2026-06-14T00:00:00.000Z",
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/worker/generation/jobs/job_polish_1/succeed",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("assetPromptPolishOutput"),
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/worker/generation/jobs/job_generate_1/succeed",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("assetImageGenerationOutput"),
      }),
    );
  });

  it("posts provider runtime config requests without putting credentials in job payloads", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          kind: "image",
          provider: "image2",
          env: { OPENAI_API_KEY: "sk-runtime" },
        }),
      ),
    );
    const client = new HttpGenerationWorkerClient(
      "http://localhost:3002/api/v1",
      fetchImpl as unknown as typeof fetch,
      "worker-secret",
    );

    const result = await client.getProviderRuntimeConfig("project_1", "image", "image2");

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:3002/api/v1/worker/generation/providers/runtime",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-worker-token": "worker-secret",
        }),
        body: JSON.stringify({
          projectId: "project_1",
          kind: "image",
          provider: "image2",
        }),
      }),
    );
    expect(result.env.OPENAI_API_KEY).toBe("sk-runtime");
  });
});
