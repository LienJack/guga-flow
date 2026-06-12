import type {
  CreateNovelDocumentInput,
  ImportNovelSourceInput,
  NovelLanguage,
  NovelSourceType,
  UpdateStoryboardDraftInput,
  UpdateNovelDocumentInput,
} from "@guga-flow/shared-types";
import { NOVEL_LANGUAGES, NOVEL_SOURCE_TYPES } from "@guga-flow/shared-types";
import { IsDefined, IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

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
