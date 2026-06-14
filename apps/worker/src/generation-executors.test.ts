import type {
  AiAudioGenerationJobInput,
  AiTextGenerationJobInput,
  GenerationJobRecord,
  ProgrammableProviderManifest,
  ShotToImageJobInput,
} from "@guga-flow/shared-types";
import { describe, expect, it, vi } from "vitest";

import { createGenerationExecutorRegistry, executeGenerationJob } from "./generation-executors";

const imageManifest: ProgrammableProviderManifest = {
  id: "custom:atlas-cloud",
  kind: "image",
  displayName: "Atlas Cloud",
  credentials: [{ key: "apiKey", label: "API Key", type: "password", required: true }],
  models: [{ id: "atlas-image-v1", displayName: "Atlas Image v1", default: true }],
  defaultModel: "atlas-image-v1",
  supportedModes: ["text_to_image"],
  defaultAspectRatio: "16:9",
  supportedAspectRatios: ["16:9"],
  parameters: [],
  image: {
    supportsReferenceImages: false,
    maxReferenceImages: 0,
    supportsMultipleOutputs: false,
    maxOutputs: 1,
    action: {
      request: {
        method: "POST",
        url: "https://api.example.test/images",
        headers: { Authorization: "Bearer {{credential.apiKey}}" },
        bodyJson: { prompt: "{{input.prompt}}", model: "{{input.model}}" },
      },
      output: { source: "url", path: "data.url", mimeType: "image/png" },
    },
  },
};

describe("generation executors", () => {
  it("executes programmable image providers from worker runtime config", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify({ data: { url: "https://cdn.example.test/generated.png" } })),
    );
    const registry = createGenerationExecutorRegistry({
      env: {},
      fetchImpl,
      programmableProvider: {
        versionId: "programmable_version_1",
        manifest: imageManifest,
        credentials: { apiKey: "sk-secret-provider-key" },
      },
    });

    const result = await executeGenerationJob(jobRecord(shotInput()), registry);

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.test/images",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer sk-secret-provider-key",
        }),
        body: JSON.stringify({ prompt: "Neon rooftop", model: "atlas-image-v1" }),
      }),
    );
    expect(result).toMatchObject({
      status: "succeeded",
      providerOutput: {
        provider: "custom:atlas-cloud",
        model: "atlas-image-v1",
        remoteUrl: "https://cdn.example.test/generated.png",
      },
    });
  });

  it("executes AI text generation jobs with deterministic mock output", async () => {
    const input = aiTextInput();
    const result = await executeGenerationJob(jobRecord(input));

    expect(result).toMatchObject({
      status: "succeeded",
      textGenerationOutput: {
        operation: "ai_text_generation",
        provider: "mock-llm",
        prompt: "Write a two-beat sequence.",
        text: expect.stringContaining("Shot 01 (shot)"),
        sourceNodeIds: ["ai_text_1", "shot_1"],
      },
    });
  });

  it("executes AI audio generation jobs with deterministic mock audio output", async () => {
    const input = aiAudioInput();
    const result = await executeGenerationJob(jobRecord(input));

    expect(result).toMatchObject({
      status: "succeeded",
      providerOutput: {
        assetId: "mock-audio-job_1",
        storageKey: "project_1/mock/audio/job_1.mp3",
        mimeType: "audio/mpeg",
        provider: "mock-audio",
        model: "mock-tts-v1",
        prompt: "Read Ari's line as a tense whisper.",
        referenceAssetIds: ["asset_voice_1"],
        rawJson: {
          operation: "ai_audio_generation",
          scriptText: "Read Ari's line as a tense whisper.",
          durationSeconds: 8,
          contextCount: 1,
          skillTemplateIds: ["preset_audio_1"],
        },
      },
    });
  });
});

function shotInput(): ShotToImageJobInput {
  return {
    operation: "shot_to_image",
    projectId: "project_1",
    sourceNodeId: "shot_1",
    shotNodeId: "shot_1",
    prompt: "Neon rooftop",
    negativePrompt: "no text",
    referenceAssetIds: [],
    sourceNodeIds: {
      shotNodeId: "shot_1",
      sceneNodeId: "scene_1",
      characterNodeIds: [],
      referenceAssetIds: [],
    },
    debugParts: [],
    missingContext: [],
    provider: "custom:atlas-cloud",
    providerVersionId: "programmable_version_1",
    model: "atlas-image-v1",
  };
}

function aiTextInput(): AiTextGenerationJobInput {
  return {
    operation: "ai_text_generation",
    projectId: "project_1",
    sourceNodeId: "ai_text_1",
    aiTextNodeId: "ai_text_1",
    prompt: "Write a two-beat sequence.",
    context: [
      {
        nodeId: "shot_1",
        nodeType: "shot",
        title: "Shot 01",
        text: "Visual description: Ari watches signal lights blink out.",
      },
    ],
    sourceNodeIds: ["ai_text_1", "shot_1"],
    provider: "mock-llm",
    model: "mock-storyboard",
  };
}

function aiAudioInput(): AiAudioGenerationJobInput {
  return {
    operation: "ai_audio_generation",
    projectId: "project_1",
    sourceNodeId: "ai_audio_1",
    aiAudioNodeId: "ai_audio_1",
    prompt: "Read Ari's line as a tense whisper.",
    scriptText: "Read Ari's line as a tense whisper.",
    context: [
      {
        nodeId: "shot_1",
        nodeType: "shot",
        title: "Shot 01",
        text: "Dialogue: We move now.",
      },
    ],
    sourceNodeIds: ["ai_audio_1", "shot_1"],
    referenceAssetIds: ["asset_voice_1"],
    provider: "mock-audio",
    model: "mock-tts-v1",
    durationSeconds: 8,
    providerParams: {},
    skillTemplateIds: ["preset_audio_1"],
  };
}

function jobRecord<TInput extends ShotToImageJobInput | AiTextGenerationJobInput | AiAudioGenerationJobInput>(
  input: TInput,
): GenerationJobRecord<TInput> {
  return {
    id: "job_1",
    projectId: input.projectId,
    operation: input.operation,
    status: "running",
    provider: input.provider,
    model: input.model,
    sourceNodeId: input.sourceNodeId,
    targetNodeId: undefined,
    providerTaskId: undefined,
    inputJson: input,
    outputJson: undefined,
    errorMessage: undefined,
    createdAt: "2026-06-13T00:00:00.000Z",
    updatedAt: "2026-06-13T00:00:00.000Z",
  };
}
