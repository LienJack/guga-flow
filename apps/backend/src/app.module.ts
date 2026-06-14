import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AgentsModule } from "./agents/agents.module";
import { AssetsModule } from "./assets/assets.module";
import { AuthModule } from "./auth/auth.module";
import { CanvasModule } from "./canvas/canvas.module";
import { readAppConfig } from "./config/app-config";
import { EditorExportsModule } from "./editor-exports/editor-exports.module";
import { GenerationModule } from "./generation/generation.module";
import { HealthController } from "./health/health.controller";
import { NovelsModule } from "./novels/novels.module";
import { ProvidersModule } from "./providers/providers.module";
import { PromptModule } from "./prompt/prompt.module";
import { ProjectSettingsModule } from "./project-settings/project-settings.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./projects/projects.module";
import { SkillTemplatesModule } from "./skill-templates/skill-templates.module";
import { WorkflowsModule } from "./workflows/workflows.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => readAppConfig()],
    }),
    PrismaModule,
    AuthModule,
    ProjectsModule,
    AssetsModule,
    CanvasModule,
    NovelsModule,
    PromptModule,
    GenerationModule,
    ProvidersModule,
    ProjectSettingsModule,
    EditorExportsModule,
    AgentsModule,
    SkillTemplatesModule,
    WorkflowsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
