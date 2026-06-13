import { Module } from "@nestjs/common";

import { PrismaModule } from "../prisma/prisma.module";
import { SkillTemplatesController } from "./skill-templates.controller";
import { SkillTemplatesService } from "./skill-templates.service";

@Module({
  imports: [PrismaModule],
  controllers: [SkillTemplatesController],
  providers: [SkillTemplatesService],
  exports: [SkillTemplatesService],
})
export class SkillTemplatesModule {}
