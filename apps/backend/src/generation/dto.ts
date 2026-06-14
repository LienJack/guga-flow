import type {
  AiTextGenerationJobOutput,
  AnyAudioProviderId,
  AnyLlmProviderId,
  CreateGenerationJobInput,
  CreateAssetAnalysisJobInput,
  CreateBatchImagesToVideosJobInput,
  CreateBatchShotsToImagesJobInput,
  AnyImageProviderId,
  AnyVideoProviderId,
  AssetAnalysisJobOutput,
  CanvasSnapshotJson,
  EditorExportPackageOutput,
  GeneratedMediaProviderOutput,
  Phase8GenerationOperation,
  ProjectAspectRatio,
  ProviderFailure,
  VideoReferenceMediaInput,
  VideoProviderResolution,
  WorkerProviderRuntimeConfigInput,
  WorkerGenerationJobFailInput,
  WorkerGenerationJobSucceedInput,
  WorkerGenerationJobWaitInput,
} from "@guga-flow/shared-types";
import {
  MANAGED_PROVIDER_KINDS,
  PHASE_8_GENERATION_OPERATIONS,
  PROJECT_ASPECT_RATIOS,
  VIDEO_PROVIDER_RESOLUTIONS,
} from "@guga-flow/shared-types";
import {
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateGenerationJobDto implements CreateGenerationJobInput {
  @IsIn(PHASE_8_GENERATION_OPERATIONS)
  operation!: Phase8GenerationOperation;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  sourceNodeId!: string;

  @IsOptional()
  @IsBoolean()
  forceFailure?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  refinementPrompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  textPrompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  audioPrompt?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  skillTemplateIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  provider?: AnyImageProviderId;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  llmProvider?: AnyLlmProviderId;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  llmModel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  audioProvider?: AnyAudioProviderId;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  audioModel?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(900)
  audioDurationSeconds?: number;

  @IsOptional()
  @IsObject()
  audioProviderParams?: CanvasSnapshotJson;

  @IsOptional()
  @IsIn(PROJECT_ASPECT_RATIOS)
  aspectRatio?: ProjectAspectRatio;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  count?: number;

  @IsOptional()
  @IsObject()
  providerParams?: CanvasSnapshotJson;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  videoProvider?: AnyVideoProviderId;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  videoModel?: string;

  @IsOptional()
  @IsIn(PROJECT_ASPECT_RATIOS)
  videoAspectRatio?: ProjectAspectRatio;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(15)
  durationSeconds?: number;

  @IsOptional()
  @IsIn(VIDEO_PROVIDER_RESOLUTIONS)
  resolution?: VideoProviderResolution;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  referenceMedia?: VideoReferenceMediaInput[];

  @IsOptional()
  @IsObject()
  videoProviderParams?: CanvasSnapshotJson;
}

export class CreateAssetAnalysisJobDto implements CreateAssetAnalysisJobInput {
  @IsIn(["asset_caption", "asset_classification"])
  operation!: CreateAssetAnalysisJobInput["operation"];

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  assetIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(80)
  provider?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsBoolean()
  overwrite?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  prompt?: string;

  @IsOptional()
  @IsBoolean()
  forceFailure?: boolean;
}

export class CreateBatchImagesToVideosJobDto implements CreateBatchImagesToVideosJobInput {
  @IsIn(["batch_images_to_videos"])
  operation!: "batch_images_to_videos";

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  sourceNodeIds!: string[];

  @IsOptional()
  @IsBoolean()
  forceFailure?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  videoProvider?: AnyVideoProviderId;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  videoModel?: string;

  @IsOptional()
  @IsIn(PROJECT_ASPECT_RATIOS)
  videoAspectRatio?: ProjectAspectRatio;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(15)
  durationSeconds?: number;

  @IsOptional()
  @IsIn(VIDEO_PROVIDER_RESOLUTIONS)
  resolution?: VideoProviderResolution;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  referenceMedia?: VideoReferenceMediaInput[];

  @IsOptional()
  @IsObject()
  videoProviderParams?: CanvasSnapshotJson;
}

export class CreateBatchShotsToImagesJobDto implements CreateBatchShotsToImagesJobInput {
  @IsIn(["batch_shots_to_images"])
  operation!: "batch_shots_to_images";

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  sourceNodeIds!: string[];

  @IsOptional()
  @IsBoolean()
  forceFailure?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  provider?: AnyImageProviderId;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsIn(PROJECT_ASPECT_RATIOS)
  aspectRatio?: ProjectAspectRatio;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  count?: number;

  @IsOptional()
  @IsObject()
  providerParams?: CanvasSnapshotJson;
}

export class WorkerGenerationJobFailDto implements WorkerGenerationJobFailInput {
  @IsObject()
  error!: ProviderFailure;
}

export class WorkerGenerationJobWaitDto implements WorkerGenerationJobWaitInput {
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  providerTaskId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  provider!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsObject()
  rawJson?: CanvasSnapshotJson;
}

export class WorkerGenerationJobSucceedDto implements WorkerGenerationJobSucceedInput {
  @IsOptional()
  @IsObject()
  providerOutput?: GeneratedMediaProviderOutput;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  providerOutputs?: GeneratedMediaProviderOutput[];

  @IsOptional()
  @IsObject()
  packageOutput?: EditorExportPackageOutput;

  @IsOptional()
  @IsObject()
  assetAnalysisOutput?: AssetAnalysisJobOutput;

  @IsOptional()
  @IsObject()
  textGenerationOutput?: AiTextGenerationJobOutput;
}

export class WorkerProviderRuntimeConfigDto implements WorkerProviderRuntimeConfigInput {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  projectId!: string;

  @IsIn(MANAGED_PROVIDER_KINDS)
  kind!: WorkerProviderRuntimeConfigInput["kind"];

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  provider!: WorkerProviderRuntimeConfigInput["provider"];
}
