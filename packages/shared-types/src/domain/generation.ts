import type { CanvasSnapshotJson } from "./canvas";
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
  "shot_to_image",
  "character_to_image",
  "location_to_image",
  "image_to_video",
  "shot_to_video",
  "batch_shots_to_images",
  "batch_images_to_videos",
  "editor_export",
] as const;
export type GenerationOperation = (typeof GENERATION_OPERATIONS)[number];

export const PHASE_8_GENERATION_OPERATIONS = ["shot_to_image", "image_to_video"] as const;
export type Phase8GenerationOperation = (typeof PHASE_8_GENERATION_OPERATIONS)[number];

export const IMAGE_PROVIDER_IDS = ["mock-image", "image2", "banana"] as const;
export type ImageProviderId = (typeof IMAGE_PROVIDER_IDS)[number];

export const IMAGE_PROVIDER_MODES = ["text_to_image", "image_to_image", "multi_reference"] as const;
export type ImageProviderMode = (typeof IMAGE_PROVIDER_MODES)[number];

export const VIDEO_PROVIDER_IDS = ["mock-video", "seedance", "happyhorse"] as const;
export type VideoProviderId = (typeof VIDEO_PROVIDER_IDS)[number];

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

export type GenerationJobStatusCounts = Record<GenerationJobStatus, number>;

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
  id: ImageProviderId;
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
  id: VideoProviderId;
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

export interface ImageGenerationSettings {
  provider?: ImageProviderId;
  model?: string;
  aspectRatio?: ProjectAspectRatio;
  count?: number;
  providerParams?: CanvasSnapshotJson;
}

export interface VideoGenerationSettings {
  videoProvider?: VideoProviderId;
  videoModel?: string;
  videoAspectRatio?: ProjectAspectRatio;
  durationSeconds?: number;
  resolution?: VideoProviderResolution;
  videoProviderParams?: CanvasSnapshotJson;
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
  forceFailure?: boolean;
}

export interface CreateBatchImagesToVideosJobInput extends VideoGenerationSettings {
  operation: "batch_images_to_videos";
  sourceNodeIds: string[];
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

export interface CreateBatchImagesToVideosJobResult {
  jobs: Array<GenerationJobRecord<ImageToVideoJobInput>>;
  skipped: BatchImagesToVideosSkippedNode[];
  queueSummary: GenerationQueueSummary;
}

export interface GenerationJobListResult<TInput = GenerationJobInput, TOutput = GeneratedMediaJobOutput> {
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
  providerOutput: GeneratedMediaProviderOutput;
  providerOutputs?: GeneratedMediaProviderOutput[];
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

export type GenerationJobInput = ShotToImageJobInput | ImageToVideoJobInput;

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
  model?: string;
  aspectRatio?: ProjectAspectRatio;
  count?: number;
  providerParams?: CanvasSnapshotJson;
  omittedReferenceAssetIds?: string[];
  referenceOmissionReason?: string;
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
  sourceNodeIds: string[];
  provider: string;
  model?: string;
  providerParams?: CanvasSnapshotJson;
  forceFailure?: boolean;
}

export interface BatchImagesToVideosJobInput {
  operation: "batch_images_to_videos";
  projectId: string;
  sourceNodeIds: string[];
  childJobIds: string[];
  provider: string;
  model?: string;
  durationSeconds?: number;
  aspectRatio?: ProjectAspectRatio;
  resolution?: VideoProviderResolution;
  providerParams?: CanvasSnapshotJson;
  forceFailure?: boolean;
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
  operation: Phase8GenerationOperation;
  sourceNodeId: string;
  targetNodeId: string;
  assetId: string;
  edgeId: string;
  provider: string;
  model: string;
  prompt: string;
  referenceAssetIds: string[];
  providerOutput: GeneratedMediaProviderOutput;
  targets?: GeneratedMediaJobTargetOutput[];
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
