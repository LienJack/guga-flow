import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from "@nestjs/common";
import {
  composeShotPrompt as composeShotPromptCore,
  normalizeGenerationCreativeSettings,
  type ShotPromptCompositionResult,
} from "@guga-flow/shared-types";

import { CanvasService } from "../canvas/canvas.service";
import { PrismaService } from "../prisma/prisma.service";
import { SkillTemplatesService } from "../skill-templates/skill-templates.service";
import type { ComposeShotPromptDto } from "./dto";

type ProjectGenerationSettingsModel = {
  generationSettingsJson: unknown | null;
};

@Injectable()
export class PromptService {
  constructor(
    @Inject(CanvasService) private readonly canvasService: CanvasService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional()
    @Inject(SkillTemplatesService)
    private readonly skillTemplatesService?: SkillTemplatesService,
  ) {}

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
    const project = (await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { generationSettingsJson: true },
    })) as ProjectGenerationSettingsModel | null;
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const skillTemplates = this.skillTemplatesService
      ? await this.skillTemplatesService.activePromptContexts(projectId, ["story", "art", "production"])
      : [];

    return composeShotPromptCore({
      shotNodeId,
      nodes: canvas.nodes,
      edges: canvas.edges,
      assets: canvas.assets,
      globalStylePrompt: input.globalStylePrompt,
      projectGenerationSettings: normalizeGenerationCreativeSettings(project.generationSettingsJson),
      skillTemplates,
      modelPromptSuffix: input.modelPromptSuffix,
    });
  }
}
