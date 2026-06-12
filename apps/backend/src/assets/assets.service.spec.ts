import { BadRequestException, NotFoundException } from "@nestjs/common";
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

function createPrismaMock() {
  return {
    project: {
      findUnique: vi.fn(async (): Promise<{ id: string } | null> => ({ id: "project_1" })),
    },
    asset: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
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

  it("reports missing projects and assets", async () => {
    prisma.project.findUnique.mockResolvedValueOnce(null);
    await expect(service.listAssets("missing")).rejects.toBeInstanceOf(NotFoundException);

    prisma.asset.findFirst.mockResolvedValueOnce(null);
    await expect(service.getAsset("project_1", "missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
