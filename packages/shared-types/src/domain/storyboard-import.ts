import type {
  CanvasEdgeRelation,
  CanvasEdgeRecord,
  CanvasNodeRecord,
  CanvasNodeType,
  CanvasSnapshotJson,
  CharacterAssetNodeData,
  LocationAssetNodeData,
  NovelNodeData,
  Phase3CanvasNodeData,
  Phase3CanvasNodeType,
  SceneFrameNodeData,
  SceneNodeData,
  ShotNodeData,
  StoryBlueprintNodeData,
  StoryEventTraceData,
} from "./canvas";
import type {
  CharacterDraft,
  CharacterLifecycleStage,
  CharacterRelationship,
  LocationDraft,
  SceneDraft,
  ShotDraft,
  StoryboardResult,
  StoryTimelineEvent,
} from "./storyboard";

export const STORYBOARD_IMPORT_DUPLICATE_POLICIES = ["new_version"] as const;
export type StoryboardImportDuplicatePolicy = (typeof STORYBOARD_IMPORT_DUPLICATE_POLICIES)[number];

export const STORYBOARD_IMPORT_ENTITY_KINDS = [
  "novel",
  "scene_frame",
  "scene",
  "shot",
  "character_asset",
  "location_asset",
  "edge",
] as const;
export type StoryboardImportEntityKind = (typeof STORYBOARD_IMPORT_ENTITY_KINDS)[number];

export const STORYBOARD_IMPORT_LAYOUT = {
  COLUMN: {
    NOVEL: 0,
    ASSET: 460,
    SCENE: 960,
  },
  NODE: {
    NOVEL_W: 360,
    NOVEL_H: 260,
    ASSET_W: 260,
    ASSET_H: 180,
    SCENE_W: 360,
    SCENE_HEADER_H: 120,
    SHOT_W: 320,
    SHOT_H: 220,
    GAP_X: 32,
    GAP_Y: 32,
    SCENE_GROUP_GAP_Y: 96,
  },
} as const;

export interface StoryboardImportProvenance {
  batchId: string;
  draftId: string;
  novelDocumentId: string;
  entityKind: StoryboardImportEntityKind;
  version: number;
  sourceTempId?: string;
  sceneTempId?: string;
  shotTempId?: string;
  importedAt?: string;
}

export interface StoryboardImportProvenanceJson {
  [key: string]: CanvasSnapshotJson;
  batchId: string;
  draftId: string;
  novelDocumentId: string;
  entityKind: StoryboardImportEntityKind;
  version: number;
}

export interface ImportStoryboardToCanvasInput {
  novelDocumentId: string;
  storyboardDraftId: string;
  duplicatePolicy?: StoryboardImportDuplicatePolicy;
}

export interface StoryboardImportSummary {
  importBatchId: string;
  duplicatePolicy: StoryboardImportDuplicatePolicy;
  version: number;
  createdNodeCount: number;
  reusedNodeCount: number;
  createdEdgeCount: number;
  sceneCount: number;
  shotCount: number;
  characterCount: number;
  locationCount: number;
}

export interface ImportStoryboardToCanvasResult {
  importBatchId: string;
  summary: StoryboardImportSummary;
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
}

export interface StoryboardImportLayoutRect {
  key: string;
  type: Phase3CanvasNodeType;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface StoryboardImportPlannedNode<TType extends Phase3CanvasNodeType = Phase3CanvasNodeType>
  extends StoryboardImportLayoutRect {
  title: string;
  zIndex: number;
  dataJson: Phase3CanvasNodeData<TType> & StoryboardImportDataJson;
}

export interface StoryboardImportPlannedEdge {
  key: string;
  sourceKey: string;
  targetKey: string;
  relation: CanvasEdgeRelation;
  dataJson: StoryboardImportDataJson;
}

export interface StoryboardImportPlan {
  importBatchId: string;
  duplicatePolicy: StoryboardImportDuplicatePolicy;
  version: number;
  nodes: StoryboardImportPlannedNode[];
  edges: StoryboardImportPlannedEdge[];
  summary: StoryboardImportSummary;
}

export interface BuildStoryboardImportPlanInput {
  storyboard: StoryboardResult;
  draftId: string;
  novelDocumentId: string;
  importBatchId: string;
  importedAt?: string;
  version?: number;
  duplicatePolicy?: StoryboardImportDuplicatePolicy;
}

export interface StoryboardImportDataJson {
  storyboardImport: StoryboardImportProvenanceJson;
  [key: string]: CanvasSnapshotJson;
}

type PlannedNodeInput<TType extends Phase3CanvasNodeType> = Omit<
  StoryboardImportPlannedNode<TType>,
  "dataJson"
> & {
  dataJson: Phase3CanvasNodeData<TType> & StoryboardImportDataJson;
};

const ASSET_KEY_PREFIX_BY_TYPE = {
  character_asset: "character",
  location_asset: "location",
} as const;

export function buildStoryboardImportPlan(input: BuildStoryboardImportPlanInput): StoryboardImportPlan {
  const duplicatePolicy = input.duplicatePolicy ?? "new_version";
  const version = input.version ?? 1;
  const nodes: StoryboardImportPlannedNode[] = [];
  const edges: StoryboardImportPlannedEdge[] = [];
  let zIndex = 0;

  nodes.push(
    plannedNode({
      key: "novel",
      type: "novel",
      title: input.storyboard.title,
      x: STORYBOARD_IMPORT_LAYOUT.COLUMN.NOVEL,
      y: 0,
      width: STORYBOARD_IMPORT_LAYOUT.NODE.NOVEL_W,
      height: STORYBOARD_IMPORT_LAYOUT.NODE.NOVEL_H,
      zIndex: zIndex++,
      dataJson: {
        synopsis: input.storyboard.logline,
        language: "zh",
        storyboardTitle: input.storyboard.title,
        ...(input.storyboard.storySeedReferences?.length
          ? {
              storySeedReferences: input.storyboard.storySeedReferences.map((reference) => ({
                ...reference,
              })),
            }
          : {}),
        ...optionalStoryBlueprintData(input.storyboard),
        storyboardImport: provenance(input, "novel", version),
      },
    }),
  );

  input.storyboard.characters.forEach((character, index) => {
    nodes.push(
      plannedNode({
        key: nodeKey("character_asset", character.tempId),
        type: "character_asset",
        title: character.name,
        ...assetGeometry(index),
        zIndex: zIndex++,
        dataJson: characterNodeData(character, input, version),
      }),
    );
  });

  input.storyboard.locations.forEach((location, index) => {
    nodes.push(
      plannedNode({
        key: nodeKey("location_asset", location.tempId),
        type: "location_asset",
        title: location.name,
        ...assetGeometry(input.storyboard.characters.length + index),
        zIndex: zIndex++,
        dataJson: locationNodeData(location, input, version),
      }),
    );
  });

  let sceneBaseY = 0;
  input.storyboard.scenes.forEach((scene, sceneIndex) => {
    const sceneNumber = String(sceneIndex + 1).padStart(2, "0");
    const frameKey = nodeKey("scene_frame", scene.tempId);
    const sceneKey = nodeKey("scene", scene.tempId);
    const sceneGeometry = sceneGroupGeometry(sceneBaseY, scene.shots.length);

    nodes.push(
      plannedNode({
        key: frameKey,
        type: "scene_frame",
        title: `Scene ${sceneNumber} Frame`,
        x: STORYBOARD_IMPORT_LAYOUT.COLUMN.SCENE,
        y: sceneBaseY,
        width: STORYBOARD_IMPORT_LAYOUT.NODE.SCENE_W,
        height: STORYBOARD_IMPORT_LAYOUT.NODE.SCENE_HEADER_H,
        zIndex: zIndex++,
        dataJson: sceneFrameNodeData(scene, sceneIndex, input, version),
      }),
    );
    nodes.push(
      plannedNode({
        key: sceneKey,
        type: "scene",
        title: scene.title,
        x: STORYBOARD_IMPORT_LAYOUT.COLUMN.SCENE,
        y: sceneBaseY + STORYBOARD_IMPORT_LAYOUT.NODE.SCENE_HEADER_H + STORYBOARD_IMPORT_LAYOUT.NODE.GAP_Y,
        width: STORYBOARD_IMPORT_LAYOUT.NODE.SCENE_W,
        height: STORYBOARD_IMPORT_LAYOUT.NODE.SCENE_HEADER_H,
        zIndex: zIndex++,
        dataJson: sceneNodeData(scene, sceneIndex, input, version),
      }),
    );

    edges.push(plannedBelongsToSceneEdge(input, version, sceneKey, frameKey, scene.tempId));

    scene.shots.forEach((shot, shotIndex) => {
      const shotKey = nodeKey("shot", shot.tempId);
      const y =
        sceneBaseY +
        STORYBOARD_IMPORT_LAYOUT.NODE.SCENE_HEADER_H * 2 +
        STORYBOARD_IMPORT_LAYOUT.NODE.GAP_Y * 2 +
        shotIndex * (STORYBOARD_IMPORT_LAYOUT.NODE.SHOT_H + STORYBOARD_IMPORT_LAYOUT.NODE.GAP_Y);

      nodes.push(
        plannedNode({
          key: shotKey,
          type: "shot",
          title: shot.title,
          x: STORYBOARD_IMPORT_LAYOUT.COLUMN.SCENE,
          y,
          width: STORYBOARD_IMPORT_LAYOUT.NODE.SHOT_W,
          height: STORYBOARD_IMPORT_LAYOUT.NODE.SHOT_H,
          zIndex: zIndex++,
          dataJson: shotNodeData(shot, scene, input, version),
        }),
      );
      edges.push(plannedBelongsToSceneEdge(input, version, shotKey, sceneKey, scene.tempId, shot.tempId));

      uniqueStrings(shot.characterTempIds).forEach((characterTempId) => {
        edges.push(
          plannedReferenceEdge(
            input,
            version,
            nodeKey("character_asset", characterTempId),
            shotKey,
            "references_character",
            scene.tempId,
            shot.tempId,
          ),
        );
      });

      if (shot.locationTempId) {
        edges.push(
          plannedReferenceEdge(
            input,
            version,
            nodeKey("location_asset", shot.locationTempId),
            shotKey,
            "references_location",
            scene.tempId,
            shot.tempId,
          ),
        );
      }
    });

    sceneBaseY += sceneGeometry.height + STORYBOARD_IMPORT_LAYOUT.NODE.SCENE_GROUP_GAP_Y;
  });

  return {
    importBatchId: input.importBatchId,
    duplicatePolicy,
    version,
    nodes,
    edges,
    summary: {
      importBatchId: input.importBatchId,
      duplicatePolicy,
      version,
      createdNodeCount: nodes.length,
      reusedNodeCount: 0,
      createdEdgeCount: edges.length,
      sceneCount: input.storyboard.scenes.length,
      shotCount: input.storyboard.scenes.reduce((total, scene) => total + scene.shots.length, 0),
      characterCount: input.storyboard.characters.length,
      locationCount: input.storyboard.locations.length,
    },
  };
}

export function storyboardImportRectanglesOverlap(
  left: StoryboardImportLayoutRect,
  right: StoryboardImportLayoutRect,
): boolean {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  );
}

export function findStoryboardImportLayoutOverlaps(
  rectangles: readonly StoryboardImportLayoutRect[],
): Array<[StoryboardImportLayoutRect, StoryboardImportLayoutRect]> {
  const overlaps: Array<[StoryboardImportLayoutRect, StoryboardImportLayoutRect]> = [];
  rectangles.forEach((left, leftIndex) => {
    rectangles.slice(leftIndex + 1).forEach((right) => {
      if (storyboardImportRectanglesOverlap(left, right)) {
        overlaps.push([left, right]);
      }
    });
  });
  return overlaps;
}

export function storyboardImportProvenance(value: unknown): StoryboardImportProvenance | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const candidate = value as Record<string, unknown>;
  const provenanceValue = candidate.storyboardImport;
  if (typeof provenanceValue !== "object" || provenanceValue === null || Array.isArray(provenanceValue)) {
    return undefined;
  }
  const provenanceCandidate = provenanceValue as Record<string, unknown>;
  if (
    typeof provenanceCandidate.batchId !== "string" ||
    typeof provenanceCandidate.draftId !== "string" ||
    typeof provenanceCandidate.novelDocumentId !== "string" ||
    typeof provenanceCandidate.version !== "number" ||
    !STORYBOARD_IMPORT_ENTITY_KINDS.includes(
      provenanceCandidate.entityKind as StoryboardImportEntityKind,
    )
  ) {
    return undefined;
  }

  return {
    batchId: provenanceCandidate.batchId,
    draftId: provenanceCandidate.draftId,
    novelDocumentId: provenanceCandidate.novelDocumentId,
    entityKind: provenanceCandidate.entityKind as StoryboardImportEntityKind,
    version: provenanceCandidate.version,
    sourceTempId: optionalString(provenanceCandidate.sourceTempId),
    sceneTempId: optionalString(provenanceCandidate.sceneTempId),
    shotTempId: optionalString(provenanceCandidate.shotTempId),
    importedAt: optionalString(provenanceCandidate.importedAt),
  };
}

export function hasStoryboardImportProvenance(value: unknown): boolean {
  return Boolean(storyboardImportProvenance(value));
}

export function storyboardImportAssetKey(
  type: "character_asset" | "location_asset",
  input: { name: string; role?: string; locationType?: string },
): string {
  const parts =
    type === "character_asset"
      ? [ASSET_KEY_PREFIX_BY_TYPE[type], input.name, input.role ?? ""]
      : [ASSET_KEY_PREFIX_BY_TYPE[type], input.name, input.locationType ?? ""];
  return parts.map(normalizeKeyPart).join(":");
}

function plannedNode<TType extends Phase3CanvasNodeType>(
  input: PlannedNodeInput<TType>,
): StoryboardImportPlannedNode<TType> {
  return input as StoryboardImportPlannedNode<TType>;
}

function assetGeometry(index: number) {
  return {
    x: STORYBOARD_IMPORT_LAYOUT.COLUMN.ASSET,
    y: index * (STORYBOARD_IMPORT_LAYOUT.NODE.ASSET_H + STORYBOARD_IMPORT_LAYOUT.NODE.GAP_Y),
    width: STORYBOARD_IMPORT_LAYOUT.NODE.ASSET_W,
    height: STORYBOARD_IMPORT_LAYOUT.NODE.ASSET_H,
  };
}

function sceneGroupGeometry(baseY: number, shotCount: number) {
  return {
    x: STORYBOARD_IMPORT_LAYOUT.COLUMN.SCENE,
    y: baseY,
    width: STORYBOARD_IMPORT_LAYOUT.NODE.SCENE_W,
    height:
      STORYBOARD_IMPORT_LAYOUT.NODE.SCENE_HEADER_H * 2 +
      STORYBOARD_IMPORT_LAYOUT.NODE.GAP_Y * 2 +
      shotCount * STORYBOARD_IMPORT_LAYOUT.NODE.SHOT_H +
      Math.max(shotCount - 1, 0) * STORYBOARD_IMPORT_LAYOUT.NODE.GAP_Y,
  };
}

function characterNodeData(
  character: CharacterDraft,
  input: BuildStoryboardImportPlanInput,
  version: number,
): CharacterAssetNodeData & StoryboardImportDataJson {
  return {
    name: character.name,
    role: character.role,
    appearance: character.appearance,
    personality: character.personality,
    wardrobe: character.costume ?? "",
    consistencyPrompt: character.identityPrompt,
    identityPrompt: character.identityPrompt,
    ...(character.referenceAssetIds?.length
      ? { referenceAssetIds: uniqueStrings(character.referenceAssetIds) }
      : {}),
    ...optionalCharacterLifecycleData(character),
    assetKey: storyboardImportAssetKey("character_asset", {
      name: character.name,
      role: character.role,
    }),
    storyboardImport: provenance(input, "character_asset", version, {
      sourceTempId: character.tempId,
    }),
  };
}

function locationNodeData(
  location: LocationDraft,
  input: BuildStoryboardImportPlanInput,
  version: number,
): LocationAssetNodeData & StoryboardImportDataJson {
  return {
    name: location.name,
    environment: location.description,
    mood: location.atmosphere,
    visualStyle: location.lighting,
    consistencyPrompt: location.locationPrompt,
    locationPrompt: location.locationPrompt,
    locationType: location.type,
    ...(location.referenceAssetIds?.length
      ? { referenceAssetIds: uniqueStrings(location.referenceAssetIds) }
      : {}),
    assetKey: storyboardImportAssetKey("location_asset", {
      name: location.name,
      locationType: location.type,
    }),
    storyboardImport: provenance(input, "location_asset", version, {
      sourceTempId: location.tempId,
    }),
  };
}

function sceneFrameNodeData(
  scene: SceneDraft,
  sceneIndex: number,
  input: BuildStoryboardImportPlanInput,
  version: number,
): SceneFrameNodeData & StoryboardImportDataJson {
  return {
    label: `Scene ${sceneIndex + 1}`,
    order: sceneIndex + 1,
    description: scene.summary,
    locationTempId: scene.locationTempId ?? "",
    ...optionalStoryEventData(input.storyboard, scene.storyEventIds),
    storyboardImport: provenance(input, "scene_frame", version, {
      sourceTempId: scene.tempId,
      sceneTempId: scene.tempId,
    }),
  };
}

function sceneNodeData(
  scene: SceneDraft,
  sceneIndex: number,
  input: BuildStoryboardImportPlanInput,
  version: number,
): SceneNodeData & StoryboardImportDataJson {
  return {
    sceneNumber: String(sceneIndex + 1).padStart(2, "0"),
    synopsis: scene.summary,
    location: scene.locationTempId ?? "",
    timeOfDay: scene.timeOfDay ?? "",
    mood: scene.mood,
    sourceExcerpt: scene.sourceExcerpt,
    characterTempIds: uniqueStrings(scene.characterTempIds),
    locationTempId: scene.locationTempId ?? "",
    ...optionalStoryEventData(input.storyboard, scene.storyEventIds),
    storyboardImport: provenance(input, "scene", version, {
      sourceTempId: scene.tempId,
      sceneTempId: scene.tempId,
    }),
  };
}

function shotNodeData(
  shot: ShotDraft,
  scene: SceneDraft,
  input: BuildStoryboardImportPlanInput,
  version: number,
): ShotNodeData & StoryboardImportDataJson {
  return {
    shotNumber: String(shot.shotIndex).padStart(2, "0"),
    visualDescription: shot.visualDescription,
    action: shot.action,
    cameraMovement: shot.cameraMovement,
    durationSeconds: shot.durationSec,
    durationSec: shot.durationSec,
    imagePrompt: shot.imagePrompt,
    videoPrompt: shot.videoPrompt,
    promptNotes: shot.imagePrompt,
    negativePromptNotes: shot.negativePrompt ?? "",
    lens: shot.lens ?? "",
    lighting: shot.lighting ?? "",
    mood: shot.mood ?? scene.mood,
    dialogue: shot.dialogue ?? "",
    narration: shot.narration ?? "",
    soundEffect: shot.soundEffect ?? "",
    sourceExcerpt: shot.sourceExcerpt ?? "",
    ...optionalStoryEventData(input.storyboard, shot.storyEventIds),
    ...(shot.characterStageRefs?.length
      ? { characterStageRefs: shot.characterStageRefs.map((reference) => ({ ...reference })) }
      : {}),
    characterTempIds: uniqueStrings(shot.characterTempIds),
    locationTempId: shot.locationTempId ?? "",
    ...(shot.referenceAssetIds?.length ? { referenceAssetIds: uniqueStrings(shot.referenceAssetIds) } : {}),
    storyboardImport: provenance(input, "shot", version, {
      sourceTempId: shot.tempId,
      sceneTempId: scene.tempId,
      shotTempId: shot.tempId,
    }),
  };
}

function plannedBelongsToSceneEdge(
  input: BuildStoryboardImportPlanInput,
  version: number,
  sourceKey: string,
  targetKey: string,
  sceneTempId: string,
  shotTempId?: string,
): StoryboardImportPlannedEdge {
  return {
    key: edgeKey(sourceKey, targetKey, "belongs_to_scene"),
    sourceKey,
    targetKey,
    relation: "belongs_to_scene",
    dataJson: {
      storyboardImport: provenance(input, "edge", version, {
        sceneTempId,
        shotTempId,
      }),
    },
  };
}

function plannedReferenceEdge(
  input: BuildStoryboardImportPlanInput,
  version: number,
  sourceKey: string,
  targetKey: string,
  relation: Extract<CanvasEdgeRelation, "references_character" | "references_location">,
  sceneTempId: string,
  shotTempId: string,
): StoryboardImportPlannedEdge {
  return {
    key: edgeKey(sourceKey, targetKey, relation),
    sourceKey,
    targetKey,
    relation,
    dataJson: {
      storyboardImport: provenance(input, "edge", version, {
        sceneTempId,
        shotTempId,
      }),
    },
  };
}

function provenance(
  input: BuildStoryboardImportPlanInput,
  entityKind: StoryboardImportEntityKind,
  version: number,
  optional: Partial<Pick<StoryboardImportProvenance, "sourceTempId" | "sceneTempId" | "shotTempId">> = {},
): StoryboardImportProvenanceJson {
  const value: StoryboardImportProvenanceJson = {
    batchId: input.importBatchId,
    draftId: input.draftId,
    novelDocumentId: input.novelDocumentId,
    entityKind,
    version,
  };
  if (optional.sourceTempId) {
    value.sourceTempId = optional.sourceTempId;
  }
  if (optional.sceneTempId) {
    value.sceneTempId = optional.sceneTempId;
  }
  if (optional.shotTempId) {
    value.shotTempId = optional.shotTempId;
  }
  if (input.importedAt) {
    value.importedAt = input.importedAt;
  }

  return value;
}

function nodeKey(type: CanvasNodeType, tempId: string): string {
  return `${type}:${tempId}`;
}

function edgeKey(sourceKey: string, targetKey: string, relation: CanvasEdgeRelation): string {
  return `${relation}:${sourceKey}->${targetKey}`;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function normalizeKeyPart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function optionalStoryBlueprintData(storyboard: StoryboardResult): Partial<NovelNodeData> {
  const blueprint = storyboard.storyBlueprint;
  if (!blueprint) {
    return {};
  }

  const storyBlueprint: StoryBlueprintNodeData = {};
  if (blueprint.worldSummary) {
    storyBlueprint.worldSummary = blueprint.worldSummary;
  }
  if (blueprint.timelineEvents?.length) {
    storyBlueprint.timelineEvents = blueprint.timelineEvents.map(storyEventTrace);
  }
  if (blueprint.characterRelationships?.length) {
    storyBlueprint.characterRelationships = blueprint.characterRelationships.map(characterRelationshipTrace);
  }
  if (blueprint.themes?.length) {
    storyBlueprint.themes = uniqueStrings(blueprint.themes);
  }
  if (blueprint.adaptationNotes) {
    storyBlueprint.adaptationNotes = blueprint.adaptationNotes;
  }

  return Object.keys(storyBlueprint).length > 0 ? { storyBlueprint } : {};
}

function optionalCharacterLifecycleData(character: CharacterDraft): Partial<CharacterAssetNodeData> {
  return {
    ...(character.lifecycleStages?.length
      ? { lifecycleStages: character.lifecycleStages.map(characterLifecycleStageData) }
      : {}),
    ...(character.locked === undefined ? {} : { locked: character.locked }),
    ...(character.lockedFields?.length ? { lockedFields: uniqueStrings(character.lockedFields) } : {}),
  };
}

function optionalStoryEventData(
  storyboard: StoryboardResult,
  storyEventIds: readonly string[] | undefined,
): Partial<SceneFrameNodeData & SceneNodeData & ShotNodeData> {
  const ids = uniqueStrings(storyEventIds ?? []);
  if (ids.length === 0) {
    return {};
  }
  const eventsById = new Map(
    (storyboard.storyBlueprint?.timelineEvents ?? []).map((event) => [event.eventId, event]),
  );
  return {
    storyEventIds: ids,
    storyEvents: ids
      .map((eventId) => eventsById.get(eventId))
      .filter((event): event is StoryTimelineEvent => Boolean(event))
      .map(storyEventTrace),
  };
}

function storyEventTrace(event: StoryTimelineEvent): StoryEventTraceData {
  return {
    eventId: event.eventId,
    ...(event.title ? { title: event.title } : {}),
    orderIndex: event.orderIndex,
    ...(event.chapterIndex ? { chapterIndex: event.chapterIndex } : {}),
    ...(event.sourceExcerpt ? { sourceExcerpt: event.sourceExcerpt } : {}),
    summary: event.summary,
    ...(event.characters?.length ? { characters: uniqueStrings(event.characters) } : {}),
    ...(event.locationName ? { locationName: event.locationName } : {}),
    ...(event.emotion ? { emotion: event.emotion } : {}),
    ...(event.conflict ? { conflict: event.conflict } : {}),
    ...(event.result ? { result: event.result } : {}),
    ...(event.estimatedDurationSec ? { estimatedDurationSec: event.estimatedDurationSec } : {}),
  };
}

function characterRelationshipTrace(relationship: CharacterRelationship) {
  return {
    relationshipId: relationship.relationshipId,
    characterTempIds: uniqueStrings(relationship.characterTempIds),
    type: relationship.type,
    summary: relationship.summary,
    ...(relationship.status ? { status: relationship.status } : {}),
  };
}

function characterLifecycleStageData(stage: CharacterLifecycleStage) {
  return {
    stageId: stage.stageId,
    label: stage.label,
    ...(stage.ageRange ? { ageRange: stage.ageRange } : {}),
    ...(stage.appearance ? { appearance: stage.appearance } : {}),
    ...(stage.costume ? { costume: stage.costume } : {}),
    ...(stage.hairstyle ? { hairstyle: stage.hairstyle } : {}),
    ...(stage.emotionalState ? { emotionalState: stage.emotionalState } : {}),
    ...(stage.identityPrompt ? { identityPrompt: stage.identityPrompt } : {}),
  };
}
