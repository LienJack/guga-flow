import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { readAppConfig } from "./config/app-config";
import { HealthController } from "./health/health.controller";
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
