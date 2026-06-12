import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import {
  UPLOADABLE_ASSET_MIME_TYPES,
  type AssetDetail,
  type AssetListItem,
  type AssetPreviewKind,
  type AssetPurpose,
  type AssetType,
  type GeneratedMediaProviderOutput,
  type UploadableAssetMimeType,
} from "@guga-flow/shared-types";

import { PrismaService } from "../prisma/prisma.service";
import { LocalStorageService } from "../storage/local-storage.service";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ASSET_FETCH = Symbol("ASSET_FETCH");
type FetchLike = typeof fetch;

type AssetModel = {
  id: string;
  projectId: string;
  type: string;
  purpose: string;
  storageKey: string;
  mimeType: string;
  originalFilename: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  metadataJson: unknown;
  createdAt: Date | string;
};

type AssetPrismaClient = Pick<PrismaService, "project" | "asset">;

export interface AssetPreviewPayload {
  asset: AssetDetail;
  body: Buffer;
  mimeType: string;
}

export interface CreateGeneratedAssetInput {
  providerOutput: GeneratedMediaProviderOutput;
  purpose: Extract<AssetPurpose, "shot_keyframe" | "shot_clip">;
  metadataJson?: Record<string, unknown>;
}

const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64",
);

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function isUploadableMimeType(value: string): value is UploadableAssetMimeType {
  return UPLOADABLE_ASSET_MIME_TYPES.includes(value as UploadableAssetMimeType);
}

function assetTypeForMime(mimeType: UploadableAssetMimeType): AssetType {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return "document";
}

function assetTypeForGeneratedMime(mimeType: string): Extract<AssetType, "image" | "video"> {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  throw new BadRequestException("Generated asset must be an image or video");
}

function previewKindForMime(mimeType: string): AssetPreviewKind {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (mimeType.startsWith("text/")) {
    return "text";
  }
  return "metadata";
}

function originalFilenameFromStorageKey(storageKey: string): string {
  const filename = storageKey.split("/").pop()?.trim();
  return filename || "generated-asset";
}

function generatedPlaceholderBuffer(output: GeneratedMediaProviderOutput): Buffer {
  if (output.mimeType === "image/png") {
    return TRANSPARENT_PNG;
  }

  return Buffer.from(
    [
      "guga-flow mock generated media",
      `provider=${output.provider}`,
      `model=${output.model}`,
      `prompt=${output.prompt}`,
    ].join("\n"),
    "utf8",
  );
}

function base64ToBuffer(value: string): Buffer {
  const dataUrlMatch = /^data:[^;]+;base64,(?<payload>.+)$/s.exec(value);
  return Buffer.from(dataUrlMatch?.groups?.payload ?? value, "base64");
}

@Injectable()
export class AssetsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LocalStorageService) private readonly storage: LocalStorageService,
    @Optional() @Inject(ASSET_FETCH) private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async listAssets(projectId: string): Promise<AssetListItem[]> {
    await this.ensureProjectExists(projectId);
    const assets = await this.prisma.asset.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    });

    return assets.map((asset) => this.toAssetRecord(asset));
  }

  async uploadAsset(
    projectId: string,
    file: Express.Multer.File | undefined,
    input: { purpose?: AssetPurpose },
  ): Promise<AssetDetail> {
    await this.ensureProjectExists(projectId);
    this.validateUpload(file);

    const mimeType = file.mimetype as UploadableAssetMimeType;
    const stored = await this.storage.putObject({
      projectId,
      originalFilename: file.originalname,
      mimeType,
      buffer: file.buffer,
    });

    const asset = await this.prisma.asset.create({
      data: {
        projectId,
        type: assetTypeForMime(mimeType),
        purpose: input.purpose ?? "uploaded",
        storageKey: stored.storageKey,
        mimeType,
        originalFilename: file.originalname,
        sizeBytes: stored.sizeBytes,
        metadataJson: {
          previewKind: previewKindForMime(mimeType),
        },
      },
    });

    return this.toAssetRecord(asset);
  }

  async createGeneratedAsset(
    projectId: string,
    input: CreateGeneratedAssetInput,
    client: AssetPrismaClient = this.prisma,
  ): Promise<AssetDetail> {
    await this.ensureProjectExists(projectId, client);

    const output = input.providerOutput;
    const type = assetTypeForGeneratedMime(output.mimeType);
    const buffer = await this.generatedAssetBuffer(output);
    const stored = await this.storage.writeObject({
      storageKey: output.storageKey,
      buffer,
    });
    const asset = await client.asset.create({
      data: {
        projectId,
        type,
        purpose: input.purpose,
        storageKey: stored.storageKey,
        mimeType: output.mimeType,
        originalFilename: originalFilenameFromStorageKey(stored.storageKey),
        sizeBytes: stored.sizeBytes,
        metadataJson: {
          previewKind: previewKindForMime(output.mimeType),
          provider: output.provider,
          model: output.model,
          prompt: output.prompt,
          referenceAssetIds: output.referenceAssetIds,
          providerAssetId: output.assetId,
          providerTaskId: output.providerTaskId,
          ...(input.metadataJson ?? {}),
        },
      },
    });

    return this.toAssetRecord(asset);
  }

  private async generatedAssetBuffer(output: GeneratedMediaProviderOutput): Promise<Buffer> {
    if (output.bytesBase64) {
      return this.validateGeneratedBytes(base64ToBuffer(output.bytesBase64));
    }
    if (output.remoteUrl) {
      return this.downloadGeneratedRemoteUrl(output.remoteUrl);
    }

    return generatedPlaceholderBuffer(output);
  }

  private async downloadGeneratedRemoteUrl(remoteUrl: string): Promise<Buffer> {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(remoteUrl);
    } catch {
      throw new BadRequestException("Generated asset remote URL is invalid");
    }
    if (parsedUrl.protocol !== "https:") {
      throw new BadRequestException("Generated asset remote URL must use https");
    }
    if (isBlockedRemoteHost(parsedUrl.hostname)) {
      throw new BadRequestException("Generated asset remote URL host is not allowed");
    }

    const response = await this.fetchImpl(parsedUrl);
    if (!response.ok) {
      throw new BadRequestException(`Generated asset remote download failed with ${response.status}`);
    }

    return this.validateGeneratedBytes(Buffer.from(await response.arrayBuffer()));
  }

  private validateGeneratedBytes(buffer: Buffer): Buffer {
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      throw new BadRequestException("Generated asset is too large");
    }

    return buffer;
  }

  async getAsset(projectId: string, assetId: string): Promise<AssetDetail> {
    const asset = await this.findAsset(projectId, assetId);
    const detail = this.toAssetRecord(asset);

    if (detail.previewKind === "text") {
      const body = await this.storage.readObject(asset.storageKey);
      return {
        ...detail,
        textPreview: body.toString("utf8").slice(0, 4000),
      };
    }

    return detail;
  }

  async getAssetPreview(projectId: string, assetId: string): Promise<AssetPreviewPayload> {
    const asset = await this.findAsset(projectId, assetId);
    return {
      asset: this.toAssetRecord(asset),
      body: await this.storage.readObject(asset.storageKey),
      mimeType: asset.mimeType,
    };
  }

  async deleteAsset(projectId: string, assetId: string): Promise<{ deleted: true }> {
    const asset = await this.findAsset(projectId, assetId);
    await this.storage.deleteObject(asset.storageKey);
    await this.prisma.asset.delete({ where: { id: asset.id } });

    return { deleted: true };
  }

  private validateUpload(file: Express.Multer.File | undefined): asserts file is Express.Multer.File {
    if (!file) {
      throw new BadRequestException("Upload file is required");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new BadRequestException("Upload file is too large");
    }
    if (!isUploadableMimeType(file.mimetype)) {
      throw new BadRequestException("Unsupported upload file type");
    }
  }

  private async ensureProjectExists(
    projectId: string,
    client: AssetPrismaClient = this.prisma,
  ): Promise<void> {
    const project = await client.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }
  }

  private async findAsset(projectId: string, assetId: string): Promise<AssetModel> {
    const asset = await this.prisma.asset.findFirst({
      where: { id: assetId, projectId },
    });

    if (!asset) {
      throw new NotFoundException("Asset not found");
    }

    return asset;
  }

  private toAssetRecord(asset: AssetModel): AssetDetail {
    const previewKind = previewKindForMime(asset.mimeType);

    return {
      id: asset.id,
      projectId: asset.projectId,
      type: asset.type as AssetType,
      purpose: asset.purpose as AssetPurpose,
      storageKey: asset.storageKey,
      mimeType: asset.mimeType,
      originalFilename: asset.originalFilename ?? undefined,
      sizeBytes: asset.sizeBytes ?? undefined,
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
      durationMs: asset.durationMs ?? undefined,
      metadataJson: asset.metadataJson ?? undefined,
      createdAt: toIsoString(asset.createdAt),
      previewKind,
      previewUrl: `/api/v1/projects/${asset.projectId}/assets/${asset.id}/preview`,
    };
  }
}

function isBlockedRemoteHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized.endsWith(".localhost") || normalized === "::1") {
    return true;
  }
  if (
    normalized === "0.0.0.0" ||
    normalized.startsWith("127.") ||
    normalized.startsWith("10.") ||
    normalized.startsWith("169.254.")
  ) {
    return true;
  }
  if (normalized.startsWith("192.168.")) {
    return true;
  }
  if (normalized.startsWith("::ffff:127.") || normalized.startsWith("fe80:")) {
    return true;
  }
  if (/^f[cd][0-9a-f]{0,2}:/i.test(normalized)) {
    return true;
  }

  const private172Match = /^172\.(1[6-9]|2\d|3[0-1])\./.exec(normalized);
  return Boolean(private172Match);
}
