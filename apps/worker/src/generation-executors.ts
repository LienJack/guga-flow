import {
  ProviderError,
  createImageProviderRegistry,
  createMockProviderRegistry,
  type ImageProviderOutput,
  type ImageProviderRegistry,
  type MockAssetOutput,
  type ProviderRegistry,
} from "@guga-flow/provider-contracts";
import type {
  GeneratedMediaProviderOutput,
  GenerationJobInput,
  GenerationJobRecord,
  ProviderFailure,
} from "@guga-flow/shared-types";

export interface GenerationExecutorRegistry {
  imageProviders: ImageProviderRegistry;
  video: ProviderRegistry["video"];
}

export interface GenerationExecutorResult {
  providerOutput: GeneratedMediaProviderOutput;
  providerOutputs?: GeneratedMediaProviderOutput[];
}

export function createGenerationExecutorRegistry(
  env: Record<string, string | undefined> = process.env,
): GenerationExecutorRegistry {
  const registry = createMockProviderRegistry();
  return {
    imageProviders: createImageProviderRegistry({ env }),
    video: registry.video,
  };
}

export function createMockGenerationExecutorRegistry(): GenerationExecutorRegistry {
  const registry = createMockProviderRegistry();
  return {
    imageProviders: createImageProviderRegistry({ env: {} }),
    video: registry.video,
  };
}

export async function executeGenerationJob(
  job: GenerationJobRecord<GenerationJobInput>,
  registry: GenerationExecutorRegistry = createMockGenerationExecutorRegistry(),
): Promise<GenerationExecutorResult> {
  const input = job.inputJson;

  if (input.operation === "shot_to_image") {
    const provider = registry.imageProviders.get(input.provider);
    const result = await provider.generateImage({
      projectId: input.projectId,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      model: input.model,
      aspectRatio: input.aspectRatio,
      count: input.count,
      referenceAssetIds: input.referenceAssetIds,
      providerParams: input.providerParams,
      forceFailure: input.forceFailure,
    });
    const providerOutputs = result.outputs.map((output) => toGeneratedMediaProviderOutput(output, input.prompt));
    const providerOutput = firstProviderOutput(provider.capability.id, providerOutputs);
    return {
      providerOutput,
      providerOutputs: providerOutputs.length > 1 ? providerOutputs : undefined,
    };
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
    return {
      providerOutput: toGeneratedMediaProviderOutput(output, input.prompt),
    };
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
  output: MockAssetOutput | ImageProviderOutput,
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
    remoteUrl: output.remoteUrl,
    bytesBase64: output.bytesBase64,
    width: output.width,
    height: output.height,
    providerTaskId: output.providerTaskId,
    rawJson: output.rawJson,
  };
}

function firstProviderOutput(
  provider: string,
  outputs: GeneratedMediaProviderOutput[],
): GeneratedMediaProviderOutput {
  const output = outputs[0];
  if (output) {
    return output;
  }

  throw new ProviderError({
    provider,
    code: "PROVIDER_EMPTY_RESPONSE",
    message: `${provider} did not return any generated media outputs.`,
    retryable: false,
  });
}
