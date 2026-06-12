import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";

import { CreateProjectDto, UpdateProjectDto } from "./dto";
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
