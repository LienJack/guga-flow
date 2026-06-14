import type {
  ActivateWorkflowVersionInput,
  CanvasSnapshotJson,
  CreateWorkflowDefinitionInput,
  CreateWorkflowRunInput,
  CreateWorkflowVersionInput,
  WorkflowMapping,
  WorkflowOutputKind,
  WorkflowRunKind,
} from "@guga-flow/shared-types";
import {
  WORKFLOW_OUTPUT_KINDS,
  WORKFLOW_RUN_KINDS,
} from "@guga-flow/shared-types";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateWorkflowDefinitionDto implements CreateWorkflowDefinitionInput {
  @IsIn(WORKFLOW_RUN_KINDS)
  kind!: WorkflowRunKind;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  provider!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName!: string;

  @IsObject()
  sourceJson!: CanvasSnapshotJson;

  @IsObject()
  mappingJson!: WorkflowMapping;
}

export class CreateWorkflowVersionDto implements CreateWorkflowVersionInput {
  @IsObject()
  sourceJson!: CanvasSnapshotJson;

  @IsObject()
  mappingJson!: WorkflowMapping;
}

export class ActivateWorkflowVersionDto implements ActivateWorkflowVersionInput {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  versionId!: string;
}

export class CreateWorkflowRunDto implements CreateWorkflowRunInput {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  sourceNodeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  prompt?: string;

  @IsOptional()
  @IsObject()
  fieldValues?: CanvasSnapshotJson;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  referenceAssetIds?: string[];

  @IsOptional()
  @IsIn(WORKFLOW_OUTPUT_KINDS)
  outputKind?: WorkflowOutputKind;

  @IsOptional()
  @IsBoolean()
  forceFailure?: boolean;
}
