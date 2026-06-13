import { Body, Controller, Get, Inject, Param, Post, Res } from "@nestjs/common";
import type { Response } from "express";

import { CreateEditorExportDto } from "./dto";
import { EditorExportsService } from "./editor-exports.service";

@Controller("projects/:projectId/editor-exports")
export class EditorExportsController {
  constructor(@Inject(EditorExportsService) private readonly editorExportsService: EditorExportsService) {}

  @Post()
  createExport(@Param("projectId") projectId: string, @Body() body: CreateEditorExportDto) {
    return this.editorExportsService.createExport(projectId, body);
  }

  @Get()
  listExports(@Param("projectId") projectId: string) {
    return this.editorExportsService.listExports(projectId);
  }

  @Get(":exportId")
  getExport(@Param("projectId") projectId: string, @Param("exportId") exportId: string) {
    return this.editorExportsService.getExport(projectId, exportId);
  }

  @Post(":exportId/send")
  sendExport(@Param("projectId") projectId: string, @Param("exportId") exportId: string) {
    return this.editorExportsService.sendToLocalEditor(projectId, exportId);
  }

  @Get(":exportId/download")
  async downloadExport(
    @Param("projectId") projectId: string,
    @Param("exportId") exportId: string,
    @Res() response: Response,
  ) {
    const packagePreview = await this.editorExportsService.downloadPackage(projectId, exportId);

    response.setHeader("Content-Type", packagePreview.mimeType);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${packagePreview.asset.originalFilename ?? "editor-export.zip"}"`,
    );
    response.send(packagePreview.body);
  }
}
