import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProviderError, createVideoProviderRegistry } from "@guga-flow/provider-contracts";
import type {
  AiAudioGenerationContextItem,
  AiAudioGenerationJobInput,
  AiAudioGenerationJobOutput,
  AiAudioNodeData,
  AiTextGenerationContextItem,
  AiTextGenerationJobInput,
  AiTextGenerationJobOutput,
  AiTextNodeData,
  AssetDetail,
  AssetAnalysisJobInput,
  AssetAnalysisJobOutput,
  CanvasSnapshotJson,
  CanvasLoadResult,
  CanvasNodeRecord,
  CanvasNodeType,
  CharacterAssetNodeData,
  CharacterToImageJobInput,
  CreateBatchImagesToVideosJobInput,
  CreateBatchImagesToVideosJobResult,
  CreateBatchShotsToImagesJobInput,
  CreateBatchShotsToImagesJobResult,
  CreateAssetAnalysisJobInput,
  CreateAssetAnalysisJobResult,
  CreateGenerationJobInput,
  EditorExportJobInput,
  EditorExportJobOutput,
  EditorExportPackageOutput,
  GeneratedMediaJobOutput,
  GeneratedMediaJobTargetOutput,
  GeneratedMediaProviderOutput,
  GenerationJobInput,
  GenerationJobListResult,
  GenerationJobRecord,
  GenerationJobStatus,
  GenerationJobStatusCounts,
  GenerationOperation,
  GenerationQueueSummary,
  ImageRefinementJobInput,
  ImageProviderCatalogItem,
  ImageNodeData,
  ImageToVideoJobInput,
  LlmProviderCatalogItem,
  LocationAssetNodeData,
  LocationToImageJobInput,
  NodeStatus,
  Phase8GenerationOperation,
  ProviderFailure,
  ProviderRuntimeConfig,
  ReferenceAssetJobOutput,
  ProjectAspectRatio,
  ResolvedGenerationSettings,
  RetryGenerationJobResult,
  ShotNodeData,
  ShotToImageJobInput,
  VideoProviderCatalogItem,
  VideoReferenceMediaInput,
  VideoProviderResolution,
  WorkerGenerationJobWaitInput,
  WorkerProviderRuntimeConfigInput,
  WorkflowRunJobInput,
} from "@guga-flow/shared-types";
import {
  EDITOR_EXPORT_PRESETS,
  EDITOR_PACKAGE_MIME_TYPE,
  GENERATION_JOB_STATUSES,
  PHASE_8_GENERATION_OPERATIONS,
  resolveGenerationSettings,
} from "@guga-flow/shared-types";
import type { GenerationOperation as PrismaGenerationOperation } from "../generated/prisma/client";
import { Prisma } from "../generated/prisma/client";

import { AssetsService } from "../assets/assets.service";
import { CanvasService } from "../canvas/canvas.service";
import { PrismaService } from "../prisma/prisma.service";
import { PromptService } from "../prompt/prompt.service";
import { ProvidersService } from "../providers/providers.service";

type GenerationPrismaClient = Pick<
  PrismaService,
  "generationJob" | "canvasNode" | "canvasEdge" | "asset" | "project" | "editorExport"
>;

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

type ProjectGenerationSettingsModel = {
  generationSettingsJson: unknown | null;
};

type DirectGenerationJobInput =
  | ShotToImageJobInput
  | CharacterToImageJobInput
  | LocationToImageJobInput
  | ImageRefinementJobInput
  | ImageToVideoJobInput
  | AiAudioGenerationJobInput
  | AiTextGenerationJobInput;
type WorkerGenerationJobInput =
  | DirectGenerationJobInput
  | AssetAnalysisJobInput
  | WorkflowRunJobInput
  | EditorExportJobInput;
type GeneratedMediaJobInput = ShotToImageJobInput | ImageRefinementJobInput | ImageToVideoJobInput | WorkflowRunJobInput;
type ReferenceImageJobInput = CharacterToImageJobInput | LocationToImageJobInput;

const CANCELLABLE_JOB_STATUSES: GenerationJobStatus[] = ["queued", "running", "provider_waiting"];
const WORKER_ACTIVE_JOB_STATUSES: GenerationJobStatus[] = ["running", "provider_waiting"];
const WORKER_GENERATION_OPERATIONS = [
  ...PHASE_8_GENERATION_OPERATIONS,
  "asset_caption",
  "asset_classification",
  "workflow_run",
  "editor_export",
] as const;

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function isPhase8GenerationOperation(value: unknown): value is Phase8GenerationOperation {
  return (
    typeof value === "string" &&
    PHASE_8_GENERATION_OPERATIONS.includes(value as Phase8GenerationOperation)
  );
}

function isGenerationJobStatus(value: unknown): value is GenerationJobStatus {
  return (
    typeof value === "string" &&
    GENERATION_JOB_STATUSES.includes(value as GenerationJobStatus)
  );
}

function isCancellableJobStatus(value: unknown): value is GenerationJobStatus {
  return (
    typeof value === "string" && CANCELLABLE_JOB_STATUSES.includes(value as GenerationJobStatus)
  );
}

function isWorkerActiveJobStatus(value: unknown): value is GenerationJobStatus {
  return (
    typeof value === "string" && WORKER_ACTIVE_JOB_STATUSES.includes(value as GenerationJobStatus)
  );
}

function dataObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isJsonValue(value: unknown): value is CanvasSnapshotJson {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === "string")
    ? Array.from(new Set(value))
    : [];
}

function uniqueStrings(values: readonly (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function compactText(values: readonly (string | undefined)[]): string {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join("\n");
}

function labelledField(data: Record<string, unknown>, key: string, label: string): string | undefined {
  const value = optionalString(data[key]);
  return value ? `${label}: ${value}` : undefined;
}

function jsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function assertJobInput(value: unknown): WorkerGenerationJobInput {
  const input = dataObject(value);
  if (
    input.operation === "shot_to_image" ||
    input.operation === "character_to_image" ||
    input.operation === "location_to_image" ||
    input.operation === "image_refinement" ||
    input.operation === "image_to_video" ||
    input.operation === "ai_text_generation" ||
    input.operation === "ai_audio_generation"
  ) {
    return value as WorkerGenerationJobInput;
  }
  if (input.operation === "asset_caption" || input.operation === "asset_classification") {
    return value as WorkerGenerationJobInput;
  }
  if (input.operation === "workflow_run") {
    return value as WorkerGenerationJobInput;
  }
  if (input.operation === "editor_export") {
    return {
      ...input,
      exportPreset: EDITOR_EXPORT_PRESETS.includes(input.exportPreset as EditorExportJobInput["exportPreset"])
        ? input.exportPreset
        : "standard_zip",
    } as WorkerGenerationJobInput;
  }
  throw new BadRequestException("Generation job input is invalid");
}

function isReferenceImageJobInput(input: WorkerGenerationJobInput): input is ReferenceImageJobInput {
  return input.operation === "character_to_image" || input.operation === "location_to_image";
}

function isGeneratedMediaJobInput(input: WorkerGenerationJobInput): input is GeneratedMediaJobInput {
  return (
    input.operation === "shot_to_image" ||
    input.operation === "image_refinement" ||
    input.operation === "image_to_video" ||
    input.operation === "workflow_run"
  );
}

@Injectable()
export class GenerationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AssetsService) private readonly assetsService: AssetsService,
    @Inject(CanvasService) private readonly canvasService: CanvasService,
    @Inject(PromptService) private readonly promptService: PromptService,
    @Inject(ProvidersService) private readonly providersService: ProvidersService,
  ) {}

  async createJob(
    projectId: string,
    input: CreateGenerationJobInput & { operation: unknown },
  ): Promise<GenerationJobRecordResult> {
    if (!isPhase8GenerationOperation(input.operation)) {
      throw new BadRequestException("Generation operation is not supported yet");
    }
    if (!input.sourceNodeId) {
      throw new BadRequestException("Generation source node id is required");
    }

    const jobInput = await this.buildDirectGenerationInput(projectId, input.sourceNodeId, input);

    const job = await this.runTransaction(async (tx) => {
      const created = await tx.generationJob.create({
        data: {
          projectId,
          operation: jobInput.operation as PrismaGenerationOperation,
          status: "queued",
          provider: jobInput.provider,
          model: jobInput.model,
          sourceNodeId: jobInput.sourceNodeId,
          inputJson: jsonValue(jobInput),
        },
      });
      await this.updateNodeStatus(tx, jobInput.sourceNodeId, "queued");
      return created as GenerationJobModel;
    });

    return {
      job: this.toGenerationJobRecord(job),
      queueSummary: await this.getQueueSummary(projectId),
    };
  }

  async createAssetAnalysisJob(
    projectId: string,
    input: CreateAssetAnalysisJobInput,
  ): Promise<CreateAssetAnalysisJobResult> {
    if (input.operation !== "asset_caption" && input.operation !== "asset_classification") {
      throw new BadRequestException("Asset analysis operation is not supported");
    }
    const assetIds = Array.from(new Set((input.assetIds ?? []).filter(Boolean)));
    if (!assetIds.length) {
      throw new BadRequestException("Asset analysis requires assetIds");
    }
    for (const assetId of assetIds) {
      await this.assetsService.getAsset(projectId, assetId);
    }

    const jobInput: AssetAnalysisJobInput = {
      operation: input.operation,
      projectId,
      assetIds,
      provider: input.provider ?? "mock-vision",
      model: input.model ?? "mock-vision-v1",
      overwrite: input.overwrite === true,
      prompt: input.prompt,
      forceFailure: input.forceFailure,
    };
    const job = await this.prisma.generationJob.create({
      data: {
        projectId,
        operation: jobInput.operation,
        status: "queued",
        provider: jobInput.provider,
        model: jobInput.model,
        inputJson: jsonValue(jobInput),
      },
    }) as GenerationJobModel;

    return {
      job: this.toGenerationJobRecord<AssetAnalysisJobInput>(job),
      queueSummary: await this.getQueueSummary(projectId),
    };
  }

  async createBatchImagesToVideosJobs(
    projectId: string,
    input: CreateBatchImagesToVideosJobInput,
  ): Promise<CreateBatchImagesToVideosJobResult> {
    if (input.operation !== "batch_images_to_videos") {
      throw new BadRequestException("Batch generation operation is not supported");
    }

    const childInputs: ImageToVideoJobInput[] = [];
    const skipped: CreateBatchImagesToVideosJobResult["skipped"] = [];
    for (const sourceNodeId of Array.from(new Set(input.sourceNodeIds))) {
      try {
        childInputs.push(
          await this.buildImageToVideoInput(projectId, sourceNodeId, {
            operation: "image_to_video",
            sourceNodeId,
            videoProvider: input.videoProvider,
            videoModel: input.videoModel,
            videoAspectRatio: input.videoAspectRatio,
            durationSeconds: input.durationSeconds,
            resolution: input.resolution,
            referenceMedia: input.referenceMedia,
            videoProviderParams: input.videoProviderParams,
            forceFailure: input.forceFailure,
          }),
        );
      } catch (error) {
        skipped.push({
          nodeId: sourceNodeId,
          reason: error instanceof Error ? error.message : "Image-to-video child job could not be created",
        });
      }
    }

    const jobs = await this.runTransaction(async (tx) => {
      const createdJobs: GenerationJobModel[] = [];
      for (const childInput of childInputs) {
        const created = (await tx.generationJob.create({
          data: {
            projectId,
            operation: childInput.operation,
            status: "queued",
            provider: childInput.provider,
            model: childInput.model,
            sourceNodeId: childInput.sourceNodeId,
            inputJson: jsonValue(childInput),
          },
        })) as GenerationJobModel;
        await this.updateNodeStatus(tx, childInput.sourceNodeId, "queued");
        createdJobs.push(created);
      }
      return createdJobs;
    });

    return {
      jobs: jobs.map((job) => this.toGenerationJobRecord<ImageToVideoJobInput>(job)),
      skipped,
      queueSummary: await this.getQueueSummary(projectId),
    };
  }

  async createBatchShotsToImagesJobs(
    projectId: string,
    input: CreateBatchShotsToImagesJobInput,
  ): Promise<CreateBatchShotsToImagesJobResult> {
    if (input.operation !== "batch_shots_to_images") {
      throw new BadRequestException("Batch generation operation is not supported");
    }

    const childInputs: ShotToImageJobInput[] = [];
    const skipped: CreateBatchShotsToImagesJobResult["skipped"] = [];
    for (const sourceNodeId of Array.from(new Set(input.sourceNodeIds))) {
      try {
        childInputs.push(
          await this.buildShotToImageInput(projectId, sourceNodeId, {
            operation: "shot_to_image",
            sourceNodeId,
            provider: input.provider,
            model: input.model,
            aspectRatio: input.aspectRatio,
            count: input.count,
            providerParams: input.providerParams,
            forceFailure: input.forceFailure,
          }),
        );
      } catch (error) {
        skipped.push({
          nodeId: sourceNodeId,
          reason: error instanceof Error ? error.message : "Shot-to-image child job could not be created",
        });
      }
    }

    const jobs = await this.runTransaction(async (tx) => {
      const createdJobs: GenerationJobModel[] = [];
      for (const childInput of childInputs) {
        const created = (await tx.generationJob.create({
          data: {
            projectId,
            operation: childInput.operation,
            status: "queued",
            provider: childInput.provider,
            model: childInput.model,
            sourceNodeId: childInput.sourceNodeId,
            inputJson: jsonValue(childInput),
          },
        })) as GenerationJobModel;
        await this.updateNodeStatus(tx, childInput.sourceNodeId, "queued");
        createdJobs.push(created);
      }
      return createdJobs;
    });

    return {
      jobs: jobs.map((job) => this.toGenerationJobRecord<ShotToImageJobInput>(job)),
      skipped,
      queueSummary: await this.getQueueSummary(projectId),
    };
  }

  async listJobs(projectId: string): Promise<GenerationJobListResult> {
    const jobs = (await this.prisma.generationJob.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
    })) as GenerationJobModel[];

    return {
      jobs: jobs.map((job) => this.toGenerationJobRecord(job)),
      queueSummary: await this.getQueueSummary(projectId),
    };
  }

  async getJob(projectId: string, jobId: string): Promise<GenerationJobRecord> {
    const job = await this.findProjectJob(projectId, jobId);
    return this.toGenerationJobRecord(job);
  }

  getProviderRuntimeConfig(
    input: WorkerProviderRuntimeConfigInput,
    workerToken?: string,
  ): Promise<ProviderRuntimeConfig> {
    return this.providersService.getRuntimeProviderConfig(
      input.projectId,
      input.kind,
      input.provider,
      workerToken,
    );
  }

  async retryJob(projectId: string, jobId: string): Promise<RetryGenerationJobResult> {
    const original = await this.findProjectJob(projectId, jobId);
    if (original.status !== "failed") {
      throw new BadRequestException("Only failed generation jobs can be retried");
    }

    const input = assertJobInput(original.inputJson);
    const retry = await this.runTransaction(async (tx) => {
      const created = await tx.generationJob.create({
        data: {
          projectId,
          operation: original.operation as PrismaGenerationOperation,
          status: "queued",
          provider: original.provider,
          model: original.model,
          sourceNodeId: original.sourceNodeId,
          inputJson: jsonValue(input),
        },
      });
      if (input.operation === "editor_export") {
        await tx.editorExport.update({
          where: { id: input.editorExportId },
          data: { status: "queued", errorMessage: null },
        });
      } else if (original.sourceNodeId) {
        await this.updateNodeStatus(tx, original.sourceNodeId, "queued");
      }
      return created as GenerationJobModel;
    });

    return {
      originalJob: this.toGenerationJobRecord(original),
      retryJob: this.toGenerationJobRecord(retry),
      queueSummary: await this.getQueueSummary(projectId),
    };
  }

  async cancelJob(projectId: string, jobId: string): Promise<GenerationJobRecord> {
    const existing = await this.findProjectJob(projectId, jobId);
    if (!isCancellableJobStatus(existing.status)) {
      throw new BadRequestException("Only queued or active generation jobs can be cancelled");
    }

    const input = assertJobInput(existing.inputJson);
    const cancelledAt = new Date().toISOString();
    const cancelled = await this.runTransaction(async (tx) => {
      const claimed = await tx.generationJob.updateMany({
        where: { id: existing.id, status: { in: CANCELLABLE_JOB_STATUSES } },
        data: {
          status: "cancelled",
          outputJson: jsonValue({
            cancelledAt,
            providerTaskId: existing.providerTaskId,
            providerCancelError: null,
          }),
          errorMessage: null,
        },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException("Only queued or active generation jobs can be cancelled");
      }
      const updated = (await tx.generationJob.findUnique({
        where: { id: existing.id },
      })) as GenerationJobModel | null;
      if (!updated) {
        throw new NotFoundException("Generation job not found");
      }
      if (input.operation === "editor_export") {
        await tx.editorExport.update({
          where: { id: input.editorExportId },
          data: {
            status: "failed",
            errorMessage: "EXPORT_CANCELLED: Editor export was cancelled",
          },
        });
      } else {
        await this.updateNodeStatus(tx, existing.targetNodeId ?? existing.sourceNodeId, "cancelled");
      }
      return updated;
    });

    const providerCancelError = await this.tryCancelProviderTask(existing);
    if (!providerCancelError) {
      return this.toGenerationJobRecord(cancelled);
    }

    const cancelWithProviderError = await this.runTransaction(async (tx) => {
      const updated = (await tx.generationJob.update({
        where: { id: existing.id },
        data: {
          outputJson: jsonValue({
            cancelledAt,
            providerTaskId: existing.providerTaskId,
            providerCancelError,
          }),
          errorMessage: `PROVIDER_CANCEL_FAILED: ${providerCancelError.message}`,
        },
      })) as GenerationJobModel;
      return updated;
    });

    return this.toGenerationJobRecord(cancelWithProviderError);
  }

  async claimNextJob(): Promise<{ job?: GenerationJobRecord }> {
    const job = await this.runTransaction(async (tx) => {
      const queued = (await tx.generationJob.findFirst({
        where: {
          status: { in: ["queued", "provider_waiting"] },
          operation: { in: [...WORKER_GENERATION_OPERATIONS] as PrismaGenerationOperation[] },
        },
        orderBy: { createdAt: "asc" },
      })) as GenerationJobModel | null;

      if (!queued) {
        return undefined;
      }

      const claimed = await tx.generationJob.updateMany({
        where: { id: queued.id, status: queued.status as GenerationJobStatus },
        data: {
          status: "running",
          errorMessage: null,
          outputJson: Prisma.JsonNull,
        },
      });
      if (claimed.count !== 1) {
        return undefined;
      }

      const updated = (await tx.generationJob.findUnique({
        where: { id: queued.id },
      })) as GenerationJobModel | null;
      if (updated) {
        const input = assertJobInput(updated.inputJson);
        if (input.operation === "editor_export") {
          await tx.editorExport.update({
            where: { id: input.editorExportId },
            data: { status: "running", errorMessage: null },
          });
        } else if (updated.sourceNodeId) {
          await this.updateNodeStatus(tx, updated.sourceNodeId, "running");
        }
      }

      return updated ?? undefined;
    });

    return job ? { job: this.toGenerationJobRecord(job) } : {};
  }

  async waitJob(
    jobId: string,
    waitInput: WorkerGenerationJobWaitInput,
  ): Promise<GenerationJobRecord> {
    const existing = (await this.prisma.generationJob.findUnique({
      where: { id: jobId },
    })) as GenerationJobModel | null;
    if (!existing) {
      throw new NotFoundException("Generation job not found");
    }
    if (!isWorkerActiveJobStatus(existing.status)) {
      throw new BadRequestException("Only active generation jobs can wait for provider completion");
    }
    if (waitInput.provider !== existing.provider) {
      throw new BadRequestException("Provider wait input does not match the claimed job provider");
    }

    const waiting = await this.runTransaction(async (tx) => {
      const claimed = await tx.generationJob.updateMany({
        where: { id: existing.id, status: { in: WORKER_ACTIVE_JOB_STATUSES } },
        data: {
          status: "provider_waiting",
          providerTaskId: waitInput.providerTaskId,
          model: waitInput.model ?? existing.model,
          outputJson: jsonValue({
            providerTaskId: waitInput.providerTaskId,
            provider: waitInput.provider,
            model: waitInput.model ?? existing.model,
            rawJson: waitInput.rawJson ?? null,
          }),
          errorMessage: null,
        },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException("Only active generation jobs can wait for provider completion");
      }
      const updated = (await tx.generationJob.findUnique({
        where: { id: existing.id },
      })) as GenerationJobModel | null;
      if (!updated) {
        throw new NotFoundException("Generation job not found");
      }
      await this.updateNodeStatus(tx, existing.targetNodeId ?? existing.sourceNodeId, "provider_waiting");
      return updated;
    });

    return this.toGenerationJobRecord(waiting);
  }

  async failJob(jobId: string, failure: ProviderFailure): Promise<GenerationJobRecord> {
    const existing = (await this.prisma.generationJob.findUnique({
      where: { id: jobId },
    })) as GenerationJobModel | null;
    if (!existing) {
      throw new NotFoundException("Generation job not found");
    }
    if (!isWorkerActiveJobStatus(existing.status)) {
      throw new BadRequestException("Only active generation jobs can fail");
    }

    const input = assertJobInput(existing.inputJson);
    const failed = await this.runTransaction(async (tx) => {
      const claimed = await tx.generationJob.updateMany({
        where: { id: existing.id, status: { in: WORKER_ACTIVE_JOB_STATUSES } },
        data: {
          status: "failed",
          errorMessage: `${failure.code}: ${failure.message}`,
          outputJson: jsonValue({ error: failure }),
        },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException("Only active generation jobs can fail");
      }
      const updated = (await tx.generationJob.findUnique({
        where: { id: existing.id },
      })) as GenerationJobModel | null;
      if (!updated) {
        throw new NotFoundException("Generation job not found");
      }
      if (input.operation === "editor_export") {
        await tx.editorExport.update({
          where: { id: input.editorExportId },
          data: {
            status: "failed",
            errorMessage: `${failure.code}: ${failure.message}`,
          },
        });
      } else {
        await this.updateNodeStatus(tx, existing.targetNodeId ?? existing.sourceNodeId, "failed");
      }
      return updated;
    });

    return this.toGenerationJobRecord(failed);
  }

  async succeedJob(
    jobId: string,
    providerOutput?: GeneratedMediaProviderOutput,
    providerOutputs?: GeneratedMediaProviderOutput[],
    packageOutput?: EditorExportPackageOutput,
    assetAnalysisOutput?: AssetAnalysisJobOutput,
    textGenerationOutput?: AiTextGenerationJobOutput,
  ): Promise<
    GenerationJobRecord<
      GenerationJobInput,
      | GeneratedMediaJobOutput
      | ReferenceAssetJobOutput
      | EditorExportJobOutput
      | AssetAnalysisJobOutput
      | AiTextGenerationJobOutput
      | AiAudioGenerationJobOutput
    >
  > {
    const existing = (await this.prisma.generationJob.findUnique({
      where: { id: jobId },
    })) as GenerationJobModel | null;
    if (!existing) {
      throw new NotFoundException("Generation job not found");
    }
    if (!isWorkerActiveJobStatus(existing.status)) {
      throw new BadRequestException("Only active generation jobs can succeed");
    }

    const input = assertJobInput(existing.inputJson);
    if (input.operation === "asset_caption" || input.operation === "asset_classification") {
      if (!assetAnalysisOutput) {
        throw new BadRequestException("Asset analysis completion requires analysis output");
      }
      return this.succeedAssetAnalysisJob(existing, input, assetAnalysisOutput);
    }
    if (input.operation === "editor_export") {
      if (!packageOutput) {
        throw new BadRequestException("Editor export completion requires package output");
      }
      return this.succeedEditorExportJob(existing, input, packageOutput);
    }
    if (input.operation === "ai_text_generation") {
      if (!textGenerationOutput) {
        throw new BadRequestException("AI text completion requires text output");
      }
      return this.succeedAiTextGenerationJob(existing, input, textGenerationOutput);
    }
    if (input.operation === "ai_audio_generation") {
      if (!providerOutput) {
        throw new BadRequestException("AI audio completion requires provider output");
      }
      return this.succeedAiAudioGenerationJob(existing, input, providerOutput);
    }
    if (!providerOutput) {
      throw new BadRequestException("Generated media completion requires provider output");
    }
    if (isReferenceImageJobInput(input)) {
      return this.succeedReferenceImageJob(existing, input, providerOutput, providerOutputs);
    }
    if (!isGeneratedMediaJobInput(input)) {
      throw new BadRequestException("Generation job input is invalid for generated media completion");
    }
    const mediaInput = input;
    const completionOutputs = this.normalizeCompletionOutputs(mediaInput, providerOutput, providerOutputs);
    completionOutputs.forEach((output) => this.validateProviderOutput(existing, mediaInput, output));

    const completed = await this.runTransaction(async (tx) => {
      const claimed = await tx.generationJob.updateMany({
        where: { id: existing.id, status: { in: WORKER_ACTIVE_JOB_STATUSES } },
        data: { errorMessage: null },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException("Only active generation jobs can succeed");
      }
      const sourceNode = await this.findSourceNode(tx, existing);
      const targets: Array<{
        asset: AssetDetail;
        edge: CanvasEdgeModel;
        node: CanvasNodeModel;
        providerOutput: GeneratedMediaProviderOutput;
      }> = [];

      for (let outputIndex = 0; outputIndex < completionOutputs.length; outputIndex += 1) {
        const output = completionOutputs[outputIndex] as GeneratedMediaProviderOutput;
        const asset = await this.assetsService.createGeneratedAsset(
          existing.projectId,
          {
            purpose: this.generatedAssetPurpose(mediaInput),
            providerOutput: output,
            metadataJson: {
              generationJobId: existing.id,
              operation: mediaInput.operation,
              sourceNodeId: sourceNode.id,
              outputIndex,
            },
          },
          tx,
        );
        const targetNode = await this.createGeneratedNode(
          tx,
          existing,
          mediaInput,
          output,
          asset,
          sourceNode,
          outputIndex,
        );
        const edge = await this.createGeneratedEdge(tx, existing, mediaInput, sourceNode, targetNode, asset);
        targets.push({ asset, edge, node: targetNode, providerOutput: output });
      }

      const firstTarget = targets[0];
      if (!firstTarget) {
        throw new BadRequestException("Generation completion requires at least one output");
      }
      const targetOutputs: GeneratedMediaJobTargetOutput[] = targets.map((target) => ({
        targetNodeId: target.node.id,
        assetId: target.asset.id,
        edgeId: target.edge.id,
        providerOutput: target.providerOutput,
      }));
      const output: GeneratedMediaJobOutput = {
        operation: mediaInput.operation,
        sourceNodeId: sourceNode.id,
        targetNodeId: firstTarget.node.id,
        assetId: firstTarget.asset.id,
        edgeId: firstTarget.edge.id,
        provider: firstTarget.providerOutput.provider,
        model: firstTarget.providerOutput.model,
        prompt: firstTarget.providerOutput.prompt,
        referenceAssetIds: firstTarget.providerOutput.referenceAssetIds,
        generationSettings: this.generationSettingsForInput(mediaInput),
        providerOutput: firstTarget.providerOutput,
        targets: targetOutputs.length > 1 ? targetOutputs : undefined,
        completedAt: new Date().toISOString(),
      };

      for (const target of targets) {
        await tx.canvasNode.update({
          where: { id: target.node.id },
          data: {
            status: "succeeded",
            dataJson: jsonValue(
              this.generatedNodeData(
                existing.id,
                mediaInput,
                target.providerOutput,
                target.asset,
                output,
                sourceNode,
              ),
            ),
          },
        });
      }
      await this.updateNodeStatus(tx, sourceNode.id, "succeeded");

      return (await tx.generationJob.update({
        where: { id: existing.id },
        data: {
          status: "succeeded",
          targetNodeId: firstTarget.node.id,
          outputJson: jsonValue(output),
          errorMessage: null,
        },
      })) as GenerationJobModel;
    });

    return this.toGenerationJobRecord(completed);
  }

  private async succeedAssetAnalysisJob(
    existing: GenerationJobModel,
    input: AssetAnalysisJobInput,
    output: AssetAnalysisJobOutput,
  ): Promise<GenerationJobRecord<AssetAnalysisJobInput, AssetAnalysisJobOutput>> {
    if (output.operation !== input.operation) {
      throw new BadRequestException("Asset analysis output operation does not match the claimed job");
    }
    const expectedAssetIds = new Set(input.assetIds);
    if (!output.results.every((result) => expectedAssetIds.has(result.assetId))) {
      throw new BadRequestException("Asset analysis output contains unexpected assets");
    }

    const claimed = await this.prisma.generationJob.updateMany({
      where: { id: existing.id, status: { in: WORKER_ACTIVE_JOB_STATUSES } },
      data: { errorMessage: null },
    });
    if (claimed.count !== 1) {
      throw new BadRequestException("Only active generation jobs can succeed");
    }
    await this.assetsService.applyAssetAnalysis(existing.projectId, output);
    const completed = (await this.prisma.generationJob.update({
      where: { id: existing.id },
      data: {
        status: "succeeded",
        outputJson: jsonValue(output),
        errorMessage: null,
      },
    })) as GenerationJobModel;

    return this.toGenerationJobRecord<AssetAnalysisJobInput, AssetAnalysisJobOutput>(completed);
  }

  private async succeedAiTextGenerationJob(
    existing: GenerationJobModel,
    input: AiTextGenerationJobInput,
    output: AiTextGenerationJobOutput,
  ): Promise<GenerationJobRecord<AiTextGenerationJobInput, AiTextGenerationJobOutput>> {
    if (output.operation !== "ai_text_generation") {
      throw new BadRequestException("AI text output operation does not match the claimed job");
    }
    if (output.sourceNodeId !== input.sourceNodeId || output.targetNodeId !== input.aiTextNodeId) {
      throw new BadRequestException("AI text output target does not match the claimed job");
    }
    if (output.provider !== existing.provider) {
      throw new BadRequestException("AI text output provider does not match the claimed job provider");
    }
    if (!optionalString(output.text)) {
      throw new BadRequestException("AI text completion requires non-empty text");
    }

    const completed = await this.runTransaction(async (tx) => {
      const claimed = await tx.generationJob.updateMany({
        where: { id: existing.id, status: { in: WORKER_ACTIVE_JOB_STATUSES } },
        data: { errorMessage: null },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException("Only active generation jobs can succeed");
      }

      const aiTextNode = await this.findSourceNode(tx, existing);
      if (aiTextNode.type !== "ai_text") {
        throw new BadRequestException("AI text completion requires an AI Text node");
      }

      const dataJson = dataObject(aiTextNode.dataJson) as AiTextNodeData;
      await tx.canvasNode.update({
        where: { id: aiTextNode.id },
        data: {
          status: "succeeded",
          dataJson: jsonValue({
            ...dataJson,
            prompt: output.prompt,
            outputText: output.text,
            contextSummary: this.aiTextContextSummary(output.context),
            provider: output.provider,
            model: output.model,
            generationJobId: existing.id,
            generationOperation: "ai_text_generation",
            generatedFromNodeId: aiTextNode.id,
            sourceNodeIds: output.sourceNodeIds,
            inputJson: input,
            outputJson: output,
          }),
        },
      });

      return (await tx.generationJob.update({
        where: { id: existing.id },
        data: {
          status: "succeeded",
          targetNodeId: aiTextNode.id,
          outputJson: jsonValue(output),
          errorMessage: null,
        },
      })) as GenerationJobModel;
    });

    return this.toGenerationJobRecord<AiTextGenerationJobInput, AiTextGenerationJobOutput>(completed);
  }

  private aiTextContextSummary(context: readonly AiTextGenerationContextItem[]): string | undefined {
    if (!context.length) {
      return undefined;
    }
    return context
      .map((item) => `${item.title?.trim() || item.nodeId} (${item.nodeType})`)
      .join(", ");
  }

  private async succeedAiAudioGenerationJob(
    existing: GenerationJobModel,
    input: AiAudioGenerationJobInput,
    providerOutput: GeneratedMediaProviderOutput,
  ): Promise<GenerationJobRecord<AiAudioGenerationJobInput, AiAudioGenerationJobOutput>> {
    if (providerOutput.provider !== existing.provider) {
      throw new BadRequestException("AI audio output provider does not match the claimed job provider");
    }
    if (!providerOutput.mimeType.startsWith("audio/")) {
      throw new BadRequestException("AI audio generation must produce an audio asset");
    }

    const completed = await this.runTransaction(async (tx) => {
      const claimed = await tx.generationJob.updateMany({
        where: { id: existing.id, status: { in: WORKER_ACTIVE_JOB_STATUSES } },
        data: { errorMessage: null },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException("Only active generation jobs can succeed");
      }

      const aiAudioNode = await this.findSourceNode(tx, existing);
      if (aiAudioNode.type !== "ai_audio") {
        throw new BadRequestException("AI audio completion requires an AI Audio node");
      }

      const asset = await this.assetsService.createGeneratedAsset(
        existing.projectId,
        {
          purpose: "shot_audio",
          providerOutput,
          metadataJson: {
            generationJobId: existing.id,
            operation: input.operation,
            sourceNodeId: aiAudioNode.id,
            context: input.context,
          },
        },
        tx,
      );
      const output: AiAudioGenerationJobOutput = {
        operation: "ai_audio_generation",
        sourceNodeId: aiAudioNode.id,
        targetNodeId: aiAudioNode.id,
        assetId: asset.id,
        provider: providerOutput.provider,
        model: providerOutput.model,
        prompt: providerOutput.prompt,
        scriptText: input.scriptText,
        referenceAssetIds: providerOutput.referenceAssetIds,
        context: input.context,
        providerOutput,
        completedAt: new Date().toISOString(),
      };

      const dataJson = dataObject(aiAudioNode.dataJson) as AiAudioNodeData;
      await tx.canvasNode.update({
        where: { id: aiAudioNode.id },
        data: {
          status: "succeeded",
          dataJson: jsonValue({
            ...dataJson,
            assetId: asset.id,
            prompt: output.prompt,
            scriptText: input.scriptText,
            description: `Generated by ${providerOutput.provider}`,
            durationSeconds: input.durationSeconds,
            contextSummary: this.aiAudioContextSummary(input.context),
            provider: output.provider,
            model: output.model,
            generationJobId: existing.id,
            generationOperation: "ai_audio_generation",
            generatedFromNodeId: aiAudioNode.id,
            sourceNodeIds: input.sourceNodeIds,
            referenceAssetIds: providerOutput.referenceAssetIds,
            voiceReferenceAssetIds: input.referenceAssetIds,
            inputJson: input,
            outputJson: output,
          }),
        },
      });

      return (await tx.generationJob.update({
        where: { id: existing.id },
        data: {
          status: "succeeded",
          targetNodeId: aiAudioNode.id,
          outputJson: jsonValue(output),
          errorMessage: null,
        },
      })) as GenerationJobModel;
    });

    return this.toGenerationJobRecord<AiAudioGenerationJobInput, AiAudioGenerationJobOutput>(completed);
  }

  private aiAudioContextSummary(context: readonly AiAudioGenerationContextItem[]): string | undefined {
    if (!context.length) {
      return undefined;
    }
    return context
      .map((item) => {
        const label = item.title?.trim() || item.label?.trim() || item.nodeId;
        const suffix = item.assetId ? `audio:${item.assetId}` : item.nodeType;
        return `${label} (${suffix})`;
      })
      .join(", ");
  }

  private async succeedReferenceImageJob(
    existing: GenerationJobModel,
    input: ReferenceImageJobInput,
    providerOutput: GeneratedMediaProviderOutput,
    providerOutputs?: GeneratedMediaProviderOutput[],
  ): Promise<GenerationJobRecord<ReferenceImageJobInput, ReferenceAssetJobOutput>> {
    if (providerOutputs && providerOutputs.length > 1) {
      throw new BadRequestException("Reference image generation supports only one provider output");
    }
    this.validateReferenceImageProviderOutput(existing, input, providerOutput);

    const completed = await this.runTransaction(async (tx) => {
      const claimed = await tx.generationJob.updateMany({
        where: { id: existing.id, status: { in: WORKER_ACTIVE_JOB_STATUSES } },
        data: { errorMessage: null },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException("Only active generation jobs can succeed");
      }

      const sourceNode = await this.findSourceNode(tx, existing);
      this.validateReferenceImageSourceNode(input, sourceNode);
      const asset = await this.assetsService.createGeneratedAsset(
        existing.projectId,
        {
          purpose: input.assetPurpose,
          providerOutput,
          metadataJson: {
            generationJobId: existing.id,
            operation: input.operation,
            sourceNodeId: sourceNode.id,
          },
        },
        tx,
      );
      const dataJson = dataObject(sourceNode.dataJson);
      const referenceAssetIds = uniqueStrings([...stringArray(dataJson.referenceAssetIds), asset.id]);
      await tx.canvasNode.update({
        where: { id: sourceNode.id },
        data: {
          status: "succeeded",
          dataJson: jsonValue({
            ...dataJson,
            referenceAssetIds,
          }),
        },
      });

      const output: ReferenceAssetJobOutput = {
        operation: input.operation,
        sourceNodeId: sourceNode.id,
        assetId: asset.id,
        provider: providerOutput.provider,
        model: providerOutput.model,
        prompt: providerOutput.prompt,
        referenceAssetIds: providerOutput.referenceAssetIds,
        providerOutput,
        completedAt: new Date().toISOString(),
      };

      return (await tx.generationJob.update({
        where: { id: existing.id },
        data: {
          status: "succeeded",
          outputJson: jsonValue(output),
          errorMessage: null,
        },
      })) as GenerationJobModel;
    });

    return this.toGenerationJobRecord<ReferenceImageJobInput, ReferenceAssetJobOutput>(completed);
  }

  private async succeedEditorExportJob(
    existing: GenerationJobModel,
    input: EditorExportJobInput,
    packageOutput: EditorExportPackageOutput,
  ): Promise<GenerationJobRecord<EditorExportJobInput, EditorExportJobOutput>> {
    if (packageOutput.mimeType !== EDITOR_PACKAGE_MIME_TYPE) {
      throw new BadRequestException("Editor export completion requires a zip package");
    }
    if (packageOutput.timeline.editorExportId !== input.editorExportId) {
      throw new BadRequestException("Editor export package does not match the claimed job");
    }
    this.validateEditorExportPackageOutput(input, packageOutput);

    const completed = await this.runTransaction(async (tx) => {
      const claimed = await tx.generationJob.updateMany({
        where: { id: existing.id, status: { in: WORKER_ACTIVE_JOB_STATUSES } },
        data: { errorMessage: null },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException("Only active generation jobs can succeed");
      }

      const videoNodes = (await tx.canvasNode.findMany({
        where: {
          projectId: existing.projectId,
          id: { in: input.videoNodeIds },
          type: "video",
        },
      })) as CanvasNodeModel[];
      if (videoNodes.length !== input.videoNodeIds.length) {
        throw new BadRequestException("Editor export selected VideoNodes are no longer valid");
      }
      const orderedVideoNodes = input.videoNodeIds.map((nodeId) => {
        const node = videoNodes.find((candidate) => candidate.id === nodeId);
        if (!node) {
          throw new BadRequestException(`Editor export selected VideoNode ${nodeId} is missing`);
        }
        return node;
      });
      const anchorNode = orderedVideoNodes[0];
      if (!anchorNode) {
        throw new BadRequestException("Editor export requires at least one VideoNode");
      }

      const packageAsset = await this.assetsService.createPackageAsset(
        existing.projectId,
        {
          packageOutput,
          metadataJson: {
            generationJobId: existing.id,
            editorExportId: input.editorExportId,
            selectedVideoNodeIds: input.videoNodeIds,
            sortMode: input.sortMode,
            exportPreset: input.exportPreset,
            sourceEditorExportId: input.sourceEditorExportId,
            generationSettings: input.generationSettings,
            packagingReferences: input.packagingReferences,
          },
        },
        tx,
      );
      const packageNode = await this.createEditorPackageNode(
        tx,
        existing,
        input,
        packageOutput,
        packageAsset,
        orderedVideoNodes,
      );
      const edges: CanvasEdgeModel[] = [];
      for (const videoNode of orderedVideoNodes) {
        edges.push(
          (await tx.canvasEdge.create({
            data: {
              projectId: existing.projectId,
              canvasDocumentId: anchorNode.canvasDocumentId,
              sourceNodeId: videoNode.id,
              targetNodeId: packageNode.id,
              sourceShapeId: videoNode.tldrawShapeId,
              targetShapeId: packageNode.tldrawShapeId,
              relation: "sent_to_editor",
              dataJson: jsonValue({
                generationJobId: existing.id,
                editorExportId: input.editorExportId,
                packageAssetId: packageAsset.id,
              }),
            },
          })) as CanvasEdgeModel,
        );
      }

      const output: EditorExportJobOutput = {
        operation: "editor_export",
        editorExportId: input.editorExportId,
        packageAssetId: packageAsset.id,
        packageNodeId: packageNode.id,
        edgeIds: edges.map((edge) => edge.id),
        selectedVideoNodeIds: input.videoNodeIds,
        sortMode: input.sortMode,
        exportPreset: input.exportPreset,
        sourceEditorExportId: input.sourceEditorExportId,
        timeline: packageOutput.timeline,
        storyboardCsv: packageOutput.storyboardCsv,
        clips: packageOutput.clips,
        completedAt: new Date().toISOString(),
      };

      await tx.editorExport.update({
        where: { id: input.editorExportId },
        data: {
          status: "succeeded",
          packageAssetId: packageAsset.id,
          timelineJson: jsonValue(packageOutput.timeline),
          storyboardCsv: packageOutput.storyboardCsv,
          errorMessage: null,
        },
      });

      return (await tx.generationJob.update({
        where: { id: existing.id },
        data: {
          status: "succeeded",
          targetNodeId: packageNode.id,
          outputJson: jsonValue(output),
          errorMessage: null,
        },
      })) as GenerationJobModel;
    });

    return this.toGenerationJobRecord<EditorExportJobInput, EditorExportJobOutput>(completed);
  }

  private validateEditorExportPackageOutput(
    input: EditorExportJobInput,
    packageOutput: EditorExportPackageOutput,
  ): void {
    if (packageOutput.timeline.projectId !== input.projectId) {
      throw new BadRequestException("Editor export package project does not match the claimed job");
    }
    if (packageOutput.timeline.sortMode !== input.sortMode) {
      throw new BadRequestException("Editor export package sort mode does not match the claimed job");
    }
    if (packageOutput.timeline.exportPreset !== input.exportPreset) {
      throw new BadRequestException("Editor export package preset does not match the claimed job");
    }
    if (packageOutput.clips.length !== input.clips.length) {
      throw new BadRequestException("Editor export package clip count does not match the claimed job");
    }

    for (let index = 0; index < input.clips.length; index += 1) {
      const expected = input.clips[index];
      const actual = packageOutput.clips[index];
      if (!expected || !actual) {
        throw new BadRequestException("Editor export package clip list is incomplete");
      }
      if (
        actual.videoNodeId !== expected.videoNodeId ||
        actual.videoAssetId !== expected.videoAssetId ||
        actual.filename !== expected.filename
      ) {
        throw new BadRequestException("Editor export package clips do not match the claimed job");
      }
    }
  }

  private async buildDirectGenerationInput(
    projectId: string,
    sourceNodeId: string,
    input: CreateGenerationJobInput,
  ): Promise<DirectGenerationJobInput> {
    switch (input.operation) {
      case "shot_to_image":
        return this.buildShotToImageInput(projectId, sourceNodeId, input);
      case "character_to_image":
        return this.buildCharacterToImageInput(projectId, sourceNodeId, input);
      case "location_to_image":
        return this.buildLocationToImageInput(projectId, sourceNodeId, input);
      case "image_refinement":
        return this.buildImageRefinementInput(projectId, sourceNodeId, input);
      case "image_to_video":
        return this.buildImageToVideoInput(projectId, sourceNodeId, input);
      case "ai_text_generation":
        return this.buildAiTextGenerationInput(projectId, sourceNodeId, input);
      case "ai_audio_generation":
        return this.buildAiAudioGenerationInput(projectId, sourceNodeId, input);
      default:
        throw new BadRequestException("Generation operation is not supported yet");
    }
  }

  private composeShotPromptForGeneration(
    projectId: string,
    shotNodeId: string,
    input: CreateGenerationJobInput,
  ) {
    const skillTemplateIds = uniqueStrings(input.skillTemplateIds ?? []);
    if (skillTemplateIds.length === 0) {
      return this.promptService.composeShotPrompt(projectId, shotNodeId);
    }
    return this.promptService.composeShotPrompt(projectId, shotNodeId, { skillTemplateIds });
  }

  private async buildShotToImageInput(
    projectId: string,
    shotNodeId: string,
    input: CreateGenerationJobInput,
  ): Promise<ShotToImageJobInput> {
    const composition = await this.composeShotPromptForGeneration(projectId, shotNodeId, input);
    const providerSettings = await this.resolveImageProviderSettings(projectId, input);
    const referenceLimit = providerSettings.provider.supportsReferenceImages
      ? providerSettings.provider.maxReferenceImages
      : 0;
    const referenceAssetIds = composition.referenceAssetIds.slice(0, referenceLimit);
    const omittedReferenceAssetIds = composition.referenceAssetIds.slice(referenceLimit);

    return {
      operation: "shot_to_image",
      projectId,
      sourceNodeId: shotNodeId,
      shotNodeId,
      prompt: composition.image.prompt,
      negativePrompt: composition.negativePrompt,
      referenceAssetIds,
      sourceNodeIds: composition.sourceNodeIds,
      debugParts: composition.debugParts,
      missingContext: composition.missingContext,
      provider: providerSettings.provider.id,
      providerVersionId: providerSettings.provider.providerVersionId,
      model: providerSettings.model,
      aspectRatio: providerSettings.aspectRatio,
      count: providerSettings.count,
      providerParams: providerSettings.providerParams,
      generationSettings: composition.resolvedGenerationSettings,
      omittedReferenceAssetIds: omittedReferenceAssetIds.length ? omittedReferenceAssetIds : undefined,
      referenceOmissionReason: omittedReferenceAssetIds.length
        ? `${providerSettings.provider.displayName} accepts up to ${referenceLimit} reference images.`
        : undefined,
      forceFailure: input.forceFailure,
    };
  }

  private async buildCharacterToImageInput(
    projectId: string,
    characterNodeId: string,
    input: CreateGenerationJobInput,
  ): Promise<CharacterToImageJobInput> {
    const canvas = await this.canvasService.getCanvas(projectId);
    const characterNode = canvas.nodes.find((node) => node.id === characterNodeId);
    if (!characterNode || characterNode.projectId !== projectId) {
      throw new NotFoundException("Character node not found");
    }
    if (characterNode.type !== "character_asset") {
      throw new BadRequestException("Character reference generation requires a Character node");
    }

    const characterData = dataObject(characterNode.dataJson) as CharacterAssetNodeData;
    const providerSettings = await this.resolveImageProviderSettings(projectId, input);
    const referenceLimit = providerSettings.provider.supportsReferenceImages
      ? providerSettings.provider.maxReferenceImages
      : 0;

    return {
      operation: "character_to_image",
      projectId,
      sourceNodeId: characterNode.id,
      characterNodeId: characterNode.id,
      prompt: this.characterReferencePrompt(characterNode, characterData),
      referenceAssetIds: stringArray(characterData.referenceAssetIds).slice(0, referenceLimit),
      sourceNodeIds: [characterNode.id],
      provider: providerSettings.provider.id,
      providerVersionId: providerSettings.provider.providerVersionId,
      model: providerSettings.model,
      aspectRatio: providerSettings.aspectRatio,
      providerParams: providerSettings.providerParams,
      assetPurpose: "character_reference",
      forceFailure: input.forceFailure,
    };
  }

  private async buildLocationToImageInput(
    projectId: string,
    locationNodeId: string,
    input: CreateGenerationJobInput,
  ): Promise<LocationToImageJobInput> {
    const canvas = await this.canvasService.getCanvas(projectId);
    const locationNode = canvas.nodes.find((node) => node.id === locationNodeId);
    if (!locationNode || locationNode.projectId !== projectId) {
      throw new NotFoundException("Location node not found");
    }
    if (locationNode.type !== "location_asset") {
      throw new BadRequestException("Location reference generation requires a Location node");
    }

    const locationData = dataObject(locationNode.dataJson) as LocationAssetNodeData;
    const providerSettings = await this.resolveImageProviderSettings(projectId, input);
    const referenceLimit = providerSettings.provider.supportsReferenceImages
      ? providerSettings.provider.maxReferenceImages
      : 0;

    return {
      operation: "location_to_image",
      projectId,
      sourceNodeId: locationNode.id,
      locationNodeId: locationNode.id,
      prompt: this.locationReferencePrompt(locationNode, locationData),
      referenceAssetIds: stringArray(locationData.referenceAssetIds).slice(0, referenceLimit),
      sourceNodeIds: [locationNode.id],
      provider: providerSettings.provider.id,
      providerVersionId: providerSettings.provider.providerVersionId,
      model: providerSettings.model,
      aspectRatio: providerSettings.aspectRatio,
      providerParams: providerSettings.providerParams,
      assetPurpose: "location_reference",
      forceFailure: input.forceFailure,
    };
  }

  private async buildImageRefinementInput(
    projectId: string,
    imageNodeId: string,
    input: CreateGenerationJobInput,
  ): Promise<ImageRefinementJobInput> {
    const prompt = optionalString(input.refinementPrompt);
    if (!prompt) {
      throw new BadRequestException("Image refinement prompt is required");
    }

    const canvas = await this.canvasService.getCanvas(projectId);
    const imageNode = canvas.nodes.find((node) => node.id === imageNodeId);
    if (!imageNode || imageNode.projectId !== projectId) {
      throw new NotFoundException("Image node not found");
    }
    if (imageNode.type !== "image") {
      throw new BadRequestException("Image refinement requires an Image node");
    }

    const imageData = dataObject(imageNode.dataJson) as ImageNodeData;
    const sourceImageAssetId = optionalString(imageData.assetId);
    if (!sourceImageAssetId) {
      throw new BadRequestException("Image node must have an image asset before refinement");
    }

    const parentShot = this.findParentShot(canvas, imageNode);
    const parentComposition = parentShot
      ? await this.composeShotPromptForGeneration(projectId, parentShot.id, input)
      : undefined;
    const generationSettings =
      parentComposition?.resolvedGenerationSettings ??
      (await this.resolveProjectGenerationSettings(projectId));
    const providerSettings = await this.resolveImageProviderSettings(projectId, input, "image_to_image");
    const rawReferenceAssetIds = uniqueStrings([
      ...stringArray(imageData.referenceAssetIds),
      ...(parentComposition?.referenceAssetIds ?? []),
    ]);
    const referenceLimit = providerSettings.provider.supportsReferenceImages
      ? providerSettings.provider.maxReferenceImages
      : 0;
    const referenceAssetIds = rawReferenceAssetIds.slice(0, referenceLimit);
    const sourceNodeIds = uniqueStrings([
      imageNode.id,
      parentShot?.id,
      parentComposition?.sourceNodeIds.sceneNodeId,
      ...(parentComposition?.sourceNodeIds.characterNodeIds ?? []),
      parentComposition?.sourceNodeIds.locationNodeId,
    ]);

    return {
      operation: "image_refinement",
      projectId,
      sourceNodeId: imageNode.id,
      imageNodeId: imageNode.id,
      sourceImageAssetId,
      prompt,
      referenceAssetIds,
      sourceNodeIds,
      parentShotNodeId: parentShot?.id,
      parentShotTitle: parentShot?.title,
      provider: providerSettings.provider.id,
      providerVersionId: providerSettings.provider.providerVersionId,
      model: providerSettings.model,
      aspectRatio: providerSettings.aspectRatio,
      providerParams: providerSettings.providerParams,
      generationSettings,
      forceFailure: input.forceFailure,
    };
  }

  private async buildImageToVideoInput(
    projectId: string,
    imageNodeId: string,
    input: CreateGenerationJobInput,
  ): Promise<ImageToVideoJobInput> {
    const canvas = await this.canvasService.getCanvas(projectId);
    const imageNode = canvas.nodes.find((node) => node.id === imageNodeId);
    if (!imageNode || imageNode.projectId !== projectId) {
      throw new NotFoundException("Image node not found");
    }
    if (imageNode.type !== "image") {
      throw new BadRequestException("Image-to-video generation requires an Image node");
    }

    const imageData = dataObject(imageNode.dataJson) as ImageNodeData;
    const sourceImageAssetId = optionalString(imageData.assetId);
    if (!sourceImageAssetId) {
      throw new BadRequestException("Image node must have an image asset before video generation");
    }

    const parentShot = this.findParentShot(canvas, imageNode);
    const parentComposition = parentShot
      ? await this.composeShotPromptForGeneration(projectId, parentShot.id, input)
      : undefined;
    const generationSettings =
      parentComposition?.resolvedGenerationSettings ??
      (await this.resolveProjectGenerationSettings(projectId));
    const parentShotData = dataObject(parentShot?.dataJson) as ShotNodeData;
    const prompt =
      parentComposition?.video.prompt ??
      optionalString(imageData.prompt) ??
      optionalString(imageData.description) ??
      "Animate the generated image into a short cinematic video.";
    const sourceDurationSeconds =
      optionalNumber(parentShotData.durationSeconds) ?? optionalNumber(parentShotData.durationSec);
    const providerSettings = await this.resolveVideoProviderSettings(projectId, input, sourceDurationSeconds);
    const rawReferenceAssetIds =
      parentComposition?.referenceAssetIds ?? stringArray(imageData.referenceAssetIds);
    const referenceLimit = providerSettings.provider.supportsReferenceImages
      ? providerSettings.provider.maxReferenceImages
      : 0;
    const referenceAssetIds = rawReferenceAssetIds.slice(0, referenceLimit);
    const referenceMedia = await this.videoReferenceMedia(
      projectId,
      input,
      providerSettings.provider,
      sourceImageAssetId,
      imageNode.id,
      referenceAssetIds,
    );
    const sourceNodeIds = uniqueStrings([
      imageNode.id,
      parentShot?.id,
      parentComposition?.sourceNodeIds.sceneNodeId,
      ...(parentComposition?.sourceNodeIds.characterNodeIds ?? []),
      parentComposition?.sourceNodeIds.locationNodeId,
    ]);

    return {
      operation: "image_to_video",
      projectId,
      sourceNodeId: imageNode.id,
      imageNodeId: imageNode.id,
      sourceImageAssetId,
      prompt,
      durationSeconds: providerSettings.durationSeconds,
      aspectRatio: providerSettings.aspectRatio,
      resolution: providerSettings.resolution,
      parentShotNodeId: parentShot?.id,
      parentShotTitle: parentShot?.title,
      referenceAssetIds,
      referenceMedia,
      sourceNodeIds,
      provider: providerSettings.provider.id,
      providerVersionId: providerSettings.provider.providerVersionId,
      model: providerSettings.model,
      providerParams: providerSettings.providerParams,
      generationSettings,
      forceFailure: input.forceFailure,
    };
  }

  private async buildAiTextGenerationInput(
    projectId: string,
    aiTextNodeId: string,
    input: CreateGenerationJobInput,
  ): Promise<AiTextGenerationJobInput> {
    const canvas = await this.canvasService.getCanvas(projectId);
    const aiTextNode = canvas.nodes.find((node) => node.id === aiTextNodeId);
    if (!aiTextNode || aiTextNode.projectId !== projectId) {
      throw new NotFoundException("AI Text node not found");
    }
    if (aiTextNode.type !== "ai_text") {
      throw new BadRequestException("AI text generation requires an AI Text node");
    }

    const dataJson = dataObject(aiTextNode.dataJson) as AiTextNodeData;
    const prompt = optionalString(input.textPrompt) ?? optionalString(dataJson.prompt);
    if (!prompt) {
      throw new BadRequestException("AI text generation prompt is required");
    }

    const providerSettings = await this.resolveLlmProviderSettings(projectId, input);
    const context = this.aiTextContextItems(canvas, aiTextNode);
    const sourceNodeIds = uniqueStrings([
      aiTextNode.id,
      ...context.map((item) => item.nodeId),
    ]);

    return {
      operation: "ai_text_generation",
      projectId,
      sourceNodeId: aiTextNode.id,
      aiTextNodeId: aiTextNode.id,
      prompt,
      context,
      sourceNodeIds,
      provider: providerSettings.provider.id,
      model: providerSettings.model,
      skillTemplateIds: uniqueStrings(input.skillTemplateIds ?? []),
      forceFailure: input.forceFailure,
    };
  }

  private aiTextContextItems(
    canvas: CanvasLoadResult,
    targetNode: CanvasNodeRecord,
  ): AiTextGenerationContextItem[] {
    const sourceById = new Map(canvas.nodes.map((node) => [node.id, node]));
    const seen = new Set<string>();
    const context: AiTextGenerationContextItem[] = [];

    for (const edge of canvas.edges) {
      if (edge.relation !== "derived_from" || edge.targetNodeId !== targetNode.id) {
        continue;
      }
      if (seen.has(edge.sourceNodeId)) {
        continue;
      }
      seen.add(edge.sourceNodeId);

      const source = sourceById.get(edge.sourceNodeId);
      if (!source) {
        continue;
      }

      const text = this.aiTextContextText(source);
      if (!text) {
        continue;
      }

      context.push({
        nodeId: source.id,
        nodeType: source.type,
        title: optionalString(source.title),
        text,
      });
    }

    return context;
  }

  private aiTextContextText(node: CanvasNodeRecord): string | undefined {
    const data = dataObject(node.dataJson);

    switch (node.type) {
      case "novel":
        return compactText([
          labelledField(data, "storyboardTitle", "Storyboard title"),
          labelledField(data, "synopsis", "Synopsis"),
          labelledField(data, "sourceText", "Source text"),
        ]);
      case "source_text":
      case "source_image":
      case "source_video":
      case "source_audio":
        return compactText([
          labelledField(data, "text", "Text"),
          labelledField(data, "sourceText", "Source text"),
          labelledField(data, "textPreview", "Text preview"),
          labelledField(data, "caption", "Caption"),
          labelledField(data, "description", "Description"),
          labelledField(data, "originalFilename", "Filename"),
          labelledField(data, "mimeType", "MIME type"),
        ]);
      case "scene":
        return compactText([
          labelledField(data, "sceneNumber", "Scene"),
          labelledField(data, "synopsis", "Synopsis"),
          labelledField(data, "location", "Location"),
          labelledField(data, "timeOfDay", "Time of day"),
          labelledField(data, "mood", "Mood"),
          labelledField(data, "sourceExcerpt", "Source excerpt"),
        ]);
      case "shot":
        return compactText([
          labelledField(data, "shotNumber", "Shot"),
          labelledField(data, "visualDescription", "Visual description"),
          labelledField(data, "action", "Action"),
          labelledField(data, "cameraMovement", "Camera movement"),
          labelledField(data, "imagePrompt", "Image prompt"),
          labelledField(data, "videoPrompt", "Video prompt"),
          labelledField(data, "dialogue", "Dialogue"),
          labelledField(data, "narration", "Narration"),
          labelledField(data, "mood", "Mood"),
          labelledField(data, "sourceExcerpt", "Source excerpt"),
        ]);
      case "character_asset":
        return compactText([
          labelledField(data, "name", "Name"),
          labelledField(data, "role", "Role"),
          labelledField(data, "appearance", "Appearance"),
          labelledField(data, "personality", "Personality"),
          labelledField(data, "wardrobe", "Wardrobe"),
          labelledField(data, "identityPrompt", "Identity prompt"),
          labelledField(data, "consistencyPrompt", "Consistency prompt"),
        ]);
      case "location_asset":
        return compactText([
          labelledField(data, "name", "Name"),
          labelledField(data, "environment", "Environment"),
          labelledField(data, "mood", "Mood"),
          labelledField(data, "visualStyle", "Visual style"),
          labelledField(data, "locationType", "Location type"),
          labelledField(data, "locationPrompt", "Location prompt"),
          labelledField(data, "consistencyPrompt", "Consistency prompt"),
        ]);
      case "ai_text":
        return compactText([
          labelledField(data, "outputText", "Generated text"),
          labelledField(data, "prompt", "Prompt"),
        ]);
      case "image":
      case "video":
        return compactText([
          labelledField(data, "description", "Description"),
          labelledField(data, "caption", "Caption"),
          labelledField(data, "prompt", "Prompt"),
        ]);
      default:
        return compactText([
          labelledField(data, "description", "Description"),
          labelledField(data, "text", "Text"),
          labelledField(data, "prompt", "Prompt"),
          optionalString(node.title) ? `Title: ${optionalString(node.title)}` : undefined,
        ]);
    }
  }

  private async buildAiAudioGenerationInput(
    projectId: string,
    aiAudioNodeId: string,
    input: CreateGenerationJobInput,
  ): Promise<AiAudioGenerationJobInput> {
    const canvas = await this.canvasService.getCanvas(projectId);
    const aiAudioNode = canvas.nodes.find((node) => node.id === aiAudioNodeId);
    if (!aiAudioNode || aiAudioNode.projectId !== projectId) {
      throw new NotFoundException("AI Audio node not found");
    }
    if (aiAudioNode.type !== "ai_audio") {
      throw new BadRequestException("AI audio generation requires an AI Audio node");
    }

    const dataJson = dataObject(aiAudioNode.dataJson) as AiAudioNodeData;
    const prompt =
      optionalString(input.audioPrompt) ??
      optionalString(dataJson.scriptText) ??
      optionalString(dataJson.prompt);
    if (!prompt) {
      throw new BadRequestException("AI audio generation prompt is required");
    }

    const context = this.aiAudioContextItems(canvas, aiAudioNode);
    const referenceAssetIds = uniqueStrings([
      ...stringArray(dataJson.voiceReferenceAssetIds),
      ...context.map((item) => item.assetId),
    ]);
    for (const assetId of referenceAssetIds) {
      const asset = await this.assetsService.getAsset(projectId, assetId);
      if (!asset.mimeType.startsWith("audio/")) {
        throw new BadRequestException("AI audio voice references must be audio assets");
      }
    }

    return {
      operation: "ai_audio_generation",
      projectId,
      sourceNodeId: aiAudioNode.id,
      aiAudioNodeId: aiAudioNode.id,
      prompt,
      scriptText: prompt,
      context,
      sourceNodeIds: uniqueStrings([
        aiAudioNode.id,
        ...context.map((item) => item.nodeId),
      ]),
      referenceAssetIds,
      provider: input.audioProvider ?? "mock-audio",
      model: input.audioModel ?? "mock-tts-v1",
      durationSeconds: input.audioDurationSeconds ?? dataJson.durationSeconds,
      providerParams: this.normalizedAudioProviderParams(input.audioProviderParams),
      skillTemplateIds: uniqueStrings(input.skillTemplateIds ?? []),
      forceFailure: input.forceFailure,
    };
  }

  private aiAudioContextItems(
    canvas: CanvasLoadResult,
    targetNode: CanvasNodeRecord,
  ): AiAudioGenerationContextItem[] {
    const sourceById = new Map(canvas.nodes.map((node) => [node.id, node]));
    const context: AiAudioGenerationContextItem[] = [];
    const seen = new Set<string>();

    for (const edge of canvas.edges) {
      if (edge.relation !== "derived_from" || edge.targetNodeId !== targetNode.id) {
        continue;
      }

      const source = sourceById.get(edge.sourceNodeId);
      if (!source) {
        continue;
      }
      const title = optionalString(source.title);
      const text = this.aiTextContextText(source);
      if (text && !seen.has(`${source.id}:text`)) {
        seen.add(`${source.id}:text`);
        context.push({
          nodeId: source.id,
          nodeType: source.type,
          title,
          text,
        });
      }

      for (const reference of this.audioContextReferences(source)) {
        const key = `${source.id}:audio:${reference.assetId}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        context.push({
          nodeId: source.id,
          nodeType: source.type,
          title,
          assetId: reference.assetId,
          label: reference.label,
          role: reference.role,
        });
      }
    }

    return context;
  }

  private audioContextReferences(
    source: CanvasNodeRecord,
  ): Array<{ assetId: string; label?: string; role?: AiAudioGenerationContextItem["role"] }> {
    const data = dataObject(source.dataJson);
    const references: Array<{ assetId: string; label?: string; role?: AiAudioGenerationContextItem["role"] }> = [];

    if (source.type === "source_audio") {
      const assetId = optionalString(data.assetId);
      if (assetId) {
        references.push({
          assetId,
          label: optionalString(data.originalFilename),
          role: "voice",
        });
      }
    }

    for (const key of ["voiceReferences", "audioReferences"]) {
      const value = data[key];
      if (!Array.isArray(value)) {
        continue;
      }
      for (const item of value) {
        const raw = dataObject(item);
        const assetId = optionalString(raw.assetId);
        if (!assetId) {
          continue;
        }
        references.push({
          assetId,
          label: optionalString(raw.label),
          role: this.audioReferenceRole(raw.role),
        });
      }
    }

    for (const assetId of uniqueStrings([
      ...stringArray(data.voiceAssetIds),
      ...stringArray(data.audioAssetIds),
    ])) {
      references.push({ assetId, role: source.type === "character_asset" ? "voice" : "clip_audio" });
    }

    return references;
  }

  private audioReferenceRole(value: unknown): AiAudioGenerationContextItem["role"] | undefined {
    return value === "voice" ||
      value === "narration" ||
      value === "sound_effect" ||
      value === "bgm" ||
      value === "clip_audio"
      ? value
      : undefined;
  }

  private normalizedAudioProviderParams(providerParams: CanvasSnapshotJson | undefined): CanvasSnapshotJson {
    const raw = dataObject(providerParams);
    const normalized: Record<string, CanvasSnapshotJson> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (isJsonValue(value)) {
        normalized[key] = value;
      }
    }
    return normalized;
  }

  private async resolveProjectGenerationSettings(projectId: string): Promise<ResolvedGenerationSettings> {
    const project = (await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { generationSettingsJson: true },
    })) as ProjectGenerationSettingsModel | null;
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return resolveGenerationSettings({ projectSettings: project.generationSettingsJson });
  }

  private async videoReferenceMedia(
    projectId: string,
    input: Pick<CreateGenerationJobInput, "referenceMedia">,
    provider: VideoProviderCatalogItem,
    sourceImageAssetId: string,
    sourceNodeId: string,
    referenceAssetIds: string[],
  ): Promise<VideoReferenceMediaInput[]> {
    const media: VideoReferenceMediaInput[] = [
      { assetId: sourceImageAssetId, role: "first_frame", sourceNodeId },
      ...referenceAssetIds.map((assetId) => ({
        assetId,
        role: "reference_image" as const,
      })),
      ...(input.referenceMedia ?? []),
    ];
    const deduped = Array.from(
      new Map(media.map((item) => [`${item.role}:${item.assetId}:${item.sourceNodeId ?? ""}`, item])).values(),
    );

    const roleCounts = deduped.reduce((counts, item) => {
      counts[item.role] = (counts[item.role] ?? 0) + 1;
      return counts;
    }, {} as Partial<Record<VideoReferenceMediaInput["role"], number>>);
    if (roleCounts.first_frame && !provider.supportsFirstFrame) {
      throw new BadRequestException(`${provider.displayName} does not support first frame input`);
    }
    if (roleCounts.last_frame && !provider.supportsLastFrame) {
      throw new BadRequestException(`${provider.displayName} does not support last frame input`);
    }
    if ((roleCounts.reference_image ?? 0) > provider.maxReferenceImages || (!provider.supportsReferenceImages && roleCounts.reference_image)) {
      throw new BadRequestException(`${provider.displayName} does not support that many reference images`);
    }
    if (roleCounts.reference_video && !provider.supportsReferenceVideo) {
      throw new BadRequestException(`${provider.displayName} does not support reference video input`);
    }
    if ((roleCounts.reference_video ?? 0) > (provider.maxReferenceVideos ?? 0)) {
      throw new BadRequestException(`${provider.displayName} reference video limit exceeded`);
    }
    if (roleCounts.reference_audio && !provider.supportsReferenceAudio) {
      throw new BadRequestException(`${provider.displayName} does not support reference audio input`);
    }
    if ((roleCounts.reference_audio ?? 0) > (provider.maxReferenceAudios ?? 0)) {
      throw new BadRequestException(`${provider.displayName} reference audio limit exceeded`);
    }
    for (const item of deduped) {
      await this.assetsService.getAsset(projectId, item.assetId);
    }
    return deduped;
  }

  private characterReferencePrompt(
    node: CanvasNodeRecord,
    data: CharacterAssetNodeData,
  ): string {
    const lockedFields = stringArray(data.lockedFields);
    return compactText([
      "Create a consistent character reference image for storyboard generation.",
      optionalString(data.identityPrompt),
      optionalString(data.consistencyPrompt),
      optionalString(data.appearance),
      optionalString(data.wardrobe) ? `Wardrobe: ${optionalString(data.wardrobe)}` : undefined,
      optionalString(data.role) ? `Role: ${optionalString(data.role)}` : undefined,
      optionalString(data.personality) ? `Personality: ${optionalString(data.personality)}` : undefined,
      data.locked === true ? "Preserve locked character details exactly." : undefined,
      lockedFields.length ? `Locked fields: ${lockedFields.join(", ")}` : undefined,
      `Source node: ${node.title?.trim() || node.id}`,
    ]);
  }

  private locationReferencePrompt(
    node: CanvasNodeRecord,
    data: LocationAssetNodeData,
  ): string {
    return compactText([
      "Create a consistent location reference image for storyboard generation.",
      optionalString(data.locationPrompt),
      optionalString(data.consistencyPrompt),
      optionalString(data.environment),
      optionalString(data.visualStyle) ? `Visual style: ${optionalString(data.visualStyle)}` : undefined,
      optionalString(data.mood) ? `Mood: ${optionalString(data.mood)}` : undefined,
      optionalString(data.locationType) ? `Location type: ${optionalString(data.locationType)}` : undefined,
      `Source node: ${node.title?.trim() || node.id}`,
    ]);
  }

  private findParentShot(
    canvas: CanvasLoadResult,
    imageNode: CanvasNodeRecord,
  ): CanvasNodeRecord<ShotNodeData> | undefined {
    const edge = canvas.edges.find(
      (candidate) =>
        candidate.relation === "generated_image" && candidate.targetNodeId === imageNode.id,
    );
    const parentNode = edge
      ? canvas.nodes.find((candidate) => candidate.id === edge.sourceNodeId)
      : undefined;
    return parentNode?.type === "shot" ? (parentNode as CanvasNodeRecord<ShotNodeData>) : undefined;
  }

  private async findProjectJob(projectId: string, jobId: string): Promise<GenerationJobModel> {
    const job = (await this.prisma.generationJob.findFirst({
      where: { id: jobId, projectId },
    })) as GenerationJobModel | null;

    if (!job) {
      throw new NotFoundException("Generation job not found");
    }

    return job;
  }

  private validateProviderOutput(
    job: GenerationJobModel,
    input: GeneratedMediaJobInput,
    output: GeneratedMediaProviderOutput,
  ): void {
    if (output.provider !== job.provider) {
      throw new BadRequestException("Provider output does not match the claimed job provider");
    }
    if (input.operation === "shot_to_image" && !output.mimeType.startsWith("image/")) {
      throw new BadRequestException("Shot image generation must produce an image asset");
    }
    if (input.operation === "image_refinement" && !output.mimeType.startsWith("image/")) {
      throw new BadRequestException("Image refinement must produce an image asset");
    }
    if (input.operation === "image_to_video" && !output.mimeType.startsWith("video/")) {
      throw new BadRequestException("Image video generation must produce a video asset");
    }
    if (input.operation === "workflow_run") {
      if (input.outputKind === "image" && !output.mimeType.startsWith("image/")) {
        throw new BadRequestException("Workflow image output must produce an image asset");
      }
      if (input.outputKind === "video" && !output.mimeType.startsWith("video/")) {
        throw new BadRequestException("Workflow video output must produce a video asset");
      }
    }
  }

  private validateReferenceImageProviderOutput(
    job: GenerationJobModel,
    input: ReferenceImageJobInput,
    output: GeneratedMediaProviderOutput,
  ): void {
    if (output.provider !== job.provider) {
      throw new BadRequestException("Provider output does not match the claimed job provider");
    }
    if (!output.mimeType.startsWith("image/")) {
      const label = input.operation === "character_to_image" ? "Character" : "Location";
      throw new BadRequestException(`${label} reference generation must produce an image asset`);
    }
  }

  private validateReferenceImageSourceNode(
    input: ReferenceImageJobInput,
    sourceNode: CanvasNodeModel,
  ): void {
    if (input.operation === "character_to_image" && sourceNode.type !== "character_asset") {
      throw new BadRequestException("Character reference completion requires a Character node");
    }
    if (input.operation === "location_to_image" && sourceNode.type !== "location_asset") {
      throw new BadRequestException("Location reference completion requires a Location node");
    }
  }

  private normalizeCompletionOutputs(
    input: GeneratedMediaJobInput,
    providerOutput: GeneratedMediaProviderOutput,
    providerOutputs: GeneratedMediaProviderOutput[] | undefined,
  ): GeneratedMediaProviderOutput[] {
    if (input.operation === "image_to_video") {
      if (providerOutputs && providerOutputs.length > 1) {
        throw new BadRequestException("Image video generation supports only one provider output");
      }
      return [providerOutput];
    }
    if (input.operation === "image_refinement") {
      if (providerOutputs && providerOutputs.length > 1) {
        throw new BadRequestException("Image refinement supports only one provider output");
      }
      return [providerOutput];
    }
    if (input.operation === "workflow_run") {
      if (providerOutputs && providerOutputs.length > 1) {
        throw new BadRequestException("Workflow run supports one output in the MVP adapter");
      }
      return [providerOutput];
    }
    if (input.operation !== "shot_to_image") {
      throw new BadRequestException("Generated media completion requires a media generation input");
    }

    const outputs = providerOutputs?.length ? providerOutputs : [providerOutput];
    if (outputs.length < 1) {
      throw new BadRequestException("Shot image generation requires at least one provider output");
    }
    const requestedCount = input.count ?? 1;
    if (outputs.length > requestedCount) {
      throw new BadRequestException(
        `Shot image generation returned ${outputs.length} outputs for requested count ${requestedCount}`,
      );
    }

    return outputs;
  }

  private async resolveLlmProviderSettings(
    projectId: string,
    input: CreateGenerationJobInput,
  ): Promise<{
    provider: LlmProviderCatalogItem;
    model: string;
  }> {
    const providers = (await this.providersService.getProjectLlmProviders(projectId)).providers;
    const providerId = input.llmProvider ?? "mock-llm";
    const provider = providers.find((candidate) => candidate.id === providerId);
    if (!provider) {
      throw new BadRequestException(`Unknown LLM provider: ${providerId}`);
    }
    if (!provider.enabled) {
      throw new BadRequestException(provider.disabledReason ?? `${provider.displayName} is disabled`);
    }

    const model = input.llmModel ?? provider.defaultModel;
    if (!provider.models.some((candidate) => candidate.id === model)) {
      throw new BadRequestException(`Model ${model} is not available for ${provider.displayName}`);
    }

    return {
      provider,
      model,
    };
  }

  private async resolveImageProviderSettings(
    projectId: string,
    input: CreateGenerationJobInput,
    requiredMode: "text_to_image" | "image_to_image" = "text_to_image",
  ): Promise<{
    provider: ImageProviderCatalogItem;
    model: string;
    aspectRatio: ProjectAspectRatio;
    count: number;
    providerParams: CanvasSnapshotJson;
  }> {
    const providers = (await this.providersService.getProjectImageProviders(projectId)).providers;
    const providerId = input.provider ?? "mock-image";
    const provider = providers.find((candidate) => candidate.id === providerId);
    if (!provider) {
      throw new BadRequestException(`Unknown image provider: ${providerId}`);
    }
    if (!provider.enabled) {
      throw new BadRequestException(provider.disabledReason ?? `${provider.displayName} is disabled`);
    }
    if (!provider.supportedModes.includes(requiredMode)) {
      const modeLabel = requiredMode === "image_to_image" ? "image refinement" : "image generation";
      throw new BadRequestException(`${provider.displayName} does not support ${modeLabel}`);
    }

    const model = input.model ?? provider.defaultModel;
    if (!provider.models.some((candidate) => candidate.id === model)) {
      throw new BadRequestException(`Model ${model} is not available for ${provider.displayName}`);
    }

    const aspectRatio = input.aspectRatio ?? provider.defaultAspectRatio;
    if (!provider.supportedAspectRatios.includes(aspectRatio)) {
      throw new BadRequestException(
        `Aspect ratio ${aspectRatio} is not available for ${provider.displayName}`,
      );
    }

    const count = input.count ?? 1;
    if (count > provider.maxOutputs || (!provider.supportsMultipleOutputs && count > 1)) {
      throw new BadRequestException(`${provider.displayName} supports at most ${provider.maxOutputs} output(s)`);
    }

    return {
      provider,
      model,
      aspectRatio,
      count,
      providerParams: this.normalizedProviderParams(input.providerParams, provider),
    };
  }

  private normalizedProviderParams(
    providerParams: CanvasSnapshotJson | undefined,
    provider: Pick<ImageProviderCatalogItem, "displayName" | "parameters">,
  ): CanvasSnapshotJson {
    const raw = dataObject(providerParams);
    const normalized: Record<string, CanvasSnapshotJson> = {};

    for (const parameter of provider.parameters) {
      const value = raw[parameter.id] ?? parameter.defaultValue;
      if (value === undefined) {
        continue;
      }
      if (!isJsonValue(value)) {
        throw new BadRequestException(`Provider parameter ${parameter.id} must be JSON-compatible`);
      }
      if (
        parameter.type === "select" &&
        parameter.options &&
        !parameter.options.some((option) => option.value === value)
      ) {
        throw new BadRequestException(
          `Provider parameter ${parameter.id} is not available for ${provider.displayName}`,
        );
      }
      normalized[parameter.id] = value;
    }

    return normalized;
  }

  private async resolveVideoProviderSettings(
    projectId: string,
    input: CreateGenerationJobInput,
    fallbackDurationSeconds: number | undefined,
  ): Promise<{
    provider: VideoProviderCatalogItem;
    model: string;
    aspectRatio: ProjectAspectRatio;
    durationSeconds: number;
    resolution: VideoProviderResolution;
    providerParams: CanvasSnapshotJson;
  }> {
    const providers = (await this.providersService.getProjectVideoProviders(projectId)).providers;
    const providerId = input.videoProvider ?? "mock-video";
    const provider = providers.find((candidate) => candidate.id === providerId);
    if (!provider) {
      throw new BadRequestException(`Unknown video provider: ${providerId}`);
    }
    if (!provider.enabled) {
      throw new BadRequestException(provider.disabledReason ?? `${provider.displayName} is disabled`);
    }
    if (!provider.supportedModes.includes("image_to_video")) {
      throw new BadRequestException(`${provider.displayName} does not support image-to-video generation`);
    }

    const model = input.videoModel ?? provider.defaultModel;
    if (!provider.models.some((candidate) => candidate.id === model)) {
      throw new BadRequestException(`Model ${model} is not available for ${provider.displayName}`);
    }

    const aspectRatio = input.videoAspectRatio ?? provider.defaultAspectRatio;
    if (!provider.supportedAspectRatios.includes(aspectRatio)) {
      throw new BadRequestException(
        `Aspect ratio ${aspectRatio} is not available for ${provider.displayName}`,
      );
    }

    const fallbackDuration =
      fallbackDurationSeconds && provider.supportedDurationSeconds.includes(fallbackDurationSeconds)
        ? fallbackDurationSeconds
        : provider.defaultDurationSeconds;
    const durationSeconds = input.durationSeconds ?? fallbackDuration;
    if (!provider.supportedDurationSeconds.includes(durationSeconds)) {
      throw new BadRequestException(
        `Duration ${durationSeconds}s is not available for ${provider.displayName}`,
      );
    }

    const resolution = input.resolution ?? provider.defaultResolution;
    if (!provider.supportedResolutions.includes(resolution)) {
      throw new BadRequestException(`Resolution ${resolution} is not available for ${provider.displayName}`);
    }

    return {
      provider,
      model,
      aspectRatio,
      durationSeconds,
      resolution,
      providerParams: this.normalizedProviderParams(input.videoProviderParams, provider),
    };
  }

  private async findSourceNode(
    tx: GenerationPrismaClient,
    job: GenerationJobModel,
  ): Promise<CanvasNodeModel> {
    if (!job.sourceNodeId) {
      throw new BadRequestException("Generation job has no source node");
    }

    const sourceNode = (await tx.canvasNode.findFirst({
      where: {
        id: job.sourceNodeId,
        projectId: job.projectId,
      },
    })) as CanvasNodeModel | null;
    if (!sourceNode) {
      throw new NotFoundException("Generation source node not found");
    }

    return sourceNode;
  }

  private async createGeneratedNode(
    tx: GenerationPrismaClient,
    job: GenerationJobModel,
    input: GeneratedMediaJobInput,
    providerOutput: GeneratedMediaProviderOutput,
    asset: AssetDetail,
    sourceNode: CanvasNodeModel,
    outputIndex = 0,
  ): Promise<CanvasNodeModel> {
    const targetType: Extract<CanvasNodeType, "image" | "video"> =
      input.operation === "image_to_video" || (input.operation === "workflow_run" && input.outputKind === "video")
        ? "video"
        : "image";
    if (input.operation === "shot_to_image" && sourceNode.type !== "shot") {
      throw new BadRequestException("Shot image completion requires a Shot source node");
    }
    if (input.operation === "image_refinement" && sourceNode.type !== "image") {
      throw new BadRequestException("Image refinement completion requires an Image source node");
    }
    if (input.operation === "image_to_video" && sourceNode.type !== "image") {
      throw new BadRequestException("Image video completion requires an Image source node");
    }

    const outputOrdinal = outputIndex + 1;
    return (await tx.canvasNode.create({
      data: {
        projectId: job.projectId,
        canvasDocumentId: sourceNode.canvasDocumentId,
        tldrawShapeId:
          outputIndex === 0
            ? `shape:generated-${job.id}-${targetType}`
            : `shape:generated-${job.id}-${targetType}-${outputOrdinal}`,
        type: targetType,
        title: this.generatedNodeTitle(sourceNode, targetType, outputOrdinal, input.operation),
        x: sourceNode.x + sourceNode.width + 120 + outputIndex * 360,
        y: sourceNode.y + outputIndex * 40,
        width: 320,
        height: targetType === "image" ? 220 : 180,
        zIndex: sourceNode.zIndex + 1,
        status: "succeeded",
        dataJson: jsonValue({
          assetId: asset.id,
          prompt: providerOutput.prompt,
          provider: providerOutput.provider,
          model: providerOutput.model,
          generationJobId: job.id,
          generationOperation: input.operation,
          generatedFromNodeId: sourceNode.id,
          sourceNodeIds: this.sourceNodeIdsForInput(input),
          referenceAssetIds: providerOutput.referenceAssetIds,
          outputIndex,
          generationSettings: this.generationSettingsForInput(input),
          inputJson: input,
        }),
      },
    })) as CanvasNodeModel;
  }

  private async createEditorPackageNode(
    tx: GenerationPrismaClient,
    job: GenerationJobModel,
    input: EditorExportJobInput,
    packageOutput: EditorExportPackageOutput,
    packageAsset: AssetDetail,
    videoNodes: CanvasNodeModel[],
  ): Promise<CanvasNodeModel> {
    const anchorNode = videoNodes[0];
    if (!anchorNode) {
      throw new BadRequestException("Editor package node requires at least one source VideoNode");
    }
    const maxX = Math.max(...videoNodes.map((node) => node.x + node.width));
    const minY = Math.min(...videoNodes.map((node) => node.y));
    const maxZ = Math.max(...videoNodes.map((node) => node.zIndex));

    return (await tx.canvasNode.create({
      data: {
        projectId: job.projectId,
        canvasDocumentId: anchorNode.canvasDocumentId,
        tldrawShapeId: `shape:editor-package-${input.editorExportId}`,
        type: "editor_package",
        title: `Editor Package ${input.editorExportId}`,
        x: maxX + 140,
        y: minY,
        width: 340,
        height: 180,
        zIndex: maxZ + 1,
        status: "succeeded",
        dataJson: jsonValue({
          packageName: `Editor Package ${input.editorExportId}`,
          format: "zip",
          assetId: packageAsset.id,
          editorExportId: input.editorExportId,
          packageAssetId: packageAsset.id,
          selectedVideoNodeIds: input.videoNodeIds,
          sortMode: input.sortMode,
          exportPreset: input.exportPreset,
          sourceEditorExportId: input.sourceEditorExportId,
          clipCount: packageOutput.clips.length,
          exportedAt: new Date().toISOString(),
          generationSettings: input.generationSettings,
          packagingReferences: input.packagingReferences,
          inputJson: input,
          timeline: packageOutput.timeline,
        }),
      },
    })) as CanvasNodeModel;
  }

  private async createGeneratedEdge(
    tx: GenerationPrismaClient,
    job: GenerationJobModel,
    input: GeneratedMediaJobInput,
    sourceNode: CanvasNodeModel,
    targetNode: CanvasNodeModel,
    asset: AssetDetail,
  ): Promise<CanvasEdgeModel> {
    const relation =
      input.operation === "shot_to_image"
        ? "generated_image"
        : input.operation === "image_refinement"
          ? "derived_from"
          : "generated_video";

    return (await tx.canvasEdge.create({
      data: {
        projectId: job.projectId,
        canvasDocumentId: sourceNode.canvasDocumentId,
        sourceNodeId: sourceNode.id,
        targetNodeId: targetNode.id,
        sourceShapeId: sourceNode.tldrawShapeId,
        targetShapeId: targetNode.tldrawShapeId,
        relation,
        dataJson: jsonValue({
          generationJobId: job.id,
          assetId: asset.id,
        }),
      },
    })) as CanvasEdgeModel;
  }

  private generatedNodeData(
    jobId: string,
    input: GeneratedMediaJobInput,
    providerOutput: GeneratedMediaProviderOutput,
    asset: AssetDetail,
    output: GeneratedMediaJobOutput,
    sourceNode: CanvasNodeModel,
  ): Record<string, unknown> {
    return {
      assetId: asset.id,
      prompt: providerOutput.prompt,
      ...(input.operation === "image_to_video" ? { durationSeconds: input.durationSeconds } : {}),
      description: `Generated by ${providerOutput.provider}`,
      provider: providerOutput.provider,
      model: providerOutput.model,
      generationJobId: jobId,
      generationOperation: input.operation,
      generatedFromNodeId: sourceNode.id,
      sourceNodeIds: this.sourceNodeIdsForInput(input),
      referenceAssetIds: providerOutput.referenceAssetIds,
      generationSettings: this.generationSettingsForInput(input),
      inputJson: input,
      outputJson: output,
    };
  }

  private generatedNodeTitle(
    sourceNode: CanvasNodeModel,
    targetType: "image" | "video",
    outputOrdinal = 1,
    operation?: GeneratedMediaJobInput["operation"],
  ): string {
    const sourceTitle = sourceNode.title?.trim() || sourceNode.type;
    const suffix = operation === "image_refinement"
      ? "Refined Image"
      : operation === "workflow_run"
        ? targetType === "image" ? "Workflow Image" : "Workflow Video"
        : targetType === "image" ? "Image" : "Video";
    return outputOrdinal === 1 ? `${sourceTitle} ${suffix}` : `${sourceTitle} ${suffix} ${outputOrdinal}`;
  }

  private sourceNodeIdsForInput(input: GeneratedMediaJobInput): string[] {
    if (input.operation === "shot_to_image") {
      return uniqueStrings([
        input.sourceNodeId,
        input.sourceNodeIds.shotNodeId,
        input.sourceNodeIds.sceneNodeId,
        ...input.sourceNodeIds.characterNodeIds,
        input.sourceNodeIds.locationNodeId,
      ]);
    }
    if (input.operation === "workflow_run") {
      return uniqueStrings([input.sourceNodeId]);
    }
    return uniqueStrings(input.sourceNodeIds);
  }

  private generationSettingsForInput(input: GeneratedMediaJobInput): ResolvedGenerationSettings | undefined {
    return input.operation === "workflow_run" ? undefined : input.generationSettings;
  }

  private generatedAssetPurpose(input: GeneratedMediaJobInput): "shot_keyframe" | "shot_clip" {
    return input.operation === "image_to_video" ||
      (input.operation === "workflow_run" && input.outputKind === "video")
      ? "shot_clip"
      : "shot_keyframe";
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
      if (isGenerationJobStatus(job.status)) {
        counts[job.status] += 1;
      }
    }

    return {
      counts,
      queued: counts.queued,
      running: counts.running + counts.provider_waiting,
      providerWaiting: counts.provider_waiting,
      succeeded: counts.succeeded,
      failed: counts.failed,
      cancelled: counts.cancelled,
    };
  }

  private async updateNodeStatus(
    tx: GenerationPrismaClient,
    nodeId: string | null | undefined,
    status: NodeStatus,
  ): Promise<void> {
    if (!nodeId) {
      return;
    }

    await tx.canvasNode.update({
      where: { id: nodeId },
      data: { status },
    });
  }

  private toGenerationJobRecord<TInput = GenerationJobInput, TOutput = unknown>(
    job: GenerationJobModel,
  ): GenerationJobRecord<TInput, TOutput> {
    return {
      id: job.id,
      projectId: job.projectId,
      operation: job.operation as GenerationOperation,
      status: job.status as GenerationJobStatus,
      provider: job.provider,
      model: job.model ?? undefined,
      sourceNodeId: job.sourceNodeId ?? undefined,
      targetNodeId: job.targetNodeId ?? undefined,
      providerTaskId: job.providerTaskId ?? undefined,
      inputJson: job.inputJson as TInput,
      outputJson: job.outputJson === null ? undefined : (job.outputJson as TOutput),
      errorMessage: job.errorMessage ?? undefined,
      createdAt: toIsoString(job.createdAt),
      updatedAt: toIsoString(job.updatedAt),
    };
  }

  private async tryCancelProviderTask(job: GenerationJobModel): Promise<ProviderFailure | undefined> {
    if (job.operation !== "image_to_video" || !job.providerTaskId) {
      return undefined;
    }

    try {
      const provider = createVideoProviderRegistry().get(job.provider);
      await provider.cancelTask(job.providerTaskId);
      return undefined;
    } catch (error) {
      if (error instanceof ProviderError) {
        return {
          provider: error.provider,
          code: error.code,
          message: sanitizeProviderErrorMessage(error.message),
          retryable: error.retryable,
        };
      }

      return {
        provider: job.provider,
        code: "PROVIDER_CANCEL_FAILED",
        message: sanitizeProviderErrorMessage(error instanceof Error ? error.message : "Provider cancel failed"),
        retryable: false,
      };
    }
  }

  private async runTransaction<T>(
    fn: (tx: GenerationPrismaClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) =>
      fn(tx as unknown as GenerationPrismaClient),
    );
  }
}

type GenerationJobRecordResult = {
  job: GenerationJobRecord<GenerationJobInput>;
  queueSummary: GenerationQueueSummary;
};

function sanitizeProviderErrorMessage(message: string): string {
  return message
    .replace(/([?&](key|token|api_key)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/(authorization:\s*(bearer|key)\s+)[^\s]+/gi, "$1[redacted]")
    .replace(/((bearer|key)\s+)[^\s]+/gi, "$1[redacted]");
}
