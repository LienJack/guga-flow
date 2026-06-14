import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  AssetType,
  CanvasSnapshotJson,
  ProjectAspectRatio,
  ProjectSettingsExportPayload,
  ProjectSettingsExportResult,
  ProjectSettingsFileSummary,
  ProjectSettingsImportValidationIssue,
  ProjectSettingsImportValidationResult,
  ProjectSettingsProviderExportSummary,
  ProjectSettingsResourceCounts,
  ProjectSettingsSkillTemplateExportSummary,
  ProjectSettingsSummaryResult,
  SettingsCenterModuleStatus,
  ValidateProjectSettingsImportInput,
} from "@guga-flow/shared-types";

import { readAppConfig } from "../config/app-config";
import { PrismaService } from "../prisma/prisma.service";

type ProjectModel = {
  id: string;
  title: string;
  defaultAspectRatio: string;
  generationSettingsJson: unknown | null;
};

type AssetSummaryModel = {
  type: string;
  sizeBytes: number | null;
};

type ProviderConfigModel = {
  kind: string;
  provider: string;
  enabled: boolean;
  defaultModel: string | null;
  secretJson: unknown | null;
  lastTestStatus: string | null;
};

type SkillTemplateModel = {
  kind: string;
  slug: string;
  displayName: string;
  enabled: boolean;
  activeVersionId: string | null;
  versions?: Array<{ id: string; version: number }>;
};

@Injectable()
export class ProjectSettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSummary(projectId: string): Promise<ProjectSettingsSummaryResult> {
    const bundle = await this.loadSettingsBundle(projectId);

    return {
      project: projectSummary(bundle.project),
      modules: moduleStatuses(bundle.counts, bundle.fileSummary),
      resourceCounts: bundle.counts,
      fileSummary: bundle.fileSummary,
      version: versionInfo(),
      debug: debugInfo(),
    };
  }

  async exportSettings(projectId: string): Promise<ProjectSettingsExportResult> {
    const bundle = await this.loadSettingsBundle(projectId);
    const payload: ProjectSettingsExportPayload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      project: projectSummary(bundle.project),
      resourceCounts: bundle.counts,
      fileSummary: bundle.fileSummary,
      generationSettings: canvasJsonOrUndefined(bundle.project.generationSettingsJson),
      providers: bundle.providerConfigs.map(providerExportSummary),
      skillTemplates: bundle.skillTemplates.map(skillTemplateExportSummary),
    };

    return { export: payload };
  }

  async validateImport(
    projectId: string,
    input: ValidateProjectSettingsImportInput,
  ): Promise<ProjectSettingsImportValidationResult> {
    await this.ensureProjectExists(projectId);
    return validateSettingsImportPayload(input.payload);
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    await this.findProject(projectId);
  }

  private async findProject(projectId: string): Promise<ProjectModel> {
    const project = (await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, title: true, defaultAspectRatio: true, generationSettingsJson: true },
    })) as ProjectModel | null;
    if (!project) {
      throw new NotFoundException("Project not found");
    }
    return project;
  }

  private async loadSettingsBundle(projectId: string) {
    const project = await this.findProject(projectId);
    const [
      canvasNodes,
      canvasEdges,
      assets,
      novelDocuments,
      storyboardDrafts,
      scriptDrafts,
      editorExports,
      providerConfigs,
      programmableProviders,
      agentDeploymentConfigs,
      assetRows,
      skillTemplates,
    ] = await Promise.all([
      this.prisma.canvasNode.count({ where: { projectId } }),
      this.prisma.canvasEdge.count({ where: { projectId } }),
      this.prisma.asset.count({ where: { projectId } }),
      this.prisma.novelDocument.count({ where: { projectId } }),
      this.prisma.storyboardDraft.count({ where: { projectId } }),
      this.prisma.scriptDraft.count({ where: { projectId } }),
      this.prisma.editorExport.count({ where: { projectId } }),
      this.prisma.providerConfig.findMany({ where: { projectId } }) as Promise<ProviderConfigModel[]>,
      this.prisma.programmableProvider.count({ where: { projectId } }),
      this.prisma.agentDeployment.count({ where: { projectId } }),
      this.prisma.asset.findMany({
        where: { projectId },
        select: { type: true, sizeBytes: true },
      }) as Promise<AssetSummaryModel[]>,
      this.prisma.skillTemplate.findMany({
        where: { projectId },
        include: { versions: { orderBy: { version: "desc" } } },
      }) as Promise<SkillTemplateModel[]>,
    ]);
    const counts: ProjectSettingsResourceCounts = {
      canvasNodes,
      canvasEdges,
      assets,
      novelDocuments,
      storyboardDrafts,
      scriptDrafts,
      editorExports,
      skillTemplates: skillTemplates.length,
      providerConfigs: providerConfigs.length,
      programmableProviders,
      agentDeploymentConfigs,
    };

    return {
      project,
      counts,
      fileSummary: fileSummary(assetRows),
      providerConfigs,
      skillTemplates,
    };
  }
}

function projectSummary(project: ProjectModel): ProjectSettingsSummaryResult["project"] {
  return {
    id: project.id,
    title: project.title,
    defaultAspectRatio: project.defaultAspectRatio as ProjectAspectRatio,
    generationSettingsCount: Object.keys(objectData(project.generationSettingsJson)).length,
  };
}

function fileSummary(assets: AssetSummaryModel[]): ProjectSettingsFileSummary {
  const byType = new Map<AssetType, { count: number; sizeBytes: number }>();
  let totalSizeBytes = 0;

  for (const asset of assets) {
    const type = assetType(asset.type);
    if (!type) {
      continue;
    }
    const sizeBytes = typeof asset.sizeBytes === "number" ? asset.sizeBytes : 0;
    const current = byType.get(type) ?? { count: 0, sizeBytes: 0 };
    current.count += 1;
    current.sizeBytes += sizeBytes;
    byType.set(type, current);
    totalSizeBytes += sizeBytes;
  }

  return {
    totalAssets: assets.length,
    totalSizeBytes,
    byType: [...byType.entries()].map(([type, value]) => ({ type, ...value })),
    uploadStorageConfigured: Boolean(readAppConfig().uploadStorageDir),
  };
}

function moduleStatuses(
  counts: ProjectSettingsResourceCounts,
  files: ProjectSettingsFileSummary,
): SettingsCenterModuleStatus[] {
  return [
    {
      module: "providers",
      label: "Providers and Models",
      status: "ready",
      summary: `${counts.providerConfigs} provider config${counts.providerConfigs === 1 ? "" : "s"}`,
      itemCount: counts.providerConfigs + counts.programmableProviders,
    },
    {
      module: "agents",
      label: "Agent Deployment",
      status: counts.agentDeploymentConfigs > 0 ? "ready" : "partial",
      summary: `${counts.agentDeploymentConfigs} deployment config${counts.agentDeploymentConfigs === 1 ? "" : "s"}`,
      itemCount: counts.agentDeploymentConfigs,
    },
    {
      module: "prompts",
      label: "Prompts and Skills",
      status: "ready",
      summary: `${counts.skillTemplates} skill template${counts.skillTemplates === 1 ? "" : "s"}`,
      itemCount: counts.skillTemplates,
    },
    {
      module: "project_defaults",
      label: "Project Defaults",
      status: "ready",
      summary: "Aspect ratio and generation defaults",
      itemCount: counts.canvasNodes,
    },
    {
      module: "data",
      label: "Data",
      status: "partial",
      summary: "Safe export and validation-only import",
      itemCount: counts.canvasNodes + counts.canvasEdges,
    },
    {
      module: "files",
      label: "Files",
      status: "ready",
      summary: `${files.totalAssets} asset${files.totalAssets === 1 ? "" : "s"}`,
      itemCount: files.totalAssets,
    },
    {
      module: "version",
      label: "Version",
      status: "ready",
      summary: "Runtime and API metadata",
    },
  ];
}

function versionInfo(): ProjectSettingsSummaryResult["version"] {
  const config = readAppConfig();
  return {
    service: "guga-flow",
    appVersion: config.appVersion,
    apiVersion: "v1",
    buildCommit: config.buildCommit,
    buildTime: config.buildTime,
    releaseFeedUrl: config.releaseFeedUrl,
    nodeVersion: process.version,
    runtime: {
      environment: config.nodeEnv,
      nodeVersion: process.version,
    },
    generatedAt: new Date().toISOString(),
  };
}

function debugInfo(): ProjectSettingsSummaryResult["debug"] {
  const config = readAppConfig();
  return {
    aiDebugAvailable: config.aiDebugAvailable,
    aiDebugEnabled: config.aiDebugEnabled,
    environment: config.nodeEnv,
    safeTraceFields: ["traceId", "provider", "model", "latencyMs", "sanitizedError"],
    credentialValuesExposed: false,
  };
}

function providerExportSummary(provider: ProviderConfigModel): ProjectSettingsProviderExportSummary {
  return {
    kind: provider.kind as ProjectSettingsProviderExportSummary["kind"],
    provider: provider.provider,
    enabled: provider.enabled,
    defaultModel: provider.defaultModel ?? undefined,
    credentialConfigured: Object.keys(objectData(provider.secretJson)).length > 0,
    credentialSource: Object.keys(objectData(provider.secretJson)).length > 0 ? "stored" : undefined,
    lastTestStatus: provider.lastTestStatus ?? undefined,
  };
}

function skillTemplateExportSummary(template: SkillTemplateModel): ProjectSettingsSkillTemplateExportSummary {
  const activeVersion = template.versions?.find((version) => version.id === template.activeVersionId);
  return {
    kind: template.kind,
    slug: template.slug,
    displayName: template.displayName,
    enabled: template.enabled,
    activeVersion: activeVersion?.version,
    versionCount: template.versions?.length ?? 0,
  };
}

function validateSettingsImportPayload(payload: unknown): ProjectSettingsImportValidationResult {
  const raw = objectData(payload);
  const issues: ProjectSettingsImportValidationIssue[] = [];
  const version = typeof raw.version === "string" ? raw.version : undefined;
  if (version !== "1.0") {
    issues.push({ path: "version", message: "Settings export version must be 1.0" });
  }
  if (!objectData(raw.project).id) {
    issues.push({ path: "project.id", message: "Project id is required" });
  }
  if (!Array.isArray(raw.providers)) {
    issues.push({ path: "providers", message: "Providers must be an array" });
  }
  if (!Array.isArray(raw.skillTemplates)) {
    issues.push({ path: "skillTemplates", message: "Skill templates must be an array" });
  }
  if (raw.generationSettings !== undefined && !isCanvasSnapshotJson(raw.generationSettings)) {
    issues.push({ path: "generationSettings", message: "Generation settings must be JSON serializable" });
  }

  return {
    valid: issues.length === 0,
    detectedVersion: version,
    issues,
    summary: issues.length
      ? undefined
      : {
          providers: Array.isArray(raw.providers) ? raw.providers.length : 0,
          skillTemplates: Array.isArray(raw.skillTemplates) ? raw.skillTemplates.length : 0,
          hasGenerationSettings: raw.generationSettings !== undefined,
        },
  };
}

function objectData(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function canvasJsonOrUndefined(value: unknown): CanvasSnapshotJson | undefined {
  return isCanvasSnapshotJson(value) ? value : undefined;
}

function isCanvasSnapshotJson(value: unknown): value is CanvasSnapshotJson {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isCanvasSnapshotJson);
  }
  if (typeof value === "object") {
    return Object.values(objectData(value)).every(isCanvasSnapshotJson);
  }
  return false;
}

function assetType(value: string): AssetType | undefined {
  return value === "image" ||
    value === "video" ||
    value === "audio" ||
    value === "document" ||
    value === "package"
    ? value
    : undefined;
}
