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
  CreateCanvasNodeInput,
  CreateCanvasNodeResult,
  DeleteCanvasNodeResult,
  NodeStatus,
  SaveCanvasSnapshotInput,
  SaveCanvasSnapshotResult,
  UpdateCanvasNodeGeometryInput,
  UpdateCanvasNodeGeometryResult,
  UpdateCanvasNodeInput,
  UpdateCanvasNodeResult,
} from "@guga-flow/shared-types";
import { NODE_STATUSES, PHASE_3_CANVAS_NODE_TYPES } from "@guga-flow/shared-types";

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

function isCanvasNodeDataJson(value: unknown): value is { [key: string]: CanvasSnapshotJson } {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    isPlainJsonObject(value) &&
    Object.values(value).every(isCanvasSnapshotJson)
  );
}

function isPhase3CanvasNodeType(value: unknown): value is CanvasNodeType {
  return typeof value === "string" && PHASE_3_CANVAS_NODE_TYPES.includes(value as never);
}

function isNodeStatus(value: unknown): value is NodeStatus {
  return typeof value === "string" && NODE_STATUSES.includes(value as never);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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

  async createNode(
    projectId: string,
    input: CreateCanvasNodeInput,
  ): Promise<CreateCanvasNodeResult> {
    const canvasDocument = await this.getOrCreateCanvasDocument(projectId);
    if (!input.tldrawShapeId || !isPhase3CanvasNodeType(input.type)) {
      throw new BadRequestException("Canvas node type and shape id are required");
    }

    const dataJson = this.normalizeNodeDataJson(input.dataJson);
    const geometry = this.normalizeNodeGeometry({
      x: input.x ?? 0,
      y: input.y ?? 0,
      width: input.width ?? 320,
      height: input.height ?? 220,
      zIndex: input.zIndex ?? 0,
    });
    const status = this.normalizeNodeStatus(input.status);

    const node = await this.prisma.canvasNode.create({
      data: {
        projectId,
        canvasDocumentId: canvasDocument.id,
        tldrawShapeId: input.tldrawShapeId,
        type: input.type,
        title: this.normalizeTitle(input.title),
        x: geometry.x,
        y: geometry.y,
        width: geometry.width,
        height: geometry.height,
        zIndex: geometry.zIndex ?? 0,
        status,
        dataJson,
      },
    });

    return { node: this.toCanvasNodeRecord(node) };
  }

  async updateNode(
    projectId: string,
    nodeId: string,
    input: UpdateCanvasNodeInput,
  ): Promise<UpdateCanvasNodeResult> {
    const existing = await this.findProjectNode(projectId, nodeId);
    const data: {
      title?: string | null;
      status?: NodeStatus;
      dataJson?: { [key: string]: CanvasSnapshotJson };
    } = {};

    if (input.title !== undefined) {
      data.title = this.normalizeTitle(input.title);
    }
    if (input.status !== undefined) {
      data.status = this.normalizeNodeStatus(input.status);
    }
    if (input.dataJson !== undefined) {
      data.dataJson = this.normalizeNodeDataJson(input.dataJson);
    }

    const node = await this.prisma.canvasNode.update({
      where: { id: existing.id },
      data,
    });

    return { node: this.toCanvasNodeRecord(node) };
  }

  async updateNodeGeometry(
    projectId: string,
    nodeId: string,
    input: UpdateCanvasNodeGeometryInput,
  ): Promise<UpdateCanvasNodeGeometryResult> {
    const existing = await this.findProjectNode(projectId, nodeId);
    const geometry = this.normalizeNodeGeometry(input);
    const node = await this.prisma.canvasNode.update({
      where: { id: existing.id },
      data: geometry,
    });

    return { node: this.toCanvasNodeRecord(node) };
  }

  async deleteNode(projectId: string, nodeId: string): Promise<DeleteCanvasNodeResult> {
    const existing = await this.findProjectNode(projectId, nodeId);
    await this.prisma.canvasNode.delete({
      where: { id: existing.id },
    });

    return { deleted: true, nodeId: existing.id };
  }

  private async getOrCreateCanvasDocument(projectId: string): Promise<CanvasDocumentModel> {
    await this.ensureProjectExists(projectId);

    return this.prisma.canvasDocument.upsert({
      where: { projectId },
      update: {},
      create: { projectId },
    });
  }

  private async findProjectNode(projectId: string, nodeId: string): Promise<CanvasNodeModel> {
    await this.ensureProjectExists(projectId);

    const node = await this.prisma.canvasNode.findFirst({
      where: { id: nodeId, projectId },
    });

    if (!node) {
      throw new NotFoundException("Canvas node not found");
    }

    return node;
  }

  private normalizeNodeDataJson(value: unknown): { [key: string]: CanvasSnapshotJson } {
    if (value === undefined) {
      return {};
    }
    if (!isCanvasNodeDataJson(value)) {
      throw new BadRequestException("Canvas node data must be a JSON object");
    }

    return value;
  }

  private normalizeNodeStatus(value: unknown): NodeStatus {
    if (value === undefined) {
      return "draft";
    }
    if (!isNodeStatus(value)) {
      throw new BadRequestException("Canvas node status is invalid");
    }

    return value;
  }

  private normalizeTitle(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeNodeGeometry(
    input: UpdateCanvasNodeGeometryInput,
  ): UpdateCanvasNodeGeometryInput {
    if (
      !isFiniteNumber(input.x) ||
      !isFiniteNumber(input.y) ||
      !isFiniteNumber(input.width) ||
      !isFiniteNumber(input.height) ||
      input.width <= 0 ||
      input.height <= 0
    ) {
      throw new BadRequestException("Canvas node geometry must use finite positive dimensions");
    }
    if (input.zIndex !== undefined && !Number.isInteger(input.zIndex)) {
      throw new BadRequestException("Canvas node zIndex must be an integer");
    }

    return input;
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
