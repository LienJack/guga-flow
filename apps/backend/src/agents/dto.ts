import type {
  ClearAgentMemoriesInput,
  CreateAgentCanvasActionInput,
  CreateAgentSessionInput,
  CreateAgentMemoryInput,
  CreateProductionAgentActionInput,
  LlmProviderId,
  RecallAgentMemoriesInput,
  ResolveAgentRoleInput,
  UpdateAgentDeploymentInput,
  UpdateAgentMemoryInput,
} from "@guga-flow/shared-types";
import {
  AGENT_DEPLOYMENT_MODES,
  AGENT_DEPLOYMENT_ROLES,
  AGENT_MEMORY_SCOPES,
  AGENT_MEMORY_SOURCES,
  AGENT_MEMORY_TYPES,
  LLM_PROVIDER_IDS,
  PRODUCTION_AGENT_ACTION_KINDS,
  STREAMING_AGENT_ROLES,
} from "@guga-flow/shared-types";
import {
  ArrayUnique,
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
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";

export class AgentRoleModelConfigDto {
  @IsOptional()
  @IsIn(LLM_PROVIDER_IDS)
  provider?: LlmProviderId;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200000)
  maxOutputTokens?: number;

  @IsOptional()
  @IsBoolean()
  inherit?: boolean;
}

export class CreateAgentCanvasActionDto implements CreateAgentCanvasActionInput {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;

  @IsOptional()
  @IsIn(AGENT_DEPLOYMENT_ROLES)
  role?: CreateAgentCanvasActionInput["role"];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  selectedNodeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  sourceNodeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  targetNodeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  canvasX?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  canvasY?: number;
}

export class CreateProductionAgentActionDto implements CreateProductionAgentActionInput {
  @IsIn(PRODUCTION_AGENT_ACTION_KINDS)
  action!: CreateProductionAgentActionInput["action"];

  @IsOptional()
  @IsIn(AGENT_DEPLOYMENT_ROLES)
  role?: CreateProductionAgentActionInput["role"];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  itemIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(6)
  columns?: number;
}

export class CreateAgentSessionDto implements CreateAgentSessionInput {
  @IsIn(STREAMING_AGENT_ROLES)
  role!: CreateAgentSessionInput["role"];

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  selectedNodeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  sourceNodeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  targetNodeId?: string;
}

export class UpdateAgentDeploymentDto implements UpdateAgentDeploymentInput {
  @IsOptional()
  @IsIn(AGENT_DEPLOYMENT_MODES)
  mode?: UpdateAgentDeploymentInput["mode"];

  @IsOptional()
  @IsObject()
  primary?: UpdateAgentDeploymentInput["primary"];

  @IsOptional()
  @IsObject()
  roles?: UpdateAgentDeploymentInput["roles"];
}

export class ResolveAgentRoleDto implements ResolveAgentRoleInput {
  @IsIn(AGENT_DEPLOYMENT_ROLES)
  role!: ResolveAgentRoleInput["role"];
}

export class CreateAgentMemoryDto implements CreateAgentMemoryInput {
  @IsOptional()
  @IsIn(AGENT_MEMORY_SCOPES)
  scope?: CreateAgentMemoryInput["scope"];

  @IsOptional()
  @IsIn(AGENT_MEMORY_TYPES)
  type?: CreateAgentMemoryInput["type"];

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(AGENT_DEPLOYMENT_ROLES)
  agentRole?: CreateAgentMemoryInput["agentRole"];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  contextNodeId?: string;

  @IsOptional()
  @IsIn(AGENT_MEMORY_SOURCES)
  source?: CreateAgentMemoryInput["source"];

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateAgentMemoryDto implements UpdateAgentMemoryInput {
  @IsOptional()
  @IsIn(AGENT_MEMORY_TYPES)
  type?: UpdateAgentMemoryInput["type"];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(AGENT_DEPLOYMENT_ROLES)
  agentRole?: UpdateAgentMemoryInput["agentRole"];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  contextNodeId?: string;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class RecallAgentMemoriesDto implements RecallAgentMemoriesInput {
  @IsString()
  @MaxLength(1000)
  query!: string;

  @IsOptional()
  @IsIn(AGENT_DEPLOYMENT_ROLES)
  role?: RecallAgentMemoriesInput["role"];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  contextNodeId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(4000)
  tokenBudget?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(1)
  @Max(20)
  limit?: number;
}

export class ClearAgentMemoriesDto implements ClearAgentMemoriesInput {
  @IsOptional()
  @IsBoolean()
  includeDisabled?: boolean;
}
