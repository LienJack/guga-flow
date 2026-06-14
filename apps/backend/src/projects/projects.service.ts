import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  PROJECT_ASPECT_RATIOS,
  ASSET_PURPOSES,
  ASSET_TYPES,
  CANVAS_EDGE_RELATIONS,
  CANVAS_NODE_TYPES,
  NODE_STATUSES,
  PROJECT_PACKAGE_FORMAT,
  PROJECT_PACKAGE_SCHEMA_VERSION,
  PROJECT_RECOVERY_SNAPSHOT_FORMAT,
  type CreateProjectInput,
  type CanvasEdgeRecord,
  type CanvasNodeRecord,
  type CanvasSnapshotJson,
  type ExportProjectPackageResult,
  type GenerationCreativeSettings,
  type ImportProjectPackageInput,
  type ImportProjectPackageResult,
  type ProjectPackageAssetManifestItem,
  type ProjectPackageCanvasPage,
  type ProjectPackageManifest,
  type ProjectPackageValidationIssue,
  type ProjectPackageValidationResult,
  type ProjectAspectRatio,
  type ProjectDetail,
  type ProjectListItem,
  type ProjectRecoverySnapshotResult,
  type UpdateProjectInput,
  normalizeGenerationCreativeSettings,
} from "@guga-flow/shared-types";

import { AuthService, DEFAULT_ADMIN_USER_ID } from "../auth/auth.service";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { LocalStorageService } from "../storage/local-storage.service";

const DEFAULT_PROJECT_ASPECT_RATIO: ProjectAspectRatio = "9:16";

type ProjectModel = {
  id: string;
  ownerUserId: string;
  title: string;
  description: string | null;
  defaultAspectRatio: string;
  generationSettingsJson: unknown | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    assets?: number;
  };
};

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
  mimeType: string;
  originalFilename: string | null;
  sizeBytes: number | null;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  metadataJson: unknown;
};

type ProjectReferenceModel = {
  id: string;
  kind: string;
  displayName: string;
};

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeText(value: string): string {
  return value.trim();
}

function normalizeDescription(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toProjectAspectRatio(value: string | undefined): ProjectAspectRatio {
  if (PROJECT_ASPECT_RATIOS.includes(value as ProjectAspectRatio)) {
    return value as ProjectAspectRatio;
  }

  return DEFAULT_PROJECT_ASPECT_RATIO;
}

function normalizeProjectGenerationSettings(value: unknown): GenerationCreativeSettings | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = normalizeGenerationCreativeSettings(value);
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function toInputJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function projectGenerationSettingsJson(value: unknown): Prisma.InputJsonValue | undefined {
  const normalized = normalizeProjectGenerationSettings(value);
  return normalized ? toInputJsonValue(normalized) : undefined;
}

function nullableProjectGenerationSettingsJson(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return projectGenerationSettingsJson(value) ?? Prisma.JsonNull;
}

function canvasJson(value: unknown): CanvasSnapshotJson {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return sanitizeCanvasJson(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => canvasJson(item));
  }
  if (typeof value === "object" && value !== null) {
    const result: { [key: string]: CanvasSnapshotJson | undefined } = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        result[key] = canvasJson(entry);
      }
    }
    return result;
  }
  return {};
}

function sanitizeCanvasJson(value: CanvasSnapshotJson): CanvasSnapshotJson {
  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeCanvasJson(item));
  }
  if (typeof value === "object" && value !== null) {
    const result: { [key: string]: CanvasSnapshotJson | undefined } = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        result[key] = sanitizeCanvasJson(entry);
      }
    }
    return result;
  }
  return value;
}

function sanitizeString(value: string): string {
  return value
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "[secret]")
    .replace(/(?:\/Users|\/home|\/var\/folders|\/tmp)\/[^\s"'`]+/g, "[local-path]")
    .replace(/[A-Za-z]:\\[^\s"'`]+/g, "[local-path]");
}

function remapCanvasJsonReferences(
  value: CanvasSnapshotJson,
  maps: { nodeIdMap: Record<string, string>; assetIdMap: Record<string, string> },
): CanvasSnapshotJson {
  if (typeof value === "string") {
    return maps.nodeIdMap[value] ?? maps.assetIdMap[value] ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => remapCanvasJsonReferences(item, maps));
  }
  if (typeof value === "object" && value !== null) {
    const result: { [key: string]: CanvasSnapshotJson | undefined } = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined) {
        result[key] = remapCanvasJsonReferences(entry, maps);
      }
    }
    return result;
  }
  return value;
}

function objectValue(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function pageTitle(snapshotJson: unknown, fallbackIndex: number): string {
  const snapshot = objectValue(snapshotJson);
  const metadata = objectValue(snapshot.gugaFlowCanvasPage);
  return stringValue(metadata.title)?.trim() || (fallbackIndex === 0 ? "Main Canvas" : `Canvas ${fallbackIndex + 1}`);
}

function pageSortOrder(snapshotJson: unknown, fallbackIndex: number): number {
  return numberValue(objectValue(objectValue(snapshotJson).gugaFlowCanvasPage).sortOrder) ?? fallbackIndex;
}

function pageIsDefault(snapshotJson: unknown, fallbackIndex: number): boolean {
  return booleanValue(objectValue(objectValue(snapshotJson).gugaFlowCanvasPage).isDefault) ?? fallbackIndex === 0;
}

function pageSnapshotWithMetadata(
  snapshotJson: CanvasSnapshotJson,
  metadata: { title: string; sortOrder: number; isDefault: boolean },
): CanvasSnapshotJson {
  const snapshot =
    typeof snapshotJson === "object" && snapshotJson !== null && !Array.isArray(snapshotJson)
      ? snapshotJson
      : {};
  return {
    ...snapshot,
    gugaFlowCanvasPage: metadata,
  };
}

function pageSnapshotWithoutMetadata(snapshotJson: unknown): CanvasSnapshotJson {
  const sanitized = canvasJson(snapshotJson);
  if (typeof sanitized !== "object" || sanitized === null || Array.isArray(sanitized)) {
    return sanitized;
  }
  const { gugaFlowCanvasPage: _metadata, ...rest } = sanitized;
  return rest;
}

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LocalStorageService) private readonly storage: LocalStorageService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  async listProjects(): Promise<ProjectListItem[]> {
    const projects = await this.prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { assets: true } } },
    });

    return projects.map((project) => this.toProjectRecord(project));
  }

  async createProject(input: CreateProjectInput): Promise<ProjectDetail> {
    await this.ensureDefaultUser();

    const title = normalizeText(input.title);
    if (!title) {
      throw new BadRequestException("Project title is required");
    }

    const project = await this.prisma.project.create({
      data: {
        ownerUserId: DEFAULT_ADMIN_USER_ID,
        title,
        description: normalizeDescription(input.description),
        defaultAspectRatio: input.defaultAspectRatio ?? DEFAULT_PROJECT_ASPECT_RATIO,
        generationSettingsJson: projectGenerationSettingsJson(input.generationSettings),
      },
      include: { _count: { select: { assets: true } } },
    });

    return this.toProjectRecord(project);
  }

  async getProject(projectId: string): Promise<ProjectDetail> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { _count: { select: { assets: true } } },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return this.toProjectRecord(project);
  }

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectDetail> {
    await this.getProject(projectId);

    const data: {
      title?: string;
      description?: string | null;
      defaultAspectRatio?: ProjectAspectRatio;
      generationSettingsJson?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    } = {};

    if (input.title !== undefined) {
      const title = normalizeText(input.title);
      if (!title) {
        throw new BadRequestException("Project title is required");
      }
      data.title = title;
    }

    const description = normalizeDescription(input.description);
    if (description !== undefined) {
      data.description = description;
    }

    if (input.defaultAspectRatio !== undefined) {
      data.defaultAspectRatio = input.defaultAspectRatio;
    }

    if (input.generationSettings !== undefined) {
      data.generationSettingsJson = nullableProjectGenerationSettingsJson(input.generationSettings);
    }

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data,
      include: { _count: { select: { assets: true } } },
    });

    return this.toProjectRecord(project);
  }

  async duplicateProject(projectId: string): Promise<ProjectDetail> {
    const source = await this.getProject(projectId);
    await this.ensureDefaultUser();

    const duplicate = await this.prisma.project.create({
      data: {
        ownerUserId: DEFAULT_ADMIN_USER_ID,
        title: `${source.title} Copy`,
        description: source.description ?? null,
        defaultAspectRatio: source.defaultAspectRatio,
        generationSettingsJson: projectGenerationSettingsJson(source.generationSettings),
      },
      include: { _count: { select: { assets: true } } },
    });

    return this.toProjectRecord(duplicate);
  }

  async deleteProject(projectId: string): Promise<{ deleted: true }> {
    await this.getProject(projectId);
    const assets = await this.prisma.asset.findMany({
      where: { projectId },
      select: { storageKey: true },
    });

    for (const asset of assets) {
      await this.storage.deleteObject(asset.storageKey);
    }

    await this.prisma.project.delete({ where: { id: projectId } });

    return { deleted: true };
  }

  async exportPackage(projectId: string): Promise<ExportProjectPackageResult> {
    const project = await this.getProject(projectId);
    const [pages, nodes, edges, assets, skillTemplates, workflows] = await Promise.all([
      this.prisma.canvasDocument.findMany({
        where: { projectId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }) as Promise<CanvasDocumentModel[]>,
      this.prisma.canvasNode.findMany({
        where: { projectId },
        orderBy: [{ canvasDocumentId: "asc" }, { zIndex: "asc" }, { createdAt: "asc" }],
      }) as Promise<CanvasNodeModel[]>,
      this.prisma.canvasEdge.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
      }) as Promise<CanvasEdgeModel[]>,
      this.prisma.asset.findMany({
        where: { projectId },
        orderBy: { createdAt: "asc" },
      }) as Promise<AssetModel[]>,
      this.prisma.skillTemplate.findMany({
        where: { projectId },
        select: { id: true, kind: true, displayName: true },
        orderBy: { displayName: "asc" },
      }) as Promise<ProjectReferenceModel[]>,
      this.prisma.workflowDefinition.findMany({
        where: { projectId },
        select: { id: true, kind: true, displayName: true },
        orderBy: { displayName: "asc" },
      }) as Promise<ProjectReferenceModel[]>,
    ]);

    const pageRecords = pages.length
      ? pages
      : [
          {
            id: "default-page",
            projectId,
            snapshotJson: pageSnapshotWithMetadata(
              {},
              { title: "Main Canvas", sortOrder: 0, isDefault: true },
            ),
            createdAt: project.createdAt,
            updatedAt: project.updatedAt,
          },
        ];
    const packageManifest: ProjectPackageManifest = {
      format: PROJECT_PACKAGE_FORMAT,
      schemaVersion: PROJECT_PACKAGE_SCHEMA_VERSION,
      source: "guga-flow",
      sourceProjectId: project.id,
      exportedAt: new Date().toISOString(),
      project: {
        title: project.title,
        description: project.description,
        defaultAspectRatio: project.defaultAspectRatio,
      },
      settings: {
        generationSettings: project.generationSettings
          ? canvasJson(project.generationSettings)
          : undefined,
        skillTemplateReferences: skillTemplates.map((skill) => ({
          id: skill.id,
          kind: skill.kind,
          label: skill.displayName,
        })),
        workflowReferences: workflows.map((workflow) => ({
          id: workflow.id,
          kind: workflow.kind,
          label: workflow.displayName,
        })),
      },
      canvasPages: pageRecords.map((page, index) =>
        this.toProjectPackageCanvasPage(page, index, nodes, edges),
      ),
      assets: assets.map((asset) => this.toProjectPackageAsset(asset)),
    };

    return { package: packageManifest };
  }

  validateImportPackage(input: ImportProjectPackageInput): ProjectPackageValidationResult {
    return validateProjectPackageManifest(input.package);
  }

  async importPackage(input: ImportProjectPackageInput): Promise<ImportProjectPackageResult> {
    const validation = this.validateImportPackage(input);
    if (!validation.valid) {
      throw new BadRequestException("Project package is invalid");
    }
    await this.ensureDefaultUser();
    const manifest = input.package;

    return this.prisma.$transaction(async (tx) => {
      const importedProject = (await tx.project.create({
        data: {
          ownerUserId: DEFAULT_ADMIN_USER_ID,
          title: `${manifest.project.title} Import`,
          description: manifest.project.description ?? null,
          defaultAspectRatio: manifest.project.defaultAspectRatio,
          generationSettingsJson: manifest.settings.generationSettings
            ? toInputJsonValue(manifest.settings.generationSettings)
            : undefined,
        },
        include: { _count: { select: { assets: true } } },
      })) as ProjectModel;

      const assetIdMap: Record<string, string> = {};
      for (const asset of manifest.assets) {
        const created = await tx.asset.create({
          data: {
            projectId: importedProject.id,
            type: asset.type,
            purpose: asset.purpose,
            storageKey: `project-packages/${importedProject.id}/${asset.id}`,
            mimeType: asset.mimeType,
            originalFilename: asset.originalFilename ?? null,
            sizeBytes: asset.sizeBytes ?? null,
            width: asset.width ?? null,
            height: asset.height ?? null,
            durationMs: asset.durationMs ?? null,
            metadataJson: toInputJsonValue({
              ...(objectValue(asset.metadataJson) as Record<string, unknown>),
              importedFromPackage: {
                sourceProjectId: manifest.sourceProjectId,
                sourceAssetId: asset.id,
                binaryIncluded: false,
              },
            }),
          },
        });
        assetIdMap[asset.id] = created.id;
      }

      const canvasPageIdMap: Record<string, string> = {};
      for (const [index, page] of manifest.canvasPages.entries()) {
        const created = await tx.canvasDocument.create({
          data: {
            projectId: importedProject.id,
            snapshotJson: toInputJsonValue(
              pageSnapshotWithMetadata(page.snapshotJson, {
                title: page.title,
                sortOrder: index,
                isDefault: index === 0 || page.isDefault,
              }),
            ),
          },
        });
        canvasPageIdMap[page.sourceCanvasDocumentId] = created.id;
      }

      const nodeIdMap: Record<string, string> = {};
      const createdNodeSourceIds: string[] = [];
      for (const page of manifest.canvasPages) {
        const canvasDocumentId = canvasPageIdMap[page.sourceCanvasDocumentId];
        if (!canvasDocumentId) {
          throw new BadRequestException("Project package page map is invalid");
        }
        for (const node of page.nodes) {
          const created = await tx.canvasNode.create({
            data: {
              projectId: importedProject.id,
              canvasDocumentId,
              tldrawShapeId: node.tldrawShapeId,
              type: node.type,
              title: node.title ?? null,
              x: node.x,
              y: node.y,
              width: node.width,
              height: node.height,
              zIndex: node.zIndex,
              status: node.status,
              dataJson: toInputJsonValue(canvasJson(node.dataJson)),
            },
          });
          nodeIdMap[node.id] = created.id;
          createdNodeSourceIds.push(node.id);
        }
      }

      const edgeIdMap: Record<string, string> = {};
      for (const page of manifest.canvasPages) {
        const canvasDocumentId = canvasPageIdMap[page.sourceCanvasDocumentId];
        if (!canvasDocumentId) {
          throw new BadRequestException("Project package page map is invalid");
        }
        for (const edge of page.edges) {
          const sourceNodeId = nodeIdMap[edge.sourceNodeId];
          const targetNodeId = nodeIdMap[edge.targetNodeId];
          if (!sourceNodeId || !targetNodeId) {
            throw new BadRequestException("Project package edge references a missing node");
          }
          const created = await tx.canvasEdge.create({
            data: {
              projectId: importedProject.id,
              canvasDocumentId,
              sourceNodeId,
              targetNodeId,
              sourceShapeId: edge.sourceShapeId ?? null,
              targetShapeId: edge.targetShapeId ?? null,
              visualArrowShapeId: edge.visualArrowShapeId ?? null,
              relation: edge.relation,
              dataJson: edge.dataJson
                ? toInputJsonValue(
                    remapCanvasJsonReferences(canvasJson(edge.dataJson), { nodeIdMap, assetIdMap }),
                  )
                : undefined,
            },
          });
          edgeIdMap[edge.id] = created.id;
        }
      }

      for (const sourceNodeId of createdNodeSourceIds) {
        const nextNodeId = nodeIdMap[sourceNodeId];
        const sourceNode = manifest.canvasPages
          .flatMap((page) => page.nodes)
          .find((node) => node.id === sourceNodeId);
        if (!nextNodeId || !sourceNode) {
          continue;
        }
        await tx.canvasNode.update({
          where: { id: nextNodeId },
          data: {
            dataJson: toInputJsonValue(
              remapCanvasJsonReferences(canvasJson(sourceNode.dataJson), { nodeIdMap, assetIdMap }),
            ),
          },
        });
      }

      return {
        project: this.toProjectRecord(importedProject),
        sourceProjectId: manifest.sourceProjectId,
        canvasPageIdMap,
        nodeIdMap,
        edgeIdMap,
        assetIdMap,
      };
    });
  }

  async getRecoverySnapshot(projectId: string): Promise<ProjectRecoverySnapshotResult> {
    await this.getProject(projectId);
    const [pages, nodes, edges] = await Promise.all([
      this.prisma.canvasDocument.findMany({
        where: { projectId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      }) as Promise<CanvasDocumentModel[]>,
      this.prisma.canvasNode.findMany({ where: { projectId } }) as Promise<CanvasNodeModel[]>,
      this.prisma.canvasEdge.findMany({ where: { projectId } }) as Promise<CanvasEdgeModel[]>,
    ]);

    return {
      snapshot: {
        format: PROJECT_RECOVERY_SNAPSHOT_FORMAT,
        schemaVersion: PROJECT_PACKAGE_SCHEMA_VERSION,
        projectId,
        capturedAt: new Date().toISOString(),
        reason: "autosave",
        canvasPages: pages.map((page, index) => ({
          canvasDocument: this.toCanvasDocumentRecord(page, index),
          nodeCount: nodes.filter((node) => node.canvasDocumentId === page.id).length,
          edgeCount: edges.filter((edge) => edge.canvasDocumentId === page.id).length,
          snapshotJson: pageSnapshotWithoutMetadata(page.snapshotJson),
        })),
      },
    };
  }

  private async ensureDefaultUser(): Promise<void> {
    await this.authService.ensureDefaultAdmin();
  }

  private toProjectRecord(project: ProjectModel): ProjectDetail {
    return {
      id: project.id,
      ownerUserId: project.ownerUserId,
      title: project.title,
      description: project.description ?? undefined,
      defaultAspectRatio: toProjectAspectRatio(project.defaultAspectRatio),
      generationSettings: normalizeProjectGenerationSettings(project.generationSettingsJson),
      createdAt: toIsoString(project.createdAt),
      updatedAt: toIsoString(project.updatedAt),
      assetCount: project._count?.assets ?? 0,
    };
  }

  private toProjectPackageCanvasPage(
    page: CanvasDocumentModel,
    index: number,
    nodes: CanvasNodeModel[],
    edges: CanvasEdgeModel[],
  ): ProjectPackageCanvasPage {
    const pageNodes = nodes.filter((node) => node.canvasDocumentId === page.id);
    const pageNodeIds = new Set(pageNodes.map((node) => node.id));
    return {
      sourceCanvasDocumentId: page.id,
      title: pageTitle(page.snapshotJson, index),
      sortOrder: pageSortOrder(page.snapshotJson, index),
      isDefault: pageIsDefault(page.snapshotJson, index),
      snapshotJson: pageSnapshotWithoutMetadata(page.snapshotJson),
      nodes: pageNodes.map((node) => this.toCanvasNodeRecord(node)),
      edges: edges
        .filter(
          (edge) =>
            edge.canvasDocumentId === page.id &&
            pageNodeIds.has(edge.sourceNodeId) &&
            pageNodeIds.has(edge.targetNodeId),
        )
        .map((edge) => this.toCanvasEdgeRecord(edge)),
    };
  }

  private toProjectPackageAsset(asset: AssetModel): ProjectPackageAssetManifestItem {
    return {
      id: asset.id,
      type: asset.type as ProjectPackageAssetManifestItem["type"],
      purpose: asset.purpose as ProjectPackageAssetManifestItem["purpose"],
      mimeType: asset.mimeType,
      originalFilename: asset.originalFilename ?? undefined,
      sizeBytes: asset.sizeBytes ?? undefined,
      width: asset.width ?? undefined,
      height: asset.height ?? undefined,
      durationMs: asset.durationMs ?? undefined,
      metadataJson: canvasJson(asset.metadataJson),
    };
  }

  private toCanvasDocumentRecord(
    page: CanvasDocumentModel,
    index: number,
  ): ProjectRecoverySnapshotResult["snapshot"]["canvasPages"][number]["canvasDocument"] {
    return {
      id: page.id,
      projectId: page.projectId,
      title: pageTitle(page.snapshotJson, index),
      sortOrder: pageSortOrder(page.snapshotJson, index),
      isDefault: pageIsDefault(page.snapshotJson, index),
      snapshotJson: pageSnapshotWithoutMetadata(page.snapshotJson),
      createdAt: toIsoString(page.createdAt),
      updatedAt: toIsoString(page.updatedAt),
    };
  }

  private toCanvasNodeRecord(node: CanvasNodeModel): CanvasNodeRecord {
    return {
      id: node.id,
      projectId: node.projectId,
      canvasDocumentId: node.canvasDocumentId,
      tldrawShapeId: node.tldrawShapeId,
      type: node.type as CanvasNodeRecord["type"],
      title: node.title ?? undefined,
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      zIndex: node.zIndex,
      status: node.status as CanvasNodeRecord["status"],
      dataJson: canvasJson(node.dataJson),
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
      relation: edge.relation as CanvasEdgeRecord["relation"],
      dataJson: canvasJson(edge.dataJson),
      createdAt: toIsoString(edge.createdAt),
    };
  }
}

function validateProjectPackageManifest(value: unknown): ProjectPackageValidationResult {
  const manifest = objectValue(value);
  const issues: ProjectPackageValidationIssue[] = [];
  const detectedFormat = stringValue(manifest.format);
  const detectedVersion = numberValue(manifest.schemaVersion);

  if (detectedFormat !== PROJECT_PACKAGE_FORMAT) {
    issues.push({
      path: "format",
      message: "Only guga-flow project packages can be imported.",
    });
  }
  if (detectedVersion !== PROJECT_PACKAGE_SCHEMA_VERSION) {
    issues.push({
      path: "schemaVersion",
      message: "Unsupported project package schema version.",
    });
  }

  const project = objectValue(manifest.project);
  if (!stringValue(project.title)?.trim()) {
    issues.push({ path: "project.title", message: "Project title is required." });
  }
  if (!PROJECT_ASPECT_RATIOS.includes(project.defaultAspectRatio as ProjectAspectRatio)) {
    issues.push({
      path: "project.defaultAspectRatio",
      message: "Project default aspect ratio is invalid.",
    });
  }

  const pages = Array.isArray(manifest.canvasPages)
    ? (manifest.canvasPages as ProjectPackageCanvasPage[])
    : [];
  if (pages.length === 0) {
    issues.push({ path: "canvasPages", message: "Project package must contain at least one canvas page." });
  }

  const nodeIds = new Set<string>();
  const pageIds = new Set<string>();
  let nodeCount = 0;
  let edgeCount = 0;
  for (const [pageIndex, page] of pages.entries()) {
    if (!stringValue(page.sourceCanvasDocumentId)) {
      issues.push({
        path: `canvasPages.${pageIndex}.sourceCanvasDocumentId`,
        message: "Canvas page id is required.",
      });
    } else if (pageIds.has(page.sourceCanvasDocumentId)) {
      issues.push({
        path: `canvasPages.${pageIndex}.sourceCanvasDocumentId`,
        message: "Canvas page ids must be unique.",
      });
    } else {
      pageIds.add(page.sourceCanvasDocumentId);
    }

    const nodes = Array.isArray(page.nodes) ? page.nodes : [];
    const edges = Array.isArray(page.edges) ? page.edges : [];
    const pageNodeIds = new Set<string>();
    for (const [nodeIndex, node] of nodes.entries()) {
      nodeCount += 1;
      if (!stringValue(node.id)) {
        issues.push({ path: `canvasPages.${pageIndex}.nodes.${nodeIndex}.id`, message: "Node id is required." });
      } else if (nodeIds.has(node.id)) {
        issues.push({
          path: `canvasPages.${pageIndex}.nodes.${nodeIndex}.id`,
          message: "Node ids must be unique.",
        });
      } else {
        nodeIds.add(node.id);
        pageNodeIds.add(node.id);
      }
      if (!CANVAS_NODE_TYPES.includes(node.type)) {
        issues.push({
          path: `canvasPages.${pageIndex}.nodes.${nodeIndex}.type`,
          message: "Node type is unsupported.",
        });
      }
      if (!NODE_STATUSES.includes(node.status)) {
        issues.push({
          path: `canvasPages.${pageIndex}.nodes.${nodeIndex}.status`,
          message: "Node status is unsupported.",
        });
      }
    }
    for (const [edgeIndex, edge] of edges.entries()) {
      edgeCount += 1;
      if (!CANVAS_EDGE_RELATIONS.includes(edge.relation)) {
        issues.push({
          path: `canvasPages.${pageIndex}.edges.${edgeIndex}.relation`,
          message: "Edge relation is unsupported.",
        });
      }
      if (!pageNodeIds.has(edge.sourceNodeId) || !pageNodeIds.has(edge.targetNodeId)) {
        issues.push({
          path: `canvasPages.${pageIndex}.edges.${edgeIndex}`,
          message: "Edge references a missing node on this page.",
        });
      }
    }
  }

  const assets = Array.isArray(manifest.assets)
    ? (manifest.assets as ProjectPackageAssetManifestItem[])
    : [];
  for (const [assetIndex, asset] of assets.entries()) {
    if (!stringValue(asset.id)) {
      issues.push({ path: `assets.${assetIndex}.id`, message: "Asset id is required." });
    }
    if (!ASSET_TYPES.includes(asset.type)) {
      issues.push({ path: `assets.${assetIndex}.type`, message: "Asset type is unsupported." });
    }
    if (!ASSET_PURPOSES.includes(asset.purpose)) {
      issues.push({ path: `assets.${assetIndex}.purpose`, message: "Asset purpose is unsupported." });
    }
    if (!stringValue(asset.mimeType)) {
      issues.push({ path: `assets.${assetIndex}.mimeType`, message: "Asset mime type is required." });
    }
  }

  return {
    valid: issues.length === 0,
    detectedFormat,
    detectedVersion,
    issues,
    summary: {
      pages: pages.length,
      nodes: nodeCount,
      edges: edgeCount,
      assets: assets.length,
    },
  };
}
