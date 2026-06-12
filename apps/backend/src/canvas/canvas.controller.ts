import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";

import { CanvasService } from "./canvas.service";
import {
  CreateCanvasNodeDto,
  SaveCanvasSnapshotDto,
  UpdateCanvasNodeDto,
  UpdateCanvasNodeGeometryDto,
} from "./dto";

@Controller("projects/:projectId/canvas")
export class CanvasController {
  constructor(@Inject(CanvasService) private readonly canvasService: CanvasService) {}

  @Get()
  getCanvas(@Param("projectId") projectId: string) {
    return this.canvasService.getCanvas(projectId);
  }

  @Patch("snapshot")
  saveSnapshot(@Param("projectId") projectId: string, @Body() body: SaveCanvasSnapshotDto) {
    return this.canvasService.saveSnapshot(projectId, body);
  }

  @Post("nodes")
  createNode(@Param("projectId") projectId: string, @Body() body: CreateCanvasNodeDto) {
    return this.canvasService.createNode(projectId, body);
  }

  @Patch("nodes/:nodeId")
  updateNode(
    @Param("projectId") projectId: string,
    @Param("nodeId") nodeId: string,
    @Body() body: UpdateCanvasNodeDto,
  ) {
    return this.canvasService.updateNode(projectId, nodeId, body);
  }

  @Patch("nodes/:nodeId/geometry")
  updateNodeGeometry(
    @Param("projectId") projectId: string,
    @Param("nodeId") nodeId: string,
    @Body() body: UpdateCanvasNodeGeometryDto,
  ) {
    return this.canvasService.updateNodeGeometry(projectId, nodeId, body);
  }

  @Delete("nodes/:nodeId")
  deleteNode(@Param("projectId") projectId: string, @Param("nodeId") nodeId: string) {
    return this.canvasService.deleteNode(projectId, nodeId);
  }
}
