import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  CanvasSnapshotJson,
  CreateEditorExportInput,
  CreateEditorExportResult,
  EditorExportClipSource,
  EditorExportDetailResult,
  EditorExportDownloadResult,
  EditorExportJobInput,
  EditorExportListResult,
  EditorExportRecord,
  EditorExportSendResult,
  EditorExportSortMode,
  GenerationJobStatus,
  GenerationJobStatusCounts,
  GenerationQueueSummary,
  ProjectAspectRatio,
  VideoNodeData,
} from "@guga-flow/shared-types";
import { GENERATION_JOB_STATUSES } from "@guga-flow/shared-types";
import type { Prisma } from "../generated/prisma/client";

import { AssetsService, type AssetPreviewPayload } from "../assets/assets.service";
import { PrismaService } from "../prisma/prisma.service";

export const EDITOR_EXPORT_FETCH = Symbol("EDITOR_EXPORT_FETCH");
type FetchLike = typeof fetch;
const LOCAL_EDITOR_SEND_TIMEOUT_MS = 5000;

type ProjectModel = {
  id: string;
  title: string | null;
  defaultAspectRatio: string;
};

type CanvasNodeModel = {
  id: string;
  projectId: string;
  type: string;
  title: string | null;
  x: number;
  y: number;
  dataJson: unknown;
};

type AssetModel = {
  id: string;
  projectId: string;
  storageKey: string;
  mimeType: string;
  originalFilename: string | null;
  durationMs: number | null;
};

type EditorExportModel = {
  id: string;
  projectId: string;
  packageAssetId: string | null;
  status: string;
  timelineJson: unknown;
  storyboardCsv: string | null;
  errorMessage: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
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

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function dataObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function jsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function uniqueInOrder(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

@Injectable()
export class EditorExportsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AssetsService) private readonly assetsService: AssetsService,
    @Inject(ConfigService) private readonly configService: ConfigService,
    @Optional() @Inject(EDITOR_EXPORT_FETCH) private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async createExport(
    projectId: string,
    input: CreateEditorExportInput,
  ): Promise<CreateEditorExportResult> {
    const project = await this.findProject(projectId);
    const selectedNodeIds = uniqueInOrder(input.videoNodeIds);
    if (!selectedNodeIds.length) {
      throw new BadRequestException("At least one VideoNode is required for editor export");
    }

    const clips = await this.buildClipSources(projectId, selectedNodeIds, input.sortMode);
    const created = await this.prisma.$transaction(async (tx) => {
      const editorExport = (await tx.editorExport.create({
        data: {
          projectId,
          status: "queued",
          timelineJson: jsonValue({
            selectedVideoNodeIds: selectedNodeIds,
            sortMode: input.sortMode,
          }),
        },
      })) as EditorExportModel;
      const jobInput: EditorExportJobInput = {
        operation: "editor_export",
        projectId,
        editorExportId: editorExport.id,
        videoNodeIds: selectedNodeIds,
        sortMode: input.sortMode,
        includeStoryboardCsv: input.includeStoryboardCsv ?? true,
        includeSubtitles: input.includeSubtitles ?? false,
        fps: 24,
        aspectRatio: project.defaultAspectRatio as ProjectAspectRatio,
        clips,
        forceFailure: input.forceFailure,
      };
      const job = (await tx.generationJob.create({
        data: {
          projectId,
          operation: "editor_export",
          status: "queued",
          provider: "mock-editor",
          model: "zip-v1",
          inputJson: jsonValue(jobInput),
        },
      })) as GenerationJobModel;

      return { editorExport, job };
    });

    return {
      export: this.toEditorExportRecord(created.editorExport),
      job: this.toGenerationJobRecord<EditorExportJobInput>(created.job),
      queueSummary: await this.getQueueSummary(projectId),
    };
  }

  async listExports(projectId: string): Promise<EditorExportListResult> {
    await this.ensureProjectExists(projectId);
    const exports = (await this.prisma.editorExport.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    })) as EditorExportModel[];

    return {
      exports: exports.map((editorExport) => this.toEditorExportRecord(editorExport)),
    };
  }

  async getExport(projectId: string, exportId: string): Promise<EditorExportDetailResult> {
    return {
      export: this.toEditorExportRecord(await this.findExport(projectId, exportId)),
    };
  }

  async getDownloadInfo(projectId: string, exportId: string): Promise<EditorExportDownloadResult> {
    const editorExport = await this.findExport(projectId, exportId);
    if (editorExport.status !== "succeeded" || !editorExport.packageAssetId) {
      throw new BadRequestException("Editor export package is not ready for download");
    }

    return {
      packageAssetId: editorExport.packageAssetId,
      downloadUrl: `/api/v1/projects/${projectId}/editor-exports/${exportId}/download`,
    };
  }

  async downloadPackage(projectId: string, exportId: string): Promise<AssetPreviewPayload> {
    const downloadInfo = await this.getDownloadInfo(projectId, exportId);
    return this.assetsService.getAssetPreview(projectId, downloadInfo.packageAssetId);
  }

  async sendToLocalEditor(projectId: string, exportId: string): Promise<EditorExportSendResult> {
    const editorExport = await this.findExport(projectId, exportId);
    if (editorExport.status !== "succeeded" || !editorExport.packageAssetId) {
      throw new BadRequestException("Editor export package must succeed before local editor send");
    }

    const localEditorUrl = this.configService.get<string>("localEditorUrl");
    if (!localEditorUrl) {
      return {
        export: this.toEditorExportRecord(editorExport),
        sent: false,
        errorMessage: "LOCAL_EDITOR_URL is not configured",
      };
    }

    try {
      const response = await fetchWithTimeout(this.fetchImpl, localEditorUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          editorExportId: editorExport.id,
          packageAssetId: editorExport.packageAssetId,
          downloadUrl: `/api/v1/projects/${projectId}/editor-exports/${editorExport.id}/download`,
          timeline: editorExport.timelineJson,
        }),
      }, LOCAL_EDITOR_SEND_TIMEOUT_MS);
      if (!response.ok) {
        throw new Error(`Local editor responded with ${response.status}`);
      }
      const body = await readLocalEditorResponse(response);
      const editorUrl = optionalString(body.url) ?? optionalString(body.editorUrl);
      return {
        export: this.toEditorExportRecord(editorExport),
        sent: true,
        editorUrl,
      };
    } catch (error) {
      return {
        export: this.toEditorExportRecord(editorExport),
        sent: false,
        errorMessage: error instanceof Error ? error.message : "Local editor send failed",
      };
    }
  }

  private async buildClipSources(
    projectId: string,
    selectedNodeIds: string[],
    sortMode: EditorExportSortMode,
  ): Promise<EditorExportClipSource[]> {
    const nodes = (await this.prisma.canvasNode.findMany({
      where: { projectId, id: { in: selectedNodeIds } },
    })) as CanvasNodeModel[];
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const clips: EditorExportClipSource[] = [];

    for (let manualIndex = 0; manualIndex < selectedNodeIds.length; manualIndex += 1) {
      const nodeId = selectedNodeIds[manualIndex] as string;
      const node = nodesById.get(nodeId);
      if (!node) {
        throw new BadRequestException(`Selected VideoNode ${nodeId} was not found`);
      }
      if (node.type !== "video") {
        throw new BadRequestException(`Selected node ${nodeId} is not a VideoNode`);
      }
      const nodeData = dataObject(node.dataJson) as VideoNodeData;
      const assetId = optionalString(nodeData.assetId);
      if (!assetId) {
        throw new BadRequestException(`Selected VideoNode ${nodeId} has no video asset`);
      }
      clips.push({
        videoNodeId: node.id,
        videoNodeTitle: node.title ?? undefined,
        videoAssetId: assetId,
        filename: `clips/shot_${String(manualIndex + 1).padStart(3, "0")}.mp4`,
        durationSeconds: optionalNumber(nodeData.durationSeconds),
        durationMs: optionalNumber(nodeData.durationSeconds)
          ? Math.round((nodeData.durationSeconds as number) * 1000)
          : undefined,
        shotNodeId: optionalString(nodeData.generatedFromNodeId),
        shotTitle: optionalString(nodeData.description),
        shotNumber: shotNumberFromNode(node),
        canvasX: node.x,
        canvasY: node.y,
        manualIndex,
      });
    }

    const assets = (await this.prisma.asset.findMany({
      where: { projectId, id: { in: clips.map((clip) => clip.videoAssetId) } },
    })) as AssetModel[];
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    for (const clip of clips) {
      const asset = assetsById.get(clip.videoAssetId);
      if (!asset) {
        throw new BadRequestException(`Video asset ${clip.videoAssetId} was not found`);
      }
      if (!asset.mimeType.startsWith("video/")) {
        throw new BadRequestException(`Asset ${asset.id} is not a video asset`);
      }
      clip.storageKey = asset.storageKey;
      clip.mimeType = asset.mimeType;
      clip.durationMs = clip.durationMs ?? asset.durationMs ?? undefined;
    }

    return sortClips(clips, sortMode).map((clip, index) => ({
      ...clip,
      filename: `clips/shot_${String(index + 1).padStart(3, "0")}.${extensionForMime(clip.mimeType)}`,
    }));
  }

  private async findProject(projectId: string): Promise<ProjectModel> {
    const project = (await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true, defaultAspectRatio: true },
    })) as ProjectModel | null;
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    return project;
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    await this.findProject(projectId);
  }

  private async findExport(projectId: string, exportId: string): Promise<EditorExportModel> {
    const editorExport = (await this.prisma.editorExport.findFirst({
      where: { id: exportId, projectId },
    })) as EditorExportModel | null;
    if (!editorExport) {
      throw new NotFoundException("Editor export not found");
    }
    return editorExport;
  }

  private async getQueueSummary(projectId: string): Promise<GenerationQueueSummary> {
    const jobs = (await this.prisma.generationJob.findMany({
      where: { projectId },
      select: { status: true },
    })) as Array<{ status: string }>;
    const counts = GENERATION_JOB_STATUSES.reduce((accumulator, status) => {
      accumulator[status] = 0;
      return accumulator;
    }, {} as GenerationJobStatusCounts);

    for (const job of jobs) {
      if (GENERATION_JOB_STATUSES.includes(job.status as GenerationJobStatus)) {
        counts[job.status as GenerationJobStatus] += 1;
      }
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

  private toEditorExportRecord(editorExport: EditorExportModel): EditorExportRecord {
    return {
      id: editorExport.id,
      projectId: editorExport.projectId,
      packageAssetId: editorExport.packageAssetId ?? undefined,
      status: editorExport.status as EditorExportRecord["status"],
      timelineJson: editorExport.timelineJson as CanvasSnapshotJson,
      storyboardCsv: editorExport.storyboardCsv ?? undefined,
      errorMessage: editorExport.errorMessage ?? undefined,
      createdAt: toIsoString(editorExport.createdAt),
      updatedAt: toIsoString(editorExport.updatedAt),
    };
  }

  private toGenerationJobRecord<TInput>(job: GenerationJobModel): CreateEditorExportResult["job"] {
    return {
      id: job.id,
      projectId: job.projectId,
      operation: job.operation as CreateEditorExportResult["job"]["operation"],
      status: job.status as CreateEditorExportResult["job"]["status"],
      provider: job.provider,
      model: job.model ?? undefined,
      sourceNodeId: job.sourceNodeId ?? undefined,
      targetNodeId: job.targetNodeId ?? undefined,
      providerTaskId: job.providerTaskId ?? undefined,
      inputJson: job.inputJson as TInput,
      outputJson: job.outputJson ?? undefined,
      errorMessage: job.errorMessage ?? undefined,
      createdAt: toIsoString(job.createdAt),
      updatedAt: toIsoString(job.updatedAt),
    } as CreateEditorExportResult["job"];
  }
}

function sortClips(
  clips: EditorExportClipSource[],
  sortMode: EditorExportSortMode,
): EditorExportClipSource[] {
  return [...clips].sort((left, right) => {
    if (sortMode === "manual") {
      return (left.manualIndex ?? 0) - (right.manualIndex ?? 0);
    }
    if (sortMode === "canvas_x") {
      return (left.canvasX ?? 0) - (right.canvasX ?? 0) || (left.canvasY ?? 0) - (right.canvasY ?? 0);
    }
    return (
      comparableShotNumber(left.shotNumber) - comparableShotNumber(right.shotNumber) ||
      (left.manualIndex ?? 0) - (right.manualIndex ?? 0)
    );
  });
}

function comparableShotNumber(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function shotNumberFromNode(node: CanvasNodeModel): string | undefined {
  const data = dataObject(node.dataJson);
  return optionalString(data.shotNumber) ?? parseNumberFromText(node.title ?? node.id);
}

function parseNumberFromText(value: string): string | undefined {
  const match = /\d+/.exec(value);
  return match?.[0];
}

function extensionForMime(mimeType: string | undefined): string {
  if (mimeType === "video/webm") {
    return "webm";
  }
  return "mp4";
}

async function readLocalEditorResponse(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function fetchWithTimeout(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(`Local editor request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetchImpl(url, { ...init, signal: controller.signal }),
      timeoutPromise,
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}
