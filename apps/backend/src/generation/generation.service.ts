import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { ProviderError, createVideoProviderRegistry } from "@guga-flow/provider-contracts";
import type {
  AssetDetail,
  CanvasSnapshotJson,
  CanvasLoadResult,
  CanvasNodeRecord,
  CanvasNodeType,
  CreateBatchImagesToVideosJobInput,
  CreateBatchImagesToVideosJobResult,
  CreateGenerationJobInput,
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
  ImageProviderCatalogItem,
  ImageNodeData,
  ImageToVideoJobInput,
  NodeStatus,
  Phase8GenerationOperation,
  ProviderFailure,
  ProjectAspectRatio,
  RetryGenerationJobResult,
  ShotNodeData,
  ShotToImageJobInput,
  VideoProviderCatalogItem,
  VideoProviderResolution,
  WorkerGenerationJobWaitInput,
} from "@guga-flow/shared-types";
import {
  GENERATION_JOB_STATUSES,
  PHASE_8_GENERATION_OPERATIONS,
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
  "generationJob" | "canvasNode" | "canvasEdge" | "asset" | "project"
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

    const jobInput =
      input.operation === "shot_to_image"
        ? await this.buildShotToImageInput(projectId, input.sourceNodeId, input)
        : await this.buildImageToVideoInput(projectId, input.sourceNodeId, input);

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

  async cancelJob(projectId: string, jobId: string): Promise<GenerationJobRecord> {
    const existing = await this.findProjectJob(projectId, jobId);
    if (!["queued", "running", "provider_waiting"].includes(existing.status)) {
      throw new BadRequestException("Only queued or active generation jobs can be cancelled");
    }

    const providerCancelError = await this.tryCancelProviderTask(existing);
    const cancelledAt = new Date().toISOString();
    const cancelled = await this.runTransaction(async (tx) => {
      const updated = (await tx.generationJob.update({
        where: { id: existing.id },
        data: {
          status: "cancelled",
          outputJson: jsonValue({
            cancelledAt,
            providerTaskId: existing.providerTaskId,
            providerCancelError: providerCancelError ?? null,
          }),
          errorMessage: providerCancelError
            ? `PROVIDER_CANCEL_FAILED: ${providerCancelError.message}`
            : null,
        },
      })) as GenerationJobModel;
      await this.updateNodeStatus(tx, existing.targetNodeId ?? existing.sourceNodeId, "cancelled");
      return updated;
    });

    return this.toGenerationJobRecord(cancelled);
  }

  async claimNextJob(): Promise<{ job?: GenerationJobRecord }> {
    const job = await this.runTransaction(async (tx) => {
      const queued = (await tx.generationJob.findFirst({
        where: {
          status: { in: ["queued", "provider_waiting"] },
          operation: { in: [...PHASE_8_GENERATION_OPERATIONS] as PrismaGenerationOperation[] },
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
      if (updated?.sourceNodeId) {
        await this.updateNodeStatus(tx, updated.sourceNodeId, "running");
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
    if (existing.status !== "running" && existing.status !== "provider_waiting") {
      throw new BadRequestException("Only active generation jobs can wait for provider completion");
    }
    if (waitInput.provider !== existing.provider) {
      throw new BadRequestException("Provider wait input does not match the claimed job provider");
    }

    const waiting = await this.runTransaction(async (tx) => {
      const updated = (await tx.generationJob.update({
        where: { id: existing.id },
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
      })) as GenerationJobModel;
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

  async succeedJob(
    jobId: string,
    providerOutput: GeneratedMediaProviderOutput,
    providerOutputs?: GeneratedMediaProviderOutput[],
  ): Promise<GenerationJobRecord<GenerationJobInput, GeneratedMediaJobOutput>> {
    const existing = (await this.prisma.generationJob.findUnique({
      where: { id: jobId },
    })) as GenerationJobModel | null;
    if (!existing) {
      throw new NotFoundException("Generation job not found");
    }
    if (existing.status !== "running" && existing.status !== "provider_waiting") {
      throw new BadRequestException("Only active generation jobs can succeed");
    }

    const input = assertJobInput(existing.inputJson);
    const completionOutputs = this.normalizeCompletionOutputs(input, providerOutput, providerOutputs);
    completionOutputs.forEach((output) => this.validateProviderOutput(existing, input, output));

    const completed = await this.runTransaction(async (tx) => {
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
            purpose: input.operation === "shot_to_image" ? "shot_keyframe" : "shot_clip",
            providerOutput: output,
            metadataJson: {
              generationJobId: existing.id,
              operation: input.operation,
              sourceNodeId: sourceNode.id,
              outputIndex,
            },
          },
          tx,
        );
        const targetNode = await this.createGeneratedNode(
          tx,
          existing,
          input,
          output,
          asset,
          sourceNode,
          outputIndex,
        );
        const edge = await this.createGeneratedEdge(tx, existing, input, sourceNode, targetNode, asset);
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
        operation: input.operation,
        sourceNodeId: sourceNode.id,
        targetNodeId: firstTarget.node.id,
        assetId: firstTarget.asset.id,
        edgeId: firstTarget.edge.id,
        provider: firstTarget.providerOutput.provider,
        model: firstTarget.providerOutput.model,
        prompt: firstTarget.providerOutput.prompt,
        referenceAssetIds: firstTarget.providerOutput.referenceAssetIds,
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
                input,
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

  private async buildShotToImageInput(
    projectId: string,
    shotNodeId: string,
    input: CreateGenerationJobInput,
  ): Promise<ShotToImageJobInput> {
    const composition = await this.promptService.composeShotPrompt(projectId, shotNodeId);
    const providerSettings = this.resolveImageProviderSettings(input);
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
      model: providerSettings.model,
      aspectRatio: providerSettings.aspectRatio,
      count: providerSettings.count,
      providerParams: providerSettings.providerParams,
      omittedReferenceAssetIds: omittedReferenceAssetIds.length ? omittedReferenceAssetIds : undefined,
      referenceOmissionReason: omittedReferenceAssetIds.length
        ? `${providerSettings.provider.displayName} accepts up to ${referenceLimit} reference images.`
        : undefined,
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
      ? await this.promptService.composeShotPrompt(projectId, parentShot.id)
      : undefined;
    const parentShotData = dataObject(parentShot?.dataJson) as ShotNodeData;
    const prompt =
      parentComposition?.video.prompt ??
      optionalString(imageData.prompt) ??
      optionalString(imageData.description) ??
      "Animate the generated image into a short cinematic video.";
    const sourceDurationSeconds =
      optionalNumber(parentShotData.durationSeconds) ?? optionalNumber(parentShotData.durationSec);
    const providerSettings = this.resolveVideoProviderSettings(input, sourceDurationSeconds);
    const rawReferenceAssetIds =
      parentComposition?.referenceAssetIds ?? stringArray(imageData.referenceAssetIds);
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
      sourceNodeIds,
      provider: providerSettings.provider.id,
      model: providerSettings.model,
      providerParams: providerSettings.providerParams,
      forceFailure: input.forceFailure,
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

  private validateProviderOutput(
    job: GenerationJobModel,
    input: GenerationJobInput,
    output: GeneratedMediaProviderOutput,
  ): void {
    if (output.provider !== job.provider) {
      throw new BadRequestException("Provider output does not match the claimed job provider");
    }
    if (input.operation === "shot_to_image" && !output.mimeType.startsWith("image/")) {
      throw new BadRequestException("Shot image generation must produce an image asset");
    }
    if (input.operation === "image_to_video" && !output.mimeType.startsWith("video/")) {
      throw new BadRequestException("Image video generation must produce a video asset");
    }
  }

  private normalizeCompletionOutputs(
    input: GenerationJobInput,
    providerOutput: GeneratedMediaProviderOutput,
    providerOutputs: GeneratedMediaProviderOutput[] | undefined,
  ): GeneratedMediaProviderOutput[] {
    if (input.operation === "image_to_video") {
      if (providerOutputs && providerOutputs.length > 1) {
        throw new BadRequestException("Image video generation supports only one provider output");
      }
      return [providerOutput];
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

  private resolveImageProviderSettings(input: CreateGenerationJobInput): {
    provider: ImageProviderCatalogItem;
    model: string;
    aspectRatio: ProjectAspectRatio;
    count: number;
    providerParams: CanvasSnapshotJson;
  } {
    const providers = this.providersService.getImageProviders().providers;
    const providerId = input.provider ?? "mock-image";
    const provider = providers.find((candidate) => candidate.id === providerId);
    if (!provider) {
      throw new BadRequestException(`Unknown image provider: ${providerId}`);
    }
    if (!provider.enabled) {
      throw new BadRequestException(provider.disabledReason ?? `${provider.displayName} is disabled`);
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

  private resolveVideoProviderSettings(
    input: CreateGenerationJobInput,
    fallbackDurationSeconds: number | undefined,
  ): {
    provider: VideoProviderCatalogItem;
    model: string;
    aspectRatio: ProjectAspectRatio;
    durationSeconds: number;
    resolution: VideoProviderResolution;
    providerParams: CanvasSnapshotJson;
  } {
    const providers = this.providersService.getVideoProviders().providers;
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
    input: GenerationJobInput,
    providerOutput: GeneratedMediaProviderOutput,
    asset: AssetDetail,
    sourceNode: CanvasNodeModel,
    outputIndex = 0,
  ): Promise<CanvasNodeModel> {
    const targetType: Extract<CanvasNodeType, "image" | "video"> =
      input.operation === "shot_to_image" ? "image" : "video";
    if (input.operation === "shot_to_image" && sourceNode.type !== "shot") {
      throw new BadRequestException("Shot image completion requires a Shot source node");
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
        title: this.generatedNodeTitle(sourceNode, targetType, outputOrdinal),
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
          inputJson: input,
        }),
      },
    })) as CanvasNodeModel;
  }

  private async createGeneratedEdge(
    tx: GenerationPrismaClient,
    job: GenerationJobModel,
    input: GenerationJobInput,
    sourceNode: CanvasNodeModel,
    targetNode: CanvasNodeModel,
    asset: AssetDetail,
  ): Promise<CanvasEdgeModel> {
    const relation = input.operation === "shot_to_image" ? "generated_image" : "generated_video";

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
    input: GenerationJobInput,
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
      inputJson: input,
      outputJson: output,
    };
  }

  private generatedNodeTitle(
    sourceNode: CanvasNodeModel,
    targetType: "image" | "video",
    outputOrdinal = 1,
  ): string {
    const sourceTitle = sourceNode.title?.trim() || sourceNode.type;
    const suffix = targetType === "image" ? "Image" : "Video";
    return outputOrdinal === 1 ? `${sourceTitle} ${suffix}` : `${sourceTitle} ${suffix} ${outputOrdinal}`;
  }

  private sourceNodeIdsForInput(input: GenerationJobInput): string[] {
    if (input.operation === "shot_to_image") {
      return uniqueStrings([
        input.sourceNodeId,
        input.sourceNodeIds.shotNodeId,
        input.sourceNodeIds.sceneNodeId,
        ...input.sourceNodeIds.characterNodeIds,
        input.sourceNodeIds.locationNodeId,
      ]);
    }

    return uniqueStrings(input.sourceNodeIds);
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
