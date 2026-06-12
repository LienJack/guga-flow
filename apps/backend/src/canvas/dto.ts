import type {
  CanvasSnapshotJson,
  CreateCanvasNodeInput,
  NodeStatus,
  Phase3CanvasNodeType,
  UpdateCanvasNodeGeometryInput,
  UpdateCanvasNodeInput,
} from "@guga-flow/shared-types";
import { NODE_STATUSES, PHASE_3_CANVAS_NODE_TYPES } from "@guga-flow/shared-types";
import { Type } from "class-transformer";
import {
  IsDefined,
  IsIn,
  IsInt,
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
