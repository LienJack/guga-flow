import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";

import { CreateNovelDocumentDto, ImportNovelSourceDto, UpdateNovelDocumentDto } from "./dto";
import { NovelsService } from "./novels.service";

@Controller("projects/:projectId/novels")
export class NovelsController {
  constructor(@Inject(NovelsService) private readonly novelsService: NovelsService) {}

  @Get()
  listNovels(@Param("projectId") projectId: string) {
    return this.novelsService.listNovels(projectId);
  }

  @Post()
  createNovel(@Param("projectId") projectId: string, @Body() body: CreateNovelDocumentDto) {
    return this.novelsService.createNovel(projectId, body);
  }

  @Post("import")
  importSource(@Param("projectId") projectId: string, @Body() body: ImportNovelSourceDto) {
    return this.novelsService.importSource(projectId, body);
  }

  @Get(":novelId")
  getNovel(@Param("projectId") projectId: string, @Param("novelId") novelId: string) {
    return this.novelsService.getNovel(projectId, novelId);
  }

  @Patch(":novelId")
  updateNovel(
    @Param("projectId") projectId: string,
    @Param("novelId") novelId: string,
    @Body() body: UpdateNovelDocumentDto,
  ) {
    return this.novelsService.updateNovel(projectId, novelId, body);
  }

  @Delete(":novelId")
  deleteNovel(@Param("projectId") projectId: string, @Param("novelId") novelId: string) {
    return this.novelsService.deleteNovel(projectId, novelId);
  }
}
