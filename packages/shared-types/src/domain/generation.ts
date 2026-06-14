import type {
  CanvasEdgeRecord,
  CanvasEdgeRelation,
  CanvasNodeRecord,
  CanvasNodeType,
  CanvasSnapshotJson,
  NodeStatus,
  Phase3CanvasNodeType,
} from "./canvas";
import type { PromptDebugPart, PromptMissingContext, ShotPromptSourceNodeIds } from "./prompt-composer";
import type { ProjectAspectRatio } from "./project";

export const GENERATION_JOB_STATUSES = [
  "queued",
  "running",
  "provider_waiting",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type GenerationJobStatus = (typeof GENERATION_JOB_STATUSES)[number];

export const GENERATION_OPERATIONS = [
  "novel_to_storyboard",
  "asset_caption",
  "asset_classification",
  "shot_to_image",
  "character_to_image",
  "location_to_image",
  "image_refinement",
  "image_to_video",
  "shot_to_video",
  "workflow_run",
  "batch_shots_to_images",
  "batch_images_to_videos",
  "editor_export",
  "agent_canvas_action",
] as const;
export type GenerationOperation = (typeof GENERATION_OPERATIONS)[number];

export const PHASE_8_GENERATION_OPERATIONS = [
  "shot_to_image",
  "character_to_image",
  "location_to_image",
  "image_refinement",
  "image_to_video",
] as const;
export type Phase8GenerationOperation = (typeof PHASE_8_GENERATION_OPERATIONS)[number];

export const IMAGE_PROVIDER_IDS = ["mock-image", "image2", "banana", "generic-image"] as const;
export type ImageProviderId = (typeof IMAGE_PROVIDER_IDS)[number];

export const IMAGE_PROVIDER_MODES = ["text_to_image", "image_to_image", "multi_reference"] as const;
export type ImageProviderMode = (typeof IMAGE_PROVIDER_MODES)[number];

export const VIDEO_PROVIDER_IDS = ["mock-video", "seedance", "happyhorse", "generic-video"] as const;
export type VideoProviderId = (typeof VIDEO_PROVIDER_IDS)[number];

export type ProgrammableProviderId = `custom:${string}`;
export type AnyImageProviderId = ImageProviderId | ProgrammableProviderId;
export type AnyVideoProviderId = VideoProviderId | ProgrammableProviderId;

export const VIDEO_PROVIDER_MODES = ["text_to_video", "image_to_video", "reference_to_video", "video_edit"] as const;
export type VideoProviderMode = (typeof VIDEO_PROVIDER_MODES)[number];

export const VIDEO_PROVIDER_RESOLUTIONS = ["720p", "1080p"] as const;
export type VideoProviderResolution = (typeof VIDEO_PROVIDER_RESOLUTIONS)[number];

export const VIDEO_PROVIDER_TASK_STATUSES = [
  "provider_waiting",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type VideoProviderTaskStatus = (typeof VIDEO_PROVIDER_TASK_STATUSES)[number];

export const VIDEO_REFERENCE_MEDIA_ROLES = [
  "first_frame",
  "last_frame",
  "reference_image",
  "reference_video",
  "reference_audio",
] as const;
export type VideoReferenceMediaRole = (typeof VIDEO_REFERENCE_MEDIA_ROLES)[number];

export interface VideoReferenceMediaInput {
  assetId: string;
  role: VideoReferenceMediaRole;
  sourceNodeId?: string;
}

export const WORKFLOW_RUN_KINDS = ["comfyui", "runninghub"] as const;
export type WorkflowRunKind = (typeof WORKFLOW_RUN_KINDS)[number];

export const WORKFLOW_OUTPUT_KINDS = ["image", "video", "audio", "document"] as const;
export type WorkflowOutputKind = (typeof WORKFLOW_OUTPUT_KINDS)[number];

export const ASSET_ANALYSIS_OPERATIONS = ["asset_caption", "asset_classification"] as const;
export type AssetAnalysisOperation = (typeof ASSET_ANALYSIS_OPERATIONS)[number];

export const PROVIDER_KINDS = ["llm", "image", "video", "editor"] as const;
export type ProviderKind = (typeof PROVIDER_KINDS)[number];

export const MANAGED_PROVIDER_KINDS = ["image", "video"] as const;
export type ManagedProviderKind = (typeof MANAGED_PROVIDER_KINDS)[number];

export type ManagedProviderId = ImageProviderId | VideoProviderId | ProgrammableProviderId;

export const PROVIDER_CREDENTIAL_UPDATE_ACTIONS = ["unchanged", "set", "clear"] as const;
export type ProviderCredentialUpdateAction = (typeof PROVIDER_CREDENTIAL_UPDATE_ACTIONS)[number];

export const PROVIDER_TEST_STATUSES = ["untested", "succeeded", "failed"] as const;
export type ProviderTestStatus = (typeof PROVIDER_TEST_STATUSES)[number];

export const PROVIDER_CREDENTIAL_SOURCES = ["environment", "stored", "temporary"] as const;
export type ProviderCredentialSource = (typeof PROVIDER_CREDENTIAL_SOURCES)[number];

export const PROVIDER_PROTOCOLS = ["openai_compatible", "gemini", "ark", "mock"] as const;
export type ProviderProtocol = (typeof PROVIDER_PROTOCOLS)[number];

export const PROVIDER_IMAGE_REQUEST_MODES = ["openai", "gemini", "ark"] as const;
export type ProviderImageRequestMode = (typeof PROVIDER_IMAGE_REQUEST_MODES)[number];

export const PROVIDER_VIDEO_REQUEST_MODES = ["task", "sync", "mock"] as const;
export type ProviderVideoRequestMode = (typeof PROVIDER_VIDEO_REQUEST_MODES)[number];

export const PROGRAMMABLE_PROVIDER_VERSION_STATUSES = ["valid", "invalid"] as const;
export type ProgrammableProviderVersionStatus = (typeof PROGRAMMABLE_PROVIDER_VERSION_STATUSES)[number];

export const PROGRAMMABLE_PROVIDER_CREDENTIAL_INPUT_TYPES = ["password", "text", "url"] as const;
export type ProgrammableProviderCredentialInputType =
  (typeof PROGRAMMABLE_PROVIDER_CREDENTIAL_INPUT_TYPES)[number];

export const PROGRAMMABLE_PROVIDER_HTTP_METHODS = ["GET", "POST"] as const;
export type ProgrammableProviderHttpMethod = (typeof PROGRAMMABLE_PROVIDER_HTTP_METHODS)[number];

export const PROGRAMMABLE_PROVIDER_OUTPUT_SOURCES = ["url", "base64"] as const;
export type ProgrammableProviderOutputSource = (typeof PROGRAMMABLE_PROVIDER_OUTPUT_SOURCES)[number];

export const EDITOR_EXPORT_SORT_MODES = ["shot_index", "canvas_x", "manual"] as const;
export type EditorExportSortMode = (typeof EDITOR_EXPORT_SORT_MODES)[number];

export const EDITOR_EXPORT_PRESETS = [
  "standard_zip",
  "gif_preview",
  "image_sequence",
  "hd_1080p",
] as const;
export type EditorExportPreset = (typeof EDITOR_EXPORT_PRESETS)[number];

export const EDITOR_EXPORT_STATUSES = ["queued", "running", "succeeded", "failed"] as const;
export type EditorExportStatus = (typeof EDITOR_EXPORT_STATUSES)[number];

export type GenerationJobStatusCounts = Record<GenerationJobStatus, number>;

export const GENERATION_PACKAGING_REFERENCE_STATUSES = [
  "absent",
  "requested_unresolved",
  "available",
] as const;
export type GenerationPackagingReferenceStatus = (typeof GENERATION_PACKAGING_REFERENCE_STATUSES)[number];

export const GENERATION_CONTINUITY_MODES = [
  "standard",
  "match_cut",
  "one_take",
  "multi_image",
] as const;
export type GenerationContinuityMode = (typeof GENERATION_CONTINUITY_MODES)[number];

export const GENERATION_CREATIVE_SETTING_KEYS = [
  "visualStyle",
  "aspectRatio",
  "narrationLanguage",
  "narrationAccent",
  "narrationVoice",
  "visualManual",
  "directorManual",
  "subtitle",
  "bgm",
  "transition",
  "stylePack",
  "viralReference",
  "continuity",
  "talkingPhoto",
  "marketing",
] as const;
export type GenerationCreativeSettingKey = (typeof GENERATION_CREATIVE_SETTING_KEYS)[number];

export type GenerationSettingSource = "project" | "shot";

export const GENERATION_VISUAL_MANUAL_FIELDS = [
  "artStyle",
  "palette",
  "lighting",
  "lens",
  "composition",
  "texture",
  "consistencyRules",
  "negativeStyle",
] as const;
export type GenerationVisualManualField = (typeof GENERATION_VISUAL_MANUAL_FIELDS)[number];

export const GENERATION_DIRECTOR_MANUAL_FIELDS = [
  "pacing",
  "cameraLanguage",
  "performance",
  "editingRhythm",
  "audioNarration",
  "productionConstraints",
] as const;
export type GenerationDirectorManualField = (typeof GENERATION_DIRECTOR_MANUAL_FIELDS)[number];

export interface GenerationPackagingReference {
  [key: string]: CanvasSnapshotJson | undefined;
  status?: GenerationPackagingReferenceStatus;
  assetId?: string;
  label?: string;
  prompt?: string;
  notes?: string;
}

export interface GenerationViralReference {
  [key: string]: CanvasSnapshotJson | undefined;
  sourceSummary?: string;
  hook?: string;
  pacing?: string;
  theme?: string;
  visualStyle?: string;
  transformationNotes?: string;
  complianceNote?: string;
}

export interface GenerationVisualManualSettings {
  [key: string]: CanvasSnapshotJson | undefined;
  artStyle?: string;
  palette?: string;
  lighting?: string;
  lens?: string;
  composition?: string;
  texture?: string;
  consistencyRules?: string;
  negativeStyle?: string;
}

export interface GenerationDirectorManualSettings {
  [key: string]: CanvasSnapshotJson | undefined;
  pacing?: string;
  cameraLanguage?: string;
  performance?: string;
  editingRhythm?: string;
  audioNarration?: string;
  productionConstraints?: string;
}

export interface GenerationContinuitySettings {
  [key: string]: CanvasSnapshotJson | undefined;
  mode?: GenerationContinuityMode;
  transitionPrompt?: string;
  adjacentShotPrompt?: string;
  cameraBridge?: string;
  subjectAnchor?: string;
}

export interface GenerationTalkingPhotoSettings {
  [key: string]: CanvasSnapshotJson | undefined;
  enabled?: boolean;
  consentConfirmed?: boolean;
  sourceAssetId?: string;
  personaPrompt?: string;
  voicePrompt?: string;
  scriptPrompt?: string;
}

export interface GenerationMarketingSettings {
  [key: string]: CanvasSnapshotJson | undefined;
  cover?: GenerationPackagingReference;
  poster?: GenerationPackagingReference;
  promo?: GenerationPackagingReference;
  callToAction?: string;
  layoutNotes?: string;
}

export interface GenerationCreativeSettings {
  [key: string]: CanvasSnapshotJson | undefined;
  visualStyle?: string;
  aspectRatio?: ProjectAspectRatio;
  narrationLanguage?: string;
  narrationAccent?: string;
  narrationVoice?: string;
  visualManual?: GenerationVisualManualSettings;
  directorManual?: GenerationDirectorManualSettings;
  subtitle?: GenerationPackagingReference;
  bgm?: GenerationPackagingReference;
  transition?: GenerationPackagingReference;
  stylePack?: GenerationPackagingReference;
  viralReference?: GenerationViralReference;
  continuity?: GenerationContinuitySettings;
  talkingPhoto?: GenerationTalkingPhotoSettings;
  marketing?: GenerationMarketingSettings;
}

export type GenerationVisualManualSources = Partial<
  Record<GenerationVisualManualField, GenerationSettingSource>
> & {
  [key: string]: CanvasSnapshotJson | undefined;
};

export type GenerationDirectorManualSources = Partial<
  Record<GenerationDirectorManualField, GenerationSettingSource>
> & {
  [key: string]: CanvasSnapshotJson | undefined;
};

export type GenerationSettingSources = Partial<Record<GenerationCreativeSettingKey, GenerationSettingSource>> & {
  visualManualFields?: GenerationVisualManualSources;
  directorManualFields?: GenerationDirectorManualSources;
  [key: string]: CanvasSnapshotJson | undefined;
};

export interface ResolvedGenerationSettings {
  [key: string]: CanvasSnapshotJson | undefined;
  project: GenerationCreativeSettings;
  shot: GenerationCreativeSettings;
  effective: GenerationCreativeSettings;
  sources: GenerationSettingSources;
}

export interface ResolveGenerationSettingsInput {
  projectSettings?: unknown;
  shotSettings?: unknown;
}

export function resolveGenerationSettings(
  input: ResolveGenerationSettingsInput = {},
): ResolvedGenerationSettings {
  const project = normalizeGenerationCreativeSettings(input.projectSettings);
  const shot = normalizeGenerationCreativeSettings(input.shotSettings);
  const effective: GenerationCreativeSettings = {};
  const sources: GenerationSettingSources = {};

  for (const key of GENERATION_CREATIVE_SETTING_KEYS) {
    if (key === "visualManual") {
      const resolved = resolveManualSetting(
        project.visualManual,
        shot.visualManual,
        GENERATION_VISUAL_MANUAL_FIELDS,
      );
      if (resolved.value) {
        effective.visualManual = resolved.value;
        sources.visualManual = resolved.source;
        sources.visualManualFields = resolved.fieldSources;
      }
      continue;
    }
    if (key === "directorManual") {
      const resolved = resolveManualSetting(
        project.directorManual,
        shot.directorManual,
        GENERATION_DIRECTOR_MANUAL_FIELDS,
      );
      if (resolved.value) {
        effective.directorManual = resolved.value;
        sources.directorManual = resolved.source;
        sources.directorManualFields = resolved.fieldSources;
      }
      continue;
    }

    const shotValue = shot[key];
    if (hasGenerationSettingValue(shotValue)) {
      effective[key] = shotValue as never;
      sources[key] = "shot";
      continue;
    }
    const projectValue = project[key];
    if (hasGenerationSettingValue(projectValue)) {
      effective[key] = projectValue as never;
      sources[key] = "project";
    }
  }

  return { project, shot, effective, sources };
}

export function normalizeGenerationCreativeSettings(input: unknown): GenerationCreativeSettings {
  const raw = dataObject(input);
  const aspectRatio = projectAspectRatio(raw.aspectRatio);

  return compactSettings({
    visualStyle: optionalString(raw.visualStyle),
    aspectRatio,
    narrationLanguage: optionalString(raw.narrationLanguage),
    narrationAccent: optionalString(raw.narrationAccent),
    narrationVoice: optionalString(raw.narrationVoice),
    visualManual: normalizeGenerationVisualManualSettings(raw.visualManual),
    directorManual: normalizeGenerationDirectorManualSettings(raw.directorManual),
    subtitle: normalizeGenerationPackagingReference(raw.subtitle),
    bgm: normalizeGenerationPackagingReference(raw.bgm),
    transition: normalizeGenerationPackagingReference(raw.transition),
    stylePack: normalizeGenerationPackagingReference(raw.stylePack),
    viralReference: normalizeGenerationViralReference(raw.viralReference),
    continuity: normalizeGenerationContinuitySettings(raw.continuity),
    talkingPhoto: normalizeGenerationTalkingPhotoSettings(raw.talkingPhoto),
    marketing: normalizeGenerationMarketingSettings(raw.marketing),
  });
}

export function normalizeGenerationPackagingReference(input: unknown): GenerationPackagingReference | undefined {
  const raw = dataObject(input);
  const assetId = optionalString(raw.assetId);
  const label = optionalString(raw.label);
  const prompt = optionalString(raw.prompt);
  const notes = optionalString(raw.notes);
  const rawStatus = optionalString(raw.status);
  const status = GENERATION_PACKAGING_REFERENCE_STATUSES.includes(rawStatus as GenerationPackagingReferenceStatus)
    ? (rawStatus as GenerationPackagingReferenceStatus)
    : assetId
      ? "available"
      : label || prompt || notes
        ? "requested_unresolved"
        : undefined;

  if (!status && !assetId && !label && !prompt && !notes) {
    return undefined;
  }

  return compactObject({
    status,
    assetId,
    label,
    prompt,
    notes,
  });
}

export function normalizeGenerationViralReference(input: unknown): GenerationViralReference | undefined {
  const raw = dataObject(input);
  return compactOptionalObject({
    sourceSummary: optionalString(raw.sourceSummary),
    hook: optionalString(raw.hook),
    pacing: optionalString(raw.pacing),
    theme: optionalString(raw.theme),
    visualStyle: optionalString(raw.visualStyle),
    transformationNotes: optionalString(raw.transformationNotes),
    complianceNote: optionalString(raw.complianceNote),
  });
}

export function normalizeGenerationVisualManualSettings(
  input: unknown,
): GenerationVisualManualSettings | undefined {
  const raw = dataObject(input);
  return compactOptionalObject({
    artStyle: optionalString(raw.artStyle),
    palette: optionalString(raw.palette),
    lighting: optionalString(raw.lighting),
    lens: optionalString(raw.lens),
    composition: optionalString(raw.composition),
    texture: optionalString(raw.texture),
    consistencyRules: optionalString(raw.consistencyRules),
    negativeStyle: optionalString(raw.negativeStyle),
  });
}

export function normalizeGenerationDirectorManualSettings(
  input: unknown,
): GenerationDirectorManualSettings | undefined {
  const raw = dataObject(input);
  return compactOptionalObject({
    pacing: optionalString(raw.pacing),
    cameraLanguage: optionalString(raw.cameraLanguage),
    performance: optionalString(raw.performance),
    editingRhythm: optionalString(raw.editingRhythm),
    audioNarration: optionalString(raw.audioNarration),
    productionConstraints: optionalString(raw.productionConstraints),
  });
}

export function normalizeGenerationContinuitySettings(
  input: unknown,
): GenerationContinuitySettings | undefined {
  const raw = dataObject(input);
  return compactOptionalObject({
    mode: continuityMode(raw.mode),
    transitionPrompt: optionalString(raw.transitionPrompt),
    adjacentShotPrompt: optionalString(raw.adjacentShotPrompt),
    cameraBridge: optionalString(raw.cameraBridge),
    subjectAnchor: optionalString(raw.subjectAnchor),
  });
}

export function normalizeGenerationTalkingPhotoSettings(
  input: unknown,
): GenerationTalkingPhotoSettings | undefined {
  const raw = dataObject(input);
  const sourceAssetId = optionalString(raw.sourceAssetId);
  const personaPrompt = optionalString(raw.personaPrompt);
  const voicePrompt = optionalString(raw.voicePrompt);
  const scriptPrompt = optionalString(raw.scriptPrompt);
  const consentConfirmed = raw.consentConfirmed === true ? true : undefined;
  const enabled =
    raw.enabled === true || sourceAssetId || personaPrompt || voicePrompt || scriptPrompt
      ? true
      : undefined;

  return compactOptionalObject({
    enabled,
    consentConfirmed,
    sourceAssetId,
    personaPrompt,
    voicePrompt,
    scriptPrompt,
  });
}

export function normalizeGenerationMarketingSettings(input: unknown): GenerationMarketingSettings | undefined {
  const raw = dataObject(input);
  return compactOptionalObject({
    cover: normalizeGenerationPackagingReference(raw.cover),
    poster: normalizeGenerationPackagingReference(raw.poster),
    promo: normalizeGenerationPackagingReference(raw.promo),
    callToAction: optionalString(raw.callToAction),
    layoutNotes: optionalString(raw.layoutNotes),
  });
}

export interface ImageProviderModelOption {
  id: string;
  displayName: string;
  default?: boolean;
}

export interface ImageProviderParameterOption {
  value: string;
  label: string;
}

export interface ImageProviderParameterDefinition {
  id: string;
  label: string;
  type: "string" | "number" | "boolean" | "select";
  required?: boolean;
  defaultValue?: CanvasSnapshotJson;
  min?: number;
  max?: number;
  options?: ImageProviderParameterOption[];
}

export interface ImageProviderCatalogItem {
  id: AnyImageProviderId;
  providerVersionId?: string;
  displayName: string;
  enabled: boolean;
  disabledReason?: string;
  requiresApiKey: boolean;
  defaultModel: string;
  models: ImageProviderModelOption[];
  supportedModes: ImageProviderMode[];
  supportsReferenceImages: boolean;
  maxReferenceImages: number;
  supportsMultipleOutputs: boolean;
  maxOutputs: number;
  defaultAspectRatio: ProjectAspectRatio;
  supportedAspectRatios: ProjectAspectRatio[];
  parameters: ImageProviderParameterDefinition[];
}

export interface ImageProviderCatalogResult {
  providers: ImageProviderCatalogItem[];
}

export type VideoProviderModelOption = ImageProviderModelOption;
export type VideoProviderParameterOption = ImageProviderParameterOption;
export type VideoProviderParameterDefinition = ImageProviderParameterDefinition;

export interface VideoProviderCatalogItem {
  id: AnyVideoProviderId;
  providerVersionId?: string;
  displayName: string;
  enabled: boolean;
  disabledReason?: string;
  requiresApiKey: boolean;
  defaultModel: string;
  models: VideoProviderModelOption[];
  supportedModes: VideoProviderMode[];
  supportsFirstFrame: boolean;
  supportsLastFrame: boolean;
  supportsReferenceImages: boolean;
  maxReferenceImages: number;
  supportsReferenceVideo?: boolean;
  maxReferenceVideos?: number;
  supportsReferenceAudio?: boolean;
  maxReferenceAudios?: number;
  supportsCancel: boolean;
  defaultDurationSeconds: number;
  supportedDurationSeconds: number[];
  defaultResolution: VideoProviderResolution;
  supportedResolutions: VideoProviderResolution[];
  defaultAspectRatio: ProjectAspectRatio;
  supportedAspectRatios: ProjectAspectRatio[];
  parameters: VideoProviderParameterDefinition[];
}

export interface VideoProviderCatalogResult {
  providers: VideoProviderCatalogItem[];
}

export interface ProviderCredentialUpdate {
  action: ProviderCredentialUpdateAction;
  value?: string;
}

export interface ProviderConfigParams {
  protocol?: ProviderProtocol;
  baseUrl?: string;
  imageRequestMode?: ProviderImageRequestMode;
  videoRequestMode?: ProviderVideoRequestMode;
  safeParams?: CanvasSnapshotJson;
}

export interface ProgrammableProviderCredentialDefinition {
  key: string;
  label: string;
  type: ProgrammableProviderCredentialInputType;
  required: boolean;
  placeholder?: string;
}

export interface ProgrammableProviderHttpRequestTemplate {
  method: ProgrammableProviderHttpMethod;
  url: string;
  headers?: Record<string, string>;
  bodyJson?: CanvasSnapshotJson;
  timeoutMs?: number;
  maxResponseBytes?: number;
}

export interface ProgrammableProviderOutputMapping {
  source: ProgrammableProviderOutputSource;
  path: string;
  mimeType?: string;
  widthPath?: string;
  heightPath?: string;
}

export interface ProgrammableProviderTaskMapping {
  idPath: string;
  statusPath?: string;
  succeededValues?: string[];
  failedValues?: string[];
  output?: ProgrammableProviderOutputMapping;
  errorPath?: string;
  pollRequest?: ProgrammableProviderHttpRequestTemplate;
  cancelRequest?: ProgrammableProviderHttpRequestTemplate;
}

export interface ProgrammableProviderActionManifest {
  request: ProgrammableProviderHttpRequestTemplate;
  output?: ProgrammableProviderOutputMapping;
  task?: ProgrammableProviderTaskMapping;
}

export interface ProgrammableProviderManifest {
  id: ProgrammableProviderId;
  kind: ManagedProviderKind;
  displayName: string;
  description?: string;
  credentials: ProgrammableProviderCredentialDefinition[];
  models: ImageProviderModelOption[];
  defaultModel: string;
  supportedModes: ImageProviderMode[] | VideoProviderMode[];
  defaultAspectRatio: ProjectAspectRatio;
  supportedAspectRatios: ProjectAspectRatio[];
  parameters: ImageProviderParameterDefinition[];
  image?: {
    supportsReferenceImages: boolean;
    maxReferenceImages: number;
    supportsMultipleOutputs: boolean;
    maxOutputs: number;
    action: ProgrammableProviderActionManifest;
  };
  video?: {
    supportsFirstFrame: boolean;
    supportsLastFrame: boolean;
    supportsReferenceImages: boolean;
    maxReferenceImages: number;
    supportsCancel: boolean;
    defaultDurationSeconds: number;
    supportedDurationSeconds: number[];
    defaultResolution: VideoProviderResolution;
    supportedResolutions: VideoProviderResolution[];
    action: ProgrammableProviderActionManifest;
  };
}

export interface ProgrammableProviderValidationDiagnostic {
  path: string;
  message: string;
}

export interface ProgrammableProviderVersionSummary {
  id: string;
  version: number;
  status: ProgrammableProviderVersionStatus;
  diagnostics: ProgrammableProviderValidationDiagnostic[];
  createdAt: string;
  active: boolean;
}

export interface ProgrammableProviderDefinitionSummary {
  id: string;
  kind: ManagedProviderKind;
  provider: ProgrammableProviderId;
  displayName: string;
  description?: string;
  activeVersionId?: string;
  versions: ProgrammableProviderVersionSummary[];
  enabled: boolean;
  credentialConfigured: boolean;
  lastTest?: ProviderConnectionTestSummary;
}

export interface ProgrammableProviderDefinitionResult {
  provider: ProgrammableProviderDefinitionSummary;
}

export interface CreateProgrammableProviderInput {
  sourceCode: string;
  credential?: ProviderCredentialUpdate;
}

export interface UpdateProgrammableProviderSourceInput {
  sourceCode: string;
}

export interface ActivateProgrammableProviderVersionInput {
  versionId: string;
}

export interface ProgrammableProviderRuntimeConfig {
  versionId: string;
  manifest: ProgrammableProviderManifest;
  credentials: Record<string, string>;
}

export interface UpdateProviderConfigInput {
  enabled?: boolean;
  defaultModel?: string;
  params?: ProviderConfigParams;
  credential?: ProviderCredentialUpdate;
}

export interface ProviderDiscoveryCredentialInput {
  source?: ProviderCredentialSource;
  value?: string;
}

export interface ProviderModelDiscoveryInput {
  kind: ManagedProviderKind;
  provider?: ManagedProviderId;
  protocol?: ProviderProtocol;
  baseUrl?: string;
  imageRequestMode?: ProviderImageRequestMode;
  videoRequestMode?: ProviderVideoRequestMode;
  credential?: ProviderDiscoveryCredentialInput;
}

export interface ProviderModelGroups {
  image: string[];
  video: string[];
  chat: string[];
}

export interface ProviderModelDiscoveryResult {
  ok: boolean;
  detectedProtocol?: ProviderProtocol;
  message: string;
  modelGroups: ProviderModelGroups;
  rawCount: number;
}

export interface ProviderConnectionTestInput {
  model?: string;
}

export interface ProviderConnectionTestSummary {
  status: ProviderTestStatus;
  testedAt?: string;
  model?: string;
  message?: string;
}

export interface ProviderManagementMetadata {
  configuredEnabled: boolean;
  credentialConfigured: boolean;
  credentialSource?: ProviderCredentialSource;
  configuredDefaultModel?: string;
  params?: ProviderConfigParams;
  lastTest?: ProviderConnectionTestSummary;
}

export type ImageProviderManagementItem = ImageProviderCatalogItem &
  ProviderManagementMetadata & {
    kind: "image";
  };

export type VideoProviderManagementItem = VideoProviderCatalogItem &
  ProviderManagementMetadata & {
    kind: "video";
  };

export type ProviderManagementItem = ImageProviderManagementItem | VideoProviderManagementItem;

export interface ProviderManagementResult {
  image: ImageProviderManagementItem[];
  video: VideoProviderManagementItem[];
}

export interface ProviderConfigUpdateResult {
  provider: ProviderManagementItem;
}

export interface ProviderConnectionTestResult {
  kind: ManagedProviderKind;
  provider: ManagedProviderId;
  status: Exclude<ProviderTestStatus, "untested">;
  testedAt: string;
  model: string;
  message: string;
  credentialConfigured: boolean;
}

export interface ProviderRuntimeConfig {
  kind: ManagedProviderKind;
  provider: ManagedProviderId;
  env: Record<string, string | undefined>;
  params?: ProviderConfigParams;
  programmableProvider?: ProgrammableProviderRuntimeConfig;
}

export interface WorkerProviderRuntimeConfigInput {
  projectId: string;
  kind: ManagedProviderKind;
  provider: ManagedProviderId;
}

export interface ImageGenerationSettings {
  provider?: AnyImageProviderId;
  model?: string;
  aspectRatio?: ProjectAspectRatio;
  count?: number;
  providerParams?: CanvasSnapshotJson;
}

export interface VideoGenerationSettings {
  videoProvider?: AnyVideoProviderId;
  videoModel?: string;
  videoAspectRatio?: ProjectAspectRatio;
  durationSeconds?: number;
  resolution?: VideoProviderResolution;
  referenceMedia?: VideoReferenceMediaInput[];
  videoProviderParams?: CanvasSnapshotJson;
}

export function normalizeUpdateProviderConfigInput(input: unknown): UpdateProviderConfigInput {
  const raw = dataObject(input);
  const credential = normalizeProviderCredentialUpdate(raw.credential);
  const params = normalizeProviderConfigParams(raw.params);
  return compactObject({
    enabled: typeof raw.enabled === "boolean" ? raw.enabled : undefined,
    defaultModel: optionalString(raw.defaultModel),
    params,
    credential,
  });
}

export function normalizeProviderConnectionTestInput(input: unknown): ProviderConnectionTestInput {
  const raw = dataObject(input);
  return compactObject({
    model: optionalString(raw.model),
  });
}

export function normalizeProviderModelDiscoveryInput(input: unknown): ProviderModelDiscoveryInput {
  const raw = dataObject(input);
  const kind = managedProviderKind(raw.kind) ?? "image";
  return compactObject({
    kind,
    provider: managedProviderId(kind, raw.provider),
    protocol: providerProtocol(raw.protocol),
    baseUrl: optionalString(raw.baseUrl),
    imageRequestMode: providerImageRequestMode(raw.imageRequestMode),
    videoRequestMode: providerVideoRequestMode(raw.videoRequestMode),
    credential: normalizeProviderDiscoveryCredential(raw.credential),
  });
}

export function managedProviderKind(value: unknown): ManagedProviderKind | undefined {
  return MANAGED_PROVIDER_KINDS.includes(value as ManagedProviderKind)
    ? (value as ManagedProviderKind)
    : undefined;
}

export function providerProtocol(value: unknown): ProviderProtocol | undefined {
  return PROVIDER_PROTOCOLS.includes(value as ProviderProtocol)
    ? (value as ProviderProtocol)
    : undefined;
}

export function providerImageRequestMode(value: unknown): ProviderImageRequestMode | undefined {
  return PROVIDER_IMAGE_REQUEST_MODES.includes(value as ProviderImageRequestMode)
    ? (value as ProviderImageRequestMode)
    : undefined;
}

export function providerVideoRequestMode(value: unknown): ProviderVideoRequestMode | undefined {
  return PROVIDER_VIDEO_REQUEST_MODES.includes(value as ProviderVideoRequestMode)
    ? (value as ProviderVideoRequestMode)
    : undefined;
}

export function programmableProviderId(value: unknown): ProgrammableProviderId | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (!/^custom:[a-z0-9][a-z0-9-]{1,62}$/.test(normalized)) {
    return undefined;
  }
  const builtinId = normalized.replace(/^custom:/, "");
  if (
    IMAGE_PROVIDER_IDS.includes(builtinId as ImageProviderId) ||
    VIDEO_PROVIDER_IDS.includes(builtinId as VideoProviderId)
  ) {
    return undefined;
  }
  return normalized as ProgrammableProviderId;
}

export function managedProviderId(kind: ManagedProviderKind, value: unknown): ManagedProviderId | undefined {
  if (kind === "image" && IMAGE_PROVIDER_IDS.includes(value as ImageProviderId)) {
    return value as ImageProviderId;
  }
  if (kind === "video" && VIDEO_PROVIDER_IDS.includes(value as VideoProviderId)) {
    return value as VideoProviderId;
  }
  return programmableProviderId(value);
}

export interface GenerationQueueSummary {
  counts: GenerationJobStatusCounts;
  queued: number;
  running: number;
  providerWaiting?: number;
  succeeded?: number;
  failed: number;
  cancelled?: number;
}

export interface GenerationJobRecord<TInput = unknown, TOutput = unknown> {
  id: string;
  projectId: string;
  operation: GenerationOperation;
  status: GenerationJobStatus;
  provider: string;
  model?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  providerTaskId?: string;
  inputJson: TInput;
  outputJson?: TOutput;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGenerationJobInput extends ImageGenerationSettings, VideoGenerationSettings {
  operation: Phase8GenerationOperation;
  sourceNodeId: string;
  refinementPrompt?: string;
  forceFailure?: boolean;
}

export interface CreateBatchImagesToVideosJobInput extends VideoGenerationSettings {
  operation: "batch_images_to_videos";
  sourceNodeIds: string[];
  forceFailure?: boolean;
}

export interface CreateBatchShotsToImagesJobInput extends ImageGenerationSettings {
  operation: "batch_shots_to_images";
  sourceNodeIds: string[];
  forceFailure?: boolean;
}

export interface CreateEditorExportInput {
  videoNodeIds: string[];
  sortMode: EditorExportSortMode;
  exportPreset?: EditorExportPreset;
  includeStoryboardCsv?: boolean;
  includeSubtitles?: boolean;
  sourceEditorExportId?: string;
  forceFailure?: boolean;
}

export interface CreateGenerationJobResult<TInput = GenerationJobInput> {
  job: GenerationJobRecord<TInput>;
  queueSummary: GenerationQueueSummary;
}

export interface BatchImagesToVideosSkippedNode {
  nodeId: string;
  reason: string;
}

export type BatchShotsToImagesSkippedNode = BatchImagesToVideosSkippedNode;

export interface CreateBatchImagesToVideosJobResult {
  jobs: Array<GenerationJobRecord<ImageToVideoJobInput>>;
  skipped: BatchImagesToVideosSkippedNode[];
  queueSummary: GenerationQueueSummary;
}

export interface CreateBatchShotsToImagesJobResult {
  jobs: Array<GenerationJobRecord<ShotToImageJobInput>>;
  skipped: BatchShotsToImagesSkippedNode[];
  queueSummary: GenerationQueueSummary;
}

export interface CreateEditorExportResult {
  export: EditorExportRecord;
  job: GenerationJobRecord<EditorExportJobInput>;
  queueSummary: GenerationQueueSummary;
}

export interface EditorExportListResult {
  exports: EditorExportRecord[];
}

export interface EditorExportDetailResult {
  export: EditorExportRecord;
}

export interface EditorExportDownloadResult {
  downloadUrl: string;
  packageAssetId: string;
}

export interface EditorExportSendResult {
  export: EditorExportRecord;
  sent: boolean;
  editorUrl?: string;
  errorMessage?: string;
}

export interface GenerationJobListResult<
  TInput = GenerationJobInput,
  TOutput = GeneratedMediaJobOutput | ReferenceAssetJobOutput,
> {
  jobs: Array<GenerationJobRecord<TInput, TOutput>>;
  queueSummary: GenerationQueueSummary;
}

export interface RetryGenerationJobResult<TInput = GenerationJobInput> {
  originalJob: GenerationJobRecord<TInput>;
  retryJob: GenerationJobRecord<TInput>;
  queueSummary: GenerationQueueSummary;
}

export interface ClaimGenerationJobResult<TInput = GenerationJobInput> {
  job?: GenerationJobRecord<TInput>;
}

export interface WorkerGenerationJobSucceedInput {
  providerOutput?: GeneratedMediaProviderOutput;
  providerOutputs?: GeneratedMediaProviderOutput[];
  packageOutput?: EditorExportPackageOutput;
  assetAnalysisOutput?: AssetAnalysisJobOutput;
}

export interface WorkerEditorExportJobSucceedInput {
  packageOutput: EditorExportPackageOutput;
}

export interface WorkerGenerationJobFailInput {
  error: ProviderFailure;
}

export interface WorkerGenerationJobWaitInput {
  providerTaskId: string;
  provider: string;
  model?: string;
  rawJson?: CanvasSnapshotJson;
}

export interface WorkerGenerationJobCancelInput {
  reason?: string;
  rawJson?: CanvasSnapshotJson;
}

export type GenerationJobInput =
  | NovelToStoryboardJobInput
  | AgentCanvasActionJobInput
  | AssetAnalysisJobInput
  | ShotToImageJobInput
  | CharacterToImageJobInput
  | LocationToImageJobInput
  | ImageRefinementJobInput
  | ImageToVideoJobInput
  | WorkflowRunJobInput
  | EditorExportJobInput;

export interface NovelToStoryboardJobInput {
  operation: "novel_to_storyboard";
  projectId: string;
  idea: string;
  mode: "novice" | "advanced" | "professional";
  audience?: string;
  stylePrompt?: string;
  targetDurationSeconds?: number;
  referenceAssetIds?: string[];
  referenceImageNodeIds?: string[];
  referencePrompt?: string;
  provider: string;
  model?: string;
  forceFailure?: boolean;
}

export const AGENT_CANVAS_ACTION_KINDS = [
  "create_node",
  "update_node",
  "create_edge",
] as const;
export type AgentCanvasActionKind = (typeof AGENT_CANVAS_ACTION_KINDS)[number];

export interface CreateAgentCanvasActionInput {
  message: string;
  selectedNodeId?: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  canvasX?: number;
  canvasY?: number;
}

export interface AgentCanvasActionJobInput extends CreateAgentCanvasActionInput {
  operation: "agent_canvas_action";
  projectId: string;
  provider: "local-agent";
  model: "deterministic-canvas-actions-v1";
  memoryIds?: string[];
  memorySummary?: string;
  skillTemplateIds?: string[];
  skillTemplateSummary?: string;
}

export interface AgentCanvasActionPreviousNodeSnapshot {
  nodeId: string;
  tldrawShapeId: string;
  type: CanvasNodeType;
  title?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  status: NodeStatus;
  dataJson: CanvasSnapshotJson;
}

export interface AgentCanvasActionCreatedNode {
  nodeId: string;
  type: Phase3CanvasNodeType;
  title?: string;
}

export interface AgentCanvasActionUpdatedNode {
  nodeId: string;
  title?: string;
  previous: AgentCanvasActionPreviousNodeSnapshot;
}

export interface AgentCanvasActionCreatedEdge {
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: CanvasEdgeRelation;
}

export interface AgentCanvasActionUndoMetadata {
  undoneAt: string;
  deletedNodeIds: string[];
  deletedEdgeIds: string[];
  restoredNodeIds: string[];
}

export interface AgentCanvasActionJobOutput {
  operation: "agent_canvas_action";
  actionKind: AgentCanvasActionKind;
  message: string;
  summary: string;
  createdNodes?: AgentCanvasActionCreatedNode[];
  updatedNodes?: AgentCanvasActionUpdatedNode[];
  createdEdges?: AgentCanvasActionCreatedEdge[];
  completedAt: string;
  undo?: AgentCanvasActionUndoMetadata;
}

export interface AssetAnalysisJobInput {
  operation: AssetAnalysisOperation;
  projectId: string;
  assetIds: string[];
  provider: "mock-vision" | string;
  model?: string;
  overwrite?: boolean;
  prompt?: string;
  forceFailure?: boolean;
}

export interface CreateAssetAnalysisJobInput {
  operation: AssetAnalysisOperation;
  assetIds: string[];
  provider?: string;
  model?: string;
  overwrite?: boolean;
  prompt?: string;
  forceFailure?: boolean;
}

export interface CreateAssetAnalysisJobResult {
  job: GenerationJobRecord<AssetAnalysisJobInput>;
  queueSummary: GenerationQueueSummary;
}

export interface AssetAnalysisItemOutput {
  assetId: string;
  caption?: string;
  classifications?: string[];
  skipped?: boolean;
  errorMessage?: string;
}

export interface AssetAnalysisJobOutput {
  operation: AssetAnalysisOperation;
  provider: string;
  model?: string;
  overwrite: boolean;
  results: AssetAnalysisItemOutput[];
  completedAt: string;
}

export interface CreateAgentCanvasActionResult {
  job: GenerationJobRecord<AgentCanvasActionJobInput, AgentCanvasActionJobOutput>;
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
  focusNodeId?: string;
}

export interface UndoAgentCanvasActionResult {
  job: GenerationJobRecord<AgentCanvasActionJobInput, AgentCanvasActionJobOutput>;
  restoredNodes: CanvasNodeRecord[];
  deletedNodeIds: string[];
  deletedEdgeIds: string[];
}

export interface ShotToImageJobInput {
  operation: "shot_to_image";
  projectId: string;
  sourceNodeId: string;
  shotNodeId: string;
  prompt: string;
  negativePrompt: string;
  referenceAssetIds: string[];
  sourceNodeIds: ShotPromptSourceNodeIds;
  debugParts: PromptDebugPart[];
  missingContext: PromptMissingContext[];
  provider: string;
  providerVersionId?: string;
  model?: string;
  aspectRatio?: ProjectAspectRatio;
  count?: number;
  providerParams?: CanvasSnapshotJson;
  generationSettings?: ResolvedGenerationSettings;
  omittedReferenceAssetIds?: string[];
  referenceOmissionReason?: string;
  forceFailure?: boolean;
}

export interface CharacterToImageJobInput {
  operation: "character_to_image";
  projectId: string;
  sourceNodeId: string;
  characterNodeId: string;
  prompt: string;
  referenceAssetIds: string[];
  sourceNodeIds: string[];
  provider: string;
  providerVersionId?: string;
  model?: string;
  aspectRatio?: ProjectAspectRatio;
  providerParams?: CanvasSnapshotJson;
  assetPurpose: "character_reference";
  forceFailure?: boolean;
}

export interface LocationToImageJobInput {
  operation: "location_to_image";
  projectId: string;
  sourceNodeId: string;
  locationNodeId: string;
  prompt: string;
  referenceAssetIds: string[];
  sourceNodeIds: string[];
  provider: string;
  providerVersionId?: string;
  model?: string;
  aspectRatio?: ProjectAspectRatio;
  providerParams?: CanvasSnapshotJson;
  assetPurpose: "location_reference";
  forceFailure?: boolean;
}

export interface ImageToVideoJobInput {
  operation: "image_to_video";
  projectId: string;
  sourceNodeId: string;
  imageNodeId: string;
  sourceImageAssetId: string;
  prompt: string;
  durationSeconds: number;
  aspectRatio?: ProjectAspectRatio;
  resolution?: VideoProviderResolution;
  parentShotNodeId?: string;
  parentShotTitle?: string;
  referenceAssetIds: string[];
  referenceMedia?: VideoReferenceMediaInput[];
  sourceNodeIds: string[];
  provider: string;
  providerVersionId?: string;
  model?: string;
  providerParams?: CanvasSnapshotJson;
  generationSettings?: ResolvedGenerationSettings;
  forceFailure?: boolean;
}

export interface WorkflowRunJobInput {
  operation: "workflow_run";
  projectId: string;
  workflowDefinitionId: string;
  workflowVersionId: string;
  workflowKind: WorkflowRunKind;
  provider: string;
  model?: string;
  sourceNodeId?: string;
  prompt?: string;
  outputKind: WorkflowOutputKind;
  fieldValues?: CanvasSnapshotJson;
  referenceAssetIds: string[];
  providerParams?: CanvasSnapshotJson;
  forceFailure?: boolean;
}

export interface ImageRefinementJobInput {
  operation: "image_refinement";
  projectId: string;
  sourceNodeId: string;
  imageNodeId: string;
  sourceImageAssetId: string;
  prompt: string;
  referenceAssetIds: string[];
  sourceNodeIds: string[];
  parentShotNodeId?: string;
  parentShotTitle?: string;
  provider: string;
  providerVersionId?: string;
  model?: string;
  aspectRatio?: ProjectAspectRatio;
  providerParams?: CanvasSnapshotJson;
  generationSettings?: ResolvedGenerationSettings;
  forceFailure?: boolean;
}

export interface BatchImagesToVideosJobInput {
  operation: "batch_images_to_videos";
  projectId: string;
  sourceNodeIds: string[];
  childJobIds: string[];
  provider: string;
  providerVersionId?: string;
  model?: string;
  durationSeconds?: number;
  aspectRatio?: ProjectAspectRatio;
  resolution?: VideoProviderResolution;
  providerParams?: CanvasSnapshotJson;
  generationSettings?: ResolvedGenerationSettings;
  forceFailure?: boolean;
}

export interface BatchShotsToImagesJobInput {
  operation: "batch_shots_to_images";
  projectId: string;
  sourceNodeIds: string[];
  childJobIds: string[];
  provider: string;
  providerVersionId?: string;
  model?: string;
  aspectRatio?: ProjectAspectRatio;
  count?: number;
  providerParams?: CanvasSnapshotJson;
  generationSettings?: ResolvedGenerationSettings;
  forceFailure?: boolean;
}

export interface EditorExportClipSource {
  videoNodeId: string;
  videoNodeTitle?: string;
  videoAssetId: string;
  storageKey?: string;
  mimeType?: string;
  filename: string;
  durationMs?: number;
  durationSeconds?: number;
  shotNodeId?: string;
  shotTitle?: string;
  shotNumber?: string;
  canvasX?: number;
  canvasY?: number;
  manualIndex?: number;
  generationSettings?: ResolvedGenerationSettings;
  packagingSettings?: ResolvedGenerationSettings;
  audioReferences?: EditorExportAudioReference[];
}

export interface EditorExportAudioReference {
  [key: string]: CanvasSnapshotJson | undefined;
  assetId: string;
  sourceNodeId: string;
  sourceNodeType?: "shot" | "video" | "character_asset";
  label?: string;
  role?: "voice" | "narration" | "sound_effect" | "bgm" | "clip_audio";
  mimeType?: string;
  durationMs?: number;
}

export interface EditorExportJobInput {
  operation: "editor_export";
  projectId: string;
  editorExportId: string;
  videoNodeIds: string[];
  sortMode: EditorExportSortMode;
  exportPreset: EditorExportPreset;
  includeStoryboardCsv: boolean;
  includeSubtitles: boolean;
  fps: 24 | 25 | 30;
  aspectRatio: ProjectAspectRatio;
  clips: EditorExportClipSource[];
  generationSettings?: ResolvedGenerationSettings;
  packagingReferences?: EditorExportPackagingReferences;
  sourceEditorExportId?: string;
  forceFailure?: boolean;
}

export interface TimelineManifest {
  version: "1.0";
  projectId: string;
  editorExportId: string;
  title: string;
  aspectRatio: ProjectAspectRatio;
  fps: 24 | 25 | 30;
  sortMode: EditorExportSortMode;
  exportPreset: EditorExportPreset;
  tracks: TimelineTrack[];
  assets: TimelineAsset[];
  metadata?: CanvasSnapshotJson;
}

export interface EditorExportPackagingReferences {
  [key: string]: CanvasSnapshotJson | undefined;
  project?: ResolvedGenerationSettings;
  subtitle?: GenerationPackagingReference;
  bgm?: GenerationPackagingReference;
  transition?: GenerationPackagingReference;
  stylePack?: GenerationPackagingReference;
  cover?: GenerationPackagingReference;
  poster?: GenerationPackagingReference;
  promo?: GenerationPackagingReference;
}

export interface TimelineTrack {
  id: string;
  type: "video" | "audio" | "subtitle" | "image";
  items: TimelineItem[];
}

export interface TimelineItem {
  id: string;
  assetId: string;
  sourceNodeId: string;
  startMs: number;
  durationMs: number;
  trimStartMs?: number;
  trimEndMs?: number;
  text?: string;
  metadata?: CanvasSnapshotJson;
}

export interface TimelineAsset {
  id: string;
  type: "video" | "image" | "audio" | "subtitle";
  url: string;
  localPath?: string;
  mimeType?: string;
  durationMs?: number;
  width?: number;
  height?: number;
}

export interface EditorExportStoryboardRow {
  index: number;
  filename: string;
  videoNodeId: string;
  videoNodeTitle?: string;
  assetId: string;
  shotNodeId?: string;
  shotTitle?: string;
  shotNumber?: string;
  durationMs?: number;
}

export interface EditorExportClipOutput {
  index: number;
  filename: string;
  videoNodeId: string;
  videoAssetId: string;
  durationMs: number;
  generationSettings?: ResolvedGenerationSettings;
  packagingSettings?: ResolvedGenerationSettings;
  audioReferences?: EditorExportAudioReference[];
}

export interface EditorExportPackageOutput {
  storageKey: string;
  mimeType: "application/zip";
  bytesBase64?: string;
  sizeBytes?: number;
  timeline: TimelineManifest;
  storyboardCsv: string;
  clips: EditorExportClipOutput[];
  rawJson?: CanvasSnapshotJson;
}

export interface EditorExportJobOutput {
  operation: "editor_export";
  editorExportId: string;
  packageAssetId: string;
  packageNodeId: string;
  edgeIds: string[];
  selectedVideoNodeIds: string[];
  sortMode: EditorExportSortMode;
  exportPreset: EditorExportPreset;
  sourceEditorExportId?: string;
  timeline: TimelineManifest;
  storyboardCsv: string;
  clips: EditorExportClipOutput[];
  completedAt: string;
  localEditor?: EditorExportLocalEditorResult;
}

export interface NovelToStoryboardJobOutput {
  operation: "novel_to_storyboard";
  novelDocumentId: string;
  storyboardDraftId: string;
  referenceAssetIds?: string[];
  referenceImageNodeIds?: string[];
  provider: string;
  model?: string;
  completedAt: string;
}

export interface EditorExportLocalEditorResult {
  attemptedAt: string;
  sent: boolean;
  editorUrl?: string;
  errorMessage?: string;
}

export interface EditorExportRecord<TTimeline = TimelineManifest | CanvasSnapshotJson> {
  id: string;
  projectId: string;
  packageAssetId?: string;
  status: EditorExportStatus;
  timelineJson: TTimeline;
  storyboardCsv?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedMediaProviderOutput {
  assetId?: string;
  storageKey: string;
  mimeType: string;
  provider: string;
  model: string;
  prompt: string;
  referenceAssetIds: string[];
  remoteUrl?: string;
  bytesBase64?: string;
  width?: number;
  height?: number;
  providerTaskId?: string;
  rawJson?: CanvasSnapshotJson;
}

export interface GeneratedMediaJobTargetOutput {
  targetNodeId: string;
  assetId: string;
  edgeId: string;
  providerOutput: GeneratedMediaProviderOutput;
}

export interface GeneratedMediaJobOutput {
  operation: "shot_to_image" | "image_refinement" | "image_to_video" | "workflow_run";
  sourceNodeId: string;
  targetNodeId: string;
  assetId: string;
  edgeId: string;
  provider: string;
  model: string;
  prompt: string;
  referenceAssetIds: string[];
  generationSettings?: ResolvedGenerationSettings;
  providerOutput: GeneratedMediaProviderOutput;
  targets?: GeneratedMediaJobTargetOutput[];
  completedAt: string;
}

export const GENERATION_EVENT_TYPES = [
  "job.created",
  "job.updated",
  "asset.created",
  "canvas.updated",
] as const;
export type GenerationEventType = (typeof GENERATION_EVENT_TYPES)[number];

export interface GenerationEvent {
  type: GenerationEventType;
  projectId: string;
  jobId?: string;
  assetId?: string;
  canvasDocumentId?: string;
  status?: GenerationJobStatus;
  updatedAt: string;
  payload?: CanvasSnapshotJson;
}

export interface ReferenceAssetJobOutput {
  operation: "character_to_image" | "location_to_image";
  sourceNodeId: string;
  assetId: string;
  provider: string;
  model: string;
  prompt: string;
  referenceAssetIds: string[];
  providerOutput: GeneratedMediaProviderOutput;
  completedAt: string;
}

export interface ProviderFailure {
  provider: string;
  code: string;
  message: string;
  retryable: boolean;
}

export interface VideoProviderTaskWaitingResult {
  status: "provider_waiting";
  provider: string;
  providerTaskId: string;
  rawJson?: CanvasSnapshotJson;
}

export interface VideoProviderTaskSucceededResult {
  status: "succeeded";
  provider: string;
  providerTaskId: string;
  output: GeneratedMediaProviderOutput;
  rawJson?: CanvasSnapshotJson;
}

export interface VideoProviderTaskFailedResult {
  status: "failed";
  provider: string;
  providerTaskId?: string;
  error: ProviderFailure;
  rawJson?: CanvasSnapshotJson;
}

export interface VideoProviderTaskCancelledResult {
  status: "cancelled";
  provider: string;
  providerTaskId: string;
  rawJson?: CanvasSnapshotJson;
}

export type VideoProviderTaskResult =
  | VideoProviderTaskWaitingResult
  | VideoProviderTaskSucceededResult
  | VideoProviderTaskFailedResult
  | VideoProviderTaskCancelledResult;

function compactSettings(settings: GenerationCreativeSettings): GenerationCreativeSettings {
  const compact: GenerationCreativeSettings = {};
  for (const key of GENERATION_CREATIVE_SETTING_KEYS) {
    const value = settings[key];
    if (hasGenerationSettingValue(value)) {
      compact[key] = value as never;
    }
  }
  return compact;
}

function resolveManualSetting<TField extends string, TManual extends Record<string, CanvasSnapshotJson | undefined>>(
  projectManual: TManual | undefined,
  shotManual: TManual | undefined,
  fields: readonly TField[],
): {
  value?: TManual;
  source?: GenerationSettingSource;
  fieldSources?: Partial<Record<TField, GenerationSettingSource>> & {
    [key: string]: CanvasSnapshotJson | undefined;
  };
} {
  const value: Record<string, CanvasSnapshotJson | undefined> = {};
  const fieldSources: Record<string, GenerationSettingSource> = {};

  for (const field of fields) {
    const shotValue = shotManual?.[field];
    if (hasGenerationSettingValue(shotValue)) {
      value[field] = shotValue;
      fieldSources[field] = "shot";
      continue;
    }

    const projectValue = projectManual?.[field];
    if (hasGenerationSettingValue(projectValue)) {
      value[field] = projectValue;
      fieldSources[field] = "project";
    }
  }

  if (!Object.keys(value).length) {
    return {};
  }

  const fieldSourceValues = Object.values(fieldSources);
  const source = fieldSourceValues.every((item) => item === "project") ? "project" : "shot";
  return {
    value: value as TManual,
    source,
    fieldSources: fieldSources as Partial<Record<TField, GenerationSettingSource>> & {
      [key: string]: CanvasSnapshotJson | undefined;
    },
  };
}

function hasGenerationSettingValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return Object.values(value).some((item) => item !== undefined && item !== "");
  }
  return value !== undefined;
}

function dataObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function projectAspectRatio(value: unknown): ProjectAspectRatio | undefined {
  return value === "9:16" || value === "16:9" || value === "1:1" ? value : undefined;
}

function continuityMode(value: unknown): GenerationContinuityMode | undefined {
  return GENERATION_CONTINUITY_MODES.includes(value as GenerationContinuityMode)
    ? (value as GenerationContinuityMode)
    : undefined;
}

function compactObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== ""),
  ) as T;
}

function compactOptionalObject<T extends Record<string, unknown>>(value: T): T | undefined {
  const compact = compactObject(value);
  return Object.keys(compact).length ? compact : undefined;
}

function normalizeProviderCredentialUpdate(input: unknown): ProviderCredentialUpdate | undefined {
  const raw = dataObject(input);
  const action = PROVIDER_CREDENTIAL_UPDATE_ACTIONS.includes(
    raw.action as ProviderCredentialUpdateAction,
  )
    ? (raw.action as ProviderCredentialUpdateAction)
    : undefined;
  if (!action || action === "unchanged") {
    return undefined;
  }

  if (action === "clear") {
    return { action };
  }

  const value = optionalString(raw.value);
  if (!value) {
    return undefined;
  }
  return { action, value };
}

function normalizeProviderConfigParams(input: unknown): ProviderConfigParams | undefined {
  const raw = dataObject(input);
  const params = compactObject({
    protocol: providerProtocol(raw.protocol),
    baseUrl: optionalString(raw.baseUrl),
    imageRequestMode: providerImageRequestMode(raw.imageRequestMode),
    videoRequestMode: providerVideoRequestMode(raw.videoRequestMode),
    safeParams: safeJsonObject(raw.safeParams),
  });
  return Object.keys(params).length ? params : undefined;
}

function normalizeProviderDiscoveryCredential(input: unknown): ProviderDiscoveryCredentialInput | undefined {
  const raw = dataObject(input);
  const source = PROVIDER_CREDENTIAL_SOURCES.includes(raw.source as ProviderCredentialSource)
    ? (raw.source as ProviderCredentialSource)
    : undefined;
  const value = optionalString(raw.value);
  const credential = compactObject({ source, value });
  return Object.keys(credential).length ? credential : undefined;
}

function safeJsonObject(input: unknown): CanvasSnapshotJson | undefined {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return undefined;
  }
  const entries = Object.entries(input as Record<string, unknown>).filter(([key, value]) => {
    const normalizedKey = key.toLowerCase();
    return (
      !normalizedKey.includes("key") &&
      !normalizedKey.includes("secret") &&
      !normalizedKey.includes("token") &&
      !normalizedKey.includes("authorization") &&
      value !== undefined
    );
  });
  return entries.length ? Object.fromEntries(entries) as CanvasSnapshotJson : undefined;
}
