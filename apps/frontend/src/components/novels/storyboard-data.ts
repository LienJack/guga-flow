import type {
  CanvasEdgeRecord,
  CanvasNodeRecord,
  CharacterDraft,
  CharacterLifecycleStage,
  ImportStoryboardToCanvasResult,
  LocationDraft,
  SceneDraft,
  ShotDraft,
  StoryboardDraftRecord,
  StoryboardImportSummary,
  StoryboardResult,
  StoryboardValidationIssue,
} from "@guga-flow/shared-types";
import { hasStoryboardImportProvenance, validateStoryboardResult } from "@guga-flow/shared-types";

type MutableStoryboardObject = Record<string, unknown>;

export interface StoryboardSummary {
  title: string;
  logline: string;
  sceneCount: number;
  shotCount: number;
  characterCount: number;
  locationCount: number;
  eventCount: number;
  relationshipCount: number;
  lifecycleStageCount: number;
  durationSec: number;
  firstSceneTitle: string;
  firstShotPrompt: string;
  firstEventSummary: string;
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

export interface StoryboardImportGraphState {
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
}

export type StoryboardOverviewPatch = Partial<Pick<StoryboardResult, "title" | "logline">>;
export type CharacterDraftPatch = Partial<Omit<CharacterDraft, "tempId">>;
export type CharacterLifecycleStagePatch = Partial<Omit<CharacterLifecycleStage, "stageId">>;
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
      eventCount: 0,
      relationshipCount: 0,
      lifecycleStageCount: 0,
      durationSec: 0,
      firstSceneTitle: "",
      firstShotPrompt: "",
      firstEventSummary: "",
    };
  }

  const shots = storyboard.scenes.flatMap((scene) => scene.shots);
  const firstShot = shots[0];
  const timelineEvents = storyboard.storyBlueprint?.timelineEvents ?? [];
  const lifecycleStageCount = storyboard.characters.reduce(
    (total, character) => total + (character.lifecycleStages?.length ?? 0),
    0,
  );

  return {
    title: storyboard.title,
    logline: storyboard.logline,
    sceneCount: storyboard.scenes.length,
    shotCount: shots.length,
    characterCount: storyboard.characters.length,
    locationCount: storyboard.locations.length,
    eventCount: timelineEvents.length,
    relationshipCount: storyboard.storyBlueprint?.characterRelationships?.length ?? 0,
    lifecycleStageCount,
    durationSec: shots.reduce((total, shot) => total + shot.durationSec, 0),
    firstSceneTitle: storyboard.scenes[0]?.title ?? "",
    firstShotPrompt: firstShot?.imagePrompt || firstShot?.videoPrompt || "",
    firstEventSummary: timelineEvents[0]?.summary ?? "",
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

export function isStoryboardDraftImportable(
  draft: StoryboardDraftRecord | undefined,
  dirty = false,
): boolean {
  return !dirty && isStoryboardDraftReadyForImport(draft);
}

export function hasExistingStoryboardImports(nodes: readonly CanvasNodeRecord[]): boolean {
  return nodes.some((node) => hasStoryboardImportProvenance(node.dataJson));
}

export function summarizeStoryboardImport(summary: StoryboardImportSummary | undefined): string {
  if (!summary) {
    return "";
  }

  const reused = summary.reusedNodeCount > 0 ? `, ${summary.reusedNodeCount} reused` : "";
  return [
    `Imported ${summary.sceneCount} scenes`,
    `${summary.shotCount} shots`,
    `${summary.characterCount} characters`,
    `${summary.locationCount} locations`,
    `${summary.createdNodeCount} nodes${reused}`,
    `${summary.createdEdgeCount} edges`,
  ].join(" / ");
}

export function mergeStoryboardImportGraph(
  state: StoryboardImportGraphState,
  result: ImportStoryboardToCanvasResult,
): StoryboardImportGraphState {
  return {
    nodes: mergeById(state.nodes, result.nodes),
    edges: mergeById(state.edges, result.edges),
  };
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

export function updateStoryboardCharacterLifecycleStage<TStoryboard extends StoryboardResult>(
  storyboard: TStoryboard,
  characterTempId: string,
  stageId: string,
  patch: CharacterLifecycleStagePatch,
): TStoryboard {
  return {
    ...storyboard,
    characters: storyboard.characters.map((character) => {
      if (character.tempId !== characterTempId) {
        return character;
      }

      return {
        ...character,
        lifecycleStages: updateByStageId(character.lifecycleStages ?? [], stageId, patch),
      };
    }),
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

function updateByStageId<TItem extends { stageId: string }>(
  items: readonly TItem[],
  stageId: string,
  patch: Partial<Omit<TItem, "stageId">>,
): TItem[] {
  return items.map((item) =>
    item.stageId === stageId
      ? ({
          ...item,
          ...compactPatch(patch as MutableStoryboardObject),
        } as TItem)
      : item,
  );
}

function mergeById<TItem extends { id: string }>(items: readonly TItem[], updates: readonly TItem[]): TItem[] {
  if (updates.length === 0) {
    return [...items];
  }

  const updateById = new Map(updates.map((item) => [item.id, item]));
  const existingIds = new Set(items.map((item) => item.id));
  const merged = items.map((item) => updateById.get(item.id) ?? item);
  for (const update of updates) {
    if (!existingIds.has(update.id)) {
      merged.push(update);
    }
  }
  return merged;
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
