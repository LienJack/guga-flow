import { Module } from "@nestjs/common";

import { AssetsModule } from "../assets/assets.module";
import { EditorExportsController } from "./editor-exports.controller";
import { EditorExportsService } from "./editor-exports.service";

@Module({
  imports: [AssetsModule],
  controllers: [EditorExportsController],
  providers: [EditorExportsService],
  exports: [EditorExportsService],
})
export class EditorExportsModule {}
