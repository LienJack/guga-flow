import type {
  CanvasEdgeRelation,
  CanvasSnapshotJson,
  CreateCanvasEdgeInput,
  CreateCanvasNodeInput,
  ExportCanvasFragmentInput,
  ImportCanvasFragmentInput,
  ImportStoryboardToCanvasInput,
  NodeStatus,
  Phase3CanvasNodeType,
  StoryboardImportDuplicatePolicy,
  UpdateCanvasNodeGeometryInput,
  UpdateCanvasNodeInput,
} from "@guga-flow/shared-types";
import {
  CANVAS_EDGE_RELATIONS,
  NODE_STATUSES,
  PHASE_3_CANVAS_NODE_TYPES,
  STORYBOARD_IMPORT_DUPLICATE_POLICIES,
} from "@guga-flow/shared-types";
import { Type } from "class-transformer";
import {
  ArrayUnique,
  IsDefined,
  IsIn,
  IsInt,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class SaveCanvasSnapshotDto {
  @IsDefined()
  snapshotJson!: CanvasSnapshotJson;
}

export class CreateCanvasNodeDto implements CreateCanvasNodeInput {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  tldrawShapeId!: string;

  @IsIn(PHASE_3_CANVAS_NODE_TYPES)
  type!: Phase3CanvasNodeType;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  x?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  y?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(1)
  width?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(1)
  height?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  zIndex?: number;

  @IsOptional()
  @IsIn(NODE_STATUSES)
  status?: NodeStatus;

  @IsOptional()
  dataJson?: CanvasSnapshotJson;
}

export class CreateCanvasEdgeDto implements CreateCanvasEdgeInput {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  sourceNodeId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  targetNodeId!: string;

  @IsIn(CANVAS_EDGE_RELATIONS)
  relation!: CanvasEdgeRelation;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  sourceShapeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  targetShapeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  visualArrowShapeId?: string;

  @IsOptional()
  dataJson?: CanvasSnapshotJson;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  affectedShotNodeIds?: string[];
}

export class UpdateCanvasNodeDto implements UpdateCanvasNodeInput {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsIn(NODE_STATUSES)
  status?: NodeStatus;

  @IsOptional()
  dataJson?: CanvasSnapshotJson;
}

export class UpdateCanvasNodeGeometryDto implements UpdateCanvasNodeGeometryInput {
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  x!: number;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  y!: number;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(1)
  width!: number;

  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false })
  @Min(1)
  height!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  zIndex?: number;
}

export class ImportStoryboardToCanvasDto implements ImportStoryboardToCanvasInput {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  novelDocumentId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  storyboardDraftId!: string;

  @IsOptional()
  @IsIn(STORYBOARD_IMPORT_DUPLICATE_POLICIES)
  duplicatePolicy?: StoryboardImportDuplicatePolicy;
}

export class ExportCanvasFragmentDto implements ExportCanvasFragmentInput {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  nodeIds!: string[];
}

export class ImportCanvasFragmentDto implements ImportCanvasFragmentInput {
  @IsDefined()
  manifest!: ImportCanvasFragmentInput["manifest"];
}
