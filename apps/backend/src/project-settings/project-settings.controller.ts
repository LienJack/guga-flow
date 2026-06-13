import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { ValidateProjectSettingsImportDto } from "./dto";
import { ProjectSettingsService } from "./project-settings.service";

@Controller("projects/:projectId/settings")
export class ProjectSettingsController {
  constructor(@Inject(ProjectSettingsService) private readonly projectSettingsService: ProjectSettingsService) {}

  @Get()
  getSummary(@Param("projectId") projectId: string) {
    return this.projectSettingsService.getSummary(projectId);
  }

  @Get("export")
  exportSettings(@Param("projectId") projectId: string) {
    return this.projectSettingsService.exportSettings(projectId);
  }

  @Post("import/validate")
  validateImport(
    @Param("projectId") projectId: string,
    @Body() body: ValidateProjectSettingsImportDto,
  ) {
    return this.projectSettingsService.validateImport(projectId, body);
  }
}
