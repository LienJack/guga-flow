import type {
  CreateGenerationJobInput,
  CreateBatchImagesToVideosJobInput,
  CreateBatchShotsToImagesJobInput,
  CanvasSnapshotJson,
  EditorExportPackageOutput,
  GeneratedMediaProviderOutput,
  ImageProviderId,
  Phase8GenerationOperation,
  ProjectAspectRatio,
  ProviderFailure,
  VideoProviderId,
  VideoProviderResolution,
  WorkerGenerationJobFailInput,
  WorkerGenerationJobSucceedInput,
  WorkerGenerationJobWaitInput,
} from "@guga-flow/shared-types";
import {
  IMAGE_PROVIDER_IDS,
  PHASE_8_GENERATION_OPERATIONS,
  PROJECT_ASPECT_RATIOS,
  VIDEO_PROVIDER_IDS,
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
  @IsIn(IMAGE_PROVIDER_IDS)
  @MaxLength(80)
  provider?: ImageProviderId;

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

  @IsOptional()
  @IsIn(VIDEO_PROVIDER_IDS)
  @MaxLength(80)
  videoProvider?: VideoProviderId;

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
  @IsObject()
  videoProviderParams?: CanvasSnapshotJson;
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
  @IsIn(VIDEO_PROVIDER_IDS)
  @MaxLength(80)
  videoProvider?: VideoProviderId;

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
  @IsIn(IMAGE_PROVIDER_IDS)
  @MaxLength(80)
  provider?: ImageProviderId;

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
}
