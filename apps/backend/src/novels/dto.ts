import type {
  CreateCreativeStoryboardInput,
  CreateNovelDocumentInput,
  CreateScriptDraftInput,
  CreativeAgentMode,
  ScriptAdaptationStrategy,
  ImportNovelSourceInput,
  NovelLanguage,
  NovelSourceType,
  UpdateStoryboardDraftInput,
  UpdateNovelDocumentInput,
} from "@guga-flow/shared-types";
import {
  CREATIVE_AGENT_MODES,
  NOVEL_LANGUAGES,
  NOVEL_SOURCE_TYPES,
  SCRIPT_ADAPTATION_STRATEGIES,
} from "@guga-flow/shared-types";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsBoolean,
  IsDefined,
  IsIn,
  IsInt,
  IsArray,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

const IMPORT_SOURCE_TYPES = NOVEL_SOURCE_TYPES.filter(
  (sourceType): sourceType is Exclude<NovelSourceType, "paste"> => sourceType !== "paste",
);

export class CreateNovelDocumentDto implements CreateNovelDocumentInput {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsIn(NOVEL_SOURCE_TYPES)
  sourceType?: NovelSourceType;

  @IsOptional()
  @IsIn(NOVEL_LANGUAGES)
  language?: NovelLanguage;
}

export class ImportNovelSourceDto implements ImportNovelSourceInput {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsIn(IMPORT_SOURCE_TYPES)
  sourceType!: Exclude<NovelSourceType, "paste">;

  @IsOptional()
  @IsIn(NOVEL_LANGUAGES)
  language?: NovelLanguage;
}

export class CreateCreativeStoryboardDto implements CreateCreativeStoryboardInput {
  @IsString()
  @MinLength(1)
  @MaxLength(800)
  idea!: string;

  @IsOptional()
  @IsIn(CREATIVE_AGENT_MODES)
  mode?: CreativeAgentMode;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  stylePrompt?: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(180)
  targetDurationSeconds?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ArrayUnique()
  @IsString({ each: true })
  referenceAssetIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @ArrayUnique()
  @IsString({ each: true })
  referenceImageNodeIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(240)
  referencePrompt?: string;

  @IsOptional()
  @IsBoolean()
  forceFailure?: boolean;
}

export class UpdateNovelDocumentDto implements UpdateNovelDocumentInput {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsIn(NOVEL_LANGUAGES)
  language?: NovelLanguage;
}

export class UpdateStoryboardDraftDto implements UpdateStoryboardDraftInput {
  @IsDefined()
  storyboard!: UpdateStoryboardDraftInput["storyboard"];
}

export class CreateScriptDraftDto implements CreateScriptDraftInput {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;

  @IsOptional()
  @IsIn(SCRIPT_ADAPTATION_STRATEGIES)
  strategy?: ScriptAdaptationStrategy;
}
