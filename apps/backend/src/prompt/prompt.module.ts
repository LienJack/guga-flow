import { Module } from "@nestjs/common";

import { CanvasModule } from "../canvas/canvas.module";
import { PrismaModule } from "../prisma/prisma.module";
import { SkillTemplatesModule } from "../skill-templates/skill-templates.module";
import { PromptController } from "./prompt.controller";
import { PromptService } from "./prompt.service";

@Module({
  imports: [CanvasModule, PrismaModule, SkillTemplatesModule],
  controllers: [PromptController],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptModule {}
