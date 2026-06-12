import { Module } from "@nestjs/common";

import { CanvasModule } from "../canvas/canvas.module";
import { PromptController } from "./prompt.controller";
import { PromptService } from "./prompt.service";

@Module({
  imports: [CanvasModule],
  controllers: [PromptController],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptModule {}
