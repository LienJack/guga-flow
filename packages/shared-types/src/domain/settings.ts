import type { AssetType } from "./assets";
import type { CanvasSnapshotJson } from "./canvas";
import type { ProviderCredentialSource, ProviderKind } from "./generation";
import type { ProjectAspectRatio } from "./project";

export const SETTINGS_CENTER_MODULES = [
  "providers",
  "agents",
  "prompts",
  "project_defaults",
  "data",
  "files",
  "version",
] as const;
export type SettingsCenterModule = (typeof SETTINGS_CENTER_MODULES)[number];

export const SETTINGS_CENTER_MODULE_STATUSES = ["ready", "partial", "planned"] as const;
export type SettingsCenterModuleStatusValue = (typeof SETTINGS_CENTER_MODULE_STATUSES)[number];

export interface SettingsCenterModuleStatus {
  module: SettingsCenterModule;
  label: string;
  status: SettingsCenterModuleStatusValue;
  summary: string;
  itemCount?: number;
}

export interface ProjectSettingsResourceCounts {
  canvasNodes: number;
  canvasEdges: number;
  assets: number;
  novelDocuments: number;
  storyboardDrafts: number;
  scriptDrafts: number;
  editorExports: number;
  skillTemplates: number;
  providerConfigs: number;
  programmableProviders: number;
  agentDeploymentConfigs: number;
}

export interface ProjectSettingsFileTypeSummary {
  type: AssetType;
  count: number;
  sizeBytes: number;
}

export interface ProjectSettingsFileSummary {
  totalAssets: number;
  totalSizeBytes: number;
  byType: ProjectSettingsFileTypeSummary[];
  uploadStorageConfigured: boolean;
}

export interface ProjectSettingsVersionInfo {
  service: "guga-flow";
  appVersion: string;
  apiVersion: "v1";
  nodeVersion?: string;
  buildCommit?: string;
  buildTime?: string;
  releaseFeedUrl?: string;
  runtime: {
    environment: string;
    nodeVersion?: string;
  };
  generatedAt: string;
}

export interface ProjectSettingsDebugInfo {
  aiDebugAvailable: boolean;
  aiDebugEnabled: boolean;
  environment: string;
  safeTraceFields: string[];
  credentialValuesExposed: false;
}

export interface ProjectSettingsProjectSummary {
  id: string;
  title: string;
  defaultAspectRatio: ProjectAspectRatio;
  generationSettingsCount: number;
}

export interface ProjectSettingsSummaryResult {
  project: ProjectSettingsProjectSummary;
  modules: SettingsCenterModuleStatus[];
  resourceCounts: ProjectSettingsResourceCounts;
  fileSummary: ProjectSettingsFileSummary;
  version: ProjectSettingsVersionInfo;
  debug: ProjectSettingsDebugInfo;
}

export interface ProjectSettingsProviderExportSummary {
  kind: ProviderKind;
  provider: string;
  enabled: boolean;
  defaultModel?: string;
  credentialConfigured: boolean;
  credentialSource?: ProviderCredentialSource;
  lastTestStatus?: string;
}

export interface ProjectSettingsSkillTemplateExportSummary {
  kind: string;
  slug: string;
  displayName: string;
  enabled: boolean;
  activeVersion?: number;
  versionCount: number;
}

export interface ProjectSettingsExportPayload {
  version: "1.0";
  exportedAt: string;
  project: ProjectSettingsProjectSummary;
  resourceCounts: ProjectSettingsResourceCounts;
  fileSummary: ProjectSettingsFileSummary;
  generationSettings?: CanvasSnapshotJson;
  providers: ProjectSettingsProviderExportSummary[];
  skillTemplates: ProjectSettingsSkillTemplateExportSummary[];
}

export interface ProjectSettingsExportResult {
  export: ProjectSettingsExportPayload;
}

export interface ValidateProjectSettingsImportInput {
  payload: unknown;
}

export interface ProjectSettingsImportValidationIssue {
  path: string;
  message: string;
}

export interface ProjectSettingsImportValidationResult {
  valid: boolean;
  detectedVersion?: string;
  issues: ProjectSettingsImportValidationIssue[];
  summary?: {
    providers: number;
    skillTemplates: number;
    hasGenerationSettings: boolean;
  };
}
