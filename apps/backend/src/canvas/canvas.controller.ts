import { Body, Controller, Get, Inject, Param, Patch } from "@nestjs/common";

import { CanvasService } from "./canvas.service";
import { SaveCanvasSnapshotDto } from "./dto";

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
}
