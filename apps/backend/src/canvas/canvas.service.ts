import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AssetListItem,
  AssetPreviewKind,
  AssetPurpose,
  AssetType,
  CanvasDocumentRecord,
  CanvasEdgeData,
  CanvasEdgeRecord,
  CanvasEdgeRelation,
  CanvasLoadResult,
  CanvasNodeRecord,
  CanvasNodeType,
  CanvasSnapshotJson,
  CreateCanvasEdgeInput,
  CreateCanvasEdgeResult,
  CreateCanvasNodeInput,
  CreateCanvasNodeResult,
  DeleteCanvasEdgeResult,
  DeleteCanvasNodeResult,
  NodeStatus,
  SaveCanvasSnapshotInput,
  SaveCanvasSnapshotResult,
  UpdateCanvasNodeGeometryInput,
  UpdateCanvasNodeGeometryResult,
  UpdateCanvasNodeInput,
  UpdateCanvasNodeResult,
} from "@guga-flow/shared-types";
import {
  CANVAS_EDGE_RELATIONS,
  NODE_STATUSES,
  PHASE_3_CANVAS_NODE_TYPES,
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

type CanvasPrismaClient = Pick<PrismaService, "canvasEdge" | "canvasNode">;
type CanvasEdgeDataJson = { [key: string]: CanvasSnapshotJson };
type CanvasEdgeWriteInput = Omit<CreateCanvasEdgeInput<CanvasEdgeDataJson>, "affectedShotNodeIds">;

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

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function getStringArray(value: CanvasSnapshotJson | undefined): string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === "string")
    ? uniqueStrings(value)
    : [];
}

function getOptionalString(value: CanvasSnapshotJson | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
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

  async createEdge(
    projectId: string,
    input: CreateCanvasEdgeInput,
  ): Promise<CreateCanvasEdgeResult> {
    if (!CANVAS_EDGE_RELATIONS.includes(input.relation)) {
      throw new BadRequestException("Canvas edge relation is invalid");
    }

    const [sourceNode, targetNode] = await Promise.all([
      this.findProjectNode(projectId, input.sourceNodeId),
      this.findProjectNode(projectId, input.targetNodeId),
    ]);

    if (sourceNode.canvasDocumentId !== targetNode.canvasDocumentId) {
      throw new BadRequestException("Canvas edge nodes must belong to the same canvas");
    }

    this.validateSemanticEdge(sourceNode, targetNode, input.relation);
    const dataJson = this.normalizeEdgeDataJson(input.dataJson);

    if (input.relation === "references_location" && targetNode.type === "scene_frame") {
      const shotNodes = await this.findProjectShotNodesByIds(
        projectId,
        targetNode.canvasDocumentId,
        input.affectedShotNodeIds ?? [],
        true,
      );

      return this.createSceneFrameLocationEdge(projectId, input, sourceNode, targetNode, shotNodes);
    }

    return this.runTransaction(async (tx) => {
      const edge = await this.findOrCreateCanvasEdge(tx, projectId, targetNode.canvasDocumentId, {
        ...input,
        dataJson,
      });
      const updatedNode =
        input.relation === "references_character"
          ? await this.applyCharacterToShot(tx, targetNode, sourceNode.id)
          : await this.applyLocationToShot(tx, targetNode, sourceNode.id);

      return {
        edge: this.toCanvasEdgeRecord(edge),
        edges: [this.toCanvasEdgeRecord(edge)],
        updatedNodes: [this.toCanvasNodeRecord(updatedNode)],
      };
    });
  }

  async deleteEdge(projectId: string, edgeId: string): Promise<DeleteCanvasEdgeResult> {
    const edge = await this.findProjectEdge(projectId, edgeId);
    const [sourceNode, targetNode] = await Promise.all([
      this.findProjectNode(projectId, edge.sourceNodeId),
      this.findProjectNode(projectId, edge.targetNodeId),
    ]);
    const edgeData = this.toCanvasEdgeData(edge.dataJson);
    const batchShotNodes =
      edge.relation === "references_location" && targetNode.type === "scene_frame"
        ? await this.findProjectShotNodesByIds(
            projectId,
            edge.canvasDocumentId,
            edgeData.appliedShotNodeIds ?? [],
            false,
          )
        : [];

    return this.runTransaction(async (tx) => {
      const updatedNodes: CanvasNodeModel[] = [];
      const deletedEdgeIds = uniqueStrings([edge.id, ...(edgeData.childEdgeIds ?? [])]);

      if (edge.relation === "references_character" && targetNode.type === "shot") {
        updatedNodes.push(await this.removeCharacterFromShot(tx, targetNode, sourceNode.id));
      } else if (edge.relation === "references_location" && targetNode.type === "shot") {
        updatedNodes.push(await this.removeLocationFromShot(tx, targetNode, sourceNode.id));
      } else if (edge.relation === "references_location" && targetNode.type === "scene_frame") {
        for (const shotNode of batchShotNodes) {
          updatedNodes.push(await this.removeLocationFromShot(tx, shotNode, sourceNode.id));
        }
      }

      if (deletedEdgeIds.length === 1) {
        await tx.canvasEdge.delete({ where: { id: edge.id } });
      } else {
        await tx.canvasEdge.deleteMany({
          where: { id: { in: deletedEdgeIds }, projectId },
        });
      }

      return {
        deleted: true,
        edgeId: edge.id,
        deletedEdgeIds,
        updatedNodes: updatedNodes.map((node) => this.toCanvasNodeRecord(node)),
      };
    });
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

  private async findProjectEdge(projectId: string, edgeId: string): Promise<CanvasEdgeModel> {
    await this.ensureProjectExists(projectId);

    const edge = await this.prisma.canvasEdge.findFirst({
      where: { id: edgeId, projectId },
    });

    if (!edge) {
      throw new NotFoundException("Canvas edge not found");
    }

    return edge;
  }

  private async findProjectShotNodesByIds(
    projectId: string,
    canvasDocumentId: string,
    shotNodeIds: readonly string[],
    requireAll: boolean,
  ): Promise<CanvasNodeModel[]> {
    const uniqueShotNodeIds = uniqueStrings(shotNodeIds);
    if (uniqueShotNodeIds.length === 0) {
      return [];
    }

    const shotNodes = await this.prisma.canvasNode.findMany({
      where: {
        id: { in: uniqueShotNodeIds },
        projectId,
        canvasDocumentId,
        type: "shot",
      },
    });
    const shotNodeById = new Map(shotNodes.map((node) => [node.id, node]));

    if (requireAll && shotNodeById.size !== uniqueShotNodeIds.length) {
      throw new BadRequestException("Affected shot nodes must belong to this project canvas");
    }

    return uniqueShotNodeIds.flatMap((shotNodeId) => {
      const shotNode = shotNodeById.get(shotNodeId);
      return shotNode ? [shotNode] : [];
    });
  }

  private validateSemanticEdge(
    sourceNode: CanvasNodeModel,
    targetNode: CanvasNodeModel,
    relation: CanvasEdgeRelation,
  ): void {
    if (relation === "references_character") {
      if (sourceNode.type !== "character_asset" || targetNode.type !== "shot") {
        throw new BadRequestException("Character references must connect a character asset to a shot");
      }
      return;
    }

    if (relation === "references_location") {
      if (
        sourceNode.type !== "location_asset" ||
        (targetNode.type !== "shot" && targetNode.type !== "scene_frame")
      ) {
        throw new BadRequestException(
          "Location references must connect a location asset to a shot or scene frame",
        );
      }
      return;
    }

    throw new BadRequestException("Canvas edge relation is not supported for semantic binding yet");
  }

  private async createSceneFrameLocationEdge(
    projectId: string,
    input: CreateCanvasEdgeInput,
    sourceNode: CanvasNodeModel,
    targetNode: CanvasNodeModel,
    shotNodes: CanvasNodeModel[],
  ): Promise<CreateCanvasEdgeResult> {
    const canvasDocumentId = targetNode.canvasDocumentId;
    const dataJson = this.normalizeEdgeDataJson(input.dataJson);
    const affectedShotNodeIds = shotNodes.map((shotNode) => shotNode.id);

    return this.runTransaction(async (tx) => {
      let primaryEdge = await this.findOrCreateCanvasEdge(tx, projectId, canvasDocumentId, {
        ...input,
        dataJson: {
          ...(dataJson ?? {}),
          appliedShotNodeIds: affectedShotNodeIds,
        },
      });
      const childEdges: CanvasEdgeModel[] = [];
      const updatedNodes: CanvasNodeModel[] = [];

      for (const shotNode of shotNodes) {
        const childEdge = await this.findOrCreateCanvasEdge(tx, projectId, canvasDocumentId, {
          sourceNodeId: sourceNode.id,
          targetNodeId: shotNode.id,
          relation: "references_location",
          sourceShapeId: input.sourceShapeId ?? sourceNode.tldrawShapeId,
          targetShapeId: shotNode.tldrawShapeId,
          dataJson: { batchSourceEdgeId: primaryEdge.id },
        });
        childEdges.push(childEdge);
        updatedNodes.push(await this.applyLocationToShot(tx, shotNode, sourceNode.id));
      }

      primaryEdge = await tx.canvasEdge.update({
        where: { id: primaryEdge.id },
        data: {
          dataJson: {
            ...(dataJson ?? {}),
            appliedShotNodeIds: affectedShotNodeIds,
            childEdgeIds: childEdges.map((childEdge) => childEdge.id),
          },
        },
      });

      return {
        edge: this.toCanvasEdgeRecord(primaryEdge),
        edges: [primaryEdge, ...childEdges].map((edge) => this.toCanvasEdgeRecord(edge)),
        updatedNodes: updatedNodes.map((node) => this.toCanvasNodeRecord(node)),
        appliedShotCount: updatedNodes.length,
      };
    });
  }

  private async findOrCreateCanvasEdge(
    tx: CanvasPrismaClient,
    projectId: string,
    canvasDocumentId: string,
    input: CanvasEdgeWriteInput,
  ): Promise<CanvasEdgeModel> {
    const existing = await tx.canvasEdge.findFirst({
      where: {
        projectId,
        canvasDocumentId,
        sourceNodeId: input.sourceNodeId,
        targetNodeId: input.targetNodeId,
        relation: input.relation,
      },
    });

    if (existing) {
      const data: {
        sourceShapeId: string | null;
        targetShapeId: string | null;
        visualArrowShapeId: string | null;
        dataJson?: CanvasEdgeDataJson;
      } = {
        sourceShapeId: input.sourceShapeId ?? existing.sourceShapeId,
        targetShapeId: input.targetShapeId ?? existing.targetShapeId,
        visualArrowShapeId: input.visualArrowShapeId ?? existing.visualArrowShapeId,
      };
      if (input.dataJson !== undefined) {
        data.dataJson = input.dataJson;
      }

      return tx.canvasEdge.update({
        where: { id: existing.id },
        data,
      });
    }

    return tx.canvasEdge.create({
      data: {
        projectId,
        canvasDocumentId,
        sourceNodeId: input.sourceNodeId,
        targetNodeId: input.targetNodeId,
        sourceShapeId: input.sourceShapeId ?? null,
        targetShapeId: input.targetShapeId ?? null,
        visualArrowShapeId: input.visualArrowShapeId ?? null,
        relation: input.relation,
        ...(input.dataJson !== undefined ? { dataJson: input.dataJson } : {}),
      },
    });
  }

  private async applyCharacterToShot(
    tx: CanvasPrismaClient,
    shotNode: CanvasNodeModel,
    characterNodeId: string,
  ): Promise<CanvasNodeModel> {
    const dataJson = this.toNodeDataObject(shotNode.dataJson);
    dataJson.characterAssetIds = uniqueStrings([
      ...getStringArray(dataJson.characterAssetIds),
      characterNodeId,
    ]);

    return tx.canvasNode.update({
      where: { id: shotNode.id },
      data: { dataJson },
    });
  }

  private async applyLocationToShot(
    tx: CanvasPrismaClient,
    shotNode: CanvasNodeModel,
    locationNodeId: string,
  ): Promise<CanvasNodeModel> {
    const dataJson = this.toNodeDataObject(shotNode.dataJson);
    dataJson.locationAssetId = locationNodeId;

    return tx.canvasNode.update({
      where: { id: shotNode.id },
      data: { dataJson },
    });
  }

  private async removeCharacterFromShot(
    tx: CanvasPrismaClient,
    shotNode: CanvasNodeModel,
    characterNodeId: string,
  ): Promise<CanvasNodeModel> {
    const dataJson = this.toNodeDataObject(shotNode.dataJson);
    const nextCharacterIds = getStringArray(dataJson.characterAssetIds).filter(
      (id) => id !== characterNodeId,
    );

    if (nextCharacterIds.length > 0) {
      dataJson.characterAssetIds = nextCharacterIds;
    } else {
      delete dataJson.characterAssetIds;
    }

    return tx.canvasNode.update({
      where: { id: shotNode.id },
      data: { dataJson },
    });
  }

  private async removeLocationFromShot(
    tx: CanvasPrismaClient,
    shotNode: CanvasNodeModel,
    locationNodeId: string,
  ): Promise<CanvasNodeModel> {
    const dataJson = this.toNodeDataObject(shotNode.dataJson);
    if (getOptionalString(dataJson.locationAssetId) === locationNodeId) {
      delete dataJson.locationAssetId;
    }

    return tx.canvasNode.update({
      where: { id: shotNode.id },
      data: { dataJson },
    });
  }

  private async runTransaction<T>(fn: (tx: CanvasPrismaClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => fn(tx as unknown as CanvasPrismaClient));
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

  private normalizeEdgeDataJson(value: unknown): CanvasEdgeDataJson | undefined {
    if (value === undefined) {
      return undefined;
    }
    if (!isCanvasNodeDataJson(value)) {
      throw new BadRequestException("Canvas edge data must be a JSON object");
    }

    return value;
  }

  private toNodeDataObject(value: unknown): { [key: string]: CanvasSnapshotJson } {
    return isCanvasNodeDataJson(value) ? { ...value } : {};
  }

  private toCanvasEdgeData(value: unknown): CanvasEdgeData {
    if (!isCanvasNodeDataJson(value)) {
      return {};
    }

    const appliedShotNodeIds = getStringArray(value.appliedShotNodeIds);
    const childEdgeIds = getStringArray(value.childEdgeIds);
    const batchSourceEdgeId = getOptionalString(value.batchSourceEdgeId);

    return {
      ...(appliedShotNodeIds.length > 0 ? { appliedShotNodeIds } : {}),
      ...(childEdgeIds.length > 0 ? { childEdgeIds } : {}),
      ...(batchSourceEdgeId ? { batchSourceEdgeId } : {}),
    };
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
