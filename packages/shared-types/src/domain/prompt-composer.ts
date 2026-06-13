import type { AssetListItem } from "./assets";
import type { SkillTemplatePromptContext } from "./skills";
import type {
  CanvasEdgeRecord,
  CanvasNodeRecord,
  CharacterAssetNodeData,
  CharacterLifecycleStageData,
  CharacterStageReferenceData,
  LocationAssetNodeData,
  SceneNodeData,
  ShotNodeData,
  StoryEventTraceData,
} from "./canvas";
import type { GenerationCreativeSettings, ResolvedGenerationSettings } from "./generation";
import { resolveGenerationSettings } from "./generation";

export const PROMPT_COMPOSITION_CHANNELS = ["image", "video"] as const;
export type PromptCompositionChannel = (typeof PROMPT_COMPOSITION_CHANNELS)[number];

export const PROMPT_DEBUG_PART_KINDS = [
  "global_style",
  "scene",
  "story_event",
  "generation_settings",
  "visual_manual",
  "director_manual",
  "skill_template",
  "location",
  "character",
  "character_lifecycle",
  "shot",
  "model_suffix",
  "negative_prompt",
] as const;
export type PromptDebugPartKind = (typeof PROMPT_DEBUG_PART_KINDS)[number];

export const PROMPT_MISSING_CONTEXT_KINDS = [
  "shot",
  "scene",
  "story_event",
  "character",
  "character_lifecycle",
  "location",
  "reference_asset",
  "image_prompt",
  "video_prompt",
] as const;
export type PromptMissingContextKind = (typeof PROMPT_MISSING_CONTEXT_KINDS)[number];

export interface PromptDebugPart {
  id: string;
  kind: PromptDebugPartKind;
  label: string;
  text: string;
  channels: PromptCompositionChannel[];
  sourceNodeIds?: string[];
  referenceAssetIds?: string[];
}

export interface PromptMissingContext {
  kind: PromptMissingContextKind;
  label: string;
  message: string;
  sourceNodeId?: string;
  referenceAssetId?: string;
}

export interface PromptChannelComposition {
  channel: PromptCompositionChannel;
  prompt: string;
  negativePrompt: string;
  parts: PromptDebugPart[];
  missingContext: PromptMissingContext[];
}

export interface ShotPromptSourceNodeIds {
  shotNodeId?: string;
  sceneNodeId?: string;
  characterNodeIds: string[];
  locationNodeId?: string;
  referenceAssetIds: string[];
}

export interface ShotPromptCompositionResult {
  shotNodeId: string;
  shotTitle?: string;
  sourceNodeIds: ShotPromptSourceNodeIds;
  referenceAssetIds: string[];
  negativePrompt: string;
  resolvedGenerationSettings: ResolvedGenerationSettings;
  image: PromptChannelComposition;
  video: PromptChannelComposition;
  debugParts: PromptDebugPart[];
  missingContext: PromptMissingContext[];
}

export interface ComposeShotPromptInput {
  shotNodeId: string;
  nodes: readonly CanvasNodeRecord[];
  edges?: readonly CanvasEdgeRecord[];
  assets?: readonly AssetListItem[];
  globalStylePrompt?: string;
  projectGenerationSettings?: GenerationCreativeSettings;
  skillTemplates?: readonly SkillTemplatePromptContext[];
  modelPromptSuffix?: string;
}

export function composeShotPrompt(input: ComposeShotPromptInput): ShotPromptCompositionResult {
  const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
  const shotNode = nodesById.get(input.shotNodeId);
  const missingContext: PromptMissingContext[] = [];

  if (!shotNode || shotNode.type !== "shot") {
    missingContext.push({
      kind: "shot",
      label: "Shot",
      message: shotNode
        ? `Node ${input.shotNodeId} is a ${shotNode.type} node, not a Shot node.`
        : `Shot node ${input.shotNodeId} was not found.`,
      sourceNodeId: input.shotNodeId,
    });
    return emptyResult(input.shotNodeId, missingContext);
  }

  const shotData = dataObject(shotNode) as ShotNodeData;
  const sceneNode = findSceneNode(input.edges ?? [], nodesById, shotNode.id);
  const characterNodes = findCharacterNodes(input.edges ?? [], nodesById, shotNode);
  const locationNode = findLocationNode(input.edges ?? [], nodesById, shotNode);
  const storyEventParts = storyEventPartsForShot(shotNode, sceneNode, missingContext);
  const lifecycleParts = characterLifecyclePartsForShot(shotNode, characterNodes, missingContext);
  const resolvedGenerationSettings = resolveGenerationSettings({
    projectSettings: input.projectGenerationSettings,
    shotSettings: shotData.generationSettings,
  });

  if (!sceneNode) {
    missingContext.push({
      kind: "scene",
      label: "Scene",
      message: "No linked Scene node was found for this Shot.",
      sourceNodeId: shotNode.id,
    });
  }
  if (characterNodes.length === 0) {
    missingContext.push({
      kind: "character",
      label: "Characters",
      message: "No linked Character nodes were found for this Shot.",
      sourceNodeId: shotNode.id,
    });
  }
  if (!locationNode) {
    missingContext.push({
      kind: "location",
      label: "Location",
      message: "No linked Location node was found for this Shot.",
      sourceNodeId: shotNode.id,
    });
  }

  const referenceAssetIds = resolveReferenceAssetIds(
    [...characterNodes, ...(locationNode ? [locationNode] : [])],
    input.assets,
    missingContext,
  );
  const negativePrompt = optionalText(shotData.negativePromptNotes) ?? "";
  const commonParts = [
    partFromText({
      id: "global-style",
      kind: "global_style",
      label: "Global style",
      text: optionalText(input.globalStylePrompt),
      channels: ["image", "video"],
    }),
    generationSettingsPart(resolvedGenerationSettings, shotNode.id),
    visualManualPart(resolvedGenerationSettings, shotNode.id),
    directorManualPart(resolvedGenerationSettings, shotNode.id),
    ...skillTemplateParts(input.skillTemplates ?? [], shotNode.id),
    ...storyEventParts,
    scenePart(sceneNode),
    locationPart(locationNode),
    ...characterNodes.map((node) => characterPart(node)),
    ...lifecycleParts,
  ].filter(isPromptDebugPart);
  const imageShotPart = shotPart("image", shotNode);
  const videoShotPart = shotPart("video", shotNode);
  const suffixPart = partFromText({
    id: "model-suffix",
    kind: "model_suffix",
    label: "Model suffix",
    text: optionalText(input.modelPromptSuffix),
    channels: ["image", "video"],
  });
  const negativePart = partFromText({
    id: `negative:${shotNode.id}`,
    kind: "negative_prompt",
    label: "Negative prompt",
    text: negativePrompt,
    channels: ["image", "video"],
    sourceNodeIds: [shotNode.id],
  });

  if (!imageShotPart) {
    missingContext.push({
      kind: "image_prompt",
      label: "Image prompt",
      message: "The Shot does not contain image prompt or visual fields.",
      sourceNodeId: shotNode.id,
    });
  }
  if (!videoShotPart) {
    missingContext.push({
      kind: "video_prompt",
      label: "Video prompt",
      message: "The Shot does not contain video prompt, action, camera, duration, or audio fields.",
      sourceNodeId: shotNode.id,
    });
  }

  const imageParts = [
    ...commonParts,
    imageShotPart,
    suffixPart,
    negativePart,
  ].filter(isPromptDebugPart);
  const videoParts = [
    ...commonParts,
    videoShotPart,
    suffixPart,
    negativePart,
  ].filter(isPromptDebugPart);

  return {
    shotNodeId: shotNode.id,
    shotTitle: shotNode.title,
    sourceNodeIds: {
      shotNodeId: shotNode.id,
      sceneNodeId: sceneNode?.id,
      characterNodeIds: characterNodes.map((node) => node.id),
      locationNodeId: locationNode?.id,
      referenceAssetIds,
    },
    referenceAssetIds,
    negativePrompt,
    resolvedGenerationSettings,
    image: channelComposition("image", imageParts, negativePrompt, missingContext),
    video: channelComposition("video", videoParts, negativePrompt, missingContext),
    debugParts: uniqueParts([...imageParts, ...videoParts]),
    missingContext,
  };
}

function emptyResult(
  shotNodeId: string,
  missingContext: PromptMissingContext[],
): ShotPromptCompositionResult {
  return {
    shotNodeId,
    sourceNodeIds: {
      characterNodeIds: [],
      referenceAssetIds: [],
    },
    referenceAssetIds: [],
    negativePrompt: "",
    resolvedGenerationSettings: resolveGenerationSettings(),
    image: channelComposition("image", [], "", missingContext),
    video: channelComposition("video", [], "", missingContext),
    debugParts: [],
    missingContext,
  };
}

function findSceneNode(
  edges: readonly CanvasEdgeRecord[],
  nodesById: ReadonlyMap<string, CanvasNodeRecord>,
  shotNodeId: string,
): CanvasNodeRecord<SceneNodeData> | undefined {
  const sceneId = edges.find((edge) => edge.relation === "belongs_to_scene" && edge.sourceNodeId === shotNodeId)
    ?.targetNodeId;
  const node = sceneId ? nodesById.get(sceneId) : undefined;
  return node?.type === "scene" ? (node as CanvasNodeRecord<SceneNodeData>) : undefined;
}

function findCharacterNodes(
  edges: readonly CanvasEdgeRecord[],
  nodesById: ReadonlyMap<string, CanvasNodeRecord>,
  shotNode: CanvasNodeRecord,
): Array<CanvasNodeRecord<CharacterAssetNodeData>> {
  const shotData = dataObject(shotNode) as ShotNodeData;
  const linkedIds = uniqueStrings([
    ...edges
      .filter((edge) => edge.relation === "references_character" && edge.targetNodeId === shotNode.id)
      .map((edge) => edge.sourceNodeId),
    ...stringArray(shotData.characterAssetIds),
  ]);

  return linkedIds
    .map((nodeId) => nodesById.get(nodeId))
    .filter((node): node is CanvasNodeRecord<CharacterAssetNodeData> => node?.type === "character_asset");
}

function findLocationNode(
  edges: readonly CanvasEdgeRecord[],
  nodesById: ReadonlyMap<string, CanvasNodeRecord>,
  shotNode: CanvasNodeRecord,
): CanvasNodeRecord<LocationAssetNodeData> | undefined {
  const shotData = dataObject(shotNode) as ShotNodeData;
  const linkedIds = uniqueStrings([
    ...edges
      .filter((edge) => edge.relation === "references_location" && edge.targetNodeId === shotNode.id)
      .map((edge) => edge.sourceNodeId),
    ...(optionalText(shotData.locationAssetId) ? [optionalText(shotData.locationAssetId)!] : []),
  ]);
  const node = linkedIds.map((nodeId) => nodesById.get(nodeId)).find((candidate) => candidate?.type === "location_asset");
  return node as CanvasNodeRecord<LocationAssetNodeData> | undefined;
}

function storyEventPartsForShot(
  shotNode: CanvasNodeRecord,
  sceneNode: CanvasNodeRecord<SceneNodeData> | undefined,
  missingContext: PromptMissingContext[],
): PromptDebugPart[] {
  const shotData = dataObject(shotNode) as ShotNodeData;
  const sceneData = sceneNode ? (dataObject(sceneNode) as SceneNodeData) : undefined;
  const shotEvents = storyEventArray(shotData.storyEvents);
  const sceneEvents = storyEventArray(sceneData?.storyEvents);
  const events = shotEvents.length > 0 ? shotEvents : sceneEvents;
  const referencedEventIds = uniqueStrings([
    ...stringArray(shotData.storyEventIds),
    ...stringArray(sceneData?.storyEventIds),
  ]);

  if (referencedEventIds.length > 0 && events.length === 0) {
    missingContext.push({
      kind: "story_event",
      label: "Story event",
      message: "The Shot references story events, but no event trace was imported.",
      sourceNodeId: shotNode.id,
    });
  }

  return events.map((event) =>
    partFromText({
      id: `story-event:${event.eventId}:${shotNode.id}`,
      kind: "story_event",
      label: "Story event",
      text: joinLines([
        labeled("Event", event.title ?? event.eventId),
        labeled("Summary", event.summary),
        labeled("Source excerpt", event.sourceExcerpt),
        labeled("Conflict", event.conflict),
        labeled("Result", event.result),
        labeled("Emotion", event.emotion),
      ]),
      channels: ["image", "video"],
      sourceNodeIds: [shotNode.id, ...(sceneNode ? [sceneNode.id] : [])],
    }),
  ).filter(isPromptDebugPart);
}

function characterLifecyclePartsForShot(
  shotNode: CanvasNodeRecord,
  characterNodes: readonly CanvasNodeRecord<CharacterAssetNodeData>[],
  missingContext: PromptMissingContext[],
): PromptDebugPart[] {
  const shotData = dataObject(shotNode) as ShotNodeData;
  const references = characterStageReferenceArray(shotData.characterStageRefs);
  if (references.length === 0) {
    return [];
  }

  return references
    .map((reference) => {
      const characterNode = characterNodes.find(
        (node) => characterReferenceKey(node) === reference.characterTempId || node.id === reference.characterTempId,
      );
      if (!characterNode) {
        missingContext.push({
          kind: "character_lifecycle",
          label: "Character lifecycle",
          message: `No linked Character node was found for lifecycle reference ${reference.characterTempId}.`,
          sourceNodeId: shotNode.id,
        });
        return undefined;
      }

      const characterData = dataObject(characterNode) as CharacterAssetNodeData;
      const stage = lifecycleStages(characterData.lifecycleStages).find(
        (candidate) => candidate.stageId === reference.stageId,
      );
      if (!stage) {
        missingContext.push({
          kind: "character_lifecycle",
          label: "Character lifecycle",
          message: `Character ${characterNode.title ?? characterData.name ?? characterNode.id} does not have lifecycle stage ${reference.stageId}.`,
          sourceNodeId: characterNode.id,
        });
        return undefined;
      }

      return partFromText({
        id: `character-lifecycle:${characterNode.id}:${stage.stageId}`,
        kind: "character_lifecycle",
        label: "Character lifecycle",
        text: joinLines([
          labeled("Character", characterNode.title ?? characterData.name),
          labeled("Stage", stage.label),
          labeled("Age", stage.ageRange),
          labeled("Appearance", stage.appearance),
          labeled("Costume", stage.costume),
          labeled("Emotion", stage.emotionalState),
          labeled("Identity", stage.identityPrompt),
        ]),
        channels: ["image", "video"],
        sourceNodeIds: [characterNode.id],
        referenceAssetIds: stringArray(characterData.referenceAssetIds),
      });
    })
    .filter(isPromptDebugPart);
}

function generationSettingsPart(
  resolved: ResolvedGenerationSettings,
  shotNodeId: string,
): PromptDebugPart | undefined {
  const settings = resolved.effective;
  const text = joinLines([
    labeledWithSource("Visual style", settings.visualStyle, resolved.sources.visualStyle),
    labeledWithSource("Aspect ratio", settings.aspectRatio, resolved.sources.aspectRatio),
    labeledWithSource("Narration language", settings.narrationLanguage, resolved.sources.narrationLanguage),
    labeledWithSource("Narration accent", settings.narrationAccent, resolved.sources.narrationAccent),
    labeledWithSource("Narration voice", settings.narrationVoice, resolved.sources.narrationVoice),
    packagingLine("Subtitle", settings.subtitle, resolved.sources.subtitle),
    packagingLine("BGM", settings.bgm, resolved.sources.bgm),
    packagingLine("Transition", settings.transition, resolved.sources.transition),
    packagingLine("Style pack", settings.stylePack, resolved.sources.stylePack),
    viralReferenceLine(settings.viralReference, resolved.sources.viralReference),
    continuityLine(settings.continuity, resolved.sources.continuity),
    talkingPhotoLine(settings.talkingPhoto, resolved.sources.talkingPhoto),
    marketingLine(settings.marketing, resolved.sources.marketing),
  ]);

  return partFromText({
    id: `generation-settings:${shotNodeId}`,
    kind: "generation_settings",
    label: "Generation settings",
    text,
    channels: ["image", "video"],
    sourceNodeIds: [shotNodeId],
  });
}

function visualManualPart(
  resolved: ResolvedGenerationSettings,
  shotNodeId: string,
): PromptDebugPart | undefined {
  const manual = resolved.effective.visualManual;
  const sources = resolved.sources.visualManualFields;
  if (!manual) {
    return undefined;
  }

  return partFromText({
    id: `visual-manual:${shotNodeId}`,
    kind: "visual_manual",
    label: "Visual manual",
    text: joinLines([
      labeledWithSource("Art style", manual.artStyle, sources?.artStyle),
      labeledWithSource("Palette", manual.palette, sources?.palette),
      labeledWithSource("Lighting", manual.lighting, sources?.lighting),
      labeledWithSource("Lens", manual.lens, sources?.lens),
      labeledWithSource("Composition", manual.composition, sources?.composition),
      labeledWithSource("Texture", manual.texture, sources?.texture),
      labeledWithSource("Consistency", manual.consistencyRules, sources?.consistencyRules),
      labeledWithSource("Negative style", manual.negativeStyle, sources?.negativeStyle),
    ]),
    channels: ["image", "video"],
    sourceNodeIds: [shotNodeId],
  });
}

function directorManualPart(
  resolved: ResolvedGenerationSettings,
  shotNodeId: string,
): PromptDebugPart | undefined {
  const manual = resolved.effective.directorManual;
  const sources = resolved.sources.directorManualFields;
  if (!manual) {
    return undefined;
  }

  return partFromText({
    id: `director-manual:${shotNodeId}`,
    kind: "director_manual",
    label: "Director manual",
    text: joinLines([
      labeledWithSource("Pacing", manual.pacing, sources?.pacing),
      labeledWithSource("Camera language", manual.cameraLanguage, sources?.cameraLanguage),
      labeledWithSource("Performance", manual.performance, sources?.performance),
      labeledWithSource("Editing rhythm", manual.editingRhythm, sources?.editingRhythm),
      labeledWithSource("Audio narration", manual.audioNarration, sources?.audioNarration),
      labeledWithSource(
        "Production constraints",
        manual.productionConstraints,
        sources?.productionConstraints,
      ),
    ]),
    channels: ["image", "video"],
    sourceNodeIds: [shotNodeId],
  });
}

function skillTemplateParts(
  templates: readonly SkillTemplatePromptContext[],
  shotNodeId: string,
): PromptDebugPart[] {
  return templates
    .filter((template) => template.kind !== "agent")
    .map((template) =>
      partFromText({
        id: `skill-template:${template.id}:${template.versionId}`,
        kind: "skill_template",
        label: `Skill: ${template.displayName}`,
        text: joinLines([
          labeled("Kind", template.kind),
          labeled("Slug", template.slug),
          labeled("Version", `v${template.version}`),
          template.sourceText,
        ]),
        channels: ["image", "video"],
        sourceNodeIds: [shotNodeId],
      }),
    )
    .filter(isPromptDebugPart);
}

function labeledWithSource(label: string, value: unknown, source: string | undefined): string | undefined {
  const text = optionalText(value);
  if (!text) {
    return undefined;
  }
  return source ? `${label}: ${text} (${source})` : `${label}: ${text}`;
}

function packagingLine(
  label: string,
  value: GenerationCreativeSettings["subtitle"],
  source: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }
  const detail = compactText([
    value.status,
    value.assetId ? `asset ${value.assetId}` : undefined,
    value.label,
    value.prompt,
    value.notes,
  ]);
  return labeledWithSource(label, detail, source);
}

function viralReferenceLine(
  value: GenerationCreativeSettings["viralReference"],
  source: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }
  const detail = compactText([
    value.sourceSummary ? `summary ${value.sourceSummary}` : undefined,
    value.hook ? `hook ${value.hook}` : undefined,
    value.pacing ? `pacing ${value.pacing}` : undefined,
    value.theme ? `theme ${value.theme}` : undefined,
    value.visualStyle ? `style ${value.visualStyle}` : undefined,
    value.transformationNotes ? `transform ${value.transformationNotes}` : undefined,
    value.complianceNote ? `compliance ${value.complianceNote}` : undefined,
  ]);
  return labeledWithSource("Manual viral reference", detail, source);
}

function continuityLine(
  value: GenerationCreativeSettings["continuity"],
  source: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }
  const detail = compactText([
    value.mode ? `mode ${value.mode}` : undefined,
    value.transitionPrompt ? `transition ${value.transitionPrompt}` : undefined,
    value.adjacentShotPrompt ? `adjacent ${value.adjacentShotPrompt}` : undefined,
    value.cameraBridge ? `camera bridge ${value.cameraBridge}` : undefined,
    value.subjectAnchor ? `subject anchor ${value.subjectAnchor}` : undefined,
  ]);
  return labeledWithSource("Continuity strategy", detail, source);
}

function talkingPhotoLine(
  value: GenerationCreativeSettings["talkingPhoto"],
  source: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }
  const detail = compactText([
    value.enabled ? "enabled" : undefined,
    value.consentConfirmed ? "consent confirmed" : undefined,
    value.sourceAssetId ? `source asset ${value.sourceAssetId}` : undefined,
    value.personaPrompt ? `persona ${value.personaPrompt}` : undefined,
    value.voicePrompt ? `voice ${value.voicePrompt}` : undefined,
    value.scriptPrompt ? `script ${value.scriptPrompt}` : undefined,
  ]);
  return labeledWithSource("Talking photo brief", detail, source);
}

function marketingLine(
  value: GenerationCreativeSettings["marketing"],
  source: string | undefined,
): string | undefined {
  if (!value) {
    return undefined;
  }
  const detail = compactText([
    packagingReferenceDetail("cover", value.cover),
    packagingReferenceDetail("poster", value.poster),
    packagingReferenceDetail("promo", value.promo),
    value.callToAction ? `CTA ${value.callToAction}` : undefined,
    value.layoutNotes ? `layout ${value.layoutNotes}` : undefined,
  ]);
  return labeledWithSource("Marketing materials", detail, source);
}

function packagingReferenceDetail(
  label: string,
  value: GenerationCreativeSettings["subtitle"],
): string | undefined {
  if (!value) {
    return undefined;
  }
  return `${label} ${compactText([
    value.status,
    value.assetId ? `asset ${value.assetId}` : undefined,
    value.label,
    value.prompt,
    value.notes,
  ])}`;
}

function scenePart(node: CanvasNodeRecord<SceneNodeData> | undefined): PromptDebugPart | undefined {
  if (!node) {
    return undefined;
  }
  const data = dataObject(node) as SceneNodeData;
  return partFromText({
    id: `scene:${node.id}`,
    kind: "scene",
    label: "Scene context",
    text: joinLines([
      labeled("Scene", node.title),
      labeled("Scene number", data.sceneNumber),
      labeled("Synopsis", data.synopsis),
      labeled("Mood", data.mood),
      labeled("Time of day", data.timeOfDay),
      labeled("Source excerpt", data.sourceExcerpt),
    ]),
    channels: ["image", "video"],
    sourceNodeIds: [node.id],
  });
}

function locationPart(
  node: CanvasNodeRecord<LocationAssetNodeData> | undefined,
): PromptDebugPart | undefined {
  if (!node) {
    return undefined;
  }
  const data = dataObject(node) as LocationAssetNodeData;
  return partFromText({
    id: `location:${node.id}`,
    kind: "location",
    label: "Location",
    text: joinLines([
      labeled("Location", node.title ?? data.name),
      labeled("Type", data.locationType),
      labeled("Prompt", data.locationPrompt),
      labeled("Consistency", data.consistencyPrompt),
      labeled("Environment", data.environment),
      labeled("Mood", data.mood),
      labeled("Visual style", data.visualStyle),
    ]),
    channels: ["image", "video"],
    sourceNodeIds: [node.id],
    referenceAssetIds: stringArray(data.referenceAssetIds),
  });
}

function characterPart(node: CanvasNodeRecord<CharacterAssetNodeData>): PromptDebugPart | undefined {
  const data = dataObject(node) as CharacterAssetNodeData;
  return partFromText({
    id: `character:${node.id}`,
    kind: "character",
    label: "Character",
    text: joinLines([
      labeled("Character", node.title ?? data.name),
      labeled("Role", data.role),
      labeled("Identity", data.identityPrompt),
      labeled("Consistency", data.consistencyPrompt),
      labeled("Appearance", data.appearance),
      labeled("Wardrobe", data.wardrobe),
      labeled("Personality", data.personality),
    ]),
    channels: ["image", "video"],
    sourceNodeIds: [node.id],
    referenceAssetIds: stringArray(data.referenceAssetIds),
  });
}

function shotPart(
  channel: PromptCompositionChannel,
  node: CanvasNodeRecord,
): PromptDebugPart | undefined {
  const data = dataObject(node) as ShotNodeData;
  const sharedLines = [
    labeled("Shot", node.title),
    labeled("Shot number", data.shotNumber),
    labeled("Visual", data.visualDescription),
    labeled("Action", data.action),
    labeled("Camera", data.cameraMovement),
    labeled("Lens", data.lens),
    labeled("Lighting", data.lighting),
    labeled("Mood", data.mood),
  ];
  const channelLines =
    channel === "image"
      ? [labeled("Image prompt", data.imagePrompt), labeled("Prompt notes", data.promptNotes)]
      : [
          labeled("Video prompt", data.videoPrompt),
          labeled("Duration seconds", data.durationSeconds ?? data.durationSec),
          labeled("Dialogue", data.dialogue),
          labeled("Narration", data.narration),
          labeled("Sound effect", data.soundEffect),
        ];

  return partFromText({
    id: `shot:${channel}:${node.id}`,
    kind: "shot",
    label: channel === "image" ? "Shot image prompt" : "Shot video prompt",
    text: joinLines([...channelLines, ...sharedLines, labeled("Source excerpt", data.sourceExcerpt)]),
    channels: [channel],
    sourceNodeIds: [node.id],
  });
}

function resolveReferenceAssetIds(
  nodes: readonly CanvasNodeRecord[],
  assets: readonly AssetListItem[] | undefined,
  missingContext: PromptMissingContext[],
): string[] {
  const requestedIds = uniqueStrings(
    nodes.flatMap((node) => stringArray((dataObject(node) as { referenceAssetIds?: unknown }).referenceAssetIds)),
  );
  if (!assets) {
    return requestedIds;
  }

  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const resolvedIds: string[] = [];
  requestedIds.forEach((assetId) => {
    const asset = assetsById.get(assetId);
    if (!asset) {
      missingContext.push({
        kind: "reference_asset",
        label: "Reference asset",
        message: `Reference asset ${assetId} is not available in this project.`,
        referenceAssetId: assetId,
      });
      return;
    }
    if (asset.type !== "image") {
      missingContext.push({
        kind: "reference_asset",
        label: "Reference asset",
        message: `Reference asset ${assetId} is a ${asset.type} asset, not an image asset.`,
        referenceAssetId: assetId,
      });
      return;
    }
    resolvedIds.push(assetId);
  });

  return uniqueStrings(resolvedIds);
}

function channelComposition(
  channel: PromptCompositionChannel,
  parts: readonly PromptDebugPart[],
  negativePrompt: string,
  missingContext: readonly PromptMissingContext[],
): PromptChannelComposition {
  const channelParts = parts.filter((part) => part.channels.includes(channel));
  return {
    channel,
    prompt: joinLines(channelParts.filter((part) => part.kind !== "negative_prompt").map((part) => part.text), "\n\n"),
    negativePrompt,
    parts: channelParts,
    missingContext: [...missingContext],
  };
}

function partFromText(input: {
  id: string;
  kind: PromptDebugPartKind;
  label: string;
  text: string | undefined;
  channels: PromptCompositionChannel[];
  sourceNodeIds?: string[];
  referenceAssetIds?: string[];
}): PromptDebugPart | undefined {
  const text = optionalText(input.text);
  if (!text) {
    return undefined;
  }
  return {
    id: input.id,
    kind: input.kind,
    label: input.label,
    text,
    channels: input.channels,
    sourceNodeIds: input.sourceNodeIds,
    referenceAssetIds: input.referenceAssetIds,
  };
}

function uniqueParts(parts: readonly PromptDebugPart[]): PromptDebugPart[] {
  const seen = new Set<string>();
  return parts.filter((part) => {
    if (seen.has(part.id)) {
      return false;
    }
    seen.add(part.id);
    return true;
  });
}

function dataObject(node: CanvasNodeRecord): Record<string, unknown> {
  return typeof node.dataJson === "object" && node.dataJson !== null && !Array.isArray(node.dataJson)
    ? (node.dataJson as Record<string, unknown>)
    : {};
}

function labeled(label: string, value: unknown): string | undefined {
  const text = optionalText(value);
  return text ? `${label}: ${text}` : undefined;
}

function joinLines(values: ReadonlyArray<string | undefined>, separator = "\n"): string {
  return values.filter((value): value is string => Boolean(optionalText(value))).join(separator);
}

function compactText(values: ReadonlyArray<string | undefined>): string {
  return values.filter((value): value is string => Boolean(optionalText(value))).join(" / ");
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(value.map(optionalText).filter((text): text is string => Boolean(text)));
}

function storyEventArray(value: unknown): StoryEventTraceData[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "object" && item !== null && !Array.isArray(item) ? item : undefined))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      eventId: optionalText(item.eventId) ?? "",
      title: optionalText(item.title),
      orderIndex: typeof item.orderIndex === "number" ? item.orderIndex : undefined,
      chapterIndex: typeof item.chapterIndex === "number" ? item.chapterIndex : undefined,
      sourceExcerpt: optionalText(item.sourceExcerpt),
      summary: optionalText(item.summary),
      characters: stringArray(item.characters),
      locationName: optionalText(item.locationName),
      emotion: optionalText(item.emotion),
      conflict: optionalText(item.conflict),
      result: optionalText(item.result),
      estimatedDurationSec:
        typeof item.estimatedDurationSec === "number" ? item.estimatedDurationSec : undefined,
    }))
    .filter((event) => Boolean(event.eventId));
}

function characterStageReferenceArray(value: unknown): CharacterStageReferenceData[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "object" && item !== null && !Array.isArray(item) ? item : undefined))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      characterTempId: optionalText(item.characterTempId) ?? "",
      stageId: optionalText(item.stageId) ?? "",
    }))
    .filter((reference) => Boolean(reference.characterTempId && reference.stageId));
}

function lifecycleStages(value: unknown): CharacterLifecycleStageData[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === "object" && item !== null && !Array.isArray(item) ? item : undefined))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map((item) => ({
      stageId: optionalText(item.stageId) ?? "",
      label: optionalText(item.label) ?? "",
      ageRange: optionalText(item.ageRange),
      appearance: optionalText(item.appearance),
      costume: optionalText(item.costume),
      hairstyle: optionalText(item.hairstyle),
      emotionalState: optionalText(item.emotionalState),
      identityPrompt: optionalText(item.identityPrompt),
    }))
    .filter((stage) => Boolean(stage.stageId));
}

function characterReferenceKey(node: CanvasNodeRecord<CharacterAssetNodeData>): string | undefined {
  const data = dataObject(node) as CharacterAssetNodeData & { storyboardImport?: unknown };
  const provenance = data.storyboardImport;
  if (typeof provenance !== "object" || provenance === null || Array.isArray(provenance)) {
    return undefined;
  }
  return optionalText((provenance as Record<string, unknown>).sourceTempId);
}

function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const text = optionalText(value);
    if (!text || seen.has(text)) {
      return false;
    }
    seen.add(text);
    return true;
  });
}

function optionalText(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const text = value.trim();
  return text.length > 0 ? text : undefined;
}

function isPromptDebugPart(value: PromptDebugPart | undefined): value is PromptDebugPart {
  return Boolean(value);
}
