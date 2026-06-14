import {
  ASSET_BATCH_ACTIONS,
  ASSET_COLLECTION_KINDS,
  ASSET_EDIT_ACTIONS,
  ASSET_PURPOSES,
  ASSET_TYPES,
  type AssetBatchInput,
  type AssetCollectionKind,
  type AssetPurpose,
  type AssetType,
  type EditAssetInput,
} from "@guga-flow/shared-types";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class UploadAssetDto {
  @IsOptional()
  @IsIn(ASSET_PURPOSES)
  purpose?: AssetPurpose;
}

export class AssetListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  query?: string;

  @IsOptional()
  @IsIn(ASSET_TYPES)
  type?: AssetType;

  @IsOptional()
  @IsIn(ASSET_PURPOSES)
  purpose?: AssetPurpose;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  collectionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  tagIds?: string;
}

export class CreateAssetCollectionDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  parentId?: string;

  @IsOptional()
  @IsIn(ASSET_COLLECTION_KINDS)
  kind?: AssetCollectionKind;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CreateAssetTagDto {
  @IsString()
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  color?: string;
}

export class AssetBatchDto implements AssetBatchInput {
  @IsArray()
  @IsString({ each: true })
  assetIds!: string[];

  @IsIn(ASSET_BATCH_ACTIONS)
  action!: AssetBatchInput["action"];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  collectionId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}

export class EditAssetDto implements EditAssetInput {
  @IsIn(ASSET_EDIT_ACTIONS)
  action!: EditAssetInput["action"];

  @IsOptional()
  @IsObject()
  crop?: EditAssetInput["crop"];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  rows?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  columns?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(400)
  @IsInt({ each: true })
  @Min(0, { each: true })
  selectedCells?: number[];
}
