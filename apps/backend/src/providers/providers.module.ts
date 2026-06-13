import { Module } from "@nestjs/common";

import { ProjectProvidersController, ProvidersController } from "./providers.controller";
import { ProvidersService } from "./providers.service";

@Module({
  controllers: [ProvidersController, ProjectProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
