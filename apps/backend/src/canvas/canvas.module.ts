import { Module } from "@nestjs/common";

import { StorageModule } from "../storage/storage.module";
import { CanvasController } from "./canvas.controller";
import { CanvasService } from "./canvas.service";

@Module({
  imports: [StorageModule],
  controllers: [CanvasController],
  providers: [CanvasService],
  exports: [CanvasService],
})
export class CanvasModule {}
