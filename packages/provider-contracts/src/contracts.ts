import type {
  CanvasSnapshotJson,
  ProjectAspectRatio,
  StoryboardResult,
  VideoProviderMode,
  VideoProviderResolution,
  VideoProviderTaskStatus,
} from "@guga-flow/shared-types";

export interface ProviderCapability {
  id: string;
  displayName: string;
  requiresApiKey: boolean;
}

export interface ProviderErrorShape {
  provider: string;
  code: string;
  message: string;
  retryable: boolean;
}

export class ProviderError extends Error {
  readonly provider: string;
  readonly code: string;
  readonly retryable: boolean;

  constructor(input: ProviderErrorShape) {
    super(input.message);
    this.name = "ProviderError";
    this.provider = input.provider;
    this.code = input.code;
    this.retryable = input.retryable;
  }

  toJSON(): ProviderErrorShape {
    return {
      provider: this.provider,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
    };
  }
}

export interface NovelToStoryboardInput {
  projectId: string;
  title?: string;
  novelText: string;
  forceFailure?: boolean;
}

export interface ImageGenerationInput {
  projectId: string;
  prompt: string;
  negativePrompt?: string;
  model?: string;
  aspectRatio?: ProjectAspectRatio;
  count?: number;
  referenceAssetIds?: string[];
  providerParams?: CanvasSnapshotJson;
  forceFailure?: boolean;
}

export interface VideoGenerationInput {
  projectId: string;
  prompt: string;
  mode?: VideoProviderMode;
  model?: string;
  sourceImageAssetId?: string;
  firstFrameAssetId?: string;
  lastFrameAssetId?: string;
  durationSec?: number;
  aspectRatio?: ProjectAspectRatio;
  resolution?: VideoProviderResolution;
  referenceAssetIds?: string[];
  providerParams?: CanvasSnapshotJson;
  forceFailure?: boolean;
}

export interface EditorPackageInput {
  projectId: string;
  videoAssetIds: string[];
  forceFailure?: boolean;
}

export interface ImageProviderOutput {
  assetId: string;
  storageKey: string;
  mimeType: string;
  provider: string;
  model: string;
  prompt?: string;
  referenceAssetIds: string[];
  remoteUrl?: string;
  bytesBase64?: string;
  width?: number;
  height?: number;
  providerTaskId?: string;
  rawJson?: CanvasSnapshotJson;
}

export interface ImageProviderResult {
  outputs: ImageProviderOutput[];
}

export interface MockAssetOutput extends ImageProviderOutput {}

export interface VideoProviderTaskResult {
  status: VideoProviderTaskStatus;
  providerTaskId: string;
  output?: MockAssetOutput;
  error?: ProviderErrorShape;
  rawJson?: CanvasSnapshotJson;
}

export interface MockEditorPackageOutput {
  packageAssetId: string;
  manifestAssetId: string;
  videoAssetIds: string[];
}

export interface LlmProvider {
  capability: ProviderCapability;
  generateStoryboard(input: NovelToStoryboardInput): Promise<StoryboardResult>;
}

export interface ImageProvider {
  capability: ProviderCapability;
  generateImage(input: ImageGenerationInput): Promise<ImageProviderResult>;
}

export interface VideoProvider {
  capability: ProviderCapability;
  createTask(input: VideoGenerationInput): Promise<VideoProviderTaskResult>;
  getTask(providerTaskId: string): Promise<VideoProviderTaskResult>;
  cancelTask(providerTaskId: string): Promise<VideoProviderTaskResult>;
  generateVideo(input: VideoGenerationInput): Promise<MockAssetOutput>;
}

export interface EditorProvider {
  capability: ProviderCapability;
  createPackage(input: EditorPackageInput): Promise<MockEditorPackageOutput>;
}

export interface ProviderRegistry {
  llm: LlmProvider;
  image: ImageProvider;
  video: VideoProvider;
  editor: EditorProvider;
}
