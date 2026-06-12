import type {
  CreateGenerationJobInput,
  CanvasSnapshotJson,
  GeneratedMediaProviderOutput,
  ImageProviderId,
  Phase8GenerationOperation,
  ProjectAspectRatio,
  ProviderFailure,
  VideoProviderId,
  VideoProviderResolution,
  WorkerGenerationJobFailInput,
  WorkerGenerationJobSucceedInput,
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

export class WorkerGenerationJobFailDto implements WorkerGenerationJobFailInput {
  @IsObject()
  error!: ProviderFailure;
}

export class WorkerGenerationJobSucceedDto implements WorkerGenerationJobSucceedInput {
  @IsObject()
  providerOutput!: GeneratedMediaProviderOutput;

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  providerOutputs?: GeneratedMediaProviderOutput[];
}
