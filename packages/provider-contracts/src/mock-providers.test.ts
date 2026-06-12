import { describe, expect, it } from "vitest";

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
    });

    expect(storyboard.characters[0]?.tempId).toBe("char_hero");
    expect(image?.provider).toBe("mock-image");
    expect(image?.referenceAssetIds).toEqual([]);
    expect(video.provider).toBe("mock-video");
    expect(editorPackage.videoAssetIds).toEqual([video.assetId]);
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
