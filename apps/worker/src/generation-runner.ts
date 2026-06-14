import {
  managedProviderId,
  type GenerationJobInput,
  type ManagedProviderId,
  type ManagedProviderKind,
  type ProviderFailure,
} from "@guga-flow/shared-types";

import { buildEditorExportPackage } from "./editor-export-package";
import type { GenerationWorkerClient } from "./generation-client";
import {
  createGenerationExecutorRegistry,
  executeGenerationJob,
  pollGenerationJob,
  toProviderFailure,
  type GenerationExecutorRegistry,
} from "./generation-executors";

export type GenerationWorkerRunResult =
  | { status: "idle" }
  | { status: "waiting"; jobId: string; providerTaskId: string }
  | { status: "succeeded"; jobId: string }
  | { status: "failed"; jobId: string; error: ProviderFailure };

export interface GenerationWorkerRunnerOptions {
  client: GenerationWorkerClient;
  registry?: GenerationExecutorRegistry;
  logger?: Pick<Console, "info" | "error">;
}

export interface GenerationWorkerLoopOptions extends GenerationWorkerRunnerOptions {
  pollIntervalMs?: number;
  shouldContinue?: () => boolean;
}

export async function runOneGenerationJob(
  options: GenerationWorkerRunnerOptions,
): Promise<GenerationWorkerRunResult> {
  const claim = await options.client.claimNextJob();
  const job = claim.job;

  if (!job) {
    options.logger?.info("No queued generation job claimed.");
    return { status: "idle" };
  }

  try {
    if (job.inputJson.operation === "editor_export") {
      const packageOutput = await buildEditorExportPackage(job.inputJson, {
        readClip: (clip) => options.client.getAssetBytes(job.projectId, clip.videoAssetId),
      });
      await options.client.succeedEditorExportJob(job.id, packageOutput);
      options.logger?.info(`Editor export job ${job.id} succeeded.`);
      return { status: "succeeded", jobId: job.id };
    }

    const registry = options.registry ?? await createRuntimeRegistry(options.client, job.inputJson);
    const result = job.providerTaskId
      ? await pollGenerationJob(job, registry)
      : await executeGenerationJob(job, registry);
    if (result.status === "provider_waiting") {
      await options.client.waitJob(job.id, {
        providerTaskId: result.providerTaskId,
        provider: result.provider,
        model: result.model ?? job.model,
        rawJson: result.rawJson,
      });
      options.logger?.info(`Generation job ${job.id} is waiting on provider task ${result.providerTaskId}.`);
      return { status: "waiting", jobId: job.id, providerTaskId: result.providerTaskId };
    }
    if ("assetAnalysisOutput" in result) {
      await options.client.succeedAssetAnalysisJob(job.id, result.assetAnalysisOutput);
      options.logger?.info(`Asset analysis job ${job.id} succeeded.`);
      return { status: "succeeded", jobId: job.id };
    }
    if ("mediaMetadataOutput" in result) {
      await options.client.succeedMediaMetadataJob(job.id, result.mediaMetadataOutput);
      options.logger?.info(`Media metadata job ${job.id} succeeded.`);
      return { status: "succeeded", jobId: job.id };
    }
    if ("sceneFrameExtractionOutput" in result) {
      await options.client.succeedSceneFrameExtractionJob(job.id, result.sceneFrameExtractionOutput);
      options.logger?.info(`Scene frame extraction job ${job.id} succeeded.`);
      return { status: "succeeded", jobId: job.id };
    }
    if ("assetPromptPolishOutput" in result) {
      await options.client.succeedAssetPromptPolishJob(job.id, result.assetPromptPolishOutput);
      options.logger?.info(`Asset prompt polish job ${job.id} succeeded.`);
      return { status: "succeeded", jobId: job.id };
    }
    if ("assetImageGenerationOutput" in result) {
      await options.client.succeedAssetImageGenerationJob(job.id, result.assetImageGenerationOutput);
      options.logger?.info(`Asset image generation job ${job.id} succeeded.`);
      return { status: "succeeded", jobId: job.id };
    }
    if ("textGenerationOutput" in result) {
      await options.client.succeedTextGenerationJob(job.id, result.textGenerationOutput);
      options.logger?.info(`AI text generation job ${job.id} succeeded.`);
      return { status: "succeeded", jobId: job.id };
    }

    await options.client.succeedJob(job.id, result.providerOutput, result.providerOutputs);
    options.logger?.info(`Generation job ${job.id} succeeded.`);
    return { status: "succeeded", jobId: job.id };
  } catch (error) {
    const failure = toProviderFailure(error, job.provider);
    await reportFailure(options, job.id, failure);
    options.logger?.error(`Generation job ${job.id} failed: ${failure.message}`);
    return { status: "failed", jobId: job.id, error: failure };
  }
}

export async function runGenerationWorkerLoop(options: GenerationWorkerLoopOptions): Promise<void> {
  const pollIntervalMs = options.pollIntervalMs ?? 2000;
  const shouldContinue = options.shouldContinue ?? (() => true);

  while (shouldContinue()) {
    await runOneGenerationJob(options);
    await sleep(pollIntervalMs);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function reportFailure(
  options: GenerationWorkerRunnerOptions,
  jobId: string,
  failure: ProviderFailure,
): Promise<void> {
  try {
    await options.client.failJob(jobId, failure);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown worker API error";
    options.logger?.error(`Generation job ${jobId} failure report was rejected: ${message}`);
  }
}

async function createRuntimeRegistry(
  client: GenerationWorkerClient,
  input: GenerationJobInput,
): Promise<GenerationExecutorRegistry> {
  const runtimeProvider = runtimeProviderForInput(input);
  if (!runtimeProvider) {
    return createGenerationExecutorRegistry();
  }

  const runtimeConfig = await client.getProviderRuntimeConfig(
    input.projectId,
    runtimeProvider.kind,
    runtimeProvider.provider,
  );
  return createGenerationExecutorRegistry({
    env: {
      ...process.env,
      ...runtimeConfig.env,
    },
    providerParams: runtimeConfig.params,
    programmableProvider: runtimeConfig.programmableProvider,
  });
}

function runtimeProviderForInput(input: GenerationJobInput): {
  kind: ManagedProviderKind;
  provider: ManagedProviderId;
} | undefined {
  if (
    input.operation === "shot_to_image" ||
    input.operation === "character_to_image" ||
    input.operation === "location_to_image" ||
    input.operation === "image_refinement" ||
    input.operation === "asset_image_generation"
  ) {
    const provider = managedProviderId("image", input.provider);
    if (!provider) {
      return undefined;
    }
    return {
      kind: "image",
      provider,
    };
  }
  if (input.operation === "image_to_video") {
    const provider = managedProviderId("video", input.provider);
    if (!provider) {
      return undefined;
    }
    return {
      kind: "video",
      provider,
    };
  }
  if (input.operation === "ai_text_generation") {
    const provider = managedProviderId("llm", input.provider);
    if (!provider) {
      return undefined;
    }
    return {
      kind: "llm",
      provider,
    };
  }
  return undefined;
}
