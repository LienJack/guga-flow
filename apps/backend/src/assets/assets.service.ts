import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import {
  ASSET_COLLECTION_KINDS,
  ASSET_EDIT_ACTIONS,
  UPLOADABLE_ASSET_MIME_TYPES,
  type AssetBatchInput,
  type AssetBatchResult,
  type AssetAnalysisJobOutput,
  type AssetCollectionKind,
  type AssetCollectionRecord,
  type AssetDetail,
  type AssetListFilters,
  type AssetListItem,
  type AssetPreviewKind,
  type AssetPurpose,
  type AssetReferenceSummary,
  type AssetTagRecord,
  type AssetType,
  type EditAssetInput,
  type EditAssetResult,
  type EditorExportPackageOutput,
  type GeneratedMediaProviderOutput,
  type UploadableAssetMimeType,
} from "@guga-flow/shared-types";
import { EDITOR_PACKAGE_MIME_TYPE } from "@guga-flow/shared-types";
import { randomUUID } from "node:crypto";

import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { LocalStorageService } from "../storage/local-storage.service";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const ASSET_FETCH = Symbol("ASSET_FETCH");
type FetchLike = typeof fetch;

type AssetModel = {
  id: string;
  projectId: string;
  collectionId?: string | null;
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

type AssetCollectionModel = {
  id: string;
  projectId: string;
  name: string;
  parentId: string | null;
  kind: string;
  sortOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type AssetTagModel = {
  id: string;
  projectId: string;
  name: string;
  color: string | null;
  createdAt: Date | string;
};

type AssetWithRelations = AssetModel & {
  collection?: AssetCollectionModel | null;
  tagAssignments?: Array<{ tag: AssetTagModel }>;
};

type AssetPrismaClient = Pick<PrismaService, "project" | "asset">;
type AssetLibraryPrismaClient = PrismaService & {
  assetCollection: {
    findMany(args?: unknown): Promise<unknown[]>;
    findFirst(args: unknown): Promise<unknown | null>;
    create(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
    delete(args: unknown): Promise<unknown>;
  };
  assetTag: {
    findMany(args?: unknown): Promise<unknown[]>;
    findFirst(args: unknown): Promise<unknown | null>;
    create(args: unknown): Promise<unknown>;
  };
  assetTagAssignment: {
    createMany(args: unknown): Promise<unknown>;
    deleteMany(args: unknown): Promise<unknown>;
  };
  canvasNode: {
    findMany(args?: unknown): Promise<unknown[]>;
  };
  generationJob: {
    findMany(args?: unknown): Promise<unknown[]>;
  };
};

export interface AssetPreviewPayload {
  asset: AssetDetail;
  body: Buffer;
  mimeType: string;
}

export interface CreateGeneratedAssetInput {
  providerOutput: GeneratedMediaProviderOutput;
  purpose: Extract<
    AssetPurpose,
    "shot_keyframe" | "shot_clip" | "character_reference" | "location_reference"
  >;
  metadataJson?: Record<string, unknown>;
}

export interface CreatePackageAssetInput {
  packageOutput: EditorExportPackageOutput;
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
  if (mimeType.startsWith("audio/")) {
    return "audio";
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
  if (mimeType.startsWith("audio/")) {
    return "audio";
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

function dataObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function jsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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

  async listAssets(projectId: string, filters: AssetListFilters = {}): Promise<AssetListItem[]> {
    await this.ensureProjectExists(projectId);
    const assets = await this.libraryPrisma().asset.findMany({
      where: {
        projectId,
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.purpose ? { purpose: filters.purpose } : {}),
        ...(filters.collectionId ? { collectionId: filters.collectionId } : {}),
      },
      include: {
        collection: true,
        tagAssignments: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
    }) as AssetWithRelations[];

    return assets
      .filter((asset) => matchesAssetFilters(asset, filters))
      .map((asset) => this.toAssetRecord(asset));
  }

  async listCollections(projectId: string): Promise<AssetCollectionRecord[]> {
    await this.ensureProjectExists(projectId);
    const rows = await this.libraryPrisma().assetCollection.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }) as AssetCollectionModel[];
    return rows.map(toAssetCollectionRecord);
  }

  async createCollection(
    projectId: string,
    input: { name?: string; parentId?: string; kind?: AssetCollectionKind; sortOrder?: number },
  ): Promise<AssetCollectionRecord> {
    await this.ensureProjectExists(projectId);
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException("Asset collection name is required");
    }
    const kind = ASSET_COLLECTION_KINDS.includes(input.kind as AssetCollectionKind)
      ? input.kind
      : "manual";
    const row = await this.libraryPrisma().assetCollection.create({
      data: {
        projectId,
        name,
        parentId: input.parentId,
        kind,
        sortOrder: input.sortOrder ?? 0,
      },
    }) as AssetCollectionModel;
    return toAssetCollectionRecord(row);
  }

  async listTags(projectId: string): Promise<AssetTagRecord[]> {
    await this.ensureProjectExists(projectId);
    const rows = await this.libraryPrisma().assetTag.findMany({
      where: { projectId },
      orderBy: { name: "asc" },
    }) as AssetTagModel[];
    return rows.map(toAssetTagRecord);
  }

  async createTag(projectId: string, input: { name?: string; color?: string }): Promise<AssetTagRecord> {
    await this.ensureProjectExists(projectId);
    const name = input.name?.trim();
    if (!name) {
      throw new BadRequestException("Asset tag name is required");
    }
    const row = await this.libraryPrisma().assetTag.create({
      data: {
        projectId,
        name,
        color: input.color?.trim() || null,
      },
    }) as AssetTagModel;
    return toAssetTagRecord(row);
  }

  async batchAssets(projectId: string, input: AssetBatchInput): Promise<AssetBatchResult> {
    await this.ensureProjectExists(projectId);
    const assetIds = [...new Set((input.assetIds ?? []).filter(Boolean))];
    if (!assetIds.length) {
      throw new BadRequestException("Asset batch requires assetIds");
    }
    await this.ensureAssetsBelongToProject(projectId, assetIds);

    if (input.action === "move_collection") {
      await this.libraryPrisma().asset.updateMany({
        where: { projectId, id: { in: assetIds } },
        data: { collectionId: input.collectionId || null },
      });
      return { assets: await this.listAssets(projectId) };
    }

    if (input.action === "add_tags") {
      const tagIds = await this.ensureTagsBelongToProject(projectId, input.tagIds ?? []);
      await this.libraryPrisma().assetTagAssignment.createMany({
        data: assetIds.flatMap((assetId) => tagIds.map((tagId) => ({ assetId, tagId }))),
        skipDuplicates: true,
      });
      return { assets: await this.listAssets(projectId) };
    }

    if (input.action === "remove_tags") {
      const tagIds = await this.ensureTagsBelongToProject(projectId, input.tagIds ?? []);
      await this.libraryPrisma().assetTagAssignment.deleteMany({
        where: { assetId: { in: assetIds }, tagId: { in: tagIds } },
      });
      return { assets: await this.listAssets(projectId) };
    }

    if (input.action === "delete") {
      await this.assertAssetsNotReferenced(projectId, assetIds);
      const assets = await this.libraryPrisma().asset.findMany({
        where: { projectId, id: { in: assetIds } },
      }) as AssetModel[];
      for (const asset of assets) {
        await this.storage.deleteObject(asset.storageKey);
      }
      await this.libraryPrisma().asset.deleteMany({ where: { projectId, id: { in: assetIds } } });
      return { assets: await this.listAssets(projectId), deletedAssetIds: assetIds };
    }

    throw new BadRequestException("Unsupported asset batch action");
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

  async createPackageAsset(
    projectId: string,
    input: CreatePackageAssetInput,
    client: AssetPrismaClient = this.prisma,
  ): Promise<AssetDetail> {
    await this.ensureProjectExists(projectId, client);

    const output = input.packageOutput;
    if (output.mimeType !== EDITOR_PACKAGE_MIME_TYPE) {
      throw new BadRequestException("Editor package asset must be a zip file");
    }
    if (!output.bytesBase64) {
      throw new BadRequestException("Editor package asset requires package bytes");
    }

    const buffer = this.validateGeneratedBytes(base64ToBuffer(output.bytesBase64));
    const stored = await this.storage.writeObject({
      storageKey: output.storageKey,
      buffer,
    });
    const asset = await client.asset.create({
      data: {
        projectId,
        type: "package",
        purpose: "editor_package",
        storageKey: stored.storageKey,
        mimeType: output.mimeType,
        originalFilename: originalFilenameFromStorageKey(stored.storageKey),
        sizeBytes: stored.sizeBytes,
        metadataJson: {
          previewKind: "metadata",
          editorExportId: output.timeline.editorExportId,
          clipCount: output.clips.length,
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
    await this.assertAssetsNotReferenced(projectId, [assetId]);
    await this.storage.deleteObject(asset.storageKey);
    await this.prisma.asset.delete({ where: { id: asset.id } });

    return { deleted: true };
  }

  async editAsset(
    projectId: string,
    assetId: string,
    input: EditAssetInput,
  ): Promise<EditAssetResult> {
    const source = await this.findAsset(projectId, assetId);
    if (source.type !== "image") {
      throw new BadRequestException("Only image assets can be edited");
    }
    if (!ASSET_EDIT_ACTIONS.includes(input.action)) {
      throw new BadRequestException("Asset edit action is not supported");
    }
    const sourceBytes = await this.storage.readObject(source.storageKey);
    const created: AssetModel[] = [];
    const count = input.action === "grid_split"
      ? selectedGridCells(input.rows, input.columns, input.selectedCells).length
      : 1;
    const cells = input.action === "grid_split"
      ? selectedGridCells(input.rows, input.columns, input.selectedCells)
      : [undefined];

    for (let index = 0; index < count; index += 1) {
      const cell = cells[index];
      const storageKey = `${projectId}/asset-edits/${source.id}-${input.action}-${index + 1}-${randomUUID()}.${extensionForMime(source.mimeType)}`;
      const stored = await this.storage.writeObject({ storageKey, buffer: sourceBytes });
      created.push(await this.prisma.asset.create({
        data: {
          projectId,
          type: "image",
          purpose: source.purpose as AssetPurpose,
          storageKey: stored.storageKey,
          mimeType: source.mimeType,
          originalFilename: originalFilenameFromStorageKey(stored.storageKey),
          sizeBytes: stored.sizeBytes,
          width: source.width,
          height: source.height,
          metadataJson: jsonValue({
            ...dataObject(source.metadataJson),
            previewKind: "image",
            editAction: input.action,
            derivedFromAssetId: source.id,
            crop: input.crop ?? null,
            gridCell: cell ?? null,
            editedAt: new Date().toISOString(),
          }),
        },
      }) as AssetModel);
    }

    return { assets: created.map((asset) => this.toAssetRecord(asset)) };
  }

  async applyAssetAnalysis(
    projectId: string,
    output: AssetAnalysisJobOutput,
  ): Promise<AssetListItem[]> {
    await this.ensureProjectExists(projectId);
    const assetIds = output.results.map((result) => result.assetId);
    await this.ensureAssetsBelongToProject(projectId, assetIds);

    for (const result of output.results) {
      if (result.skipped || result.errorMessage) {
        continue;
      }
      const asset = await this.findAsset(projectId, result.assetId);
      const metadata = dataObject(asset.metadataJson);
      const nextMetadata: Record<string, unknown> = { ...metadata };
      if (result.caption && (output.overwrite || !metadata.caption)) {
        nextMetadata.caption = result.caption;
      }
      if (result.classifications?.length) {
        const existing = Array.isArray(metadata.classifications)
          ? metadata.classifications.filter((item): item is string => typeof item === "string")
          : [];
        nextMetadata.classifications = Array.from(new Set([
          ...(output.overwrite ? [] : existing),
          ...result.classifications,
        ]));
      }
      nextMetadata.analysisProvider = output.provider;
      nextMetadata.analysisModel = output.model;
      nextMetadata.analyzedAt = output.completedAt;

      await this.prisma.asset.update({
        where: { id: asset.id },
        data: { metadataJson: jsonValue(nextMetadata) },
      });
    }

    return this.listAssets(projectId);
  }

  private libraryPrisma(): AssetLibraryPrismaClient {
    return this.prisma as AssetLibraryPrismaClient;
  }

  private async ensureAssetsBelongToProject(projectId: string, assetIds: string[]): Promise<void> {
    const rows = await this.libraryPrisma().asset.findMany({
      where: { projectId, id: { in: assetIds } },
      select: { id: true },
    }) as Array<{ id: string }>;
    if (rows.length !== assetIds.length) {
      throw new NotFoundException("One or more assets were not found");
    }
  }

  private async ensureTagsBelongToProject(projectId: string, tagIds: string[]): Promise<string[]> {
    const uniqueTagIds = [...new Set(tagIds.filter(Boolean))];
    if (!uniqueTagIds.length) {
      throw new BadRequestException("Asset tag operation requires tagIds");
    }
    const rows = await this.libraryPrisma().assetTag.findMany({
      where: { projectId, id: { in: uniqueTagIds } },
      select: { id: true },
    }) as Array<{ id: string }>;
    if (rows.length !== uniqueTagIds.length) {
      throw new NotFoundException("One or more asset tags were not found");
    }
    return uniqueTagIds;
  }

  private async assertAssetsNotReferenced(projectId: string, assetIds: string[]): Promise<void> {
    const summaries = await this.assetReferenceSummaries(projectId, assetIds);
    const referenced = summaries.find((summary) => summary.nodeIds.length || summary.jobIds.length);
    if (referenced) {
      throw new BadRequestException(
        `Asset ${referenced.assetId} is still referenced by canvas nodes or generation jobs`,
      );
    }
  }

  private async assetReferenceSummaries(
    projectId: string,
    assetIds: string[],
  ): Promise<AssetReferenceSummary[]> {
    const nodes = await this.libraryPrisma().canvasNode.findMany({
      where: { projectId },
      select: { id: true, dataJson: true },
    }) as Array<{ id: string; dataJson: unknown }>;
    const jobs = await this.libraryPrisma().generationJob.findMany({
      where: { projectId },
      select: { id: true, inputJson: true, outputJson: true },
    }) as Array<{ id: string; inputJson: unknown; outputJson: unknown }>;

    return assetIds.map((assetId) => ({
      assetId,
      nodeIds: nodes.filter((node) => jsonContainsString(node.dataJson, assetId)).map((node) => node.id),
      jobIds: jobs
        .filter((job) => jsonContainsString(job.inputJson, assetId) || jsonContainsString(job.outputJson, assetId))
        .map((job) => job.id),
    }));
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

  private toAssetRecord(asset: AssetWithRelations): AssetDetail {
    const previewKind = previewKindForMime(asset.mimeType);

    return {
      id: asset.id,
      projectId: asset.projectId,
      type: asset.type as AssetType,
      purpose: asset.purpose as AssetPurpose,
      collectionId: asset.collectionId ?? undefined,
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
      collection: asset.collection ? toAssetCollectionRecord(asset.collection) : undefined,
      tags: asset.tagAssignments?.map((assignment) => toAssetTagRecord(assignment.tag)) ?? [],
      referenceCount: undefined,
    };
  }
}

function toAssetCollectionRecord(row: AssetCollectionModel): AssetCollectionRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    parentId: row.parentId ?? undefined,
    kind: ASSET_COLLECTION_KINDS.includes(row.kind as AssetCollectionKind)
      ? row.kind as AssetCollectionKind
      : "manual",
    sortOrder: row.sortOrder,
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  };
}

function toAssetTagRecord(row: AssetTagModel): AssetTagRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    name: row.name,
    color: row.color ?? undefined,
    createdAt: toIsoString(row.createdAt),
  };
}

function matchesAssetFilters(asset: AssetWithRelations, filters: AssetListFilters): boolean {
  const tagIds = filters.tagIds ?? [];
  if (tagIds.length) {
    const assigned = new Set((asset.tagAssignments ?? []).map((assignment) => assignment.tag.id));
    if (!tagIds.every((tagId) => assigned.has(tagId))) {
      return false;
    }
  }
  const query = filters.query?.trim().toLowerCase();
  if (!query) {
    return true;
  }
  const searchable = [
    asset.originalFilename,
    asset.storageKey,
    asset.purpose,
    asset.type,
    asset.collection?.name,
    ...(asset.tagAssignments ?? []).map((assignment) => assignment.tag.name),
    metadataSearchText(asset.metadataJson),
  ].filter(Boolean).join("\n").toLowerCase();
  return searchable.includes(query);
}

function metadataSearchText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(metadataSearchText).join(" ");
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).map(metadataSearchText).join(" ");
  }
  return "";
}

function jsonContainsString(value: unknown, needle: string): boolean {
  if (value === needle) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some((item) => jsonContainsString(item, needle));
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some((item) => jsonContainsString(item, needle));
  }
  return false;
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

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  return "png";
}

function selectedGridCells(
  rows = 2,
  columns = 2,
  selectedCells?: number[],
): number[] {
  const safeRows = Number.isInteger(rows) && rows > 0 && rows <= 6 ? rows : 2;
  const safeColumns = Number.isInteger(columns) && columns > 0 && columns <= 6 ? columns : 2;
  const total = safeRows * safeColumns;
  const requested = selectedCells?.filter((cell) => Number.isInteger(cell) && cell >= 0 && cell < total);
  return requested?.length ? Array.from(new Set(requested)) : Array.from({ length: total }, (_, index) => index);
}
