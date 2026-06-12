import {
  ProviderError,
  createMockProviderRegistry,
  type MockAssetOutput,
  type ProviderRegistry,
} from "@guga-flow/provider-contracts";
import type {
  GeneratedMediaProviderOutput,
  GenerationJobInput,
  GenerationJobRecord,
  ProviderFailure,
} from "@guga-flow/shared-types";

export type GenerationExecutorRegistry = Pick<ProviderRegistry, "image" | "video">;

export function createMockGenerationExecutorRegistry(): GenerationExecutorRegistry {
  const registry = createMockProviderRegistry();
  return {
    image: registry.image,
    video: registry.video,
  };
}

export async function executeGenerationJob(
  job: GenerationJobRecord<GenerationJobInput>,
  registry: GenerationExecutorRegistry = createMockGenerationExecutorRegistry(),
): Promise<GeneratedMediaProviderOutput> {
  const input = job.inputJson;

  if (input.operation === "shot_to_image") {
    const output = await registry.image.generateImage({
      projectId: input.projectId,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      referenceAssetIds: input.referenceAssetIds,
      forceFailure: input.forceFailure,
    });
    return toGeneratedMediaProviderOutput(output, input.prompt);
  }

  if (input.operation === "image_to_video") {
    const output = await registry.video.generateVideo({
      projectId: input.projectId,
      prompt: input.prompt,
      sourceImageAssetId: input.sourceImageAssetId,
      durationSec: input.durationSeconds,
      referenceAssetIds: input.referenceAssetIds,
      forceFailure: input.forceFailure,
    });
    return toGeneratedMediaProviderOutput(output, input.prompt);
  }

  return Promise.reject(new Error(`Unsupported generation operation: ${job.operation}`));
}

export function toProviderFailure(error: unknown, provider: string): ProviderFailure {
  if (error instanceof ProviderError) {
    return {
      provider: error.provider,
      code: error.code,
      message: error.message,
      retryable: error.retryable,
    };
  }

  return {
    provider,
    code: "WORKER_EXECUTOR_ERROR",
    message: error instanceof Error ? error.message : "Unknown worker executor error",
    retryable: false,
  };
}

function toGeneratedMediaProviderOutput(
  output: MockAssetOutput,
  prompt: string,
): GeneratedMediaProviderOutput {
  return {
    assetId: output.assetId,
    storageKey: output.storageKey,
    mimeType: output.mimeType,
    provider: output.provider,
    model: output.model,
    prompt: output.prompt ?? prompt,
    referenceAssetIds: output.referenceAssetIds,
  };
}
