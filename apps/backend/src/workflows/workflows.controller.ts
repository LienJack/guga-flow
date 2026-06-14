import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import {
  CreateWorkflowDefinitionDto,
  CreateWorkflowRunDto,
  CreateWorkflowVersionDto,
} from "./dto";
import { WorkflowsService } from "./workflows.service";

@Controller("projects/:projectId/workflows")
export class WorkflowsController {
  constructor(@Inject(WorkflowsService) private readonly workflowsService: WorkflowsService) {}

  @Get()
  listWorkflows(@Param("projectId") projectId: string) {
    return this.workflowsService.listWorkflows(projectId);
  }

  @Post()
  createWorkflow(@Param("projectId") projectId: string, @Body() body: CreateWorkflowDefinitionDto) {
    return this.workflowsService.createWorkflow(projectId, body);
  }

  @Post(":workflowId/versions")
  createVersion(
    @Param("projectId") projectId: string,
    @Param("workflowId") workflowId: string,
    @Body() body: CreateWorkflowVersionDto,
  ) {
    return this.workflowsService.createVersion(projectId, workflowId, body);
  }

  @Post(":workflowId/versions/:versionId/activate")
  activateVersion(
    @Param("projectId") projectId: string,
    @Param("workflowId") workflowId: string,
    @Param("versionId") versionId: string,
  ) {
    return this.workflowsService.activateVersion(projectId, workflowId, { versionId });
  }

  @Post(":workflowId/run")
  createRunJob(
    @Param("projectId") projectId: string,
    @Param("workflowId") workflowId: string,
    @Body() body: CreateWorkflowRunDto,
  ) {
    return this.workflowsService.createRunJob(projectId, workflowId, body);
  }
}
