export declare const GENERATION_JOB_STATUSES: readonly ["queued", "running", "provider_waiting", "succeeded", "failed", "cancelled"];
export type GenerationJobStatus = (typeof GENERATION_JOB_STATUSES)[number];
export declare const GENERATION_OPERATIONS: readonly ["novel_to_storyboard", "shot_to_image", "character_to_image", "location_to_image", "image_to_video", "shot_to_video", "batch_shots_to_images", "batch_images_to_videos", "editor_export"];
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
//# sourceMappingURL=generation.d.ts.map