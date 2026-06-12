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
    const image = await registry.image.generateImage({
      projectId: "project_1",
      prompt: storyboard.scenes[0]?.shots[0]?.imagePrompt ?? "fallback",
    });
    const video = await registry.video.generateVideo({
      projectId: "project_1",
      prompt: storyboard.scenes[0]?.shots[0]?.videoPrompt ?? "fallback",
      sourceImageAssetId: image.assetId,
    });
    const editorPackage = await registry.editor.createPackage({
      projectId: "project_1",
      videoAssetIds: [video.assetId],
    });

    expect(storyboard.characters[0]?.tempId).toBe("char_hero");
    expect(image.provider).toBe("mock-image");
    expect(image.referenceAssetIds).toEqual([]);
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
});
