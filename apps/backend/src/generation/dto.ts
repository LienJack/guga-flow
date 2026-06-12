import type {
  CreateGenerationJobInput,
  GeneratedMediaProviderOutput,
  Phase8GenerationOperation,
  ProviderFailure,
  WorkerGenerationJobFailInput,
  WorkerGenerationJobSucceedInput,
} from "@guga-flow/shared-types";
import { PHASE_8_GENERATION_OPERATIONS } from "@guga-flow/shared-types";
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

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
}

export class WorkerGenerationJobFailDto implements WorkerGenerationJobFailInput {
  @IsObject()
  error!: ProviderFailure;
}

export class WorkerGenerationJobSucceedDto implements WorkerGenerationJobSucceedInput {
  @IsObject()
  providerOutput!: GeneratedMediaProviderOutput;
}
