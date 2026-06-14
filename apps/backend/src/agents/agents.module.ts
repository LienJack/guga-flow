import { Module } from "@nestjs/common";

import { CanvasModule } from "../canvas/canvas.module";
import { ProvidersModule } from "../providers/providers.module";
import { SkillTemplatesModule } from "../skill-templates/skill-templates.module";
import { AgentsController } from "./agents.controller";
import { AgentsService } from "./agents.service";

@Module({
  imports: [CanvasModule, ProvidersModule, SkillTemplatesModule],
  controllers: [AgentsController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
