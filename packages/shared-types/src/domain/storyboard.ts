import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const optionalNonEmptyString = z.string().trim().min(1).optional();
const referenceAssetIdsSchema = z.array(nonEmptyString).optional();

export const STORYBOARD_LOCATION_TYPES = ["interior", "exterior", "fantasy", "virtual"] as const;
export type StoryboardLocationType = (typeof STORYBOARD_LOCATION_TYPES)[number];

export const STORYBOARD_DRAFT_STATUSES = ["draft", "valid", "invalid", "ready"] as const;
export type StoryboardDraftStatus = (typeof STORYBOARD_DRAFT_STATUSES)[number];

export const CHARACTER_IDENTITY_LOCK_FIELDS = [
  "name",
  "role",
  "appearance",
  "personality",
  "costume",
  "identityPrompt",
  "lifecycleStages",
] as const;
export type CharacterIdentityLockField = (typeof CHARACTER_IDENTITY_LOCK_FIELDS)[number];

export const characterLifecycleStageSchema = z.object({
  stageId: nonEmptyString,
  label: nonEmptyString,
  ageRange: optionalNonEmptyString,
  appearance: optionalNonEmptyString,
  costume: optionalNonEmptyString,
  hairstyle: optionalNonEmptyString,
  emotionalState: optionalNonEmptyString,
  identityPrompt: optionalNonEmptyString,
});

export const characterStageReferenceSchema = z.object({
  characterTempId: nonEmptyString,
  stageId: nonEmptyString,
});

export const storyTimelineEventSchema = z.object({
  eventId: nonEmptyString,
  title: optionalNonEmptyString,
  orderIndex: z.number().int().nonnegative(),
  chapterIndex: z.number().int().positive().optional(),
  sourceExcerpt: optionalNonEmptyString,
  summary: nonEmptyString,
  characters: z.array(nonEmptyString).optional(),
  locationName: optionalNonEmptyString,
  emotion: optionalNonEmptyString,
  conflict: optionalNonEmptyString,
  result: optionalNonEmptyString,
  estimatedDurationSec: z.number().positive().optional(),
});

export const characterRelationshipSchema = z.object({
  relationshipId: nonEmptyString,
  characterTempIds: z.array(nonEmptyString).min(2),
  type: nonEmptyString,
  summary: nonEmptyString,
  status: optionalNonEmptyString,
});

export const storyBlueprintSchema = z.object({
  worldSummary: optionalNonEmptyString,
  timelineEvents: z.array(storyTimelineEventSchema).optional(),
  characterRelationships: z.array(characterRelationshipSchema).optional(),
  themes: z.array(nonEmptyString).optional(),
  adaptationNotes: optionalNonEmptyString,
});

export const storySeedReferenceSchema = z.object({
  assetId: optionalNonEmptyString,
  imageNodeId: optionalNonEmptyString,
  label: optionalNonEmptyString,
  prompt: optionalNonEmptyString,
});

export const characterDraftSchema = z.object({
  tempId: nonEmptyString,
  name: nonEmptyString,
  role: nonEmptyString,
  appearance: nonEmptyString,
  personality: nonEmptyString,
  costume: optionalNonEmptyString,
  identityPrompt: nonEmptyString,
  referenceAssetIds: referenceAssetIdsSchema,
  lifecycleStages: z.array(characterLifecycleStageSchema).optional(),
  locked: z.boolean().optional(),
  lockedFields: z.array(z.enum(CHARACTER_IDENTITY_LOCK_FIELDS)).optional(),
});

export const locationDraftSchema = z.object({
  tempId: nonEmptyString,
  name: nonEmptyString,
  type: z.enum(STORYBOARD_LOCATION_TYPES),
  description: nonEmptyString,
  lighting: nonEmptyString,
  atmosphere: nonEmptyString,
  locationPrompt: nonEmptyString,
  referenceAssetIds: referenceAssetIdsSchema,
});

export const shotDraftSchema = z.object({
  tempId: nonEmptyString,
  shotIndex: z.number().int().positive(),
  title: nonEmptyString,
  sourceExcerpt: optionalNonEmptyString,
  durationSec: z.number().positive(),
  visualDescription: nonEmptyString,
  action: nonEmptyString,
  cameraMovement: nonEmptyString,
  lens: optionalNonEmptyString,
  lighting: optionalNonEmptyString,
  mood: optionalNonEmptyString,
  dialogue: optionalNonEmptyString,
  narration: optionalNonEmptyString,
  soundEffect: optionalNonEmptyString,
  characterTempIds: z.array(nonEmptyString),
  locationTempId: optionalNonEmptyString,
  storyEventIds: z.array(nonEmptyString).optional(),
  characterStageRefs: z.array(characterStageReferenceSchema).optional(),
  imagePrompt: nonEmptyString,
  videoPrompt: nonEmptyString,
  negativePrompt: optionalNonEmptyString,
  referenceAssetIds: referenceAssetIdsSchema,
});

export const sceneDraftSchema = z.object({
  tempId: nonEmptyString,
  title: nonEmptyString,
  sourceExcerpt: nonEmptyString,
  summary: nonEmptyString,
  mood: nonEmptyString,
  timeOfDay: optionalNonEmptyString,
  characterTempIds: z.array(nonEmptyString),
  locationTempId: optionalNonEmptyString,
  storyEventIds: z.array(nonEmptyString).optional(),
  shots: z.array(shotDraftSchema).min(1),
});

export const storyboardResultSchema = z
  .object({
    title: nonEmptyString,
    logline: nonEmptyString,
    storySeedReferences: z.array(storySeedReferenceSchema).optional(),
    storyBlueprint: storyBlueprintSchema.optional(),
    characters: z.array(characterDraftSchema).min(1),
    locations: z.array(locationDraftSchema).min(1),
    scenes: z.array(sceneDraftSchema).min(1),
  })
  .superRefine((storyboard, context) => {
    addDuplicateTempIdIssues(
      context,
      storyboard.characters.map((character) => character.tempId),
      "Duplicate character temp id",
      (index) => ["characters", index, "tempId"],
    );
    addDuplicateTempIdIssues(
      context,
      storyboard.locations.map((location) => location.tempId),
      "Duplicate location temp id",
      (index) => ["locations", index, "tempId"],
    );
    addDuplicateTempIdIssues(
      context,
      storyboard.scenes.map((scene) => scene.tempId),
      "Duplicate scene temp id",
      (index) => ["scenes", index, "tempId"],
    );
    addDuplicateTempIdIssues(
      context,
      storyboard.storyBlueprint?.timelineEvents?.map((event) => event.eventId) ?? [],
      "Duplicate story event id",
      (index) => ["storyBlueprint", "timelineEvents", index, "eventId"],
    );
    addDuplicateTempIdIssues(
      context,
      storyboard.storyBlueprint?.characterRelationships?.map((relationship) => relationship.relationshipId) ?? [],
      "Duplicate character relationship id",
      (index) => ["storyBlueprint", "characterRelationships", index, "relationshipId"],
    );

    const characterIds = new Set(storyboard.characters.map((character) => character.tempId));
    const locationIds = new Set(storyboard.locations.map((location) => location.tempId));
    const storyEventIds = new Set(
      storyboard.storyBlueprint?.timelineEvents?.map((event) => event.eventId) ?? [],
    );
    const stageIdsByCharacter = new Map(
      storyboard.characters.map((character) => [
        character.tempId,
        new Set(character.lifecycleStages?.map((stage) => stage.stageId) ?? []),
      ]),
    );
    const shotIds: string[] = [];
    const shotPaths: Array<(string | number)[]> = [];

    storyboard.characters.forEach((character, characterIndex) => {
      addDuplicateTempIdIssues(
        context,
        character.lifecycleStages?.map((stage) => stage.stageId) ?? [],
        "Duplicate character lifecycle stage id",
        (index) => ["characters", characterIndex, "lifecycleStages", index, "stageId"],
      );
    });

    storyboard.storyBlueprint?.timelineEvents?.forEach((event, eventIndex) => {
      assertKnownReferences(
        context,
        event.characters ?? [],
        characterIds,
        ["storyBlueprint", "timelineEvents", eventIndex, "characters"],
        "Unknown story event character temp id",
      );
    });

    storyboard.storyBlueprint?.characterRelationships?.forEach((relationship, relationshipIndex) => {
      assertKnownReferences(
        context,
        relationship.characterTempIds,
        characterIds,
        ["storyBlueprint", "characterRelationships", relationshipIndex, "characterTempIds"],
        "Unknown character relationship participant temp id",
      );
    });

    storyboard.scenes.forEach((scene, sceneIndex) => {
      assertKnownReferences(
        context,
        scene.characterTempIds,
        characterIds,
        ["scenes", sceneIndex, "characterTempIds"],
        "Unknown scene character temp id",
      );
      assertOptionalReference(
        context,
        scene.locationTempId,
        locationIds,
        ["scenes", sceneIndex, "locationTempId"],
        "Unknown scene location temp id",
      );
      assertKnownStoryEventReferences(
        context,
        scene.storyEventIds ?? [],
        storyEventIds,
        ["scenes", sceneIndex, "storyEventIds"],
        "Unknown scene story event id",
      );

      scene.shots.forEach((shot, shotIndex) => {
        shotIds.push(shot.tempId);
        shotPaths.push(["scenes", sceneIndex, "shots", shotIndex, "tempId"]);
        assertKnownReferences(
          context,
          shot.characterTempIds,
          characterIds,
          ["scenes", sceneIndex, "shots", shotIndex, "characterTempIds"],
          "Unknown shot character temp id",
        );
        assertOptionalReference(
          context,
          shot.locationTempId,
          locationIds,
          ["scenes", sceneIndex, "shots", shotIndex, "locationTempId"],
          "Unknown shot location temp id",
        );
        assertKnownStoryEventReferences(
          context,
          shot.storyEventIds ?? [],
          storyEventIds,
          ["scenes", sceneIndex, "shots", shotIndex, "storyEventIds"],
          "Unknown shot story event id",
        );
        shot.characterStageRefs?.forEach((stageRef, stageRefIndex) => {
          if (!characterIds.has(stageRef.characterTempId)) {
            context.addIssue({
              code: "custom",
              message: "Unknown shot character stage character temp id",
              path: [
                "scenes",
                sceneIndex,
                "shots",
                shotIndex,
                "characterStageRefs",
                stageRefIndex,
                "characterTempId",
              ],
            });
            return;
          }
          if (!stageIdsByCharacter.get(stageRef.characterTempId)?.has(stageRef.stageId)) {
            context.addIssue({
              code: "custom",
              message: "Unknown shot character lifecycle stage id",
              path: [
                "scenes",
                sceneIndex,
                "shots",
                shotIndex,
                "characterStageRefs",
                stageRefIndex,
                "stageId",
              ],
            });
          }
        });
      });
    });

    addDuplicateTempIdIssues(context, shotIds, "Duplicate shot temp id", (index) => shotPaths[index] ?? []);
  });

export type CharacterDraft = z.infer<typeof characterDraftSchema>;
export type CharacterLifecycleStage = z.infer<typeof characterLifecycleStageSchema>;
export type CharacterStageReference = z.infer<typeof characterStageReferenceSchema>;
export type CharacterRelationship = z.infer<typeof characterRelationshipSchema>;
export type LocationDraft = z.infer<typeof locationDraftSchema>;
export type SceneDraft = z.infer<typeof sceneDraftSchema>;
export type ShotDraft = z.infer<typeof shotDraftSchema>;
export type StoryBlueprint = z.infer<typeof storyBlueprintSchema>;
export type StorySeedReference = z.infer<typeof storySeedReferenceSchema>;
export type StoryTimelineEvent = z.infer<typeof storyTimelineEventSchema>;
export type StoryboardResult = z.infer<typeof storyboardResultSchema>;

export interface StoryboardValidationIssue {
  path: Array<string | number>;
  message: string;
}

export type StoryboardValidationResult =
  | { success: true; data: StoryboardResult; issues: [] }
  | { success: false; issues: StoryboardValidationIssue[] };

export interface StoryboardDraftRecord {
  id: string;
  projectId: string;
  novelDocumentId: string;
  status: StoryboardDraftStatus;
  storyboard?: StoryboardResult;
  validationIssues: StoryboardValidationIssue[];
  provider: string;
  model?: string;
  errorMessage?: string;
  readyForImport: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateStoryboardResult {
  draft?: StoryboardDraftRecord;
  validation: StoryboardValidationResult;
}

export interface UpdateStoryboardDraftInput {
  storyboard: StoryboardResult;
}

export interface UpdateStoryboardDraftResult {
  draft: StoryboardDraftRecord;
}

export interface MarkStoryboardDraftReadyResult {
  draft: StoryboardDraftRecord;
}

export function validateStoryboardResult(value: unknown): StoryboardValidationResult {
  const result = storyboardResultSchema.safeParse(value);
  if (result.success) {
    return {
      success: true,
      data: result.data,
      issues: [],
    };
  }

  return {
    success: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.filter((part): part is string | number =>
        typeof part === "string" || typeof part === "number",
      ),
      message: issue.message,
    })),
  };
}

function addDuplicateTempIdIssues(
  context: z.RefinementCtx,
  values: string[],
  message: string,
  pathForIndex: (index: number) => Array<string | number>,
) {
  const firstIndexByValue = new Map<string, number>();
  values.forEach((value, index) => {
    const firstIndex = firstIndexByValue.get(value);
    if (firstIndex === undefined) {
      firstIndexByValue.set(value, index);
      return;
    }

    context.addIssue({
      code: "custom",
      message,
      path: pathForIndex(index),
    });
    if (firstIndex !== index) {
      context.addIssue({
        code: "custom",
        message,
        path: pathForIndex(firstIndex),
      });
    }
  });
}

function assertKnownReferences(
  context: z.RefinementCtx,
  values: string[],
  knownIds: Set<string>,
  basePath: Array<string | number>,
  message: string,
) {
  values.forEach((value, index) => {
    if (!knownIds.has(value)) {
      context.addIssue({
        code: "custom",
        message,
        path: [...basePath, index],
      });
    }
  });
}

function assertOptionalReference(
  context: z.RefinementCtx,
  value: string | undefined,
  knownIds: Set<string>,
  path: Array<string | number>,
  message: string,
) {
  if (value && !knownIds.has(value)) {
    context.addIssue({
      code: "custom",
      message,
      path,
    });
  }
}

function assertKnownStoryEventReferences(
  context: z.RefinementCtx,
  values: string[],
  knownIds: Set<string>,
  basePath: Array<string | number>,
  message: string,
) {
  values.forEach((value, index) => {
    if (!knownIds.has(value)) {
      context.addIssue({
        code: "custom",
        message,
        path: [...basePath, index],
      });
    }
  });
}
