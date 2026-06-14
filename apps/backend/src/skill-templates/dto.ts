import { Transform } from "class-transformer";
import { IsArray, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import type {
  ActivateSkillTemplateVersionInput,
  ListSkillTemplatesInput,
  UpdateSkillTemplateSourceInput,
} from "@guga-flow/shared-types";
import {
  AGENT_DEPLOYMENT_ROLES,
  SKILL_TEMPLATE_PRESET_CATEGORIES,
  SKILL_TEMPLATE_TRIGGER_MODES,
} from "@guga-flow/shared-types";

export class ListSkillTemplatesDto implements ListSkillTemplatesInput {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  query?: string;

  @IsOptional()
  @IsIn(SKILL_TEMPLATE_PRESET_CATEGORIES)
  category?: ListSkillTemplatesInput["category"];

  @IsOptional()
  @IsIn(SKILL_TEMPLATE_TRIGGER_MODES)
  triggerMode?: ListSkillTemplatesInput["triggerMode"];

  @IsOptional()
  @IsIn(AGENT_DEPLOYMENT_ROLES)
  agentRole?: ListSkillTemplatesInput["agentRole"];

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value;
    }
    return typeof value === "string" && value.trim() ? value.split(",") : undefined;
  })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  templateIds?: string[];
}

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
