import type {
  EditorPackageInput,
  EditorProvider,
  ImageGenerationInput,
  ImageProvider,
  ImageProviderResult,
  LlmProvider,
  MockAssetOutput,
  MockEditorPackageOutput,
  ProviderRegistry,
  VideoGenerationInput,
  VideoProvider,
  VideoProviderTaskResult,
} from "./contracts";
import { ProviderError } from "./contracts";
import type { StoryboardResult } from "@guga-flow/shared-types";

const MOCK_PROJECT_SEED = "mock";
const STABLE_ID_BODY_MAX_LENGTH = 80;

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
  const body = normalized || MOCK_PROJECT_SEED;
  const digest = stableDigest(value);
  const truncated = body.slice(0, STABLE_ID_BODY_MAX_LENGTH).replace(/-+$/g, "");
  return `${prefix}_${truncated || MOCK_PROJECT_SEED}-${digest}`;
}

function stableDigest(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 0x01000193);
    second ^= code + index;
    second = Math.imul(second, 0x85ebca6b);
  }

  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`.slice(0, 10);
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
      storyBlueprint: {
        worldSummary: "A near-future city where rooftop signals reveal hidden alliances.",
        timelineEvents: [
          {
            eventId: "event_opening",
            title: "Signal spotted",
            orderIndex: 1,
            chapterIndex: 1,
            sourceExcerpt: input.novelText.slice(0, 160),
            summary: "The hero notices a hidden signal above the city and decides to investigate.",
            characters: ["char_hero"],
            locationName: "City Rooftop",
            emotion: "anticipation",
            conflict: "The hero must decide whether the signal is a trap.",
            result: "The hero moves toward the signal.",
            estimatedDurationSec: 12,
          },
          {
            eventId: "event_decision",
            title: "Alliance confirmed",
            orderIndex: 2,
            chapterIndex: 1,
            sourceExcerpt: input.novelText.slice(160, 320) || input.novelText.slice(0, 160),
            summary: "The ally joins the hero and confirms the city signal points to the next move.",
            characters: ["char_hero", "char_ally"],
            locationName: "City Rooftop",
            emotion: "resolve",
            conflict: "The pair must commit before the signal disappears.",
            result: "The hero and ally choose the mission together.",
            estimatedDurationSec: 15,
          },
        ],
        characterRelationships: [
          {
            relationshipId: "rel_hero_ally",
            characterTempIds: ["char_hero", "char_ally"],
            type: "allies",
            summary: "The hero and ally trust each other after surviving previous city signals.",
            status: "tested",
          },
        ],
        themes: ["trust", "hidden-city"],
        adaptationNotes: "Keep the glowing signal visible as the story trace across shots.",
      },
      characters: [
        {
          tempId: "char_hero",
          name: "Hero",
          role: "protagonist",
          appearance: "A consistent lead character for mock generation.",
          personality: "Determined and observant.",
          identityPrompt: "consistent protagonist, cinematic character reference",
          lifecycleStages: [
            {
              stageId: "stage_alert",
              label: "Signal discovery",
              ageRange: "late 20s",
              appearance: "alert lead character with rain-damp hair",
              costume: "dark utility coat",
              emotionalState: "wary",
              identityPrompt: "alert protagonist in dark utility coat, rain-damp hair",
            },
            {
              stageId: "stage_resolved",
              label: "Mission decision",
              ageRange: "late 20s",
              appearance: "resolved lead character standing tall",
              costume: "dark utility coat with glowing signal reflection",
              emotionalState: "determined",
              identityPrompt: "resolved protagonist, glowing signal reflection on dark coat",
            },
          ],
        },
        {
          tempId: "char_ally",
          name: "Ally",
          role: "support",
          appearance: "A reliable companion with a clean visual silhouette.",
          personality: "Calm, practical, and watchful.",
          identityPrompt: "consistent support character, cinematic character reference",
          lifecycleStages: [
            {
              stageId: "stage_joining",
              label: "Joining the mission",
              ageRange: "early 30s",
              appearance: "calm companion with a precise silhouette",
              costume: "light tactical jacket",
              emotionalState: "focused",
              identityPrompt: "calm support character in light tactical jacket",
            },
          ],
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
        mockScene({
          sceneIndex: 1,
          eventId: "event_opening",
          title: "Opening Beat",
          sourceExcerpt: input.novelText.slice(0, 160),
          summary: "The story opens with a clear visual action.",
          mood: "anticipatory",
          timeOfDay: "evening",
          heroStageId: "stage_alert",
        }),
        mockScene({
          sceneIndex: 2,
          eventId: "event_decision",
          title: "Decision Beat",
          sourceExcerpt: input.novelText.slice(160, 320) || input.novelText.slice(0, 160),
          summary: "The hero and ally make the decision that moves the story forward.",
          mood: "resolved",
          timeOfDay: "night",
          heroStageId: "stage_resolved",
        }),
      ],
    };
  }
}

function mockScene(input: {
  sceneIndex: number;
  eventId: string;
  title: string;
  sourceExcerpt: string;
  summary: string;
  mood: string;
  timeOfDay: string;
  heroStageId: string;
}): StoryboardResult["scenes"][number] {
  return {
    tempId: `scene_${input.sceneIndex}`,
    title: input.title,
    sourceExcerpt: input.sourceExcerpt,
    summary: input.summary,
    mood: input.mood,
    timeOfDay: input.timeOfDay,
    characterTempIds: ["char_hero", "char_ally"],
    locationTempId: "loc_city",
    storyEventIds: [input.eventId],
    shots: [1, 2, 3].map((shotIndex) => {
      const globalShotIndex = (input.sceneIndex - 1) * 3 + shotIndex;
      const characterStageRefs =
        shotIndex === 1
          ? [{ characterTempId: "char_hero", stageId: input.heroStageId }]
          : [
              { characterTempId: "char_hero", stageId: input.heroStageId },
              { characterTempId: "char_ally", stageId: "stage_joining" },
            ];
      return {
        tempId: `shot_${globalShotIndex}`,
        shotIndex: globalShotIndex,
        title: `Shot ${globalShotIndex}`,
        durationSec: shotIndex === 2 ? 5 : 4,
        visualDescription: `Scene ${input.sceneIndex} shot ${shotIndex} frames the rooftop action clearly.`,
        action:
          shotIndex === 1
            ? "the hero enters the rooftop frame"
            : shotIndex === 2
              ? "the ally joins and points toward the city"
              : "both characters commit to the next move",
        cameraMovement:
          shotIndex === 1 ? "slow push in" : shotIndex === 2 ? "gentle pan" : "locked close up",
        mood: input.mood,
        characterTempIds: shotIndex === 1 ? ["char_hero"] : ["char_hero", "char_ally"],
        locationTempId: "loc_city",
        storyEventIds: [input.eventId],
        characterStageRefs,
        imagePrompt: `cinematic rooftop scene ${input.sceneIndex} shot ${shotIndex}, consistent hero and ally`,
        videoPrompt: `camera ${shotIndex} movement over rooftop scene ${input.sceneIndex}`,
      };
    }),
  };
}

export class MockImageProvider implements ImageProvider {
  readonly capability = {
    id: "mock-image",
    displayName: "Mock Image",
    requiresApiKey: false,
  };

  async generateImage(input: ImageGenerationInput): Promise<ImageProviderResult> {
    failIfRequested(this.capability.id, input.forceFailure);

    const assetId = stableId("asset_image", `${input.projectId}-${input.prompt}`);

    const output: MockAssetOutput = {
      assetId,
      storageKey: `mock/images/${assetId}.png`,
      mimeType: "image/png",
      provider: this.capability.id,
      model: "mock-image-v1",
      prompt: input.prompt,
      referenceAssetIds: input.referenceAssetIds ?? [],
    };

    return {
      outputs: [output],
    };
  }
}

export class MockVideoProvider implements VideoProvider {
  readonly capability = {
    id: "mock-video",
    displayName: "Mock Video",
    requiresApiKey: false,
  };

  private readonly tasks = new Map<string, VideoProviderTaskResult>();

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

  async createTask(input: VideoGenerationInput): Promise<VideoProviderTaskResult> {
    const providerTaskId = stableId(
      "task_video",
      `${input.projectId}-${input.prompt}-${input.durationSec ?? 4}-${input.model ?? "mock-video-v1"}`,
    );
    const output = {
      ...(await this.generateVideo(input)),
      providerTaskId,
    };
    const result: VideoProviderTaskResult = {
      status: "succeeded",
      providerTaskId,
      output,
      rawJson: {
        provider: this.capability.id,
        mode: input.mode ?? "image_to_video",
        mock: true,
      },
    };

    this.tasks.set(providerTaskId, result);
    return result;
  }

  async getTask(providerTaskId: string): Promise<VideoProviderTaskResult> {
    const task = this.tasks.get(providerTaskId);
    if (task) {
      return task;
    }

    return {
      status: "failed",
      providerTaskId,
      error: {
        provider: this.capability.id,
        code: "MOCK_TASK_NOT_FOUND",
        message: `${this.capability.id} task was not found.`,
        retryable: false,
      },
    };
  }

  async cancelTask(providerTaskId: string): Promise<VideoProviderTaskResult> {
    const result: VideoProviderTaskResult = {
      status: "cancelled",
      providerTaskId,
      rawJson: {
        provider: this.capability.id,
        mock: true,
      },
    };
    this.tasks.set(providerTaskId, result);
    return result;
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
      selectedVideoNodeIds: input.selectedVideoNodeIds ?? [],
      storageKey: `mock/editor-packages/${packageAssetId}.zip`,
      mimeType: "application/zip",
      timeline: input.timeline,
      storyboardCsv: input.storyboardCsv,
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
