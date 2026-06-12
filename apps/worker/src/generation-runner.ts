import type { ProviderFailure } from "@guga-flow/shared-types";

import type { GenerationWorkerClient } from "./generation-client";
import {
  createGenerationExecutorRegistry,
  executeGenerationJob,
  toProviderFailure,
  type GenerationExecutorRegistry,
} from "./generation-executors";

export type GenerationWorkerRunResult =
  | { status: "idle" }
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
  const registry = options.registry ?? createGenerationExecutorRegistry();
  const claim = await options.client.claimNextJob();
  const job = claim.job;

  if (!job) {
    options.logger?.info("No queued generation job claimed.");
    return { status: "idle" };
  }

  try {
    const result = await executeGenerationJob(job, registry);
    await options.client.succeedJob(job.id, result.providerOutput, result.providerOutputs);
    options.logger?.info(`Generation job ${job.id} succeeded.`);
    return { status: "succeeded", jobId: job.id };
  } catch (error) {
    const failure = toProviderFailure(error, job.provider);
    await options.client.failJob(job.id, failure);
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
