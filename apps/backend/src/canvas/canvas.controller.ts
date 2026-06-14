import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from "@nestjs/common";

import { CanvasService } from "./canvas.service";
import {
  CreateCanvasEdgeDto,
  CreateCanvasNodeDto,
  ExportCanvasFragmentDto,
  ImportCanvasFragmentDto,
  ImportStoryboardToCanvasDto,
  SaveCanvasSnapshotDto,
  UpdateCanvasNodeDto,
  UpdateCanvasNodeGeometryDto,
  UpdateProductionWorkspaceItemDto,
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

  @Get("production-workspace")
  getProductionWorkspace(@Param("projectId") projectId: string) {
    return this.canvasService.getProductionWorkspace(projectId);
  }

  @Patch("production-workspace/items/:itemId")
  updateProductionWorkspaceItem(
    @Param("projectId") projectId: string,
    @Param("itemId") itemId: string,
    @Body() body: UpdateProductionWorkspaceItemDto,
  ) {
    return this.canvasService.updateProductionWorkspaceItem(projectId, itemId, body);
  }

  @Post("nodes")
  createNode(@Param("projectId") projectId: string, @Body() body: CreateCanvasNodeDto) {
    return this.canvasService.createNode(projectId, body);
  }

  @Post("edges")
  createEdge(@Param("projectId") projectId: string, @Body() body: CreateCanvasEdgeDto) {
    return this.canvasService.createEdge(projectId, body);
  }

  @Post("import-storyboard")
  importStoryboard(
    @Param("projectId") projectId: string,
    @Body() body: ImportStoryboardToCanvasDto,
  ) {
    return this.canvasService.importStoryboard(projectId, body);
  }

  @Post("fragments/export")
  exportFragment(@Param("projectId") projectId: string, @Body() body: ExportCanvasFragmentDto) {
    return this.canvasService.exportFragment(projectId, body);
  }

  @Post("fragments/import")
  importFragment(@Param("projectId") projectId: string, @Body() body: ImportCanvasFragmentDto) {
    return this.canvasService.importFragment(projectId, body);
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

  @Delete("edges/:edgeId")
  deleteEdge(@Param("projectId") projectId: string, @Param("edgeId") edgeId: string) {
    return this.canvasService.deleteEdge(projectId, edgeId);
  }
}
