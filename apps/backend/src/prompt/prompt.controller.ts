import { Body, Controller, Inject, Param, Post } from "@nestjs/common";

import { ComposeShotPromptDto } from "./dto";
import { PromptService } from "./prompt.service";

@Controller("projects/:projectId/prompts")
export class PromptController {
  constructor(@Inject(PromptService) private readonly promptService: PromptService) {}

  @Post("shot/:shotNodeId/compose")
  composeShotPrompt(
    @Param("projectId") projectId: string,
    @Param("shotNodeId") shotNodeId: string,
    @Body() body: ComposeShotPromptDto,
  ) {
    return this.promptService.composeShotPrompt(projectId, shotNodeId, body ?? {});
  }
}
