import { IsString, MaxLength, MinLength } from "class-validator";
import type {
  ActivateSkillTemplateVersionInput,
  UpdateSkillTemplateSourceInput,
} from "@guga-flow/shared-types";

export class UpdateSkillTemplateSourceDto implements UpdateSkillTemplateSourceInput {
  @IsString()
  @MinLength(1)
  @MaxLength(20_000)
  sourceText!: string;
}

export class ActivateSkillTemplateVersionDto implements ActivateSkillTemplateVersionInput {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  versionId!: string;
}
