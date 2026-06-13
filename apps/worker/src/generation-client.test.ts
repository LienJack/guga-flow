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
