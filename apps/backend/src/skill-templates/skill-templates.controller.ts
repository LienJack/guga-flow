import { Body, Controller, Get, Inject, Param, Patch, Post } from "@nestjs/common";

import { ActivateSkillTemplateVersionDto, UpdateSkillTemplateSourceDto } from "./dto";
import { SkillTemplatesService } from "./skill-templates.service";

@Controller("projects/:projectId/skills")
export class SkillTemplatesController {
  constructor(
    @Inject(SkillTemplatesService) private readonly skillTemplatesService: SkillTemplatesService,
  ) {}

  @Get()
  listSkillTemplates(@Param("projectId") projectId: string) {
    return this.skillTemplatesService.listSkillTemplates(projectId);
  }

  @Patch(":kind/:slug/source")
  updateSkillTemplateSource(
    @Param("projectId") projectId: string,
    @Param("kind") kind: string,
    @Param("slug") slug: string,
    @Body() body: UpdateSkillTemplateSourceDto,
  ) {
    return this.skillTemplatesService.updateSkillTemplateSource(projectId, kind, slug, body);
  }

  @Post(":kind/:slug/activate")
  activateSkillTemplateVersion(
    @Param("projectId") projectId: string,
    @Param("kind") kind: string,
    @Param("slug") slug: string,
    @Body() body: ActivateSkillTemplateVersionDto,
  ) {
    return this.skillTemplatesService.activateSkillTemplateVersion(
      projectId,
      kind,
      slug,
      body.versionId,
    );
  }
}
