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
        generationSettingsJson: {
          visualStyle: "export noir",
          aspectRatio: "16:9",
          visualManual: {
            artStyle: "export painterly noir",
            palette: "cyan shadows with amber signal lights",
          },
          directorManual: {
            cameraLanguage: "slow surveillance push-ins",
            audioNarration: "restrained low narration",
          },
          subtitle: { label: "Project captions" },
          bgm: { status: "available", assetId: "asset_bgm_1", label: "Main cue" },
          stylePack: { status: "available", assetId: "asset_missing_style", label: "Missing pack" },
          viralReference: { hook: "Manual platform-safe hook" },
          continuity: { mode: "one_take", adjacentShotPrompt: "Hold screen direction" },
          marketing: {
            cover: { status: "available", assetId: "asset_cover_1", label: "Episode cover" },
            poster: { status: "available", assetId: "asset_missing_poster", label: "Poster brief" },
            callToAction: "Watch next",
          },
        },
      })),
    },
    canvasNode: {
      findMany: vi.fn(async (args?: { where?: { id?: { in?: string[] }; type?: string } }) => {
        const ids = args?.where?.id?.in;
        if (args?.where?.type === "shot") {
          const shots = [
            shotNode("shot_1", {
              aspectRatio: "1:1",
              audioAssetIds: ["asset_ambience_1"],
              audioReferences: [
                {
                  assetId: "asset_ambience_1",
                  role: "sound_effect",
                  label: "Launch room hum",
                },
              ],
              characterAssetIds: ["character_1"],
            }),
            shotNode("shot_2", { aspectRatio: "9:16" }),
            shotNode("shot_3", {
              audioAssetIds: ["asset_ai_audio_1"],
              audioReferences: [
                {
                  assetId: "asset_ai_audio_1",
                  role: "narration",
                  label: "Generated Ari narration",
                },
              ],
            }),
          ];
          return ids ? shots.filter((node) => ids.includes(node.id)) : shots;
        }
        if (args?.where?.type === "character_asset") {
          const characters = [characterNode("character_1")];
          return ids ? characters.filter((node) => ids.includes(node.id)) : characters;
        }
        const videos = [
          videoNode("video_1", {
            title: "Shot 002 video",
            x: 300,
            assetId: "asset_video_1",
            durationSeconds: 5,
            shotNodeId: "shot_2",
            audioAssetIds: ["asset_clip_audio_1"],
            audioReferences: [{ assetId: "asset_clip_audio_1", role: "bgm", label: "Needle drop" }],
          }),
          videoNode("video_2", {
            title: "Shot 001 video",
            x: 100,
            assetId: "asset_video_2",
            durationSeconds: 4,
            shotNodeId: "shot_1",
          }),
          videoNode("video_3", {
            title: "Shot 003 video",
            x: 200,
            assetId: "asset_video_3",
            durationSeconds: 6,
            shotNodeId: "shot_3",
          }),
        ];
        return ids ? videos.filter((node) => ids.includes(node.id)) : videos;
      }),
    },
    asset: {
      findMany: vi.fn(async (args?: { where?: { id?: { in?: string[] } } }) => {
        const ids = args?.where?.id?.in;
        const assets = [
          asset("asset_video_1", "clip-one.mp4", 5000),
          asset("asset_video_2", "clip-two.mp4", 4000),
          asset("asset_video_3", "clip-three.mp4", 6000),
          asset("asset_ambience_1", "launch-room.wav", 7000, "audio/wav"),
          asset("asset_voice_1", "ari-voice.mp3", 9000, "audio/mpeg"),
          asset("asset_clip_audio_1", "needle-drop.ogg", 11000, "audio/ogg"),
          asset("asset_ai_audio_1", "ari-generated-tts.mp3", 6500, "audio/mpeg"),
          asset("asset_bgm_1", "main-cue.mp3", 120000, "audio/mpeg"),
          asset("asset_cover_1", "episode-cover.png", 180000, "image/png"),
        ];
        return ids ? assets.filter((item) => ids.includes(item.id)) : assets;
      }),
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
      exportPreset: "gif_preview",
      sourceEditorExportId: "export_previous",
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
    expect(jobInput.exportPreset).toBe("gif_preview");
    expect(jobInput.sourceEditorExportId).toBe("export_previous");
    expect(jobInput.generationSettings?.effective.visualStyle).toBe("export noir");
    expect(jobInput.generationSettings?.effective.visualManual?.artStyle).toBe("export painterly noir");
    expect(jobInput.generationSettings?.effective.directorManual?.cameraLanguage).toBe("slow surveillance push-ins");
    expect(jobInput.generationSettings?.effective.viralReference?.hook).toBe("Manual platform-safe hook");
    expect(jobInput.generationSettings?.effective.continuity?.mode).toBe("one_take");
    expect(jobInput.packagingReferences?.subtitle?.status).toBe("requested_unresolved");
    expect(jobInput.packagingReferences?.bgm?.status).toBe("available");
    expect(jobInput.packagingReferences?.stylePack).toMatchObject({
      status: "requested_unresolved",
      assetId: "asset_missing_style",
    });
    expect(jobInput.packagingReferences?.cover).toMatchObject({
      status: "available",
      assetId: "asset_cover_1",
    });
    expect(jobInput.packagingReferences?.poster).toMatchObject({
      status: "requested_unresolved",
      assetId: "asset_missing_poster",
    });
    expect(jobInput.clips[0]?.audioReferences).toEqual([
      expect.objectContaining({
        assetId: "asset_ambience_1",
        sourceNodeId: "shot_1",
        sourceNodeType: "shot",
        role: "sound_effect",
        label: "Launch room hum",
        mimeType: "audio/wav",
        durationMs: 7000,
      }),
      expect.objectContaining({
        assetId: "asset_voice_1",
        sourceNodeId: "character_1",
        sourceNodeType: "character_asset",
        role: "voice",
        label: "Ari voice",
        mimeType: "audio/mpeg",
        durationMs: 9000,
      }),
    ]);
    expect(jobInput.clips[1]?.audioReferences).toEqual([
      expect.objectContaining({
        assetId: "asset_clip_audio_1",
        sourceNodeId: "video_1",
        sourceNodeType: "video",
        role: "bgm",
        label: "Needle drop",
        mimeType: "audio/ogg",
        durationMs: 11000,
      }),
    ]);
    expect(jobInput.clips[2]?.audioReferences).toEqual([
      expect.objectContaining({
        assetId: "asset_ai_audio_1",
        sourceNodeId: "shot_3",
        sourceNodeType: "shot",
        role: "narration",
        label: "Generated Ari narration",
        mimeType: "audio/mpeg",
        durationMs: 6500,
      }),
    ]);
    expect(jobInput.clips[0]?.generationSettings?.effective.visualStyle).toBe("generated clip style");
    expect(jobInput.clips[0]?.packagingSettings?.effective.aspectRatio).toBe("1:1");
    expect(result.export.timelineJson).toMatchObject({
      selectedVideoNodeIds: ["video_1", "video_2", "video_3"],
      sortMode: "shot_index",
      exportPreset: "gif_preview",
      sourceEditorExportId: "export_previous",
    });
    expect(prisma.editorExport.findFirst).toHaveBeenCalledWith({
      where: { id: "export_previous", projectId: "project_1" },
    });
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

  it("rejects revision exports when the source export is unavailable", async () => {
    const prisma = createPrismaMock();
    prisma.editorExport.findFirst.mockImplementationOnce(async () => null as never);
    const { service } = createService({ prisma });

    await expect(
      service.createExport("project_1", {
        videoNodeIds: ["video_1"],
        sortMode: "manual",
        sourceEditorExportId: "export_missing",
      }),
    ).rejects.toThrow("Editor export not found");
    expect(prisma.editorExport.create).not.toHaveBeenCalled();
    expect(prisma.generationJob.create).not.toHaveBeenCalled();
  });

  it("rejects revision exports when the source export has not succeeded", async () => {
    const prisma = createPrismaMock();
    prisma.editorExport.findFirst.mockResolvedValueOnce({
      id: "export_running",
      projectId: "project_1",
      packageAssetId: "asset_package_running",
      status: "running",
      timelineJson: { version: "1.0" },
      storyboardCsv: "",
      errorMessage: null,
      createdAt,
      updatedAt,
    });
    const { service } = createService({ prisma });

    await expect(
      service.createExport("project_1", {
        videoNodeIds: ["video_1"],
        sortMode: "manual",
        sourceEditorExportId: "export_running",
      }),
    ).rejects.toThrow("Revision source export must be succeeded");
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
    shotNodeId?: string;
    audioAssetIds?: string[];
    audioReferences?: Array<{ assetId: string; role?: string; label?: string }>;
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
      inputJson: {
        parentShotNodeId: overrides.shotNodeId,
      },
      audioAssetIds: overrides.audioAssetIds,
      audioReferences: overrides.audioReferences,
      generationSettings: {
        project: { visualStyle: "project at generation" },
        shot: { visualStyle: "generated clip style" },
        effective: { visualStyle: "generated clip style" },
        sources: { visualStyle: "shot" },
      },
    },
  };
}

function shotNode(
  id: string,
  overrides: {
    aspectRatio?: "9:16" | "16:9" | "1:1";
    audioAssetIds?: string[];
    audioReferences?: Array<{ assetId: string; role?: string; label?: string }>;
    characterAssetIds?: string[];
  },
) {
  return {
    id,
    projectId: "project_1",
    type: "shot",
    title: id,
    x: 0,
    y: 0,
    dataJson: {
      audioAssetIds: overrides.audioAssetIds,
      audioReferences: overrides.audioReferences,
      characterAssetIds: overrides.characterAssetIds,
      generationSettings: {
        aspectRatio: overrides.aspectRatio,
      },
    },
  };
}

function characterNode(id: string) {
  return {
    id,
    projectId: "project_1",
    type: "character_asset",
    title: "Ari",
    x: 0,
    y: 0,
    dataJson: {
      voiceAssetIds: ["asset_voice_1"],
      voiceReferences: [{ assetId: "asset_voice_1", role: "voice", label: "Ari voice" }],
    },
  };
}

function asset(
  id: string,
  originalFilename: string,
  durationMs: number,
  mimeType = "video/mp4",
) {
  return {
    id,
    projectId: "project_1",
    storageKey: `project_1/${originalFilename}`,
    mimeType,
    originalFilename,
    durationMs,
  };
}
