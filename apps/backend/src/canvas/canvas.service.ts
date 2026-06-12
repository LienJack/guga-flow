import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AssetListItem,
  AssetPreviewKind,
  AssetPurpose,
  AssetType,
  CanvasDocumentRecord,
  CanvasEdgeRecord,
  CanvasEdgeRelation,
  CanvasLoadResult,
  CanvasNodeRecord,
  CanvasNodeType,
  CanvasSnapshotJson,
  NodeStatus,
  SaveCanvasSnapshotInput,
  SaveCanvasSnapshotResult,
} from "@guga-flow/shared-types";

import { PrismaService } from "../prisma/prisma.service";

type CanvasDocumentModel = {
  id: string;
  projectId: string;
  snapshotJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type CanvasNodeModel = {
  id: string;
  projectId: string;
  canvasDocumentId: string;
  tldrawShapeId: string;
  type: string;
  title: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  status: string;
  dataJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type CanvasEdgeModel = {
  id: string;
  projectId: string;
  canvasDocumentId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourceShapeId: string | null;
  targetShapeId: string | null;
  visualArrowShapeId: string | null;
  relation: string;
  dataJson: unknown;
  createdAt: Date | string;
};

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

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
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

function isPlainJsonObject(value: object): value is { [key: string]: CanvasSnapshotJson } {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isCanvasSnapshotJson(value: unknown): value is CanvasSnapshotJson {
  if (value === null) {
    return true;
  }

  const valueType = typeof value;
  if (valueType === "string" || valueType === "number" || valueType === "boolean") {
    return Number.isFinite(value as number) || valueType !== "number";
  }

  if (Array.isArray(value)) {
    return value.every(isCanvasSnapshotJson);
  }

  if (valueType === "object" && value && isPlainJsonObject(value)) {
    return Object.values(value).every(isCanvasSnapshotJson);
  }

  return false;
}

@Injectable()
export class CanvasService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getCanvas(projectId: string): Promise<CanvasLoadResult> {
    await this.ensureProjectExists(projectId);

    const canvasDocument = await this.prisma.canvasDocument.upsert({
      where: { projectId },
      update: {},
      create: { projectId },
    });
    const [nodes, edges, assets] = await Promise.all([
      this.prisma.canvasNode.findMany({
        where: { projectId, canvasDocumentId: canvasDocument.id },
        orderBy: [{ zIndex: "asc" }, { createdAt: "asc" }],
      }),
      this.prisma.canvasEdge.findMany({
        where: { projectId, canvasDocumentId: canvasDocument.id },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.asset.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      canvasDocument: this.toCanvasDocumentRecord(canvasDocument),
      nodes: nodes.map((node) => this.toCanvasNodeRecord(node)),
      edges: edges.map((edge) => this.toCanvasEdgeRecord(edge)),
      assets: assets.map((asset) => this.toAssetRecord(asset)),
    };
  }

  async saveSnapshot(
    projectId: string,
    input: SaveCanvasSnapshotInput,
  ): Promise<SaveCanvasSnapshotResult> {
    await this.ensureProjectExists(projectId);
    if (input.snapshotJson === null || !isCanvasSnapshotJson(input.snapshotJson)) {
      throw new BadRequestException("Canvas snapshot must be valid JSON");
    }

    const snapshotJson = input.snapshotJson;
    const canvasDocument = await this.prisma.canvasDocument.upsert({
      where: { projectId },
      update: { snapshotJson },
      create: { projectId, snapshotJson },
    });

    return {
      canvasDocument: this.toCanvasDocumentRecord(canvasDocument),
    };
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

  private toCanvasDocumentRecord(canvasDocument: CanvasDocumentModel): CanvasDocumentRecord {
    const snapshotJson = isCanvasSnapshotJson(canvasDocument.snapshotJson)
      ? canvasDocument.snapshotJson
      : {};

    return {
      id: canvasDocument.id,
      projectId: canvasDocument.projectId,
      snapshotJson,
      createdAt: toIsoString(canvasDocument.createdAt),
      updatedAt: toIsoString(canvasDocument.updatedAt),
    };
  }

  private toCanvasNodeRecord(node: CanvasNodeModel): CanvasNodeRecord {
    return {
      id: node.id,
      projectId: node.projectId,
      canvasDocumentId: node.canvasDocumentId,
      tldrawShapeId: node.tldrawShapeId,
      type: node.type as CanvasNodeType,
      title: node.title ?? undefined,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      zIndex: node.zIndex,
      status: node.status as NodeStatus,
      dataJson: node.dataJson ?? {},
      createdAt: toIsoString(node.createdAt),
      updatedAt: toIsoString(node.updatedAt),
    };
  }

  private toCanvasEdgeRecord(edge: CanvasEdgeModel): CanvasEdgeRecord {
    return {
      id: edge.id,
      projectId: edge.projectId,
      canvasDocumentId: edge.canvasDocumentId,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: edge.targetNodeId,
      sourceShapeId: edge.sourceShapeId ?? undefined,
      targetShapeId: edge.targetShapeId ?? undefined,
      visualArrowShapeId: edge.visualArrowShapeId ?? undefined,
      relation: edge.relation as CanvasEdgeRelation,
      dataJson: edge.dataJson ?? undefined,
      createdAt: toIsoString(edge.createdAt),
    };
  }

  private toAssetRecord(asset: AssetModel): AssetListItem {
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
      previewKind: previewKindForMime(asset.mimeType),
      previewUrl: `/api/v1/projects/${asset.projectId}/assets/${asset.id}/preview`,
    };
  }
}
