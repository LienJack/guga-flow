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
  AiAudioGenerationJobInput,
  AiTextGenerationJobOutput,
  AssetImageGenerationJobOutput,
  GeneratedMediaProviderOutput,
  GenerationJobInput,
  GenerationJobRecord,
  AssetAnalysisJobOutput,
  AssetPromptPolishJobOutput,
  MediaMetadataJobOutput,
  ProgrammableProviderRuntimeConfig,
  ProviderConfigParams,
  ProviderFailure,
  SceneFrameExtractionJobOutput,
} from "@guga-flow/shared-types";

export interface GenerationExecutorRegistry {
  imageProviders: ImageProviderRegistry;
  videoProviders: VideoProviderRegistry;
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface GenerationExecutorRegistryOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: FetchLike;
  providerParams?: ProviderConfigParams;
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
    }
  | {
      status: "succeeded";
      assetAnalysisOutput: AssetAnalysisJobOutput;
    }
  | {
      status: "succeeded";
      mediaMetadataOutput: MediaMetadataJobOutput;
    }
  | {
      status: "succeeded";
      sceneFrameExtractionOutput: SceneFrameExtractionJobOutput;
    }
  | {
      status: "succeeded";
      assetPromptPolishOutput: AssetPromptPolishJobOutput;
    }
  | {
      status: "succeeded";
      assetImageGenerationOutput: AssetImageGenerationJobOutput;
    }
  | {
      status: "succeeded";
      textGenerationOutput: AiTextGenerationJobOutput;
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
      genericBaseUrl: normalized.providerParams?.baseUrl,
      genericProtocol: normalized.providerParams?.protocol,
      additionalProviders: programmableImageProviders,
    }),
    videoProviders: createVideoProviderRegistry({
      env,
      fetchImpl: normalized.fetchImpl,
      genericBaseUrl: normalized.providerParams?.baseUrl,
      genericProtocol: normalized.providerParams?.protocol,
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

  if (input.operation === "media_metadata") {
    if (input.forceFailure) {
      throw new ProviderError({
        provider: input.provider,
        code: "MOCK_MEDIA_METADATA_FAILED",
        message: "Mock media metadata failure requested.",
        retryable: true,
      });
    }
    return {
      status: "succeeded",
      mediaMetadataOutput: mockMediaMetadataOutput(job.id, input),
    };
  }

  if (input.operation === "scene_frame_extraction") {
    if (input.forceFailure) {
      throw new ProviderError({
        provider: input.provider,
        code: "MOCK_SCENE_FRAME_EXTRACTION_FAILED",
        message: "Mock scene frame extraction failure requested.",
        retryable: true,
      });
    }
    return {
      status: "succeeded",
      sceneFrameExtractionOutput: mockSceneFrameExtractionOutput(job.id, input),
    };
  }

  if (input.operation === "asset_prompt_polish") {
    if (input.forceFailure) {
      throw new ProviderError({
        provider: input.provider,
        code: "MOCK_ASSET_PROMPT_POLISH_FAILED",
        message: "Mock asset prompt polish failure requested.",
        retryable: true,
      });
    }
    return {
      status: "succeeded",
      assetPromptPolishOutput: mockAssetPromptPolishOutput(job.id, input),
    };
  }

  if (input.operation === "asset_image_generation") {
    if (input.forceFailure) {
      throw new ProviderError({
        provider: input.provider,
        code: "MOCK_ASSET_IMAGE_GENERATION_FAILED",
        message: "Mock asset image generation failure requested.",
        retryable: true,
      });
    }
    return {
      status: "succeeded",
      assetImageGenerationOutput: mockAssetImageGenerationOutput(job.id, input),
    };
  }

  if (input.operation === "asset_caption" || input.operation === "asset_classification") {
    if (input.forceFailure) {
      throw new ProviderError({
        provider: input.provider,
        code: "MOCK_ASSET_ANALYSIS_FAILED",
        message: "Mock asset analysis failure requested.",
        retryable: false,
      });
    }
    return {
      status: "succeeded",
      assetAnalysisOutput: {
        operation: input.operation,
        provider: input.provider,
        model: input.model,
        overwrite: input.overwrite === true,
        results: input.assetIds.map((assetId) => ({
          assetId,
          caption: input.operation === "asset_caption"
            ? `Mock caption for asset ${assetId}. ${input.prompt ?? "Describe production-useful visual details."}`
            : undefined,
          classifications: input.operation === "asset_classification"
            ? ["reference", "production", assetId.includes("audio") ? "audio" : "visual"]
            : undefined,
        })),
        completedAt: new Date().toISOString(),
      },
    };
  }

  if (input.operation === "workflow_run") {
    if (input.forceFailure) {
      throw new ProviderError({
        provider: input.provider,
        code: "MOCK_WORKFLOW_FAILED",
        message: "Mock workflow failure requested.",
        retryable: false,
      });
    }
    const isVideo = input.outputKind === "video";
    const extension = isVideo ? "mp4" : "png";
    return {
      status: "succeeded",
      providerOutput: {
        assetId: `workflow-${job.id}`,
        storageKey: `${input.projectId}/workflows/${job.id}.${extension}`,
        mimeType: isVideo ? "video/mp4" : "image/png",
        provider: input.provider,
        model: input.model ?? `${input.workflowKind}-workflow`,
        prompt: input.prompt ?? `Run ${input.workflowKind} workflow ${input.workflowDefinitionId}`,
        referenceAssetIds: input.referenceAssetIds,
        rawJson: {
          workflowDefinitionId: input.workflowDefinitionId,
          workflowVersionId: input.workflowVersionId,
          workflowKind: input.workflowKind,
          outputKind: input.outputKind,
        },
      },
    };
  }

  if (input.operation === "ai_text_generation") {
    if (input.forceFailure) {
      throw new ProviderError({
        provider: input.provider,
        code: "MOCK_AI_TEXT_FAILED",
        message: "Mock AI text generation failure requested.",
        retryable: false,
      });
    }
    return {
      status: "succeeded",
      textGenerationOutput: {
        operation: "ai_text_generation",
        sourceNodeId: input.sourceNodeId,
        targetNodeId: input.aiTextNodeId,
        provider: input.provider,
        model: input.model,
        prompt: input.prompt,
        text: mockAiTextOutput(input),
        context: input.context,
        sourceNodeIds: input.sourceNodeIds,
        completedAt: new Date().toISOString(),
      },
    };
  }

  if (input.operation === "ai_audio_generation") {
    if (input.forceFailure) {
      throw new ProviderError({
        provider: input.provider,
        code: "MOCK_AI_AUDIO_FAILED",
        message: "Mock AI audio generation failure requested.",
        retryable: false,
      });
    }
    return {
      status: "succeeded",
      providerOutput: mockAiAudioOutput(job.id, input),
    };
  }

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
      mode: input.videoProviderMode ?? "image_to_video",
      model: input.model,
      sourceImageAssetId: input.sourceImageAssetId,
      firstFrameAssetId: input.referenceMedia?.find((item) => item.role === "first_frame")?.assetId,
      lastFrameAssetId: input.referenceMedia?.find((item) => item.role === "last_frame")?.assetId,
      durationSec: input.durationSeconds,
      aspectRatio: input.aspectRatio,
      resolution: input.resolution,
      referenceAssetIds: input.referenceAssetIds,
      referenceMedia: input.referenceMedia,
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

function mockAiTextOutput(input: Extract<GenerationJobInput, { operation: "ai_text_generation" }>): string {
  const contextLines = input.context.map((item, index) => {
    const title = item.title?.trim() || item.nodeId;
    return `${index + 1}. ${title} (${item.nodeType}): ${item.text}`;
  });
  const presetLine = input.skillTemplateIds?.length
    ? `\nPrompt presets: ${input.skillTemplateIds.join(", ")}`
    : "";
  const contextBlock = contextLines.length ? `\n\nReferenced canvas context:\n${contextLines.join("\n")}` : "";
  return `Mock AI text for prompt: ${input.prompt}${presetLine}${contextBlock}`;
}

function mockAiAudioOutput(
  jobId: string,
  input: AiAudioGenerationJobInput,
): GeneratedMediaProviderOutput {
  const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return {
    assetId: `mock-audio-${safeJobId}`,
    storageKey: `${input.projectId}/mock/audio/${safeJobId}.mp3`,
    mimeType: "audio/mpeg",
    provider: input.provider,
    model: input.model,
    prompt: input.prompt,
    referenceAssetIds: input.referenceAssetIds,
    rawJson: {
      mock: true,
      operation: input.operation,
      scriptText: input.scriptText,
      durationSeconds: input.durationSeconds,
      contextCount: input.context.length,
      skillTemplateIds: input.skillTemplateIds ?? [],
    },
  };
}

function mockMediaMetadataOutput(
  jobId: string,
  input: Extract<GenerationJobInput, { operation: "media_metadata" }>,
): MediaMetadataJobOutput {
  return {
    operation: "media_metadata",
    provider: input.provider,
    model: input.model,
    overwrite: input.overwrite === true,
    createThumbnail: input.createThumbnail,
    generationJobId: jobId,
    results: input.assetIds.map((assetId) => {
      const normalized = assetId.toLowerCase();
      const audioOnly = normalized.includes("audio") && !normalized.includes("video");
      const shortVideo = normalized.includes("short") || normalized.includes("tiny");
      const silentVideo = normalized.includes("silent") || normalized.includes("no-audio");
      const durationMs = shortVideo ? 240 : audioOnly ? 6100 : 4200;
      const width = audioOnly ? undefined : 1280;
      const height = audioOnly ? undefined : 720;
      const strategy = [
        "mock executor writes metadata only; real ffmpeg adapter remains replaceable",
        shortVideo ? "short_video_keep_original_no_cut" : undefined,
        silentVideo ? "no_audio_stream_marked_hasAudio_false" : undefined,
      ].filter((item): item is string => Boolean(item));

      return {
        assetId,
        mediaInfo: {
          container: audioOnly ? "mpeg-audio" : "mp4",
          durationMs,
          width,
          height,
          frameRate: audioOnly ? undefined : 24,
          hasVideo: !audioOnly,
          hasAudio: audioOnly || !silentVideo,
          streamCount: audioOnly ? 1 : silentVideo ? 1 : 2,
          streams: [
            audioOnly
              ? {
                  kind: "audio" as const,
                  codec: "mock-aac",
                  durationMs,
                  sampleRate: 48000,
                  channelCount: 2,
                }
              : {
                  kind: "video" as const,
                  codec: "mock-h264",
                  width,
                  height,
                  durationMs,
                  frameRate: 24,
                },
            ...(!audioOnly && !silentVideo
              ? [{
                  kind: "audio" as const,
                  codec: "mock-aac",
                  durationMs,
                  sampleRate: 48000,
                  channelCount: 2,
                }]
              : []),
          ],
        },
        thumbnail: input.createThumbnail
          ? {
              kind: "thumbnail" as const,
              status: "ready" as const,
              mimeType: "image/png",
              width: audioOnly ? 320 : 480,
              height: audioOnly ? 80 : 270,
              sourceAssetId: assetId,
              generationJobId: jobId,
              rebuildStrategy: "mock_media_metadata" as const,
            }
          : undefined,
        derivatives: [],
        strategy,
      };
    }),
    completedAt: new Date().toISOString(),
  };
}

function mockSceneFrameExtractionOutput(
  jobId: string,
  input: Extract<GenerationJobInput, { operation: "scene_frame_extraction" }>,
): SceneFrameExtractionJobOutput {
  const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const timestamps = input.timestampsMs?.length
    ? input.timestampsMs.slice(0, 24)
    : Array.from({ length: Math.min(Math.max(input.frameCount, 1), 24) }, (_, index) => index * 1250);
  const frames = timestamps.map((timestampMs, index) => {
    const frameId = `frame-${index + 1}`;
    return {
      frameId,
      orderIndex: index,
      timestampMs,
      sceneIndex: input.strategy === "scene_segments" ? index : Math.floor(index / 2),
      label: `Frame ${index + 1}`,
      providerOutput: {
        assetId: `mock-scene-frame-${safeJobId}-${index + 1}`,
        storageKey: `${input.projectId}/scene-frames/${safeJobId}-${index + 1}.png`,
        mimeType: "image/png",
        provider: input.provider,
        model: input.model ?? "scene-frame-v1",
        prompt: `Frame ${index + 1} extracted from video asset ${input.sourceAssetId} at ${timestampMs}ms.`,
        referenceAssetIds: [input.sourceAssetId],
        width: 1280,
        height: 720,
        rawJson: {
          mock: true,
          operation: input.operation,
          sourceAssetId: input.sourceAssetId,
          timestampMs,
          strategy: input.strategy,
        },
      },
    };
  });

  const sceneIndices = Array.from(new Set(frames.map((frame) => frame.sceneIndex ?? frame.orderIndex)));

  return {
    operation: "scene_frame_extraction",
    provider: input.provider,
    model: input.model,
    generationJobId: jobId,
    sourceAssetId: input.sourceAssetId,
    sourceNodeId: input.sourceNodeId,
    strategy: input.strategy,
    frames,
    scenes: sceneIndices.map((sceneIndex) => {
      const sceneFrames = frames.filter((frame) => (frame.sceneIndex ?? frame.orderIndex) === sceneIndex);
      const firstFrame = sceneFrames[0];
      const lastFrame = sceneFrames[sceneFrames.length - 1];
      return {
        segmentId: `scene-${sceneIndex}`,
        orderIndex: sceneIndex,
        startMs: firstFrame?.timestampMs ?? 0,
        endMs: (lastFrame?.timestampMs ?? 0) + 1250,
        title: `Scene ${(sceneIndex + 1).toString().padStart(2, "0")}`,
        ...(firstFrame ? { representativeFrameId: firstFrame.frameId } : {}),
      };
    }),
    completedAt: new Date().toISOString(),
  };
}

function mockAssetPromptPolishOutput(
  jobId: string,
  input: Extract<GenerationJobInput, { operation: "asset_prompt_polish" }>,
): AssetPromptPolishJobOutput {
  return {
    operation: "asset_prompt_polish",
    provider: input.provider,
    model: input.model,
    overwrite: input.overwrite === true,
    prompt: input.prompt,
    generationJobId: jobId,
    results: input.items.map((item) => ({
      assetId: item.assetId,
      sourcePrompt: item.prompt,
      polishedPrompt: [
        "Production-ready asset prompt:",
        item.prompt.replace(/\s+/g, " ").trim(),
        "Use clear subject identity, consistent style, and generation-safe visual detail.",
      ].join(" "),
    })),
    completedAt: new Date().toISOString(),
  };
}

function mockAssetImageGenerationOutput(
  jobId: string,
  input: Extract<GenerationJobInput, { operation: "asset_image_generation" }>,
): AssetImageGenerationJobOutput {
  const safeJobId = jobId.replace(/[^a-zA-Z0-9_-]/g, "-");
  return {
    operation: "asset_image_generation",
    provider: input.provider,
    model: input.model,
    overwrite: input.overwrite === true,
    generationJobId: jobId,
    results: input.items.map((item, index) => ({
      sourceAssetId: item.assetId,
      prompt: item.prompt,
      providerOutput: {
        assetId: `mock-asset-image-${safeJobId}-${index + 1}`,
        storageKey: `${input.projectId}/asset-generations/${safeJobId}-${index + 1}.png`,
        mimeType: "image/png",
        provider: input.provider,
        model: input.model ?? "mock-image-v1",
        prompt: item.prompt,
        referenceAssetIds: [item.assetId],
        width: 1280,
        height: 720,
        rawJson: {
          mock: true,
          operation: input.operation,
          sourceAssetId: item.assetId,
          aspectRatio: input.aspectRatio,
          providerParams: input.providerParams ?? {},
        },
      },
    })),
    completedAt: new Date().toISOString(),
  };
}

function isGenerationExecutorRegistryOptions(
  value: Record<string, string | undefined> | GenerationExecutorRegistryOptions,
): value is GenerationExecutorRegistryOptions {
  return "env" in value || "fetchImpl" in value || "programmableProvider" in value;
}
