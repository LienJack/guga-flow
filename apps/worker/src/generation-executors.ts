import {
  ProviderError,
  createImageProviderRegistry,
  createProgrammableImageProvider,
  createProgrammableVideoProvider,
  createVideoProviderRegistry,
  type ImageProviderOutput,
  type ImageProviderRegistry,
  type MockAssetOutput,
  type VideoProviderRegistry,
  type VideoProviderTaskResult,
} from "@guga-flow/provider-contracts";
import type {
  GeneratedMediaProviderOutput,
  GenerationJobInput,
  GenerationJobRecord,
  ProgrammableProviderRuntimeConfig,
  ProviderFailure,
} from "@guga-flow/shared-types";

export interface GenerationExecutorRegistry {
  imageProviders: ImageProviderRegistry;
  videoProviders: VideoProviderRegistry;
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface GenerationExecutorRegistryOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
  programmableProvider?: ProgrammableProviderRuntimeConfig;
}

export type GenerationExecutorResult =
  | {
      status: "succeeded";
      providerOutput: GeneratedMediaProviderOutput;
      providerOutputs?: GeneratedMediaProviderOutput[];
    }
  | {
      status: "provider_waiting";
      provider: string;
      model?: string;
      providerTaskId: string;
      rawJson?: GeneratedMediaProviderOutput["rawJson"];
    };

export function createGenerationExecutorRegistry(
  options: Record<string, string | undefined> | GenerationExecutorRegistryOptions = process.env,
): GenerationExecutorRegistry {
  const normalized = isGenerationExecutorRegistryOptions(options)
    ? options
    : { env: options };
  const env = normalized.env ?? {};
  const programmable = normalized.programmableProvider;
  const programmableImageProviders = programmable?.manifest.kind === "image"
    ? [createProgrammableImageProvider(programmable.manifest, {
        credentials: programmable.credentials,
        fetchImpl: normalized.fetchImpl,
      })]
    : [];
  const programmableVideoProviders = programmable?.manifest.kind === "video"
    ? [createProgrammableVideoProvider(programmable.manifest, {
        credentials: programmable.credentials,
        fetchImpl: normalized.fetchImpl,
      })]
    : [];
  return {
    imageProviders: createImageProviderRegistry({
      env,
      fetchImpl: normalized.fetchImpl,
      additionalProviders: programmableImageProviders,
    }),
    videoProviders: createVideoProviderRegistry({
      env,
      fetchImpl: normalized.fetchImpl,
      additionalProviders: programmableVideoProviders,
    }),
  };
}

export function createMockGenerationExecutorRegistry(): GenerationExecutorRegistry {
  return {
    imageProviders: createImageProviderRegistry({ env: {} }),
    videoProviders: createVideoProviderRegistry({ env: {} }),
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
      status: "succeeded",
      providerOutput,
      providerOutputs: providerOutputs.length > 1 ? providerOutputs : undefined,
    };
  }

  if (input.operation === "character_to_image" || input.operation === "location_to_image") {
    const provider = registry.imageProviders.get(input.provider);
    const result = await provider.generateImage({
      projectId: input.projectId,
      prompt: input.prompt,
      mode: "text_to_image",
      model: input.model,
      aspectRatio: input.aspectRatio,
      count: 1,
      referenceAssetIds: input.referenceAssetIds,
      providerParams: input.providerParams,
      forceFailure: input.forceFailure,
    });
    const providerOutputs = result.outputs.map((output) => toGeneratedMediaProviderOutput(output, input.prompt));
    const providerOutput = firstProviderOutput(provider.capability.id, providerOutputs);
    return {
      status: "succeeded",
      providerOutput,
    };
  }

  if (input.operation === "image_refinement") {
    const provider = registry.imageProviders.get(input.provider);
    const result = await provider.generateImage({
      projectId: input.projectId,
      prompt: input.prompt,
      mode: "image_to_image",
      model: input.model,
      aspectRatio: input.aspectRatio,
      count: 1,
      sourceImageAssetId: input.sourceImageAssetId,
      sourceImageNodeId: input.imageNodeId,
      referenceAssetIds: input.referenceAssetIds,
      providerParams: input.providerParams,
      forceFailure: input.forceFailure,
    });
    const providerOutputs = result.outputs.map((output) => toGeneratedMediaProviderOutput(output, input.prompt));
    const providerOutput = firstProviderOutput(provider.capability.id, providerOutputs);
    return {
      status: "succeeded",
      providerOutput,
    };
  }

  if (input.operation === "image_to_video") {
    const provider = registry.videoProviders.get(input.provider);
    const result = await provider.createTask({
      projectId: input.projectId,
      prompt: input.prompt,
      mode: "image_to_video",
      model: input.model,
      sourceImageAssetId: input.sourceImageAssetId,
      durationSec: input.durationSeconds,
      aspectRatio: input.aspectRatio,
      resolution: input.resolution,
      referenceAssetIds: input.referenceAssetIds,
      providerParams: input.providerParams,
      forceFailure: input.forceFailure,
    });
    return videoTaskResultToExecutorResult(result, provider.capability.id, input.prompt, input.model);
  }

  return Promise.reject(new Error(`Unsupported generation operation: ${job.operation}`));
}

export async function pollGenerationJob(
  job: GenerationJobRecord<GenerationJobInput>,
  registry: GenerationExecutorRegistry = createMockGenerationExecutorRegistry(),
): Promise<GenerationExecutorResult> {
  const input = job.inputJson;
  if (input.operation !== "image_to_video") {
    throw new Error(`Only image-to-video jobs can wait for provider tasks: ${job.operation}`);
  }
  if (!job.providerTaskId) {
    throw new Error(`Image-to-video job ${job.id} has no provider task id`);
  }

  const provider = registry.videoProviders.get(input.provider);
  const result = await provider.getTask(job.providerTaskId);
  return videoTaskResultToExecutorResult(result, provider.capability.id, input.prompt, input.model);
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

function videoTaskResultToExecutorResult(
  result: VideoProviderTaskResult,
  provider: string,
  prompt: string,
  model?: string,
): GenerationExecutorResult {
  if (result.status === "provider_waiting") {
    return {
      status: "provider_waiting",
      provider,
      model,
      providerTaskId: result.providerTaskId,
      rawJson: result.rawJson,
    };
  }
  if (result.status === "succeeded" && result.output) {
    return {
      status: "succeeded",
      providerOutput: toGeneratedMediaProviderOutput(result.output, prompt),
    };
  }
  if (result.status === "succeeded") {
    throw new ProviderError({
      provider,
      code: "PROVIDER_EMPTY_RESPONSE",
      message: `${provider} video task succeeded without a video output.`,
      retryable: false,
    });
  }
  if (result.status === "failed") {
    throw new ProviderError(
      result.error ?? {
        provider,
        code: "PROVIDER_TASK_FAILED",
        message: `${provider} video task failed.`,
        retryable: false,
      },
    );
  }

  throw new ProviderError({
    provider,
    code: "PROVIDER_TASK_CANCELLED",
    message: `${provider} video task was cancelled by the provider.`,
    retryable: false,
  });
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

function isGenerationExecutorRegistryOptions(
  value: Record<string, string | undefined> | GenerationExecutorRegistryOptions,
): value is GenerationExecutorRegistryOptions {
  return "env" in value || "fetchImpl" in value || "programmableProvider" in value;
}
