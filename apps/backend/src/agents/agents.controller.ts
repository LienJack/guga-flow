import { Body, Controller, Inject, Param, Post } from "@nestjs/common";
import { Get, Patch } from "@nestjs/common";

import { AgentsService } from "./agents.service";
import {
  ClearAgentMemoriesDto,
  CreateAgentCanvasActionDto,
  CreateAgentMemoryDto,
  RecallAgentMemoriesDto,
  UpdateAgentMemoryDto,
} from "./dto";

@Controller("projects/:projectId/agents")
export class AgentsController {
  constructor(@Inject(AgentsService) private readonly agentsService: AgentsService) {}

  @Post("canvas-actions")
  createCanvasAction(
    @Param("projectId") projectId: string,
    @Body() body: CreateAgentCanvasActionDto,
  ) {
    return this.agentsService.createCanvasAction(projectId, body);
  }

  @Post("canvas-actions/:jobId/undo")
  undoCanvasAction(@Param("projectId") projectId: string, @Param("jobId") jobId: string) {
    return this.agentsService.undoCanvasAction(projectId, jobId);
  }

  @Get("memories")
  listMemories(@Param("projectId") projectId: string) {
    return this.agentsService.listMemories(projectId);
  }

  @Post("memories")
  createMemory(@Param("projectId") projectId: string, @Body() body: CreateAgentMemoryDto) {
    return this.agentsService.createMemory(projectId, body);
  }

  @Post("memories/recall")
  recallMemories(@Param("projectId") projectId: string, @Body() body: RecallAgentMemoriesDto) {
    return this.agentsService.recallMemories(projectId, body);
  }

  @Post("memories/clear")
  clearMemories(@Param("projectId") projectId: string, @Body() body: ClearAgentMemoriesDto) {
    return this.agentsService.clearMemories(projectId, body);
  }

  @Patch("memories/:memoryId")
  updateMemory(
    @Param("projectId") projectId: string,
    @Param("memoryId") memoryId: string,
    @Body() body: UpdateAgentMemoryDto,
  ) {
    return this.agentsService.updateMemory(projectId, memoryId, body);
  }

  @Post("memories/:memoryId/disable")
  disableMemory(@Param("projectId") projectId: string, @Param("memoryId") memoryId: string) {
    return this.agentsService.disableMemory(projectId, memoryId);
  }
}
