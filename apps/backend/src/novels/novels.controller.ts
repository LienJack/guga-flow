import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";

import {
  CreateCreativeStoryboardDto,
  CreateNovelDocumentDto,
  CreateScriptDraftDto,
  ImportNovelSourceDto,
  UpdateNovelDocumentDto,
  UpdateStoryboardDraftDto,
} from "./dto";
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

  @Post("creative-brief")
  createCreativeStoryboard(
    @Param("projectId") projectId: string,
    @Body() body: CreateCreativeStoryboardDto,
  ) {
    return this.novelsService.createCreativeStoryboard(projectId, body);
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

  @Post(":novelId/generate-storyboard")
  generateStoryboard(@Param("projectId") projectId: string, @Param("novelId") novelId: string) {
    return this.novelsService.generateStoryboard(projectId, novelId);
  }

  @Post(":novelId/extract-events")
  extractChapterEvents(@Param("projectId") projectId: string, @Param("novelId") novelId: string) {
    return this.novelsService.extractChapterEvents(projectId, novelId);
  }

  @Get(":novelId/event-graph")
  getLatestEventGraph(@Param("projectId") projectId: string, @Param("novelId") novelId: string) {
    return this.novelsService.getLatestEventGraph(projectId, novelId);
  }

  @Get(":novelId/script-drafts")
  listScriptDrafts(@Param("projectId") projectId: string, @Param("novelId") novelId: string) {
    return this.novelsService.listScriptDrafts(projectId, novelId);
  }

  @Post(":novelId/script-drafts")
  createScriptDraft(
    @Param("projectId") projectId: string,
    @Param("novelId") novelId: string,
    @Body() body: CreateScriptDraftDto,
  ) {
    return this.novelsService.createScriptDraft(projectId, novelId, body ?? {});
  }

  @Get(":novelId/script-drafts/:scriptDraftId/export")
  exportScriptDraft(
    @Param("projectId") projectId: string,
    @Param("novelId") novelId: string,
    @Param("scriptDraftId") scriptDraftId: string,
  ) {
    return this.novelsService.exportScriptDraft(projectId, novelId, scriptDraftId);
  }

  @Post(":novelId/script-drafts/:scriptDraftId/generate-storyboard")
  generateStoryboardFromScriptDraft(
    @Param("projectId") projectId: string,
    @Param("novelId") novelId: string,
    @Param("scriptDraftId") scriptDraftId: string,
  ) {
    return this.novelsService.generateStoryboardFromScriptDraft(projectId, novelId, scriptDraftId);
  }

  @Get(":novelId/storyboard-draft")
  getActiveStoryboardDraft(
    @Param("projectId") projectId: string,
    @Param("novelId") novelId: string,
  ) {
    return this.novelsService.getActiveStoryboardDraft(projectId, novelId);
  }

  @Patch(":novelId/storyboard-draft/:draftId")
  updateStoryboardDraft(
    @Param("projectId") projectId: string,
    @Param("novelId") novelId: string,
    @Param("draftId") draftId: string,
    @Body() body: UpdateStoryboardDraftDto,
  ) {
    return this.novelsService.updateStoryboardDraft(projectId, novelId, draftId, body);
  }

  @Post(":novelId/storyboard-draft/:draftId/ready")
  markStoryboardDraftReady(
    @Param("projectId") projectId: string,
    @Param("novelId") novelId: string,
    @Param("draftId") draftId: string,
  ) {
    return this.novelsService.markStoryboardDraftReady(projectId, novelId, draftId);
  }
}
