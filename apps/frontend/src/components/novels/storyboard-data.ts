import type {
  CharacterDraft,
  LocationDraft,
  SceneDraft,
  ShotDraft,
  StoryboardDraftRecord,
  StoryboardResult,
  StoryboardValidationIssue,
} from "@guga-flow/shared-types";
import { validateStoryboardResult } from "@guga-flow/shared-types";

type MutableStoryboardObject = Record<string, unknown>;

export interface StoryboardSummary {
  title: string;
  logline: string;
  sceneCount: number;
  shotCount: number;
  characterCount: number;
  locationCount: number;
  durationSec: number;
  firstSceneTitle: string;
  firstShotPrompt: string;
}

export interface StoryboardDraftUiState {
  label: string;
  isValid: boolean;
  isReady: boolean;
  canSave: boolean;
  canMarkReady: boolean;
  issueSummary: string;
  issues: StoryboardValidationIssue[];
}

export type StoryboardOverviewPatch = Partial<Pick<StoryboardResult, "title" | "logline">>;
export type CharacterDraftPatch = Partial<Omit<CharacterDraft, "tempId">>;
export type LocationDraftPatch = Partial<Omit<LocationDraft, "tempId">>;
export type SceneDraftPatch = Partial<Omit<SceneDraft, "tempId" | "shots">>;
export type ShotDraftPatch = Partial<Omit<ShotDraft, "tempId">>;

export function summarizeStoryboard(storyboard: StoryboardResult | undefined): StoryboardSummary {
  if (!storyboard) {
    return {
      title: "",
      logline: "",
      sceneCount: 0,
      shotCount: 0,
      characterCount: 0,
      locationCount: 0,
      durationSec: 0,
      firstSceneTitle: "",
      firstShotPrompt: "",
    };
  }

  const shots = storyboard.scenes.flatMap((scene) => scene.shots);
  const firstShot = shots[0];

  return {
    title: storyboard.title,
    logline: storyboard.logline,
    sceneCount: storyboard.scenes.length,
    shotCount: shots.length,
    characterCount: storyboard.characters.length,
    locationCount: storyboard.locations.length,
    durationSec: shots.reduce((total, shot) => total + shot.durationSec, 0),
    firstSceneTitle: storyboard.scenes[0]?.title ?? "",
    firstShotPrompt: firstShot?.imagePrompt || firstShot?.videoPrompt || "",
  };
}

export function buildStoryboardDraftUiState(
  draft: StoryboardDraftRecord | undefined,
): StoryboardDraftUiState {
  if (!draft) {
    return {
      label: "No storyboard draft",
      isValid: false,
      isReady: false,
      canSave: false,
      canMarkReady: false,
      issueSummary: "",
      issues: [],
    };
  }

  const validation = validateStoryboardResult(draft.storyboard);
  const validationIssues = validation.success ? [] : validation.issues;
  const issues = draft.validationIssues.length > 0 ? draft.validationIssues : validationIssues;
  const isValid = validation.success && draft.status !== "invalid";
  const isReady = isStoryboardDraftReadyForImport(draft);

  return {
    label: draftStatusLabel(draft, isValid, isReady),
    isValid,
    isReady,
    canSave: Boolean(draft.storyboard && validation.success),
    canMarkReady: Boolean(draft.storyboard && validation.success && !isReady),
    issueSummary: formatStoryboardValidationIssues(issues),
    issues,
  };
}

export function isStoryboardDraftReadyForImport(draft: StoryboardDraftRecord | undefined): boolean {
  if (!draft?.storyboard || draft.status !== "ready" || !draft.readyForImport) {
    return false;
  }

  return validateStoryboardResult(draft.storyboard).success;
}

export function formatStoryboardValidationIssues(
  issues: readonly StoryboardValidationIssue[],
): string {
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "storyboard";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
}

export function summarizeStoryboardActionError(
  error: unknown,
  fallback = "Storyboard action failed",
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (Array.isArray(message)) {
      const joined = message.filter((item): item is string => typeof item === "string").join(", ");
      return joined || fallback;
    }
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return fallback;
}

export function updateStoryboardOverview<TStoryboard extends StoryboardResult>(
  storyboard: TStoryboard,
  patch: StoryboardOverviewPatch,
): TStoryboard {
  return {
    ...storyboard,
    ...compactPatch(patch),
  };
}

export function updateStoryboardCharacter<TStoryboard extends StoryboardResult>(
  storyboard: TStoryboard,
  tempId: string,
  patch: CharacterDraftPatch,
): TStoryboard {
  return {
    ...storyboard,
    characters: updateByTempId(storyboard.characters, tempId, patch),
  };
}

export function updateStoryboardLocation<TStoryboard extends StoryboardResult>(
  storyboard: TStoryboard,
  tempId: string,
  patch: LocationDraftPatch,
): TStoryboard {
  return {
    ...storyboard,
    locations: updateByTempId(storyboard.locations, tempId, patch),
  };
}

export function updateStoryboardScene<TStoryboard extends StoryboardResult>(
  storyboard: TStoryboard,
  tempId: string,
  patch: SceneDraftPatch,
): TStoryboard {
  return {
    ...storyboard,
    scenes: updateByTempId(storyboard.scenes, tempId, patch),
  };
}

export function updateStoryboardShot<TStoryboard extends StoryboardResult>(
  storyboard: TStoryboard,
  sceneTempId: string,
  shotTempId: string,
  patch: ShotDraftPatch,
): TStoryboard {
  return {
    ...storyboard,
    scenes: storyboard.scenes.map((scene) => {
      if (scene.tempId !== sceneTempId) {
        return scene;
      }

      return {
        ...scene,
        shots: updateByTempId(scene.shots, shotTempId, patch),
      };
    }),
  };
}

function updateByTempId<TItem extends { tempId: string }>(
  items: readonly TItem[],
  tempId: string,
  patch: Partial<Omit<TItem, "tempId">>,
): TItem[] {
  return items.map((item) =>
    item.tempId === tempId
      ? ({
          ...item,
          ...compactPatch(patch as MutableStoryboardObject),
        } as TItem)
      : item,
  );
}

function compactPatch<TPatch extends MutableStoryboardObject>(patch: TPatch): Partial<TPatch> {
  return { ...patch };
}

function draftStatusLabel(
  draft: StoryboardDraftRecord,
  isValid: boolean,
  isReady: boolean,
): string {
  if (isReady) {
    return "Ready for import";
  }
  if (isValid) {
    return "Valid draft";
  }
  if (draft.errorMessage) {
    return draft.errorMessage;
  }
  if (draft.status === "invalid") {
    return "Draft needs fixes";
  }
  return "Draft incomplete";
}
