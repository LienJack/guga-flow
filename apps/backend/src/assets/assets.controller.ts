import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { memoryStorage } from "multer";

import { AssetsService, MAX_UPLOAD_BYTES } from "./assets.service";
import { UploadAssetDto } from "./dto";

@Controller("projects/:projectId/assets")
export class AssetsController {
  constructor(@Inject(AssetsService) private readonly assetsService: AssetsService) {}

  @Get()
  listAssets(@Param("projectId") projectId: string) {
    return this.assetsService.listAssets(projectId);
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
    }),
  )
  uploadAsset(
    @Param("projectId") projectId: string,
    @Body() body: UploadAssetDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_BYTES })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.assetsService.uploadAsset(projectId, file, body);
  }

  @Get(":assetId")
  getAsset(@Param("projectId") projectId: string, @Param("assetId") assetId: string) {
    return this.assetsService.getAsset(projectId, assetId);
  }

  @Get(":assetId/preview")
  async previewAsset(
    @Param("projectId") projectId: string,
    @Param("assetId") assetId: string,
    @Res() response: Response,
  ) {
    const preview = await this.assetsService.getAssetPreview(projectId, assetId);

    response.setHeader("Content-Type", preview.mimeType);
    response.setHeader("Cache-Control", "private, max-age=60");
    response.send(preview.body);
  }

  @Delete(":assetId")
  deleteAsset(@Param("projectId") projectId: string, @Param("assetId") assetId: string) {
    return this.assetsService.deleteAsset(projectId, assetId);
  }
}
