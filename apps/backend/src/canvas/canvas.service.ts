import { randomUUID } from "node:crypto";

import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import type {
  AssetListItem,
  AssetPreviewKind,
  AssetPurpose,
  AssetType,
  CanvasFragmentManifest,
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
  ImportStoryboardToCanvasInput,
  ImportStoryboardToCanvasResult,
  ExportCanvasFragmentInput,
  ExportCanvasFragmentResult,
  GenerationJobRecord,
  GenerationJobStatus,
  GenerationOperation,
  ImportCanvasFragmentInput,
  ImportCanvasFragmentResult,
  NodeStatus,
  ProductionWorkspaceAgentContext,
  ProductionWorkspaceAssetSummary,
  ProductionWorkspaceProjection,
  ProductionWorkspaceScriptPlan,
  ProductionWorkspaceStoryboardItem,
  SaveCanvasSnapshotInput,
  SaveCanvasSnapshotResult,
  ScriptAdaptationStrategy,
  ScriptDraftWorkspace,
  StoryboardImportDataJson,
  StoryboardImportDuplicatePolicy,
  StoryboardImportPlannedNode,
  StoryboardImportSummary,
  UpdateCanvasNodeGeometryInput,
  UpdateCanvasNodeGeometryResult,
  UpdateCanvasNodeInput,
  UpdateCanvasNodeResult,
  UpdateProductionWorkspaceItemInput,
  UpdateProductionWorkspaceItemResult,
} from "@guga-flow/shared-types";
import {
  CANVAS_FRAGMENT_FORMAT,
  CANVAS_FRAGMENT_SCHEMA_VERSION,
  CANVAS_EDGE_RELATIONS,
  GENERATION_JOB_STATUSES,
  NODE_STATUSES,
  PHASE_3_CANVAS_NODE_TYPES,
  PRODUCTION_WORKSPACE_ITEM_TYPES,
  STORYBOARD_IMPORT_DUPLICATE_POLICIES,
  buildStoryboardImportPlan,
  storyboardImportAssetKey,
  storyboardImportProvenance,
  validateCanvasInputConnection,
  validateStoryboardResult,
} from "@guga-flow/shared-types";

import type {
  CanvasEdgeRelation as PrismaCanvasEdgeRelation,
  CanvasNodeType as PrismaCanvasNodeType,
} from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { LocalStorageService } from "../storage/local-storage.service";

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

type StoryboardDraftModel = {
  id: string;
  projectId: string;
  novelDocumentId: string;
  status: string;
  storyboardJson: unknown | null;
  readyForImport: boolean;
};

type CanvasPrismaClient = Pick<PrismaService, "canvasEdge" | "canvasNode">;
type CanvasEdgeDataJson = { [key: string]: CanvasSnapshotJson };
type CanvasEdgeWriteInput = Omit<CreateCanvasEdgeInput<CanvasEdgeDataJson>, "affectedShotNodeIds">;

function prismaCanvasNodeType(type: CanvasNodeType): PrismaCanvasNodeType {
  return type as PrismaCanvasNodeType;
}

function prismaCanvasEdgeRelation(relation: CanvasEdgeRelation): PrismaCanvasEdgeRelation {
  return relation as PrismaCanvasEdgeRelation;
}

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

type GenerationJobModel = {
  id: string;
  projectId: string;
  operation: string;
  status: string;
  provider: string;
  model: string | null;
  sourceNodeId: string | null;
  targetNodeId: string | null;
  providerTaskId: string | null;
  inputJson: unknown;
  outputJson: unknown | null;
  errorMessage: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ScriptDraftModel = {
  id: string;
  projectId: string;
  novelDocumentId: string;
  version: number;
  title: string;
  strategy: string;
  status: string;
  scriptJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
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

function isSourceMediaNodeType(value: string): boolean {
  return value === "source_text" || value === "source_image" || value === "source_video" || value === "source_audio";
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

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? uniqueStrings(value.filter((item): item is string => typeof item === "string" && item.trim().length > 0))
    : [];
}

function optionalText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalPositiveNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

function objectData(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function hasExistingLifecycleStages(value: CanvasSnapshotJson | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

function getOptionalString(value: CanvasSnapshotJson | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
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

function rewriteFragmentJson(
  value: unknown,
  nodeIdMap: Map<string, string>,
  edgeIdMap: Map<string, string>,
  assetIdMap: Map<string, string>,
): CanvasSnapshotJson {
  if (typeof value === "string") {
    return nodeIdMap.get(value) ?? edgeIdMap.get(value) ?? assetIdMap.get(value) ?? value;
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteFragmentJson(item, nodeIdMap, edgeIdMap, assetIdMap));
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        rewriteFragmentJson(item, nodeIdMap, edgeIdMap, assetIdMap),
      ]),
    );
  }
  return null;
}

function createStoredZip(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(normalizeZipPath(entry.name), "utf8");
    const crc = crc32(entry.data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(entry.data.byteLength, 18);
    localHeader.writeUInt32LE(entry.data.byteLength, 22);
    localHeader.writeUInt16LE(name.byteLength, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, name, entry.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(entry.data.byteLength, 20);
    centralHeader.writeUInt32LE(entry.data.byteLength, 24);
    centralHeader.writeUInt16LE(name.byteLength, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);
    offset += localHeader.byteLength + name.byteLength + entry.data.byteLength;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.byteLength, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function normalizeZipPath(value: string): string {
  const normalized = value
    .replace(/^\/+/g, "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  return normalized || "entry";
}

function isStoryboardImportDuplicatePolicy(
  value: unknown,
): value is StoryboardImportDuplicatePolicy {
  return (
    typeof value === "string" &&
    STORYBOARD_IMPORT_DUPLICATE_POLICIES.includes(value as StoryboardImportDuplicatePolicy)
  );
}

@Injectable()
export class CanvasService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional() @Inject(LocalStorageService) private readonly storage?: LocalStorageService,
  ) {}

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
        type: prismaCanvasNodeType(input.type),
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

  async getProductionWorkspace(projectId: string): Promise<ProductionWorkspaceProjection> {
    const canvas = await this.getCanvas(projectId);
    const [jobs, scriptDraft] = await Promise.all([
      this.prisma.generationJob.findMany({
        where: { projectId },
        orderBy: { updatedAt: "desc" },
        take: 50,
      }),
      this.prisma.scriptDraft.findFirst({
        where: { projectId },
        orderBy: [{ updatedAt: "desc" }, { version: "desc" }],
      }),
    ]);

    return this.buildProductionWorkspaceProjection({
      projectId,
      nodes: canvas.nodes,
      edges: canvas.edges,
      jobs: jobs.map((job) => this.toGenerationJobRecord(job as GenerationJobModel)),
      scriptDraft: scriptDraft as ScriptDraftModel | null,
    });
  }

  async updateProductionWorkspaceItem(
    projectId: string,
    itemId: string,
    input: UpdateProductionWorkspaceItemInput,
  ): Promise<UpdateProductionWorkspaceItemResult> {
    if (!PRODUCTION_WORKSPACE_ITEM_TYPES.includes(input.itemType)) {
      throw new BadRequestException("Production workspace item type is invalid");
    }

    const existing = await this.findProjectNode(projectId, itemId);
    if (existing.type !== "shot") {
      throw new BadRequestException("Production workspace storyboard items must target Shot nodes");
    }

    const dataJson = this.toNodeDataObject(existing.dataJson);
    if (input.summary !== undefined) {
      dataJson.visualDescription = this.normalizeProductionText(input.summary, "Summary");
    }
    if (input.imagePrompt !== undefined) {
      dataJson.imagePrompt = this.normalizeProductionText(input.imagePrompt, "Image prompt");
    }
    if (input.videoPrompt !== undefined) {
      dataJson.videoPrompt = this.normalizeProductionText(input.videoPrompt, "Video prompt");
    }
    if (input.durationSeconds !== undefined) {
      if (!Number.isFinite(input.durationSeconds) || input.durationSeconds <= 0) {
        throw new BadRequestException("Duration must be a positive number");
      }
      dataJson.durationSeconds = input.durationSeconds;
    }

    const node = await this.prisma.canvasNode.update({
      where: { id: existing.id },
      data: {
        ...(input.title !== undefined ? { title: this.normalizeTitle(input.title) } : {}),
        dataJson,
      },
    });

    return {
      updatedNode: this.toCanvasNodeRecord(node),
      workspace: await this.getProductionWorkspace(projectId),
    };
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
    const requestedDataJson = this.normalizeEdgeDataJson(input.dataJson);
    const existingTargetEdges = this.shouldValidateInputSlotEdge(sourceNode, targetNode, input.relation)
      ? await this.prisma.canvasEdge.findMany({
          where: {
            projectId,
            canvasDocumentId: targetNode.canvasDocumentId,
            targetNodeId: targetNode.id,
            relation: "derived_from",
          },
        })
      : [];
    const dataJson = this.resolveInputSlotEdgeData({
      sourceNode,
      targetNode,
      relation: input.relation,
      dataJson: requestedDataJson,
      existingEdges: existingTargetEdges,
    });

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
      const updatedNodes: CanvasNodeModel[] = [];
      if (input.relation === "references_character") {
        updatedNodes.push(await this.applyCharacterToShot(tx, targetNode, sourceNode.id));
      } else if (input.relation === "references_location") {
        updatedNodes.push(await this.applyLocationToShot(tx, targetNode, sourceNode.id));
      }

      return {
        edge: this.toCanvasEdgeRecord(edge),
        edges: [this.toCanvasEdgeRecord(edge)],
        updatedNodes: updatedNodes.map((node) => this.toCanvasNodeRecord(node)),
      };
    });
  }

  async importStoryboard(
    projectId: string,
    input: ImportStoryboardToCanvasInput,
  ): Promise<ImportStoryboardToCanvasResult> {
    const duplicatePolicy = input.duplicatePolicy ?? "new_version";
    if (!isStoryboardImportDuplicatePolicy(duplicatePolicy)) {
      throw new BadRequestException("Storyboard import duplicate policy is invalid");
    }

    const canvasDocument = await this.getOrCreateCanvasDocument(projectId);
    const draft = await this.findReadyStoryboardDraft(
      projectId,
      input.novelDocumentId,
      input.storyboardDraftId,
    );
    const validation = validateStoryboardResult(draft.storyboardJson);
    if (!validation.success) {
      throw new BadRequestException("Storyboard draft is invalid");
    }

    const existingNodes = await this.prisma.canvasNode.findMany({
      where: { projectId, canvasDocumentId: canvasDocument.id },
      orderBy: [{ zIndex: "asc" }, { createdAt: "asc" }],
    });
    const existingNodeById = new Map(existingNodes.map((node) => [node.id, node]));
    const seedReferences = validation.data.storySeedReferences ?? [];
    const seedReferencesByImageNode = Array.from(
      new Map(
        seedReferences.flatMap((reference) =>
          reference.imageNodeId ? [[reference.imageNodeId, reference] as const] : [],
        ),
      ).values(),
    );
    const seedImageNodeIds = uniqueStrings(
      seedReferencesByImageNode.flatMap((reference) =>
        reference.imageNodeId ? [reference.imageNodeId] : [],
      ),
    );
    const missingSeedImageNodeIds = seedImageNodeIds.filter(
      (nodeId) => existingNodeById.get(nodeId)?.type !== "image",
    );
    if (missingSeedImageNodeIds.length > 0) {
      throw new BadRequestException("Storyboard seed ImageNodes must still exist on this canvas");
    }
    const existingImportVersions = existingNodes.flatMap((node) => {
      const provenance = storyboardImportProvenance(node.dataJson);
      return provenance ? [provenance.version] : [];
    });
    const version =
      existingImportVersions.length > 0 ? Math.max(...existingImportVersions) + 1 : 1;
    const importBatchId = `storyboard-import-${draft.id}-v${version}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const importedAt = new Date().toISOString();
    const plan = buildStoryboardImportPlan({
      storyboard: validation.data,
      draftId: draft.id,
      novelDocumentId: draft.novelDocumentId,
      importBatchId,
      importedAt,
      version,
      duplicatePolicy,
    });

    const maxZIndex = existingNodes.reduce(
      (max, node) => Math.max(max, Number.isFinite(node.zIndex) ? node.zIndex : 0),
      0,
    );
    const existingAssetNodes = existingNodes.filter(
      (node) => node.type === "character_asset" || node.type === "location_asset",
    );

    return this.runTransaction(async (tx) => {
      const nodeByPlanKey = new Map<string, CanvasNodeModel>();
      const resultNodes: CanvasNodeModel[] = [];
      const resultNodeIds = new Set<string>();
      let createdNodeCount = 0;
      const reusedNodeIds = new Set<string>();

      for (const plannedNode of plan.nodes) {
        const reusableAssetNode = this.findReusableAssetNode(plannedNode, existingAssetNodes);
        if (reusableAssetNode) {
          const mergedAssetNode = await this.mergeReusableAssetNode(tx, reusableAssetNode, plannedNode);
          nodeByPlanKey.set(plannedNode.key, mergedAssetNode);
          if (!resultNodeIds.has(mergedAssetNode.id)) {
            resultNodes.push(mergedAssetNode);
            resultNodeIds.add(mergedAssetNode.id);
          }
          reusedNodeIds.add(reusableAssetNode.id);
          continue;
        }

        const node = await tx.canvasNode.create({
          data: {
            projectId,
            canvasDocumentId: canvasDocument.id,
            tldrawShapeId: this.importShapeId(importBatchId, plannedNode.key),
            type: prismaCanvasNodeType(plannedNode.type),
            title: this.normalizeTitle(plannedNode.title),
            x: plannedNode.x,
            y: plannedNode.y,
            width: plannedNode.width,
            height: plannedNode.height,
            zIndex: maxZIndex + plannedNode.zIndex + 1,
            status: "draft",
            dataJson: this.normalizeNodeDataJson(plannedNode.dataJson),
          },
        });
        nodeByPlanKey.set(plannedNode.key, node);
        resultNodes.push(node);
        resultNodeIds.add(node.id);
        createdNodeCount += 1;
      }

      const resultEdges: CanvasEdgeModel[] = [];
      const updatedNodeById = new Map<string, CanvasNodeModel>();

      for (const [edgeIndex, plannedEdge] of plan.edges.entries()) {
        const sourceNode = nodeByPlanKey.get(plannedEdge.sourceKey);
        const targetNode = nodeByPlanKey.get(plannedEdge.targetKey);
        if (!sourceNode || !targetNode) {
          throw new BadRequestException("Storyboard import edge references a missing node");
        }

        this.validateSemanticEdge(sourceNode, targetNode, plannedEdge.relation);
        const dataJson = this.resolveInputSlotEdgeData({
          sourceNode,
          targetNode,
          relation: plannedEdge.relation,
          dataJson: this.normalizeEdgeDataJson(plannedEdge.dataJson),
          existingEdges: resultEdges,
        });
        const edge = await this.findOrCreateCanvasEdge(tx, projectId, canvasDocument.id, {
          sourceNodeId: sourceNode.id,
          targetNodeId: targetNode.id,
          relation: plannedEdge.relation,
          sourceShapeId: sourceNode.tldrawShapeId,
          targetShapeId: targetNode.tldrawShapeId,
          visualArrowShapeId: this.importShapeId(importBatchId, `edge-${edgeIndex}`),
          dataJson,
        });
        resultEdges.push(edge);

        if (plannedEdge.relation === "references_character" && targetNode.type === "shot") {
          updatedNodeById.set(
            targetNode.id,
            await this.applyCharacterToShot(tx, updatedNodeById.get(targetNode.id) ?? targetNode, sourceNode.id),
          );
        } else if (plannedEdge.relation === "references_location" && targetNode.type === "shot") {
          updatedNodeById.set(
            targetNode.id,
            await this.applyLocationToShot(tx, updatedNodeById.get(targetNode.id) ?? targetNode, sourceNode.id),
          );
        }
      }

      const novelNode = nodeByPlanKey.get("novel");
      if (novelNode) {
        for (const [seedIndex, seedReference] of seedReferencesByImageNode.entries()) {
          if (!seedReference.imageNodeId) {
            continue;
          }
          const seedNode = existingNodeById.get(seedReference.imageNodeId);
          if (!seedNode) {
            throw new BadRequestException("Storyboard seed ImageNodes must still exist on this canvas");
          }
          const edge = await this.findOrCreateCanvasEdge(tx, projectId, canvasDocument.id, {
            sourceNodeId: seedNode.id,
            targetNodeId: novelNode.id,
            relation: "story_seed",
            sourceShapeId: seedNode.tldrawShapeId,
            targetShapeId: novelNode.tldrawShapeId,
            visualArrowShapeId: this.importShapeId(importBatchId, `story-seed-edge-${seedIndex}`),
            dataJson: {
              storySeed: {
                ...(seedReference.assetId ? { assetId: seedReference.assetId } : {}),
                imageNodeId: seedReference.imageNodeId,
                ...(seedReference.label ? { label: seedReference.label } : {}),
                ...(seedReference.prompt ? { prompt: seedReference.prompt } : {}),
              },
              storyboardImport: {
                batchId: importBatchId,
                draftId: draft.id,
                novelDocumentId: draft.novelDocumentId,
                entityKind: "edge",
                version,
                importedAt,
              },
            },
          });
          resultEdges.push(edge);
        }
      }

      const mergedNodes = resultNodes.map((node) => updatedNodeById.get(node.id) ?? node);
      const summary: StoryboardImportSummary = {
        ...plan.summary,
        createdNodeCount,
        reusedNodeCount: reusedNodeIds.size,
        createdEdgeCount: resultEdges.length,
      };

      return {
        importBatchId,
        summary,
        nodes: mergedNodes.map((node) => this.toCanvasNodeRecord(node)),
        edges: resultEdges.map((edge) => this.toCanvasEdgeRecord(edge)),
      };
    });
  }

  async exportFragment(
    projectId: string,
    input: ExportCanvasFragmentInput,
  ): Promise<ExportCanvasFragmentResult> {
    if (!this.storage) {
      throw new BadRequestException("Canvas fragment storage is not configured");
    }
    const nodeIds = uniqueStrings(input.nodeIds ?? []);
    if (!nodeIds.length) {
      throw new BadRequestException("Canvas fragment export requires nodeIds");
    }
    const canvas = await this.getCanvas(projectId);
    const selectedNodes = canvas.nodes.filter((node) => nodeIds.includes(node.id));
    if (selectedNodes.length !== nodeIds.length) {
      throw new BadRequestException("Canvas fragment contains nodes outside this project");
    }
    const selectedNodeIds = new Set(selectedNodes.map((node) => node.id));
    const selectedEdges = canvas.edges.filter(
      (edge) => selectedNodeIds.has(edge.sourceNodeId) && selectedNodeIds.has(edge.targetNodeId),
    );
    const referencedAssets = canvas.assets.filter((asset) =>
      [...selectedNodes, ...selectedEdges].some((item) => jsonContainsString(item, asset.id)),
    );
    const manifest: CanvasFragmentManifest = {
      format: CANVAS_FRAGMENT_FORMAT,
      schemaVersion: CANVAS_FRAGMENT_SCHEMA_VERSION,
      sourceProjectId: projectId,
      exportedAt: new Date().toISOString(),
      nodes: selectedNodes,
      edges: selectedEdges,
      assets: referencedAssets,
    };
    const zip = createStoredZip([
      { name: "manifest.json", data: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8") },
    ]);
    const storageKey = `${projectId}/canvas-fragments/${Date.now()}-${randomUUID()}.zip`;
    const stored = await this.storage.writeObject({ storageKey, buffer: zip });
    const packageAsset = await this.prisma.asset.create({
      data: {
        projectId,
        type: "package",
        purpose: "canvas_fragment",
        storageKey: stored.storageKey,
        mimeType: "application/zip",
        originalFilename: "canvas-fragment.zip",
        sizeBytes: stored.sizeBytes,
        metadataJson: {
          previewKind: "metadata",
          format: CANVAS_FRAGMENT_FORMAT,
          schemaVersion: CANVAS_FRAGMENT_SCHEMA_VERSION,
          nodeCount: selectedNodes.length,
          edgeCount: selectedEdges.length,
          assetCount: referencedAssets.length,
        },
      },
    });

    return {
      manifest,
      packageAssetId: packageAsset.id,
      storageKey: stored.storageKey,
    };
  }

  async importFragment(
    projectId: string,
    input: ImportCanvasFragmentInput,
  ): Promise<ImportCanvasFragmentResult> {
    await this.ensureProjectExists(projectId);
    try {
      await this.validateFragmentManifest(projectId, input.manifest);
    } catch (error) {
      const record = await this.prisma.canvasFragmentImport.create({
        data: {
          projectId,
          schemaVersion: typeof input.manifest?.schemaVersion === "number" ? input.manifest.schemaVersion : 0,
          status: "failed",
          summaryJson: { nodeCount: input.manifest?.nodes?.length ?? 0 },
          errorMessage: error instanceof Error ? error.message : "Canvas fragment import failed",
        },
      });
      throw new BadRequestException(record.errorMessage ?? "Canvas fragment import failed");
    }

    const canvasDocument = await this.getOrCreateCanvasDocument(projectId);
    const importedAt = new Date().toISOString();
    const nodeIdMap = new Map(input.manifest.nodes.map((node) => [node.id, `fragment-node-${randomUUID()}`]));
    const edgeIdMap = new Map(input.manifest.edges.map((edge) => [edge.id, `fragment-edge-${randomUUID()}`]));
    const assetIdMap = new Map(input.manifest.assets.map((asset) => [asset.id, asset.id]));

    const result = await this.prisma.$transaction(async (tx) => {
      const nodes: CanvasNodeModel[] = [];
      for (const node of input.manifest.nodes) {
        const nextId = nodeIdMap.get(node.id);
        if (!nextId) {
          throw new BadRequestException("Canvas fragment node rewrite failed");
        }
        nodes.push(await tx.canvasNode.create({
          data: {
            id: nextId,
            projectId,
            canvasDocumentId: canvasDocument.id,
            tldrawShapeId: `shape:fragment-${nextId}`,
            type: prismaCanvasNodeType(node.type),
            title: this.normalizeTitle(node.title),
            x: node.x + 80,
            y: node.y + 80,
            width: node.width,
            height: node.height,
            zIndex: node.zIndex + 1,
            status: "draft",
            dataJson: this.normalizeNodeDataJson(
              rewriteFragmentJson(node.dataJson, nodeIdMap, edgeIdMap, assetIdMap),
            ),
          },
        }));
      }
      const edges: CanvasEdgeModel[] = [];
      for (const edge of input.manifest.edges) {
        const nextId = edgeIdMap.get(edge.id);
        const sourceNodeId = nodeIdMap.get(edge.sourceNodeId);
        const targetNodeId = nodeIdMap.get(edge.targetNodeId);
        if (!nextId || !sourceNodeId || !targetNodeId) {
          throw new BadRequestException("Canvas fragment edge rewrite failed");
        }
        const sourceNode = nodes.find((node) => node.id === sourceNodeId);
        const targetNode = nodes.find((node) => node.id === targetNodeId);
        if (!sourceNode || !targetNode) {
          throw new BadRequestException("Canvas fragment edge references a missing node");
        }
        this.validateSemanticEdge(sourceNode, targetNode, edge.relation);
        const dataJson = this.resolveInputSlotEdgeData({
          sourceNode,
          targetNode,
          relation: edge.relation,
          dataJson: this.normalizeEdgeDataJson(
            rewriteFragmentJson(edge.dataJson ?? {}, nodeIdMap, edgeIdMap, assetIdMap),
          ),
          existingEdges: edges,
        });
        edges.push(await tx.canvasEdge.create({
          data: {
            id: nextId,
            projectId,
            canvasDocumentId: canvasDocument.id,
            sourceNodeId,
            targetNodeId,
            sourceShapeId: sourceNode.tldrawShapeId,
            targetShapeId: targetNode.tldrawShapeId,
            visualArrowShapeId: `shape:fragment-arrow-${nextId}`,
            relation: prismaCanvasEdgeRelation(edge.relation),
            dataJson,
          },
        }));
      }
      const record = await tx.canvasFragmentImport.create({
        data: {
          projectId,
          schemaVersion: input.manifest.schemaVersion,
          status: "succeeded",
          summaryJson: {
            sourceProjectId: input.manifest.sourceProjectId,
            nodeCount: nodes.length,
            edgeCount: edges.length,
            assetCount: input.manifest.assets.length,
            importedAt,
          },
        },
      });
      return { record, nodes, edges };
    });

    return {
      import: {
        id: result.record.id,
        projectId: result.record.projectId,
        schemaVersion: result.record.schemaVersion,
        status: "succeeded",
        summaryJson: result.record.summaryJson as CanvasSnapshotJson,
        createdAt: toIsoString(result.record.createdAt),
      },
      nodes: result.nodes.map((node) => this.toCanvasNodeRecord(node)),
      edges: result.edges.map((edge) => this.toCanvasEdgeRecord(edge)),
    };
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

  private async validateFragmentManifest(
    projectId: string,
    manifest: CanvasFragmentManifest,
  ): Promise<void> {
    if (!manifest || manifest.format !== CANVAS_FRAGMENT_FORMAT) {
      throw new BadRequestException("Canvas fragment format is not supported");
    }
    if (manifest.schemaVersion !== CANVAS_FRAGMENT_SCHEMA_VERSION) {
      throw new BadRequestException("Canvas fragment schemaVersion is not supported");
    }
    if (!Array.isArray(manifest.nodes) || manifest.nodes.length === 0) {
      throw new BadRequestException("Canvas fragment requires nodes");
    }
    if (!Array.isArray(manifest.edges) || !Array.isArray(manifest.assets)) {
      throw new BadRequestException("Canvas fragment manifest is invalid");
    }
    const nodeIds = new Set(manifest.nodes.map((node) => node.id));
    for (const node of manifest.nodes) {
      if (!isPhase3CanvasNodeType(node.type)) {
        throw new BadRequestException("Canvas fragment contains an unsupported node type");
      }
      if (!isCanvasNodeDataJson(node.dataJson)) {
        throw new BadRequestException("Canvas fragment node data is invalid");
      }
    }
    for (const edge of manifest.edges) {
      if (!nodeIds.has(edge.sourceNodeId) || !nodeIds.has(edge.targetNodeId)) {
        throw new BadRequestException("Canvas fragment edge references a missing node");
      }
      if (!CANVAS_EDGE_RELATIONS.includes(edge.relation)) {
        throw new BadRequestException("Canvas fragment edge relation is invalid");
      }
    }
    const assetIds = manifest.assets.map((asset) => asset.id);
    if (assetIds.length) {
      const existingAssets = await this.prisma.asset.findMany({
        where: { projectId, id: { in: assetIds } },
        select: { id: true },
      });
      if (existingAssets.length !== assetIds.length) {
        throw new BadRequestException("Canvas fragment resources are missing from this project");
      }
    }
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
    if (relation === "derived_from") {
      if (sourceNode.id === targetNode.id) {
        throw new BadRequestException("Variant edges cannot reference the same node");
      }
      if (sourceNode.type !== targetNode.type && !isSourceMediaNodeType(sourceNode.type)) {
        throw new BadRequestException("Variant edges must connect nodes of the same type");
      }
      return;
    }

    if (relation === "story_seed") {
      if (sourceNode.type !== "image" || targetNode.type !== "novel") {
        throw new BadRequestException("Story seed edges must connect an Image node to a Novel node");
      }
      return;
    }

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

    if (relation === "belongs_to_scene") {
      const validSceneMembership =
        (sourceNode.type === "shot" && targetNode.type === "scene") ||
        (sourceNode.type === "scene" && targetNode.type === "scene_frame") ||
        (sourceNode.type === "shot" && targetNode.type === "scene_frame");
      if (!validSceneMembership) {
        throw new BadRequestException(
          "Scene membership edges must connect shots or scenes to their scene container",
        );
      }
      return;
    }

    if (relation === "generated_image") {
      if (sourceNode.type !== "shot" || targetNode.type !== "image") {
        throw new BadRequestException("Generated image edges must connect a shot to an image");
      }
      return;
    }

    if (relation === "generated_video") {
      if (sourceNode.type !== "image" || targetNode.type !== "video") {
        throw new BadRequestException("Generated video edges must connect an image to a video");
      }
      return;
    }

    if (relation === "generated_audio") {
      if (sourceNode.type !== "ai_audio" || targetNode.type !== "ai_audio") {
        throw new BadRequestException("Generated audio edges must resolve on an AI Audio node");
      }
      return;
    }

    throw new BadRequestException("Canvas edge relation is not supported for semantic binding yet");
  }

  private shouldValidateInputSlotEdge(
    sourceNode: CanvasNodeModel,
    targetNode: CanvasNodeModel,
    relation: CanvasEdgeRelation,
  ): boolean {
    return (
      relation === "derived_from" &&
      sourceNode.type !== targetNode.type &&
      (isSourceMediaNodeType(sourceNode.type) || targetNode.type === "ai_audio")
    );
  }

  private resolveInputSlotEdgeData(input: {
    sourceNode: CanvasNodeModel;
    targetNode: CanvasNodeModel;
    relation: CanvasEdgeRelation;
    dataJson: CanvasEdgeDataJson | undefined;
    existingEdges: readonly CanvasEdgeModel[];
  }): CanvasEdgeDataJson | undefined {
    if (!this.shouldValidateInputSlotEdge(input.sourceNode, input.targetNode, input.relation)) {
      return input.dataJson;
    }

    const preferredSlotId =
      typeof input.dataJson?.slotId === "string" ? input.dataJson.slotId : undefined;
    const validation = validateCanvasInputConnection({
      sourceNode: this.toCanvasNodeRecord(input.sourceNode),
      targetNode: this.toCanvasNodeRecord(input.targetNode),
      existingEdges: input.existingEdges.map((edge) => this.toCanvasEdgeRecord(edge)),
      preferredSlotId,
    });

    if (!validation.ok) {
      throw new BadRequestException(validation.error.message);
    }

    return {
      ...(input.dataJson ?? {}),
      slotId: validation.edgeData.slotId,
      inputKind: validation.edgeData.inputKind,
      inputRole: validation.edgeData.inputRole,
      order: validation.edgeData.order,
    };
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
        relation: prismaCanvasEdgeRelation(input.relation),
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
        relation: prismaCanvasEdgeRelation(input.relation),
        ...(input.dataJson !== undefined ? { dataJson: input.dataJson } : {}),
      },
    });
  }

  private async findReadyStoryboardDraft(
    projectId: string,
    novelDocumentId: string,
    storyboardDraftId: string,
  ): Promise<StoryboardDraftModel> {
    await this.ensureProjectExists(projectId);

    const draft = await this.prisma.storyboardDraft.findFirst({
      where: {
        id: storyboardDraftId,
        projectId,
        novelDocumentId,
      },
    });
    if (!draft) {
      throw new NotFoundException("Storyboard draft not found");
    }
    if (draft.status !== "ready" || !draft.readyForImport) {
      throw new BadRequestException("Storyboard draft is not ready for import");
    }

    return draft;
  }

  private findReusableAssetNode(
    plannedNode: StoryboardImportPlannedNode,
    existingAssetNodes: CanvasNodeModel[],
  ): CanvasNodeModel | undefined {
    if (plannedNode.type !== "character_asset" && plannedNode.type !== "location_asset") {
      return undefined;
    }

    const plannedType = plannedNode.type;
    const plannedAssetKey = this.assetKeyForNode(plannedType, plannedNode.dataJson);
    if (!plannedAssetKey) {
      return undefined;
    }

    return existingAssetNodes.find(
      (node) =>
        node.type === plannedType &&
        this.assetKeyForNode(plannedType, this.toNodeDataObject(node.dataJson)) === plannedAssetKey,
    );
  }

  private async mergeReusableAssetNode(
    tx: CanvasPrismaClient,
    existingNode: CanvasNodeModel,
    plannedNode: StoryboardImportPlannedNode,
  ): Promise<CanvasNodeModel> {
    if (plannedNode.type !== "character_asset" && plannedNode.type !== "location_asset") {
      return existingNode;
    }

    const existingData = this.toNodeDataObject(existingNode.dataJson);
    const plannedData = this.toNodeDataObject(plannedNode.dataJson);
    const mergedData = {
      ...plannedData,
      ...existingData,
    };

    if (plannedData.storyboardImport) {
      mergedData.storyboardImport = plannedData.storyboardImport;
    }
    if (plannedData.lifecycleStages && !hasExistingLifecycleStages(existingData.lifecycleStages)) {
      mergedData.lifecycleStages = plannedData.lifecycleStages;
    }

    return tx.canvasNode.update({
      where: { id: existingNode.id },
      data: { dataJson: mergedData },
    });
  }

  private assetKeyForNode(
    type: Extract<CanvasNodeType, "character_asset" | "location_asset">,
    dataJson: { [key: string]: CanvasSnapshotJson },
  ): string | undefined {
    const explicitKey = getOptionalString(dataJson.assetKey);
    if (explicitKey) {
      return explicitKey;
    }

    const name = getOptionalString(dataJson.name);
    if (!name) {
      return undefined;
    }

    return type === "character_asset"
      ? storyboardImportAssetKey(type, {
          name,
          role: getOptionalString(dataJson.role),
        })
      : storyboardImportAssetKey(type, {
          name,
          locationType: getOptionalString(dataJson.locationType),
        });
  }

  private importShapeId(importBatchId: string, key: string): string {
    return `shape:${[importBatchId, key]
      .join("-")
      .replace(/[^a-zA-Z0-9:_-]+/g, "-")
      .slice(0, 150)}`;
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

  private buildProductionWorkspaceProjection(input: {
    projectId: string;
    nodes: CanvasNodeRecord[];
    edges: CanvasEdgeRecord[];
    jobs: Array<GenerationJobRecord>;
    scriptDraft: ScriptDraftModel | null;
  }): ProductionWorkspaceProjection {
    const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
    const scriptPlan = input.scriptDraft ? this.productionScriptPlan(input.scriptDraft) : undefined;
    const storyboardItems = input.nodes
      .filter((node) => node.type === "shot")
      .map((node) => this.productionStoryboardItem(node, input.edges, nodesById, scriptPlan))
      .sort((left, right) => {
        const leftNumber = Number.parseInt(left.shotNumber ?? "", 10);
        const rightNumber = Number.parseInt(right.shotNumber ?? "", 10);
        if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
          return leftNumber - rightNumber;
        }
        return left.updatedAt.localeCompare(right.updatedAt) || left.title.localeCompare(right.title);
      });
    const assets = input.nodes
      .filter((node) =>
        node.type === "character_asset" || node.type === "location_asset" || node.type === "prop_asset",
      )
      .map((node) => this.productionAssetSummary(node));
    const generationQueue = this.productionGenerationQueue(input.jobs);
    const latestUpdatedAt = [
      ...storyboardItems.map((item) => item.updatedAt),
      ...input.jobs.map((job) => job.updatedAt),
      input.scriptDraft ? toIsoString(input.scriptDraft.updatedAt) : undefined,
    ]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);
    const referenceAssetCount = uniqueStrings([
      ...storyboardItems.flatMap((item) => item.referenceAssetIds),
      ...assets.flatMap((asset) => asset.referenceAssetIds),
    ]).length;
    const agentContext = this.productionAgentContext({
      scriptPlan,
      storyboardItems,
      assets,
      generationQueue,
    });

    return {
      projectId: input.projectId,
      ...(scriptPlan ? { scriptPlan } : {}),
      storyboardTable: storyboardItems,
      storyboardItems,
      assets,
      summary: {
        shotCount: storyboardItems.length,
        assetCount: assets.length,
        referenceAssetCount,
        ...(latestUpdatedAt ? { latestUpdatedAt } : {}),
        generationQueue,
      },
      agentContext,
    };
  }

  private productionScriptPlan(scriptDraft: ScriptDraftModel): ProductionWorkspaceScriptPlan {
    const workspace = objectData(scriptDraft.scriptJson);
    const script = objectData(workspace.script);
    const storySkeleton = objectData(workspace.storySkeleton);
    const adaptationStrategy = objectData(workspace.adaptationStrategy);
    const scenes = Array.isArray(script.scenes) ? script.scenes : [];
    const skeletonBeats = Array.isArray(storySkeleton.beats) ? storySkeleton.beats : [];
    const sourceEventIds = uniqueStrings([
      ...stringArray(storySkeleton.sourceEventIds),
      ...skeletonBeats.flatMap((beat) => stringArray(objectData(beat).eventIds)),
    ]);

    return {
      scriptDraftId: scriptDraft.id,
      version: scriptDraft.version,
      title: optionalText(script.title) ?? scriptDraft.title,
      logline: optionalText(script.logline) ?? optionalText(storySkeleton.logline) ?? "",
      strategy: (
        optionalText(adaptationStrategy.strategy) ??
        optionalText(script.strategy) ??
        scriptDraft.strategy
      ) as ScriptAdaptationStrategy,
      sceneCount: scenes.length,
      beatCount: skeletonBeats.length,
      sourceEventIds,
      ...(optionalText(adaptationStrategy.revisionNotes)
        ? { revisionNotes: optionalText(adaptationStrategy.revisionNotes) }
        : {}),
    };
  }

  private productionStoryboardItem(
    node: CanvasNodeRecord,
    edges: readonly CanvasEdgeRecord[],
    nodesById: ReadonlyMap<string, CanvasNodeRecord>,
    scriptPlan: ProductionWorkspaceScriptPlan | undefined,
  ): ProductionWorkspaceStoryboardItem {
    const data = objectData(node.dataJson);
    const sceneEdge = edges.find(
      (edge) => edge.relation === "belongs_to_scene" && edge.sourceNodeId === node.id,
    );
    const sceneNode = sceneEdge ? nodesById.get(sceneEdge.targetNodeId) : undefined;
    const sceneData = objectData(sceneNode?.dataJson);
    const durationSeconds =
      optionalPositiveNumber(data.durationSeconds) ?? optionalPositiveNumber(data.durationSec);

    return {
      itemId: node.id,
      shotNodeId: node.id,
      ...(sceneNode ? { sceneNodeId: sceneNode.id } : {}),
      ...(sceneNode ? { sceneTitle: sceneNode.title ?? optionalText(sceneData.label) ?? "Scene" } : {}),
      ...(optionalText(data.shotNumber) ? { shotNumber: optionalText(data.shotNumber) } : {}),
      title: node.title ?? optionalText(data.shotNumber) ?? "Shot",
      summary: optionalText(data.visualDescription) ?? optionalText(data.action) ?? "",
      ...(optionalText(data.action) ? { action: optionalText(data.action) } : {}),
      ...(durationSeconds ? { durationSeconds } : {}),
      ...(optionalText(data.imagePrompt) ? { imagePrompt: optionalText(data.imagePrompt) } : {}),
      ...(optionalText(data.videoPrompt) ? { videoPrompt: optionalText(data.videoPrompt) } : {}),
      status: node.status,
      storyEventIds: stringArray(data.storyEventIds),
      referenceAssetIds: stringArray(data.referenceAssetIds),
      ...(scriptPlan ? { sourceScriptDraftId: scriptPlan.scriptDraftId } : {}),
      updatedAt: node.updatedAt,
    };
  }

  private productionAssetSummary(node: CanvasNodeRecord): ProductionWorkspaceAssetSummary {
    const data = objectData(node.dataJson);
    const source = objectData(data.scriptAssetSource);
    const variants = Array.isArray(data.assetVariants)
      ? data.assetVariants.filter((variant) => typeof variant === "object" && variant !== null)
      : [];
    const variantAssetIds = variants.flatMap((variant) => {
      const assetId = optionalText(objectData(variant).assetId);
      return assetId ? [assetId] : [];
    });

    return {
      nodeId: node.id,
      nodeType: node.type as ProductionWorkspaceAssetSummary["nodeType"],
      title: node.title ?? optionalText(data.name) ?? "Asset",
      status: node.status,
      referenceAssetIds: uniqueStrings([...stringArray(data.referenceAssetIds), ...variantAssetIds]),
      variantCount: variants.length,
      ...(optionalText(data.selectedVariantId)
        ? { selectedVariantId: optionalText(data.selectedVariantId) }
        : {}),
      ...(optionalText(source.scriptDraftId) ? { sourceScriptDraftId: optionalText(source.scriptDraftId) } : {}),
      ...(optionalText(data.assetKey) ? { assetKey: optionalText(data.assetKey) } : {}),
    };
  }

  private productionAgentContext(input: {
    scriptPlan?: ProductionWorkspaceScriptPlan;
    storyboardItems: ProductionWorkspaceStoryboardItem[];
    assets: ProductionWorkspaceAssetSummary[];
    generationQueue: ProductionWorkspaceProjection["summary"]["generationQueue"];
  }): ProductionWorkspaceAgentContext {
    const sceneCount = new Set(input.storyboardItems.flatMap((item) => item.sceneNodeId ? [item.sceneNodeId] : [])).size;
    const activeJobs = input.generationQueue.queued + input.generationQueue.running + (input.generationQueue.providerWaiting ?? 0);
    const storyboardPreview = input.storyboardItems
      .slice(0, 5)
      .map((item) => `${item.title}: ${item.summary}`)
      .join("\n");

    return {
      scriptPlanSummary: input.scriptPlan
        ? `${input.scriptPlan.title} v${input.scriptPlan.version}: ${input.scriptPlan.sceneCount} scenes, ${input.scriptPlan.beatCount} beats, strategy ${input.scriptPlan.strategy}.`
        : "No ScriptDraft plan is available.",
      storyboardTableSummary: `${input.storyboardItems.length} shots across ${sceneCount} scene containers.`,
      storyboardSummary: storyboardPreview || "No storyboard shots are available.",
      assetSummary: `${input.assets.length} production assets, ${input.assets.reduce((sum, asset) => sum + asset.variantCount, 0)} visual variants.`,
      generationSummary: `${activeJobs} active generation jobs, ${input.generationQueue.failed} failed jobs.`,
    };
  }

  private productionGenerationQueue(
    jobs: readonly GenerationJobRecord[],
  ): ProductionWorkspaceProjection["summary"]["generationQueue"] {
    const counts = Object.fromEntries(
      GENERATION_JOB_STATUSES.map((status) => [status, 0]),
    ) as Record<GenerationJobStatus, number>;
    for (const job of jobs) {
      counts[job.status] += 1;
    }

    return {
      counts,
      queued: counts.queued,
      running: counts.running,
      providerWaiting: counts.provider_waiting,
      succeeded: counts.succeeded,
      failed: counts.failed,
      cancelled: counts.cancelled,
    };
  }

  private normalizeProductionText(value: string, label: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${label} cannot be empty`);
    }
    if (trimmed.length > 2000) {
      throw new BadRequestException(`${label} is too long`);
    }
    return trimmed;
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

  private toGenerationJobRecord(job: GenerationJobModel): GenerationJobRecord {
    return {
      id: job.id,
      projectId: job.projectId,
      operation: job.operation as GenerationOperation,
      status: GENERATION_JOB_STATUSES.includes(job.status as GenerationJobStatus)
        ? (job.status as GenerationJobStatus)
        : "failed",
      provider: job.provider,
      model: job.model ?? undefined,
      sourceNodeId: job.sourceNodeId ?? undefined,
      targetNodeId: job.targetNodeId ?? undefined,
      providerTaskId: job.providerTaskId ?? undefined,
      inputJson: job.inputJson,
      outputJson: job.outputJson ?? undefined,
      errorMessage: job.errorMessage ?? undefined,
      createdAt: toIsoString(job.createdAt),
      updatedAt: toIsoString(job.updatedAt),
    };
  }
}
