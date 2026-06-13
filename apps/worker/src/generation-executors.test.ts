import type { GenerationJobRecord, ProgrammableProviderManifest, ShotToImageJobInput } from "@guga-flow/shared-types";
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

function jobRecord(input: ShotToImageJobInput): GenerationJobRecord<ShotToImageJobInput> {
  return {
    id: "job_1",
    projectId: input.projectId,
    operation: "shot_to_image",
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
