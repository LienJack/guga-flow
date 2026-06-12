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

export interface ProviderFailure {
  provider: string;
  code: string;
  message: string;
  retryable: boolean;
}
