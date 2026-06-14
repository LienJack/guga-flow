import type {
  CanvasEdgeRecord,
  CanvasNodeRecord,
  CanvasSnapshotJson,
} from "./canvas";
import type { AssetListItem } from "./assets";

export const CANVAS_FRAGMENT_FORMAT = "guga-flow-canvas-fragment" as const;
export const CANVAS_FRAGMENT_SCHEMA_VERSION = 1 as const;

export interface CanvasFragmentManifest {
  format: typeof CANVAS_FRAGMENT_FORMAT;
  schemaVersion: typeof CANVAS_FRAGMENT_SCHEMA_VERSION;
  sourceProjectId: string;
  exportedAt: string;
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
  assets: AssetListItem[];
}

export interface ExportCanvasFragmentInput {
  nodeIds: string[];
}

export interface ExportCanvasFragmentResult {
  manifest: CanvasFragmentManifest;
  packageAssetId: string;
  storageKey: string;
}

export interface ImportCanvasFragmentInput {
  manifest: CanvasFragmentManifest;
}

export interface CanvasFragmentImportRecord {
  id: string;
  projectId: string;
  schemaVersion: number;
  status: "succeeded" | "failed";
  summaryJson: CanvasSnapshotJson;
  errorMessage?: string;
  createdAt: string;
}

export interface ImportCanvasFragmentResult {
  import: CanvasFragmentImportRecord;
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
}
