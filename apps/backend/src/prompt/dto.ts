import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength } from "class-validator";

export class ComposeShotPromptDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  globalStylePrompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  modelPromptSuffix?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  skillTemplateIds?: string[];
}
