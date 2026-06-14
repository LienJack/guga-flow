import {
  PROJECT_ASPECT_RATIOS,
  type GenerationCreativeSettings,
  type ImportProjectPackageInput,
  type ProjectAspectRatio,
} from "@guga-flow/shared-types";
import { IsDefined, IsIn, IsObject, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class CreateProjectDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsIn(PROJECT_ASPECT_RATIOS)
  defaultAspectRatio?: ProjectAspectRatio;

  @IsOptional()
  @IsObject()
  generationSettings?: GenerationCreativeSettings;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsIn(PROJECT_ASPECT_RATIOS)
  defaultAspectRatio?: ProjectAspectRatio;

  @IsOptional()
  @IsObject()
  generationSettings?: GenerationCreativeSettings;
}

export class ImportProjectPackageDto implements ImportProjectPackageInput {
  @IsDefined()
  package!: ImportProjectPackageInput["package"];
}
