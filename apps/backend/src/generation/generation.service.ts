import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CanvasLoadResult,
  CanvasNodeRecord,
  GenerationJobInput,
  GenerationJobListResult,
  GenerationJobRecord,
  GenerationJobStatus,
  GenerationJobStatusCounts,
  GenerationOperation,
  GenerationQueueSummary,
  ImageNodeData,
  ImageToVideoJobInput,
  NodeStatus,
  Phase8GenerationOperation,
  ProviderFailure,
  RetryGenerationJobResult,
  ShotNodeData,
  ShotToImageJobInput,
} from "@guga-flow/shared-types";
import {
  GENERATION_JOB_STATUSES,
  PHASE_8_GENERATION_OPERATIONS,
} from "@guga-flow/shared-types";
import type { GenerationOperation as PrismaGenerationOperation } from "../generated/prisma/client";
import { Prisma } from "../generated/prisma/client";

import { CanvasService } from "../canvas/canvas.service";
import { PrismaService } from "../prisma/prisma.service";
import { PromptService } from "../prompt/prompt.service";

type GenerationPrismaClient = Pick<PrismaService, "generationJob" | "canvasNode">;

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

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === "string")
    ? Array.from(new Set(value))
    : [];
}

function uniqueStrings(values: readonly (string | undefined)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

function jsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function assertJobInput(value: unknown): GenerationJobInput {
  const input = dataObject(value);
  if (input.operation === "shot_to_image" || input.operation === "image_to_video") {
    return value as GenerationJobInput;
  }
  throw new BadRequestException("Generation job input is invalid");
}

@Injectable()
export class GenerationService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CanvasService) private readonly canvasService: CanvasService,
    @Inject(PromptService) private readonly promptService: PromptService,
  ) {}

  async createJob(
    projectId: string,
    input: { operation: unknown; sourceNodeId?: string; forceFailure?: boolean },
  ): Promise<GenerationJobRecordResult> {
    if (!isPhase8GenerationOperation(input.operation)) {
      throw new BadRequestException("Generation operation is not supported yet");
    }
    if (!input.sourceNodeId) {
      throw new BadRequestException("Generation source node id is required");
    }

    const jobInput =
      input.operation === "shot_to_image"
        ? await this.buildShotToImageInput(projectId, input.sourceNodeId, input.forceFailure)
        : await this.buildImageToVideoInput(projectId, input.sourceNodeId, input.forceFailure);

    const job = await this.runTransaction(async (tx) => {
      const created = await tx.generationJob.create({
        data: {
          projectId,
          operation: jobInput.operation,
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
      if (original.sourceNodeId) {
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

  async claimNextJob(): Promise<{ job?: GenerationJobRecord }> {
    const job = await this.runTransaction(async (tx) => {
      const queued = (await tx.generationJob.findFirst({
        where: {
          status: "queued",
          operation: { in: [...PHASE_8_GENERATION_OPERATIONS] as PrismaGenerationOperation[] },
        },
        orderBy: { createdAt: "asc" },
      })) as GenerationJobModel | null;

      if (!queued) {
        return undefined;
      }

      const claimed = await tx.generationJob.updateMany({
        where: { id: queued.id, status: "queued" },
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
      if (updated?.sourceNodeId) {
        await this.updateNodeStatus(tx, updated.sourceNodeId, "running");
      }

      return updated ?? undefined;
    });

    return job ? { job: this.toGenerationJobRecord(job) } : {};
  }

  async failJob(jobId: string, failure: ProviderFailure): Promise<GenerationJobRecord> {
    const existing = (await this.prisma.generationJob.findUnique({
      where: { id: jobId },
    })) as GenerationJobModel | null;
    if (!existing) {
      throw new NotFoundException("Generation job not found");
    }
    if (existing.status !== "running" && existing.status !== "provider_waiting") {
      throw new BadRequestException("Only active generation jobs can fail");
    }

    const failed = await this.runTransaction(async (tx) => {
      const updated = (await tx.generationJob.update({
        where: { id: existing.id },
        data: {
          status: "failed",
          errorMessage: `${failure.code}: ${failure.message}`,
          outputJson: jsonValue({ error: failure }),
        },
      })) as GenerationJobModel;
      await this.updateNodeStatus(tx, existing.targetNodeId ?? existing.sourceNodeId, "failed");
      return updated;
    });

    return this.toGenerationJobRecord(failed);
  }

  private async buildShotToImageInput(
    projectId: string,
    shotNodeId: string,
    forceFailure: boolean | undefined,
  ): Promise<ShotToImageJobInput> {
    const composition = await this.promptService.composeShotPrompt(projectId, shotNodeId);

    return {
      operation: "shot_to_image",
      projectId,
      sourceNodeId: shotNodeId,
      shotNodeId,
      prompt: composition.image.prompt,
      negativePrompt: composition.negativePrompt,
      referenceAssetIds: composition.referenceAssetIds,
      sourceNodeIds: composition.sourceNodeIds,
      debugParts: composition.debugParts,
      missingContext: composition.missingContext,
      provider: "mock-image",
      model: "mock-image-v1",
      providerParams: {},
      forceFailure,
    };
  }

  private async buildImageToVideoInput(
    projectId: string,
    imageNodeId: string,
    forceFailure: boolean | undefined,
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
      ? await this.promptService.composeShotPrompt(projectId, parentShot.id)
      : undefined;
    const parentShotData = dataObject(parentShot?.dataJson) as ShotNodeData;
    const prompt =
      parentComposition?.video.prompt ??
      optionalString(imageData.prompt) ??
      optionalString(imageData.description) ??
      "Animate the generated image into a short cinematic video.";
    const durationSeconds =
      optionalNumber(parentShotData.durationSeconds) ?? optionalNumber(parentShotData.durationSec) ?? 4;
    const referenceAssetIds = parentComposition?.referenceAssetIds ?? stringArray(imageData.referenceAssetIds);
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
      durationSeconds,
      parentShotNodeId: parentShot?.id,
      parentShotTitle: parentShot?.title,
      referenceAssetIds,
      sourceNodeIds,
      provider: "mock-video",
      model: "mock-video-v1",
      providerParams: {},
      forceFailure,
    };
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
      failed: counts.failed,
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
