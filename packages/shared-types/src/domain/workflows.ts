import type { CanvasSnapshotJson } from "./canvas";
import type { GenerationJobRecord, WorkflowOutputKind, WorkflowRunJobInput, WorkflowRunKind } from "./generation";

export const WORKFLOW_DEFINITION_STATUSES = ["draft", "active", "disabled"] as const;
export type WorkflowDefinitionStatus = (typeof WORKFLOW_DEFINITION_STATUSES)[number];

export const WORKFLOW_FIELD_TYPES = [
  "text",
  "number",
  "boolean",
  "image",
  "video",
  "audio",
  "select",
] as const;
export type WorkflowFieldType = (typeof WORKFLOW_FIELD_TYPES)[number];

export interface WorkflowFieldMapping {
  id: string;
  nodeId?: string;
  input?: string;
  type: WorkflowFieldType;
  source?: string;
  required?: boolean;
  options?: string[];
}

export interface WorkflowOutputMapping {
  nodeId?: string;
  kind: WorkflowOutputKind;
}

export interface WorkflowMapping {
  fields: WorkflowFieldMapping[];
  outputs: WorkflowOutputMapping[];
}

export interface WorkflowDiagnostic {
  path: string;
  message: string;
}

export interface WorkflowDefinitionVersionSummary {
  id: string;
  workflowDefinitionId: string;
  version: number;
  sourceJson: CanvasSnapshotJson;
  mappingJson: WorkflowMapping;
  diagnostics: WorkflowDiagnostic[];
  createdAt: string;
  active: boolean;
}

export interface WorkflowDefinitionSummary {
  id: string;
  projectId: string;
  kind: WorkflowRunKind;
  provider: string;
  displayName: string;
  status: WorkflowDefinitionStatus;
  activeVersionId?: string;
  versions: WorkflowDefinitionVersionSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowListResult {
  workflows: WorkflowDefinitionSummary[];
}

export interface CreateWorkflowDefinitionInput {
  kind: WorkflowRunKind;
  provider: string;
  displayName: string;
  sourceJson: CanvasSnapshotJson;
  mappingJson: WorkflowMapping;
}

export interface CreateWorkflowVersionInput {
  sourceJson: CanvasSnapshotJson;
  mappingJson: WorkflowMapping;
}

export interface ActivateWorkflowVersionInput {
  versionId: string;
}

export interface WorkflowDefinitionResult {
  workflow: WorkflowDefinitionSummary;
}

export interface CreateWorkflowRunInput {
  sourceNodeId?: string;
  prompt?: string;
  fieldValues?: CanvasSnapshotJson;
  referenceAssetIds?: string[];
  outputKind?: WorkflowOutputKind;
  forceFailure?: boolean;
}

export interface WorkflowRunResult {
  job: GenerationJobRecord<WorkflowRunJobInput>;
}
