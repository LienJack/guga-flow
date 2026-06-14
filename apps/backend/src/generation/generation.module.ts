import { Module } from "@nestjs/common";

import { AssetsModule } from "../assets/assets.module";
import { CanvasModule } from "../canvas/canvas.module";
import { PromptModule } from "../prompt/prompt.module";
import { ProvidersModule } from "../providers/providers.module";
import { GenerationController } from "./generation.controller";
import { GenerationEventsController } from "./generation-events.controller";
import { GenerationService } from "./generation.service";
import { WorkerGenerationController } from "./worker-generation.controller";

@Module({
  imports: [AssetsModule, CanvasModule, PromptModule, ProvidersModule],
  controllers: [GenerationController, GenerationEventsController, WorkerGenerationController],
  providers: [GenerationService],
  exports: [GenerationService],
})
export class GenerationModule {}
