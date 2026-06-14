import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";

import { CreateProjectDto, ImportProjectPackageDto, UpdateProjectDto } from "./dto";
import { ProjectsService } from "./projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(@Inject(ProjectsService) private readonly projectsService: ProjectsService) {}

  @Get()
  listProjects() {
    return this.projectsService.listProjects();
  }

  @Post()
  createProject(@Body() body: CreateProjectDto) {
    return this.projectsService.createProject(body);
  }

  @Post("import-package/validate")
  validateImportPackage(@Body() body: ImportProjectPackageDto) {
    return this.projectsService.validateImportPackage(body);
  }

  @Post("import-package")
  importPackage(@Body() body: ImportProjectPackageDto) {
    return this.projectsService.importPackage(body);
  }

  @Get(":projectId/package")
  exportPackage(@Param("projectId") projectId: string) {
    return this.projectsService.exportPackage(projectId);
  }

  @Get(":projectId/recovery-snapshot")
  getRecoverySnapshot(@Param("projectId") projectId: string) {
    return this.projectsService.getRecoverySnapshot(projectId);
  }

  @Get(":projectId")
  getProject(@Param("projectId") projectId: string) {
    return this.projectsService.getProject(projectId);
  }

  @Patch(":projectId")
  updateProject(@Param("projectId") projectId: string, @Body() body: UpdateProjectDto) {
    return this.projectsService.updateProject(projectId, body);
  }

  @Delete(":projectId")
  deleteProject(@Param("projectId") projectId: string) {
    return this.projectsService.deleteProject(projectId);
  }

  @Post(":projectId/duplicate")
  duplicateProject(@Param("projectId") projectId: string) {
    return this.projectsService.duplicateProject(projectId);
  }
}
