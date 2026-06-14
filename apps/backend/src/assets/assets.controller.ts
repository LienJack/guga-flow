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
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { memoryStorage } from "multer";

import { AssetsService, MAX_UPLOAD_BYTES } from "./assets.service";
import {
  AssetBatchDto,
  AssetListQueryDto,
  CreateAssetCollectionDto,
  CreateAssetTagDto,
  EditAssetDto,
  UploadAssetDto,
} from "./dto";

@Controller("projects/:projectId/assets")
export class AssetsController {
  constructor(@Inject(AssetsService) private readonly assetsService: AssetsService) {}

  @Get()
  listAssets(@Param("projectId") projectId: string, @Query() query: AssetListQueryDto) {
    return this.assetsService.listAssets(projectId, {
      query: query.query,
      type: query.type,
      purpose: query.purpose,
      collectionId: query.collectionId,
      tagIds: query.tagIds?.split(",").map((tagId) => tagId.trim()).filter(Boolean),
    });
  }

  @Get("collections")
  listCollections(@Param("projectId") projectId: string) {
    return this.assetsService.listCollections(projectId);
  }

  @Post("collections")
  createCollection(@Param("projectId") projectId: string, @Body() body: CreateAssetCollectionDto) {
    return this.assetsService.createCollection(projectId, body);
  }

  @Get("tags")
  listTags(@Param("projectId") projectId: string) {
    return this.assetsService.listTags(projectId);
  }

  @Post("tags")
  createTag(@Param("projectId") projectId: string, @Body() body: CreateAssetTagDto) {
    return this.assetsService.createTag(projectId, body);
  }

  @Post("batch")
  batchAssets(@Param("projectId") projectId: string, @Body() body: AssetBatchDto) {
    return this.assetsService.batchAssets(projectId, body);
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

  @Post(":assetId/edit")
  editAsset(
    @Param("projectId") projectId: string,
    @Param("assetId") assetId: string,
    @Body() body: EditAssetDto,
  ) {
    return this.assetsService.editAsset(projectId, assetId, body);
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
