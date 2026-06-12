import {
  ProviderError,
  createMockProviderRegistry,
  type MockAssetOutput,
  type MockEditorPackageOutput,
  type ProviderErrorShape,
  type ProviderRegistry,
} from "@guga-flow/provider-contracts";
import type { StoryboardResult } from "@guga-flow/shared-types";

export interface MockWorkflowInput {
  projectId: string;
  novelText: string;
  title?: string;
  referenceAssetIds?: string[];
  forceFailureStage?: "storyboard" | "image" | "video" | "editor";
}

export interface MockWorkflowSuccess {
  status: "succeeded";
  storyboard: StoryboardResult;
  image: MockAssetOutput;
  video: MockAssetOutput;
  editorPackage: MockEditorPackageOutput;
}

export interface MockWorkflowFailure {
  status: "failed";
  failedStage: "storyboard" | "image" | "video" | "editor";
  error: ProviderErrorShape;
}

export type MockWorkflowResult = MockWorkflowSuccess | MockWorkflowFailure;

function toProviderErrorShape(error: unknown, provider: string): ProviderErrorShape {
  if (error instanceof ProviderError) {
    return error.toJSON();
  }

  return {
    provider,
    code: "UNKNOWN_WORKFLOW_ERROR",
    message: error instanceof Error ? error.message : "Unknown worker error",
    retryable: false,
  };
}

export async function runMockMediaWorkflow(
  input: MockWorkflowInput,
  registry: ProviderRegistry = createMockProviderRegistry(),
): Promise<MockWorkflowResult> {
  let storyboard: StoryboardResult;

  try {
    storyboard = await registry.llm.generateStoryboard({
      projectId: input.projectId,
      title: input.title,
      novelText: input.novelText,
      forceFailure: input.forceFailureStage === "storyboard",
    });
  } catch (error) {
    return {
      status: "failed",
      failedStage: "storyboard",
      error: toProviderErrorShape(error, registry.llm.capability.id),
    };
  }

  const firstShot = storyboard.scenes[0]?.shots[0];
  const imagePrompt = firstShot?.imagePrompt ?? "mock image prompt";
  const videoPrompt = firstShot?.videoPrompt ?? "mock video prompt";

  let image: MockAssetOutput;
  try {
    const imageResult = await registry.image.generateImage({
      projectId: input.projectId,
      prompt: imagePrompt,
      referenceAssetIds: input.referenceAssetIds ?? [],
      forceFailure: input.forceFailureStage === "image",
    });
    const firstImage = imageResult.outputs[0];
    if (!firstImage) {
      throw new ProviderError({
        provider: registry.image.capability.id,
        code: "PROVIDER_EMPTY_RESPONSE",
        message: "Mock image provider did not return an output.",
        retryable: false,
      });
    }
    image = firstImage;
  } catch (error) {
    return {
      status: "failed",
      failedStage: "image",
      error: toProviderErrorShape(error, registry.image.capability.id),
    };
  }

  let video: MockAssetOutput;
  try {
    video = await registry.video.generateVideo({
      projectId: input.projectId,
      prompt: videoPrompt,
      sourceImageAssetId: image.assetId,
      durationSec: firstShot?.durationSec ?? 4,
      referenceAssetIds: [image.assetId],
      forceFailure: input.forceFailureStage === "video",
    });
  } catch (error) {
    return {
      status: "failed",
      failedStage: "video",
      error: toProviderErrorShape(error, registry.video.capability.id),
    };
  }

  try {
    const editorPackage = await registry.editor.createPackage({
      projectId: input.projectId,
      videoAssetIds: [video.assetId],
      forceFailure: input.forceFailureStage === "editor",
    });

    return {
      status: "succeeded",
      storyboard,
      image,
      video,
      editorPackage,
    };
  } catch (error) {
    return {
      status: "failed",
      failedStage: "editor",
      error: toProviderErrorShape(error, registry.editor.capability.id),
    };
  }
}
