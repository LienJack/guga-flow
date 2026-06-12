import { Module } from "@nestjs/common";

import { CanvasModule } from "../canvas/canvas.module";
import { PromptModule } from "../prompt/prompt.module";
import { GenerationController } from "./generation.controller";
import { GenerationService } from "./generation.service";
import { WorkerGenerationController } from "./worker-generation.controller";

@Module({
  imports: [CanvasModule, PromptModule],
  controllers: [GenerationController, WorkerGenerationController],
  providers: [GenerationService],
  exports: [GenerationService],
})
export class GenerationModule {}
