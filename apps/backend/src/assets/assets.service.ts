import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  UPLOADABLE_ASSET_MIME_TYPES,
  type AssetDetail,
  type AssetListItem,
  type AssetPreviewKind,
  type AssetPurpose,
  type AssetType,
  type UploadableAssetMimeType,
} from "@guga-flow/shared-types";

import { PrismaService } from "../prisma/prisma.service";
import { LocalStorageService } from "../storage/local-storage.service";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

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

export interface AssetPreviewPayload {
  asset: AssetDetail;
  body: Buffer;
  mimeType: string;
}

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

@Injectable()
export class AssetsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LocalStorageService) private readonly storage: LocalStorageService,
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

  private async ensureProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
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
