import { describe, expect, it } from "vitest";
import { validateStoryboardResult } from "@guga-flow/shared-types";

import { ProviderError, createMockProviderRegistry } from "./index";

describe("mock providers", () => {
  it("returns deterministic storyboard and media outputs without real keys", async () => {
    const registry = createMockProviderRegistry();

    const storyboard = await registry.llm.generateStoryboard({
      projectId: "project_1",
      title: "Demo",
      novelText: "A hero watches the skyline.",
    });
    const imageResult = await registry.image.generateImage({
      projectId: "project_1",
      prompt: storyboard.scenes[0]?.shots[0]?.imagePrompt ?? "fallback",
    });
    const image = imageResult.outputs[0];
    expect(image).toBeDefined();
    const video = await registry.video.generateVideo({
      projectId: "project_1",
      prompt: storyboard.scenes[0]?.shots[0]?.videoPrompt ?? "fallback",
      sourceImageAssetId: image?.assetId,
    });
    const editorPackage = await registry.editor.createPackage({
      projectId: "project_1",
      videoAssetIds: [video.assetId],
      selectedVideoNodeIds: ["video_node_1"],
      sortMode: "manual",
    });

    expect(storyboard.characters[0]?.tempId).toBe("char_hero");
    const timelineEvents = storyboard.storyBlueprint?.timelineEvents ?? [];

    expect(timelineEvents.map((event) => event.eventId)).toEqual([
      "event_opening",
      "event_decision",
    ]);
    expect(storyboard.characters[0]?.lifecycleStages?.[0]?.stageId).toBe("stage_alert");
    expect(storyboard.scenes[0]?.shots[0]?.storyEventIds).toEqual(["event_opening"]);
    expect(storyboard.scenes[1]?.shots[0]?.characterStageRefs?.[0]).toEqual({
      characterTempId: "char_hero",
      stageId: "stage_resolved",
    });
    expect(validateStoryboardResult(storyboard).success).toBe(true);
    expect(image?.provider).toBe("mock-image");
    expect(image?.referenceAssetIds).toEqual([]);
    expect(video.provider).toBe("mock-video");
    expect(editorPackage.videoAssetIds).toEqual([video.assetId]);
    expect(editorPackage.selectedVideoNodeIds).toEqual(["video_node_1"]);
    expect(editorPackage.storageKey).toMatch(/mock\/editor-packages\/asset_package_/);
    expect(editorPackage.mimeType).toBe("application/zip");
  });

  it("supports async video task lifecycle contracts", async () => {
    const registry = createMockProviderRegistry();

    const created = await registry.video.createTask({
      projectId: "project_1",
      prompt: "slow dolly across a generated frame",
      mode: "image_to_video",
      sourceImageAssetId: "asset_image_1",
      durationSec: 5,
      aspectRatio: "16:9",
      resolution: "720p",
      providerParams: {
        motionStrength: "medium",
      },
    });
    const fetched = await registry.video.getTask(created.providerTaskId);
    const cancelled = await registry.video.cancelTask(created.providerTaskId);

    expect(created.status).toBe("succeeded");
    expect(created.output?.providerTaskId).toBe(created.providerTaskId);
    expect(fetched).toMatchObject({
      status: "succeeded",
      providerTaskId: created.providerTaskId,
    });
    expect(cancelled).toMatchObject({
      status: "cancelled",
      providerTaskId: created.providerTaskId,
    });
  });

  it("carries reference image story seeds through storyboard drafts", async () => {
    const registry = createMockProviderRegistry();

    const storyboard = await registry.llm.generateStoryboard({
      projectId: "project_1",
      title: "Reference Demo",
      novelText: "A raincoat courier becomes the subject of a short film.",
      referenceAssetIds: ["asset_seed_1"],
      referenceImageNodeIds: ["image_seed_1"],
      referencePrompt: "preserve the yellow raincoat",
    });

    expect(validateStoryboardResult(storyboard).success).toBe(true);
    expect(storyboard.storySeedReferences).toEqual([
      expect.objectContaining({
        assetId: "asset_seed_1",
        imageNodeId: "image_seed_1",
      }),
    ]);
    expect(storyboard.characters[0]?.referenceAssetIds).toEqual(["asset_seed_1"]);
    expect(storyboard.locations[0]?.referenceAssetIds).toEqual(["asset_seed_1"]);
    expect(storyboard.scenes[0]?.shots[0]?.referenceAssetIds).toEqual(["asset_seed_1"]);
  });

  it("normalizes forced mock provider failures", async () => {
    const registry = createMockProviderRegistry();

    await expect(
      registry.image.generateImage({
        projectId: "project_1",
        prompt: "fail please",
        forceFailure: true,
      }),
    ).rejects.toMatchObject({
      provider: "mock-image",
      code: "MOCK_PROVIDER_FAILURE",
      retryable: true,
    } satisfies Partial<ProviderError>);
  });

  it("carries source image metadata through mock image refinement", async () => {
    const registry = createMockProviderRegistry();

    const first = await registry.image.generateImage({
      projectId: "project_1",
      prompt: "make the lighting warmer",
      mode: "image_to_image",
      sourceImageAssetId: "asset_source_a",
      sourceImageNodeId: "image_source_a",
      referenceAssetIds: ["asset_ref_1"],
    });
    const second = await registry.image.generateImage({
      projectId: "project_1",
      prompt: "make the lighting warmer",
      mode: "image_to_image",
      sourceImageAssetId: "asset_source_b",
      sourceImageNodeId: "image_source_b",
      referenceAssetIds: ["asset_ref_1"],
    });

    expect(first.outputs[0]?.assetId).not.toBe(second.outputs[0]?.assetId);
    expect(first.outputs[0]).toMatchObject({
      referenceAssetIds: ["asset_source_a", "asset_ref_1"],
      rawJson: {
        mode: "image_to_image",
        sourceImageAssetId: "asset_source_a",
        sourceImageNodeId: "image_source_a",
      },
    });
  });

  it("keeps mock media storage filenames bounded for long prompts", async () => {
    const registry = createMockProviderRegistry();
    const prompt = [
      "Location prompt bright control room practical lights consistency same glowing console bank",
      "Character smoke hero identity consistent smoke hero identity consistency same face and coat",
      "Image prompt cinematic hero at the console shot visual action camera slow dolly",
    ].join(" ");

    const imageResult = await registry.image.generateImage({
      projectId: "project_1",
      prompt,
    });
    const image = imageResult.outputs[0];
    expect(image).toBeDefined();
    const video = await registry.video.generateVideo({
      projectId: "project_1",
      prompt,
      sourceImageAssetId: image?.assetId,
    });
    const imageFilename = image?.storageKey.split("/").pop() ?? "";
    const videoFilename = video.storageKey.split("/").pop() ?? "";

    expect(imageFilename.length).toBeLessThanOrEqual(120);
    expect(videoFilename.length).toBeLessThanOrEqual(120);
    expect(image?.assetId).toMatch(/-[a-f0-9]{10}$/);
    expect(video.assetId).toMatch(/-[a-f0-9]{10}$/);
  });
});
