import type { CanvasSnapshotJson } from "@guga-flow/shared-types";
import { IsDefined } from "class-validator";

export class SaveCanvasSnapshotDto {
  @IsDefined()
  snapshotJson!: CanvasSnapshotJson;
}
