import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AssetsModule } from "./assets/assets.module";
import { CanvasModule } from "./canvas/canvas.module";
import { readAppConfig } from "./config/app-config";
import { HealthController } from "./health/health.controller";
import { NovelsModule } from "./novels/novels.module";
import { PromptModule } from "./prompt/prompt.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProjectsModule } from "./projects/projects.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => readAppConfig()],
    }),
    PrismaModule,
    ProjectsModule,
    AssetsModule,
    CanvasModule,
    NovelsModule,
    PromptModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
