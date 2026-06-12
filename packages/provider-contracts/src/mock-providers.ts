import type {
  EditorPackageInput,
  EditorProvider,
  ImageGenerationInput,
  ImageProvider,
  LlmProvider,
  MockAssetOutput,
  MockEditorPackageOutput,
  ProviderRegistry,
  VideoGenerationInput,
  VideoProvider,
} from "./contracts";
import { ProviderError } from "./contracts";
import type { StoryboardResult } from "@guga-flow/shared-types";

const MOCK_PROJECT_SEED = "mock";

function failIfRequested(provider: string, forceFailure?: boolean): void {
  if (!forceFailure) {
    return;
  }

  throw new ProviderError({
    provider,
    code: "MOCK_PROVIDER_FAILURE",
    message: `${provider} mock failure requested`,
    retryable: true,
  });
}

function stableId(prefix: string, value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${prefix}_${normalized || MOCK_PROJECT_SEED}`;
}

export class MockLlmProvider implements LlmProvider {
  readonly capability = {
    id: "mock-llm",
    displayName: "Mock LLM",
    requiresApiKey: false,
  };

  async generateStoryboard(input: Parameters<LlmProvider["generateStoryboard"]>[0]): Promise<StoryboardResult> {
    failIfRequested(this.capability.id, input.forceFailure);

    const title = input.title?.trim() || "Mock Storyboard";

    return {
      title,
      logline: `A mock storyboard generated from ${input.novelText.length} characters.`,
      characters: [
        {
          tempId: "char_hero",
          name: "Hero",
          role: "protagonist",
          appearance: "A consistent lead character for mock generation.",
          personality: "Determined and observant.",
          identityPrompt: "consistent protagonist, cinematic character reference",
        },
      ],
      locations: [
        {
          tempId: "loc_city",
          name: "City Rooftop",
          type: "exterior",
          description: "A simple rooftop location used by the mock storyboard.",
          lighting: "soft evening light",
          atmosphere: "quiet and expectant",
          locationPrompt: "cinematic rooftop, soft evening light",
        },
      ],
      scenes: [
        {
          tempId: "scene_1",
          title: "Opening Beat",
          sourceExcerpt: input.novelText.slice(0, 160),
          summary: "The story opens with a clear visual action.",
          mood: "anticipatory",
          timeOfDay: "evening",
          characterTempIds: ["char_hero"],
          locationTempId: "loc_city",
          shots: [
            {
              tempId: "shot_1",
              shotIndex: 1,
              title: "Hero establishes the scene",
              durationSec: 4,
              visualDescription: "The hero steps into frame and surveys the city.",
              action: "walks to the edge of the rooftop",
              cameraMovement: "slow push in",
              mood: "focused",
              characterTempIds: ["char_hero"],
              locationTempId: "loc_city",
              imagePrompt: "hero on a cinematic rooftop, evening, slow push in",
              videoPrompt: "slow push in on hero overlooking the city",
            },
          ],
        },
      ],
    };
  }
}

export class MockImageProvider implements ImageProvider {
  readonly capability = {
    id: "mock-image",
    displayName: "Mock Image",
    requiresApiKey: false,
  };

  async generateImage(input: ImageGenerationInput): Promise<MockAssetOutput> {
    failIfRequested(this.capability.id, input.forceFailure);

    const assetId = stableId("asset_image", `${input.projectId}-${input.prompt}`);

    return {
      assetId,
      storageKey: `mock/images/${assetId}.png`,
      mimeType: "image/png",
      provider: this.capability.id,
      model: "mock-image-v1",
      prompt: input.prompt,
      referenceAssetIds: input.referenceAssetIds ?? [],
    };
  }
}

export class MockVideoProvider implements VideoProvider {
  readonly capability = {
    id: "mock-video",
    displayName: "Mock Video",
    requiresApiKey: false,
  };

  async generateVideo(input: VideoGenerationInput): Promise<MockAssetOutput> {
    failIfRequested(this.capability.id, input.forceFailure);

    const assetId = stableId("asset_video", `${input.projectId}-${input.prompt}-${input.durationSec ?? 4}`);

    return {
      assetId,
      storageKey: `mock/videos/${assetId}.mp4`,
      mimeType: "video/mp4",
      provider: this.capability.id,
      model: "mock-video-v1",
      prompt: input.prompt,
      referenceAssetIds: input.referenceAssetIds ?? [],
    };
  }
}

export class MockEditorProvider implements EditorProvider {
  readonly capability = {
    id: "mock-editor",
    displayName: "Mock Editor Export",
    requiresApiKey: false,
  };

  async createPackage(input: EditorPackageInput): Promise<MockEditorPackageOutput> {
    failIfRequested(this.capability.id, input.forceFailure);

    const joinedIds = input.videoAssetIds.join("-");
    const packageAssetId = stableId("asset_package", `${input.projectId}-${joinedIds}`);

    return {
      packageAssetId,
      manifestAssetId: `${packageAssetId}_manifest`,
      videoAssetIds: input.videoAssetIds,
    };
  }
}

export function createMockProviderRegistry(): ProviderRegistry {
  return {
    llm: new MockLlmProvider(),
    image: new MockImageProvider(),
    video: new MockVideoProvider(),
    editor: new MockEditorProvider(),
  };
}
