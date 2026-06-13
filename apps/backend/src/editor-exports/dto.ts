import type { CreateEditorExportInput, EditorExportPreset, EditorExportSortMode } from "@guga-flow/shared-types";
import { EDITOR_EXPORT_PRESETS, EDITOR_EXPORT_SORT_MODES } from "@guga-flow/shared-types";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateEditorExportDto implements CreateEditorExportInput {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  videoNodeIds!: string[];

  @IsIn(EDITOR_EXPORT_SORT_MODES)
  sortMode!: EditorExportSortMode;

  @IsOptional()
  @IsIn(EDITOR_EXPORT_PRESETS)
  exportPreset?: EditorExportPreset;

  @IsOptional()
  @IsBoolean()
  includeStoryboardCsv?: boolean;

  @IsOptional()
  @IsBoolean()
  includeSubtitles?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  sourceEditorExportId?: string;

  @IsOptional()
  @IsBoolean()
  forceFailure?: boolean;
}
