import type { AssetPurpose, AssetType } from "./assets";
import type {
  CanvasDocumentRecord,
  CanvasEdgeRecord,
  CanvasNodeRecord,
  CanvasSnapshotJson,
} from "./canvas";
import type { ProjectAspectRatio, ProjectDetail } from "./project";

export const PROJECT_PACKAGE_FORMAT = "guga-flow-project-package" as const;
export const PROJECT_PACKAGE_SCHEMA_VERSION = 1 as const;
export const PROJECT_RECOVERY_SNAPSHOT_FORMAT = "guga-flow-recovery-snapshot" as const;

export interface ProjectPackageProjectMetadata {
  title: string;
  description?: string;
  defaultAspectRatio: ProjectAspectRatio;
}

export interface ProjectPackageSettings {
  generationSettings?: CanvasSnapshotJson;
  skillTemplateReferences: ProjectPackageReference[];
  workflowReferences: ProjectPackageReference[];
}

export interface ProjectPackageReference {
  id: string;
  label: string;
  kind?: string;
}

export interface ProjectPackageAssetManifestItem {
  id: string;
  type: AssetType;
  purpose: AssetPurpose;
  mimeType: string;
  originalFilename?: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  metadataJson?: CanvasSnapshotJson;
}

export interface ProjectPackageCanvasPage {
  sourceCanvasDocumentId: string;
  title: string;
  sortOrder: number;
  isDefault: boolean;
  snapshotJson: CanvasSnapshotJson;
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
}

export interface ProjectPackageManifest {
  format: typeof PROJECT_PACKAGE_FORMAT;
  schemaVersion: typeof PROJECT_PACKAGE_SCHEMA_VERSION;
  source: "guga-flow";
  sourceProjectId: string;
  exportedAt: string;
  project: ProjectPackageProjectMetadata;
  settings: ProjectPackageSettings;
  canvasPages: ProjectPackageCanvasPage[];
  assets: ProjectPackageAssetManifestItem[];
}

export interface ExportProjectPackageResult {
  package: ProjectPackageManifest;
}

export interface ImportProjectPackageInput {
  package: ProjectPackageManifest;
}

export interface ImportProjectPackageResult {
  project: ProjectDetail;
  sourceProjectId: string;
  canvasPageIdMap: Record<string, string>;
  nodeIdMap: Record<string, string>;
  edgeIdMap: Record<string, string>;
  assetIdMap: Record<string, string>;
}

export interface ProjectPackageValidationIssue {
  path: string;
  message: string;
}

export interface ProjectPackageValidationResult {
  valid: boolean;
  detectedFormat?: string;
  detectedVersion?: number;
  issues: ProjectPackageValidationIssue[];
  summary?: {
    pages: number;
    nodes: number;
    edges: number;
    assets: number;
  };
}

export interface ProjectRecoveryCanvasPageSnapshot {
  canvasDocument: CanvasDocumentRecord;
  nodeCount: number;
  edgeCount: number;
  snapshotJson: CanvasSnapshotJson;
}

export interface ProjectRecoverySnapshot {
  format: typeof PROJECT_RECOVERY_SNAPSHOT_FORMAT;
  schemaVersion: typeof PROJECT_PACKAGE_SCHEMA_VERSION;
  projectId: string;
  capturedAt: string;
  reason: "manual" | "autosave" | "import_failed";
  canvasPages: ProjectRecoveryCanvasPageSnapshot[];
}

export interface ProjectRecoverySnapshotResult {
  snapshot: ProjectRecoverySnapshot;
}
