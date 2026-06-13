import { BadRequestException } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { AssetPreviewPayload } from "../assets/assets.service";
import { describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service";
import { EditorExportsService } from "./editor-exports.service";

const createdAt = new Date("2026-06-13T00:00:00.000Z");
const updatedAt = new Date("2026-06-13T00:05:00.000Z");

function createPrismaMock() {
  const prisma = {
    project: {
      findUnique: vi.fn(async () => ({
        id: "project_1",
        title: "Rain Night Chase",
        defaultAspectRatio: "16:9",
      })),
    },
    canvasNode: {
      findMany: vi.fn(async () => [
        videoNode("video_1", {
          title: "Shot 002 video",
          x: 300,
          assetId: "asset_video_1",
          durationSeconds: 5,
        }),
        videoNode("video_2", {
          title: "Shot 001 video",
          x: 100,
          assetId: "asset_video_2",
          durationSeconds: 4,
        }),
        videoNode("video_3", {
          title: "Shot 003 video",
          x: 200,
          assetId: "asset_video_3",
          durationSeconds: 6,
        }),
      ]),
    },
    asset: {
      findMany: vi.fn(async () => [
        asset("asset_video_1", "clip-one.mp4", 5000),
        asset("asset_video_2", "clip-two.mp4", 4000),
        asset("asset_video_3", "clip-three.mp4", 6000),
      ]),
    },
    editorExport: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({
        id: "export_1",
        projectId: args.data.projectId,
        packageAssetId: null,
        status: args.data.status,
        timelineJson: args.data.timelineJson,
        storyboardCsv: null,
        errorMessage: null,
        createdAt,
        updatedAt,
      })),
      findMany: vi.fn(async () => [
        {
          id: "export_1",
          projectId: "project_1",
          packageAssetId: "asset_package_1",
          status: "succeeded",
          timelineJson: {},
          storyboardCsv: "index,filename\n",
          errorMessage: null,
          createdAt,
          updatedAt,
        },
      ]),
      findFirst: vi.fn(async () => ({
        id: "export_1",
        projectId: "project_1",
        packageAssetId: "asset_package_1",
        status: "succeeded",
        timelineJson: { version: "1.0" },
        storyboardCsv: "index,filename\n",
        errorMessage: null,
        createdAt,
        updatedAt,
      })),
    },
    generationJob: {
      create: vi.fn(async (args: { data: Record<string, unknown> }) => ({
        id: "job_export_1",
        projectId: args.data.projectId,
        operation: args.data.operation,
        status: args.data.status,
        provider: args.data.provider,
        model: args.data.model,
        sourceNodeId: null,
        targetNodeId: null,
        providerTaskId: null,
        inputJson: args.data.inputJson,
        outputJson: null,
        errorMessage: null,
        createdAt,
        updatedAt,
      })),
      findMany: vi.fn(async () => [{ status: "queued" }, { status: "succeeded" }]),
    },
  };

  return {
    ...prisma,
    $transaction: vi.fn(async <T>(callback: (tx: typeof prisma) => Promise<T>) => callback(prisma)),
  };
}

function createService(options: {
  prisma?: ReturnType<typeof createPrismaMock>;
  localEditorUrl?: string;
  fetchImpl?: typeof fetch;
} = {}) {
  const prisma = options.prisma ?? createPrismaMock();
  const assetsService = {
    getAssetPreview: vi.fn(async (): Promise<AssetPreviewPayload> => ({
      asset: {
        id: "asset_package_1",
        projectId: "project_1",
        type: "package",
        purpose: "editor_package",
        storageKey: "project_1/editor-exports/export_1.zip",
        mimeType: "application/zip",
        originalFilename: "export_1.zip",
        sizeBytes: 128,
        createdAt: createdAt.toISOString(),
        previewKind: "metadata",
      },
      body: Buffer.from("zip"),
      mimeType: "application/zip",
    })),
  };
  const configService = {
    get: vi.fn((key: string) => (key === "localEditorUrl" ? options.localEditorUrl : undefined)),
  } as unknown as ConfigService;
  const service = new EditorExportsService(
    prisma as unknown as PrismaService,
    assetsService as never,
    configService,
    options.fetchImpl ?? vi.fn(fetch),
  );

  return { assetsService, configService, prisma, service };
}

describe("EditorExportsService", () => {
  it("creates a queued editor export job with deterministic shot-index order", async () => {
    const { prisma, service } = createService();

    const result = await service.createExport("project_1", {
      videoNodeIds: ["video_1", "video_2", "video_3"],
      sortMode: "shot_index",
    });

    expect(result.export).toMatchObject({
      id: "export_1",
      status: "queued",
    });
    expect(result.job.operation).toBe("editor_export");
    expect(result.queueSummary.counts.queued).toBe(1);
    const jobInput = result.job.inputJson;
    expect(jobInput.clips.map((clip) => clip.videoNodeId)).toEqual(["video_2", "video_1", "video_3"]);
    expect(jobInput.clips.map((clip) => clip.filename)).toEqual([
      "clips/shot_001.mp4",
      "clips/shot_002.mp4",
      "clips/shot_003.mp4",
    ]);
    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operation: "editor_export",
        provider: "mock-editor",
        model: "zip-v1",
      }),
    });
  });

  it("rejects non-video selections before creating export state", async () => {
    const prisma = createPrismaMock();
    prisma.canvasNode.findMany.mockResolvedValueOnce([
      {
        ...videoNode("image_1", { assetId: "asset_image_1" }),
        type: "image",
      },
    ]);
    const { service } = createService({ prisma });

    await expect(
      service.createExport("project_1", {
        videoNodeIds: ["image_1"],
        sortMode: "manual",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.editorExport.create).not.toHaveBeenCalled();
    expect(prisma.generationJob.create).not.toHaveBeenCalled();
  });

  it("gates package download until an export has a succeeded package asset", async () => {
    const prisma = createPrismaMock();
    prisma.editorExport.findFirst.mockResolvedValueOnce({
      id: "export_1",
      projectId: "project_1",
      packageAssetId: "",
      status: "running",
      timelineJson: { version: "1.0" },
      storyboardCsv: "",
      errorMessage: null,
      createdAt,
      updatedAt,
    });
    const { assetsService, service } = createService({ prisma });

    await expect(service.downloadPackage("project_1", "export_1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(assetsService.getAssetPreview).not.toHaveBeenCalled();
  });

  it("downloads a succeeded package through the Asset boundary", async () => {
    const { assetsService, service } = createService();

    const packagePreview = await service.downloadPackage("project_1", "export_1");

    expect(assetsService.getAssetPreview).toHaveBeenCalledWith("project_1", "asset_package_1");
    expect(packagePreview.mimeType).toBe("application/zip");
  });

  it("keeps missing local editor config separate from package success", async () => {
    const { service } = createService();

    const result = await service.sendToLocalEditor("project_1", "export_1");

    expect(result).toMatchObject({
      sent: false,
      errorMessage: "LOCAL_EDITOR_URL is not configured",
    });
    expect(result.export.status).toBe("succeeded");
  });

  it("posts completed package metadata to the configured local editor", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ editorUrl: "http://localhost:4300/open/export_1" })));
    const { service } = createService({
      localEditorUrl: "http://localhost:4300/editor-exports",
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await service.sendToLocalEditor("project_1", "export_1");

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:4300/editor-exports",
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(result).toMatchObject({
      sent: true,
      editorUrl: "http://localhost:4300/open/export_1",
    });
  });

  it("times out local editor sends without invalidating package success", async () => {
    vi.useFakeTimers();
    try {
      const fetchImpl = vi.fn(() => new Promise<Response>(() => {}));
      const { service } = createService({
        localEditorUrl: "http://localhost:4300/editor-exports",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      });

      const resultPromise = service.sendToLocalEditor("project_1", "export_1");
      await vi.advanceTimersByTimeAsync(5000);
      const result = await resultPromise;

      expect(result).toMatchObject({
        sent: false,
        errorMessage: "Local editor request timed out after 5000ms",
      });
      expect(result.export.status).toBe("succeeded");
    } finally {
      vi.useRealTimers();
    }
  });
});

function videoNode(
  id: string,
  overrides: {
    assetId: string;
    title?: string;
    x?: number;
    durationSeconds?: number;
  },
) {
  return {
    id,
    projectId: "project_1",
    type: "video",
    title: overrides.title ?? id,
    x: overrides.x ?? 0,
    y: 0,
    dataJson: {
      assetId: overrides.assetId,
      durationSeconds: overrides.durationSeconds,
    },
  };
}

function asset(id: string, originalFilename: string, durationMs: number) {
  return {
    id,
    projectId: "project_1",
    storageKey: `project_1/${originalFilename}`,
    mimeType: "video/mp4",
    originalFilename,
    durationMs,
  };
}
