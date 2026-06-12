import type { CanvasSnapshotJson } from "./canvas";
import type { PromptDebugPart, PromptMissingContext, ShotPromptSourceNodeIds } from "./prompt-composer";

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

export type GenerationJobStatusCounts = Record<GenerationJobStatus, number>;

export interface GenerationQueueSummary {
  counts: GenerationJobStatusCounts;
  queued: number;
  running: number;
  failed: number;
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

export interface CreateGenerationJobInput {
  operation: Phase8GenerationOperation;
  sourceNodeId: string;
  forceFailure?: boolean;
}

export interface CreateGenerationJobResult<TInput = GenerationJobInput> {
  job: GenerationJobRecord<TInput>;
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
}

export interface WorkerGenerationJobFailInput {
  error: ProviderFailure;
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
  providerParams?: CanvasSnapshotJson;
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
  parentShotNodeId?: string;
  parentShotTitle?: string;
  referenceAssetIds: string[];
  sourceNodeIds: string[];
  provider: string;
  model?: string;
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
  completedAt: string;
}

export interface ProviderFailure {
  provider: string;
  code: string;
  message: string;
  retryable: boolean;
}
