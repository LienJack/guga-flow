import { ASSET_PURPOSES, type AssetPurpose } from "@guga-flow/shared-types";
import { IsIn, IsOptional } from "class-validator";

export class UploadAssetDto {
  @IsOptional()
  @IsIn(ASSET_PURPOSES)
  purpose?: AssetPurpose;
}
