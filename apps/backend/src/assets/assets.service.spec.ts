import { BadRequestException, NotFoundException } from "@nestjs/common";
import { EDITOR_PACKAGE_MIME_TYPE, type EditorExportPackageOutput } from "@guga-flow/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaService } from "../prisma/prisma.service";
import { LocalStorageService } from "../storage/local-storage.service";
import { AssetsService } from "./assets.service";

const createdAt = new Date("2026-06-12T00:00:00.000Z");

function createFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  const buffer = Buffer.from("asset bytes");
  return {
    fieldname: "file",
    originalname: "hero.png",
    encoding: "7bit",
    mimetype: "image/png",
    size: buffer.byteLength,
    buffer,
    destination: "",
    filename: "",
    path: "",
    stream: undefined as never,
    ...overrides,
  };
}

function asset(overrides: Record<string, unknown> = {}) {
  return {
    id: "asset_1",
    projectId: "project_1",
    collectionId: null,
    type: "image",
    purpose: "uploaded",
    storageKey: "project_1/hero.png",
    mimeType: "image/png",
    originalFilename: "hero.png",
    sizeBytes: 11,
    width: null,
    height: null,
    durationMs: null,
    metadataJson: { previewKind: "image" },
    createdAt,
    ...overrides,
  };
}

function collection(overrides: Record<string, unknown> = {}) {
  return {
    id: "collection_1",
    projectId: "project_1",
    name: "Characters",
    parentId: null,
    kind: "character",
    sortOrder: 0,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function tag(overrides: Record<string, unknown> = {}) {
  return {
    id: "tag_1",
    projectId: "project_1",
    name: "approved",
    color: null,
    createdAt,
    ...overrides,
  };
}

function createPrismaMock() {
  return {
    project: {
      findUnique: vi.fn(async (): Promise<{ id: string } | null> => ({ id: "project_1" })),
    },
    asset: {
      findMany: vi.fn(async (): Promise<unknown[]> => []),
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(async () => ({ count: 1 })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    assetCollection: {
      findMany: vi.fn(async (): Promise<unknown[]> => []),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    assetTag: {
      findMany: vi.fn(async (): Promise<unknown[]> => []),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    assetTagAssignment: {
      createMany: vi.fn(async () => ({ count: 1 })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    canvasNode: {
      findMany: vi.fn(async (): Promise<unknown[]> => []),
    },
    generationJob: {
      findMany: vi.fn(async (): Promise<unknown[]> => []),
    },
  };
}

function createStorageMock() {
  return {
    putObject: vi.fn(async () => ({
      storageKey: "project_1/stored-hero.png",
      absolutePath: "/tmp/stored-hero.png",
      sizeBytes: 11,
    })),
    writeObject: vi.fn(async (input: { storageKey: string; buffer: Buffer }) => ({
      storageKey: input.storageKey,
      absolutePath: `/tmp/${input.storageKey}`,
      sizeBytes: input.buffer.byteLength,
    })),
    readObject: vi.fn(async () => Buffer.from("hello text")),
    deleteObject: vi.fn(async () => undefined),
  };
}

describe("AssetsService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let storage: ReturnType<typeof createStorageMock>;
  let fetchImpl: ReturnType<typeof vi.fn>;
  let service: AssetsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    storage = createStorageMock();
    fetchImpl = vi.fn();
    service = new AssetsService(
      prisma as unknown as PrismaService,
      storage as unknown as LocalStorageService,
      fetchImpl as unknown as typeof fetch,
    );
  });

  it("stores uploaded files and creates project-scoped asset records", async () => {
    prisma.asset.create.mockResolvedValue(asset());

    const result = await service.uploadAsset("project_1", createFile(), { purpose: "uploaded" });

    expect(storage.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: "project_1",
        originalFilename: "hero.png",
        mimeType: "image/png",
      }),
    );
    expect(prisma.asset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project_1",
          type: "image",
          purpose: "uploaded",
          storageKey: "project_1/stored-hero.png",
          mimeType: "image/png",
        }),
      }),
    );
    expect(result).toMatchObject({
      id: "asset_1",
      previewKind: "image",
      previewUrl: "/api/v1/projects/project_1/assets/asset_1/preview",
    });
  });

  it("stores uploaded audio files as audio assets with audio previews", async () => {
    prisma.asset.create.mockResolvedValue(
      asset({
        id: "asset_audio_1",
        type: "audio",
        purpose: "voice_reference",
        storageKey: "project_1/hero-voice.mp3",
        mimeType: "audio/mpeg",
        originalFilename: "hero-voice.mp3",
        metadataJson: { previewKind: "audio" },
      }),
    );

    const result = await service.uploadAsset(
      "project_1",
      createFile({
        originalname: "hero-voice.mp3",
        mimetype: "audio/mpeg",
      }),
      { purpose: "voice_reference" },
    );

    expect(prisma.asset.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project_1",
          type: "audio",
          purpose: "voice_reference",
          mimeType: "audio/mpeg",
          metadataJson: expect.objectContaining({ previewKind: "audio" }),
        }),
      }),
    );
    expect(result).toMatchObject({
      id: "asset_audio_1",
      type: "audio",
      purpose: "voice_reference",
      previewKind: "audio",
    });
  });

  it("rejects unsupported MIME types before storing files", async () => {
    await expect(
      service.uploadAsset(
        "project_1",
        createFile({
          mimetype: "application/x-msdownload",
        }),
        {},
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(storage.putObject).not.toHaveBeenCalled();
    expect(prisma.asset.create).not.toHaveBeenCalled();
  });

  it("creates generated mock asset records with placeholder bytes", async () => {
    prisma.asset.create.mockResolvedValue(
      asset({
        type: "image",
        purpose: "shot_keyframe",
        storageKey: "mock/images/generated.png",
        mimeType: "image/png",
        originalFilename: "generated.png",
        metadataJson: {
          previewKind: "image",
          provider: "mock-image",
          model: "mock-image-v1",
        },
      }),
    );

    const result = await service.createGeneratedAsset("project_1", {
      purpose: "shot_keyframe",
      providerOutput: {
        assetId: "provider_asset_1",
        storageKey: "mock/images/generated.png",
        mimeType: "image/png",
        provider: "mock-image",
        model: "mock-image-v1",
        prompt: "hero at console",
        referenceAssetIds: ["asset_ref_1"],
      },
      metadataJson: {
        generationJobId: "job_1",
      },
    });

    expect(storage.writeObject).toHaveBeenCalledWith({
      storageKey: "mock/images/generated.png",
      buffer: expect.any(Buffer),
    });
    expect(prisma.asset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        type: "image",
        purpose: "shot_keyframe",
        storageKey: "mock/images/generated.png",
        mimeType: "image/png",
        metadataJson: expect.objectContaining({
          provider: "mock-image",
          model: "mock-image-v1",
          providerAssetId: "provider_asset_1",
          generationJobId: "job_1",
        }),
      }),
    });
    expect(result).toMatchObject({
      id: "asset_1",
      purpose: "shot_keyframe",
      previewKind: "image",
    });
  });

  it("creates generated asset records from inline base64 bytes", async () => {
    prisma.asset.create.mockResolvedValue(
      asset({
        type: "image",
        purpose: "shot_keyframe",
        storageKey: "providers/image2/generated.png",
        mimeType: "image/png",
        originalFilename: "generated.png",
      }),
    );

    await service.createGeneratedAsset("project_1", {
      purpose: "shot_keyframe",
      providerOutput: {
        assetId: "provider_asset_1",
        storageKey: "providers/image2/generated.png",
        mimeType: "image/png",
        provider: "image2",
        model: "gpt-image-2",
        prompt: "hero at console",
        referenceAssetIds: [],
        bytesBase64: Buffer.from("real-image-bytes").toString("base64"),
      },
    });

    expect(storage.writeObject).toHaveBeenCalledWith({
      storageKey: "providers/image2/generated.png",
      buffer: Buffer.from("real-image-bytes"),
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("creates editor package asset records from worker zip bytes", async () => {
    prisma.asset.create.mockResolvedValue(
      asset({
        type: "package",
        purpose: "editor_package",
        storageKey: "project_1/editor-exports/export_1.zip",
        mimeType: EDITOR_PACKAGE_MIME_TYPE,
        originalFilename: "export_1.zip",
        metadataJson: {
          previewKind: "metadata",
          editorExportId: "export_1",
          clipCount: 2,
        },
      }),
    );
    const packageOutput: EditorExportPackageOutput = {
      storageKey: "project_1/editor-exports/export_1.zip",
      mimeType: EDITOR_PACKAGE_MIME_TYPE,
      bytesBase64: Buffer.from("zip-bytes").toString("base64"),
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
    };

    const result = await service.createPackageAsset("project_1", {
      packageOutput,
      metadataJson: { generationJobId: "job_export_1" },
    });

    expect(storage.writeObject).toHaveBeenCalledWith({
      storageKey: "project_1/editor-exports/export_1.zip",
      buffer: Buffer.from("zip-bytes"),
    });
    expect(prisma.asset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        type: "package",
        purpose: "editor_package",
        storageKey: "project_1/editor-exports/export_1.zip",
        mimeType: EDITOR_PACKAGE_MIME_TYPE,
        metadataJson: expect.objectContaining({
          previewKind: "metadata",
          editorExportId: "export_1",
          clipCount: 2,
          generationJobId: "job_export_1",
        }),
      }),
    });
    expect(result).toMatchObject({
      id: "asset_1",
      purpose: "editor_package",
      previewKind: "metadata",
    });
  });

  it("downloads remote generated asset bytes server-side before creating the asset", async () => {
    fetchImpl.mockResolvedValue(
      new Response(new Uint8Array(Buffer.from("remote-image-bytes")), {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );
    prisma.asset.create.mockResolvedValue(
      asset({
        type: "image",
        purpose: "shot_keyframe",
        storageKey: "providers/image2/remote.png",
        mimeType: "image/png",
        originalFilename: "remote.png",
      }),
    );

    await service.createGeneratedAsset("project_1", {
      purpose: "shot_keyframe",
      providerOutput: {
        storageKey: "providers/image2/remote.png",
        mimeType: "image/png",
        provider: "image2",
        model: "gpt-image-2",
        prompt: "hero at console",
        referenceAssetIds: [],
        remoteUrl: "https://cdn.example.test/generated.png",
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith(new URL("https://cdn.example.test/generated.png"));
    expect(storage.writeObject).toHaveBeenCalledWith({
      storageKey: "providers/image2/remote.png",
      buffer: Buffer.from("remote-image-bytes"),
    });
  });

  it("downloads remote generated video bytes before creating the asset", async () => {
    fetchImpl.mockResolvedValue(
      new Response(new Uint8Array(Buffer.from("remote-video-bytes")), {
        status: 200,
        headers: { "content-type": "video/mp4" },
      }),
    );
    prisma.asset.create.mockResolvedValue(
      asset({
        type: "video",
        purpose: "shot_clip",
        storageKey: "providers/seedance/tasks/task_1/generated.mp4",
        mimeType: "video/mp4",
        originalFilename: "generated.mp4",
      }),
    );

    await service.createGeneratedAsset("project_1", {
      purpose: "shot_clip",
      providerOutput: {
        storageKey: "providers/seedance/tasks/task_1/generated.mp4",
        mimeType: "video/mp4",
        provider: "seedance",
        model: "seedance-1-0-pro",
        prompt: "slow push",
        referenceAssetIds: [],
        remoteUrl: "https://cdn.example.test/generated.mp4",
        providerTaskId: "task_1",
      },
    });

    expect(fetchImpl).toHaveBeenCalledWith(new URL("https://cdn.example.test/generated.mp4"));
    expect(storage.writeObject).toHaveBeenCalledWith({
      storageKey: "providers/seedance/tasks/task_1/generated.mp4",
      buffer: Buffer.from("remote-video-bytes"),
    });
    expect(prisma.asset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "video",
        purpose: "shot_clip",
        mimeType: "video/mp4",
        metadataJson: expect.objectContaining({
          previewKind: "video",
          provider: "seedance",
          providerTaskId: "task_1",
        }),
      }),
    });
  });

  it("rejects failed remote downloads before creating an asset record", async () => {
    fetchImpl.mockResolvedValue(new Response("not found", { status: 404 }));

    await expect(
      service.createGeneratedAsset("project_1", {
        purpose: "shot_keyframe",
        providerOutput: {
          storageKey: "providers/image2/missing.png",
          mimeType: "image/png",
          provider: "image2",
          model: "gpt-image-2",
          prompt: "hero at console",
          referenceAssetIds: [],
          remoteUrl: "https://cdn.example.test/missing.png",
        },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(storage.writeObject).not.toHaveBeenCalled();
    expect(prisma.asset.create).not.toHaveBeenCalled();
  });

  it("rejects non-https or local generated remote URLs before fetching", async () => {
    for (const remoteUrl of [
      "http://cdn.example.test/generated.png",
      "https://localhost/generated.png",
      "https://127.0.0.1/generated.png",
      "https://[::1]/generated.png",
      "https://[fd00::1]/generated.png",
      "https://[fe80::1]/generated.png",
      "https://0.0.0.0/generated.png",
      "https://172.16.0.10/generated.png",
      "https://192.168.1.20/generated.png",
    ]) {
      await expect(
        service.createGeneratedAsset("project_1", {
          purpose: "shot_keyframe",
          providerOutput: {
            storageKey: "providers/image2/blocked.png",
            mimeType: "image/png",
            provider: "image2",
            model: "gpt-image-2",
            prompt: "blocked",
            referenceAssetIds: [],
            remoteUrl,
          },
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    }

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(storage.writeObject).not.toHaveBeenCalled();
    expect(prisma.asset.create).not.toHaveBeenCalled();
  });

  it("lists assets with collection, tag, and metadata query filters", async () => {
    prisma.asset.findMany.mockResolvedValue([
      asset({
        collectionId: "collection_1",
        collection: collection(),
        tagAssignments: [{ tag: tag() }],
        metadataJson: { caption: "rain hero portrait" },
      }),
      asset({
        id: "asset_2",
        originalFilename: "unused.png",
        storageKey: "project_1/unused.png",
        metadataJson: { caption: "flat lay" },
        tagAssignments: [],
      }),
    ]);

    const result = await service.listAssets("project_1", {
      query: "rain",
      tagIds: ["tag_1"],
    });

    expect(prisma.asset.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project_1" },
        include: {
          collection: true,
          tagAssignments: { include: { tag: true } },
        },
      }),
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "asset_1",
      collection: { id: "collection_1", name: "Characters" },
      tags: [{ id: "tag_1", name: "approved" }],
    });
  });

  it("creates asset collections and tags", async () => {
    prisma.assetCollection.create.mockResolvedValue(collection({ name: "Locations", kind: "location" }));
    prisma.assetTag.create.mockResolvedValue(tag({ name: "needs polish", color: "#c45a2a" }));

    await expect(
      service.createCollection("project_1", { name: " Locations ", kind: "location" }),
    ).resolves.toMatchObject({ name: "Locations", kind: "location" });
    await expect(
      service.createTag("project_1", { name: " needs polish ", color: "#c45a2a" }),
    ).resolves.toMatchObject({ name: "needs polish", color: "#c45a2a" });

    expect(prisma.assetCollection.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        name: "Locations",
        kind: "location",
      }),
    });
    expect(prisma.assetTag.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        name: "needs polish",
        color: "#c45a2a",
      }),
    });
  });

  it("adds tags to selected assets in a batch operation", async () => {
    prisma.asset.findMany
      .mockResolvedValueOnce([{ id: "asset_1" }])
      .mockResolvedValueOnce([
        asset({
          tagAssignments: [{ tag: tag() }],
        }),
      ]);
    prisma.assetTag.findMany.mockResolvedValue([{ id: "tag_1" }]);

    const result = await service.batchAssets("project_1", {
      assetIds: ["asset_1", "asset_1"],
      action: "add_tags",
      tagIds: ["tag_1"],
    });

    expect(prisma.assetTagAssignment.createMany).toHaveBeenCalledWith({
      data: [{ assetId: "asset_1", tagId: "tag_1" }],
      skipDuplicates: true,
    });
    expect(result.assets[0]).toMatchObject({ tags: [{ id: "tag_1" }] });
  });

  it("applies asset analysis captions and merged classifications to metadata", async () => {
    prisma.asset.findMany
      .mockResolvedValueOnce([{ id: "asset_1" }])
      .mockResolvedValueOnce([asset({ metadataJson: { caption: "Hero caption", classifications: ["existing", "hero"] } })]);
    prisma.asset.findFirst.mockResolvedValue(
      asset({ metadataJson: { previewKind: "image", classifications: ["existing"] } }),
    );

    const result = await service.applyAssetAnalysis("project_1", {
      operation: "asset_caption",
      provider: "mock-vision",
      model: "mock-vision-v1",
      overwrite: false,
      results: [
        {
          assetId: "asset_1",
          caption: "Hero caption",
          classifications: ["hero"],
        },
      ],
      completedAt: "2026-06-14T00:00:00.000Z",
    });

    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: "asset_1" },
      data: {
        metadataJson: expect.objectContaining({
          caption: "Hero caption",
          classifications: ["existing", "hero"],
          analysisProvider: "mock-vision",
          analysisModel: "mock-vision-v1",
          analyzedAt: "2026-06-14T00:00:00.000Z",
        }),
      },
    });
    expect(result[0]).toMatchObject({ id: "asset_1", previewKind: "image" });
  });

  it("applies asset prompt polish output to metadata", async () => {
    prisma.asset.findMany
      .mockResolvedValueOnce([{ id: "asset_1" }])
      .mockResolvedValueOnce([asset({ metadataJson: { assetPrompt: "Existing prompt" } })]);
    prisma.asset.findFirst.mockResolvedValue(
      asset({ metadataJson: { previewKind: "image", assetPrompt: "Existing prompt" } }),
    );

    const result = await service.applyAssetPromptPolish("project_1", {
      operation: "asset_prompt_polish",
      provider: "mock-llm",
      model: "mock-polish-v1",
      overwrite: false,
      generationJobId: "job_polish_1",
      results: [
        {
          assetId: "asset_1",
          sourcePrompt: "rough prompt",
          polishedPrompt: "Production-ready polished prompt",
        },
      ],
      completedAt: "2026-06-14T00:00:00.000Z",
    });

    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: "asset_1" },
      data: {
        metadataJson: expect.objectContaining({
          assetPrompt: "Existing prompt",
          polishedPrompt: "Production-ready polished prompt",
          promptPolishProvider: "mock-llm",
          promptPolishModel: "mock-polish-v1",
          promptPolishJobId: "job_polish_1",
          promptPolishSourcePrompt: "rough prompt",
        }),
      },
    });
    expect(result[0]).toMatchObject({ id: "asset_1", previewKind: "image" });
  });

  it("applies media metadata with stable original, display, and thumbnail derivatives", async () => {
    const videoAsset = asset({
      id: "asset_video_1",
      type: "video",
      storageKey: "project_1/source-video.mp4",
      mimeType: "video/mp4",
      originalFilename: "source-video.mp4",
      metadataJson: { previewKind: "video", caption: "Existing caption" },
    });
    prisma.asset.findMany
      .mockResolvedValueOnce([{ id: "asset_video_1" }])
      .mockResolvedValueOnce([
        asset({
          id: "asset_video_1",
          type: "video",
          storageKey: "project_1/source-video.mp4",
          mimeType: "video/mp4",
          metadataJson: { previewKind: "video" },
          width: 1280,
          height: 720,
          durationMs: 4200,
        }),
      ]);
    prisma.asset.findFirst.mockResolvedValue(videoAsset);
    prisma.asset.create.mockResolvedValue(
      asset({
        id: "asset_thumb_1",
        type: "image",
        storageKey: "project_1/asset-derivatives/asset_video_1-thumbnail.png",
        mimeType: "image/png",
        width: 480,
        height: 270,
        sizeBytes: 68,
        metadataJson: { previewKind: "image", derivativeKind: "thumbnail" },
      }),
    );

    const result = await service.applyMediaMetadata("project_1", {
      operation: "media_metadata",
      provider: "mock-media",
      model: "metadata-v1",
      overwrite: false,
      createThumbnail: true,
      generationJobId: "job_media_1",
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
            kind: "thumbnail",
            status: "ready",
            mimeType: "image/png",
            width: 480,
            height: 270,
            sourceAssetId: "asset_video_1",
            generationJobId: "job_media_1",
            rebuildStrategy: "mock_media_metadata",
          },
          strategy: ["no_audio_stream_marked_hasAudio_false"],
        },
      ],
      completedAt: "2026-06-14T00:00:00.000Z",
    });

    expect(storage.writeObject).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: expect.stringContaining("project_1/asset-derivatives/asset_video_1-thumbnail-"),
      }),
    );
    expect(prisma.asset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        type: "image",
        purpose: "uploaded",
        mimeType: "image/png",
        metadataJson: expect.objectContaining({
          derivativeKind: "thumbnail",
          sourceAssetId: "asset_video_1",
          generationJobId: "job_media_1",
        }),
      }),
    });
    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: "asset_video_1" },
      data: expect.objectContaining({
        width: 1280,
        height: 720,
        durationMs: 4200,
        metadataJson: expect.objectContaining({
          caption: "Existing caption",
          original: expect.objectContaining({
            kind: "original",
            storageKey: "project_1/source-video.mp4",
            rebuildStrategy: "source_asset",
          }),
          display: expect.objectContaining({
            kind: "display",
            storageKey: "project_1/source-video.mp4",
          }),
          thumbnail: expect.objectContaining({
            kind: "thumbnail",
            assetId: "asset_thumb_1",
            storageKey: "project_1/asset-derivatives/asset_video_1-thumbnail.png",
          }),
          mediaInfo: expect.objectContaining({
            durationMs: 4200,
            hasAudio: false,
          }),
          mediaMetadataProvider: "mock-media",
          mediaMetadataModel: "metadata-v1",
          mediaMetadataStrategy: ["no_audio_stream_marked_hasAudio_false"],
        }),
      }),
    });
    const updateCall = prisma.asset.update.mock.calls[prisma.asset.update.mock.calls.length - 1];
    expect(JSON.stringify(updateCall)).not.toContain("/tmp/");
    expect(result[0]).toMatchObject({ id: "asset_video_1", previewKind: "video" });
  });

  it("creates derived image assets for crop edits with lineage metadata", async () => {
    prisma.asset.findFirst.mockResolvedValue(asset({ width: 100, height: 80 }));
    prisma.asset.create.mockResolvedValue(
      asset({
        id: "asset_edit_1",
        storageKey: "project_1/asset-edits/edit.png",
        originalFilename: "edit.png",
        metadataJson: {
          previewKind: "image",
          editAction: "crop",
          derivedFromAssetId: "asset_1",
        },
      }),
    );

    const result = await service.editAsset("project_1", "asset_1", {
      action: "crop",
      crop: { x: 0, y: 0, width: 50, height: 50 },
    });

    expect(storage.readObject).toHaveBeenCalledWith("project_1/hero.png");
    expect(storage.writeObject).toHaveBeenCalledWith(
      expect.objectContaining({
        storageKey: expect.stringContaining("project_1/asset-edits/asset_1-crop-1-"),
      }),
    );
    expect(prisma.asset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: "project_1",
        type: "image",
        purpose: "uploaded",
        metadataJson: expect.objectContaining({
          editAction: "crop",
          derivedFromAssetId: "asset_1",
          crop: { x: 0, y: 0, width: 50, height: 50 },
        }),
      }),
    });
    expect(result.assets[0]).toMatchObject({ id: "asset_edit_1" });
  });

  it("returns text previews for document assets", async () => {
    prisma.asset.findFirst.mockResolvedValue(
      asset({
        type: "document",
        mimeType: "text/markdown",
        originalFilename: "notes.md",
      }),
    );

    const result = await service.getAsset("project_1", "asset_1");

    expect(result.previewKind).toBe("text");
    expect(result.textPreview).toBe("hello text");
  });

  it("deletes local objects before deleting asset records", async () => {
    prisma.asset.findFirst.mockResolvedValue(asset());

    await expect(service.deleteAsset("project_1", "asset_1")).resolves.toEqual({ deleted: true });

    expect(storage.deleteObject).toHaveBeenCalledWith("project_1/hero.png");
    expect(prisma.asset.delete).toHaveBeenCalledWith({ where: { id: "asset_1" } });
  });

  it("blocks deletion while an asset is referenced by canvas data", async () => {
    prisma.asset.findFirst.mockResolvedValue(asset());
    prisma.canvasNode.findMany.mockResolvedValue([
      {
        id: "node_1",
        dataJson: { referenceAssetIds: ["asset_1"] },
      },
    ]);

    await expect(service.deleteAsset("project_1", "asset_1")).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(prisma.asset.delete).not.toHaveBeenCalled();
  });

  it("reports missing projects and assets", async () => {
    prisma.project.findUnique.mockResolvedValueOnce(null);
    await expect(service.listAssets("missing")).rejects.toBeInstanceOf(NotFoundException);

    prisma.asset.findFirst.mockResolvedValueOnce(null);
    await expect(service.getAsset("project_1", "missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
