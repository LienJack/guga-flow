import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { composeShotPrompt as composeShotPromptCore, type ShotPromptCompositionResult } from "@guga-flow/shared-types";

import { CanvasService } from "../canvas/canvas.service";
import type { ComposeShotPromptDto } from "./dto";

@Injectable()
export class PromptService {
  constructor(@Inject(CanvasService) private readonly canvasService: CanvasService) {}

  async composeShotPrompt(
    projectId: string,
    shotNodeId: string,
    input: ComposeShotPromptDto = {},
  ): Promise<ShotPromptCompositionResult> {
    const canvas = await this.canvasService.getCanvas(projectId);
    const shotNode = canvas.nodes.find((node) => node.id === shotNodeId);
    if (!shotNode || shotNode.projectId !== projectId) {
      throw new NotFoundException("Shot node not found");
    }
    if (shotNode.type !== "shot") {
      throw new BadRequestException("Prompt composition requires a Shot node");
    }

    return composeShotPromptCore({
      shotNodeId,
      nodes: canvas.nodes,
      edges: canvas.edges,
      assets: canvas.assets,
      globalStylePrompt: input.globalStylePrompt,
      modelPromptSuffix: input.modelPromptSuffix,
    });
  }
}
