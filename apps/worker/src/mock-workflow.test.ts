import { describe, expect, it } from "vitest";

import { runMockMediaWorkflow } from "./mock-workflow";

describe("runMockMediaWorkflow", () => {
  it("runs storyboard to image to video to editor package with mock providers", async () => {
    const result = await runMockMediaWorkflow({
      projectId: "project_1",
      novelText: "A hero watches the city skyline.",
      referenceAssetIds: [],
    });

    expect(result.status).toBe("succeeded");
    if (result.status === "succeeded") {
      expect(result.storyboard.scenes).toHaveLength(2);
      expect(result.storyboard.scenes.flatMap((scene) => scene.shots)).toHaveLength(6);
      expect(result.storyboard.characters).toHaveLength(2);
      expect(result.storyboard.locations).toHaveLength(1);
      expect(result.image.provider).toBe("mock-image");
      expect(result.video.provider).toBe("mock-video");
      expect(result.editorPackage.videoAssetIds).toEqual([result.video.assetId]);
    }
  });

  it("preserves typed failure state when a provider fails", async () => {
    const result = await runMockMediaWorkflow({
      projectId: "project_1",
      novelText: "A hero watches the city skyline.",
      forceFailureStage: "video",
    });

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.failedStage).toBe("video");
      expect(result.error.provider).toBe("mock-video");
      expect(result.error.retryable).toBe(true);
    }
  });
});
