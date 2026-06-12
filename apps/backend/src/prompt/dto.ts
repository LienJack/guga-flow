import { IsOptional, IsString, MaxLength } from "class-validator";

export class ComposeShotPromptDto {
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  globalStylePrompt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  modelPromptSuffix?: string;
}
