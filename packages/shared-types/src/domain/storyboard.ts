import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);
const optionalNonEmptyString = z.string().trim().min(1).optional();

export const STORYBOARD_LOCATION_TYPES = ["interior", "exterior", "fantasy", "virtual"] as const;
export type StoryboardLocationType = (typeof STORYBOARD_LOCATION_TYPES)[number];

export const STORYBOARD_DRAFT_STATUSES = ["draft", "valid", "invalid", "ready"] as const;
export type StoryboardDraftStatus = (typeof STORYBOARD_DRAFT_STATUSES)[number];

export const characterDraftSchema = z.object({
  tempId: nonEmptyString,
  name: nonEmptyString,
  role: nonEmptyString,
  appearance: nonEmptyString,
  personality: nonEmptyString,
  costume: optionalNonEmptyString,
  identityPrompt: nonEmptyString,
});

export const locationDraftSchema = z.object({
  tempId: nonEmptyString,
  name: nonEmptyString,
  type: z.enum(STORYBOARD_LOCATION_TYPES),
  description: nonEmptyString,
  lighting: nonEmptyString,
  atmosphere: nonEmptyString,
  locationPrompt: nonEmptyString,
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
  imagePrompt: nonEmptyString,
  videoPrompt: nonEmptyString,
  negativePrompt: optionalNonEmptyString,
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
  shots: z.array(shotDraftSchema).min(1),
});

export const storyboardResultSchema = z
  .object({
    title: nonEmptyString,
    logline: nonEmptyString,
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

    const characterIds = new Set(storyboard.characters.map((character) => character.tempId));
    const locationIds = new Set(storyboard.locations.map((location) => location.tempId));
    const shotIds: string[] = [];
    const shotPaths: Array<(string | number)[]> = [];

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
      });
    });

    addDuplicateTempIdIssues(context, shotIds, "Duplicate shot temp id", (index) => shotPaths[index] ?? []);
  });

export type CharacterDraft = z.infer<typeof characterDraftSchema>;
export type LocationDraft = z.infer<typeof locationDraftSchema>;
export type SceneDraft = z.infer<typeof sceneDraftSchema>;
export type ShotDraft = z.infer<typeof shotDraftSchema>;
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
