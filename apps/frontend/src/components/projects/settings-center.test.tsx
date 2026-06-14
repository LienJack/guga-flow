import type {
  ProjectSettingsSummaryResult,
  ProviderManagementResult,
  SkillTemplateSummary,
} from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { SettingsCenter } from "./settings-center";
import { I18nProvider } from "../../lib/i18n";

vi.mock("../../lib/api", () => ({
  exportProjectSettings: vi.fn(),
  getAgentDeployment: vi.fn(async () => agentDeployment),
  getProjectSettingsSummary: vi.fn(async () => settingsSummary),
  getProviderManagement: vi.fn(async () => providerManagement),
  listProgrammableProviders: vi.fn(async () => ({ providers: [] })),
  listSkillTemplates: vi.fn(async () => ({ templates: skillTemplates })),
  validateProjectSettingsImport: vi.fn(),
  activateProgrammableProviderVersion: vi.fn(),
  activateSkillTemplateVersion: vi.fn(),
  createProgrammableProvider: vi.fn(),
  disableProgrammableProvider: vi.fn(),
  testProviderConfig: vi.fn(),
  updateAgentDeployment: vi.fn(),
  updateProviderConfig: vi.fn(),
  updateProgrammableProviderSource: vi.fn(),
  updateSkillTemplateSource: vi.fn(),
}));

const settingsSummary: ProjectSettingsSummaryResult = {
  project: {
    id: "project_1",
    title: "Rain Night",
    defaultAspectRatio: "16:9",
    generationSettingsCount: 2,
  },
  modules: [
    {
      module: "providers",
      label: "Providers and Models",
      status: "ready",
      summary: "1 provider config",
      itemCount: 1,
    },
    {
      module: "agents",
      label: "Agent Deployment",
      status: "ready",
      summary: "1 deployment config",
      itemCount: 1,
    },
    {
      module: "prompts",
      label: "Prompts and Skills",
      status: "ready",
      summary: "1 skill template",
      itemCount: 1,
    },
    {
      module: "project_defaults",
      label: "Project Defaults",
      status: "ready",
      summary: "Aspect ratio and generation defaults",
    },
    {
      module: "data",
      label: "Data",
      status: "partial",
      summary: "Safe export and validation-only import",
    },
    {
      module: "files",
      label: "Files",
      status: "ready",
      summary: "2 assets",
      itemCount: 2,
    },
    {
      module: "version",
      label: "Version",
      status: "ready",
      summary: "Runtime and API metadata",
    },
  ],
  resourceCounts: {
    canvasNodes: 4,
    canvasEdges: 3,
    assets: 2,
    novelDocuments: 1,
    storyboardDrafts: 1,
    scriptDrafts: 1,
    editorExports: 1,
    skillTemplates: 1,
    providerConfigs: 1,
    programmableProviders: 0,
    agentDeploymentConfigs: 1,
  },
  fileSummary: {
    totalAssets: 2,
    totalSizeBytes: 3000,
    uploadStorageConfigured: true,
    byType: [
      { type: "image", count: 1, sizeBytes: 1000 },
      { type: "audio", count: 1, sizeBytes: 2000 },
    ],
  },
  version: {
    service: "guga-flow",
    appVersion: "0.1.0",
    apiVersion: "v1",
    nodeVersion: "v26.3.0",
    generatedAt: "2026-06-13T00:00:00.000Z",
  },
};

const agentDeployment = {
  deployment: {
    projectId: "project_1",
    mode: "simple" as const,
    primary: {
      provider: "mock-llm" as const,
      model: "mock-storyboard",
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
    roles: {},
    version: 1,
    updatedAt: "2026-06-14T00:00:00.000Z",
  },
  resolvedRoles: [
    {
      role: "universal" as const,
      provider: "mock-llm" as const,
      model: "mock-storyboard",
      inheritedFrom: "primary" as const,
    },
  ],
  issues: [],
};

const providerManagement: ProviderManagementResult = {
  llm: [
    {
      id: "mock-llm",
      kind: "llm",
      displayName: "Mock LLM",
      enabled: true,
      requiresApiKey: false,
      defaultModel: "mock-storyboard",
      models: [{ id: "mock-storyboard", displayName: "Mock Storyboard", default: true }],
      supportedModes: ["chat", "json"],
      supportsJsonMode: true,
      supportsToolCalls: false,
      supportsVision: false,
      parameters: [],
      configuredEnabled: true,
      credentialConfigured: true,
    },
  ],
  image: [
    {
      id: "image2",
      kind: "image",
      displayName: "Image 2",
      enabled: true,
      requiresApiKey: true,
      defaultModel: "gpt-image-2",
      models: [{ id: "gpt-image-2", displayName: "GPT Image 2", default: true }],
      supportedModes: ["text_to_image"],
      supportsReferenceImages: true,
      maxReferenceImages: 4,
      supportsMultipleOutputs: true,
      maxOutputs: 4,
      defaultAspectRatio: "16:9",
      supportedAspectRatios: ["16:9"],
      parameters: [],
      configuredEnabled: true,
      credentialConfigured: true,
      credentialSource: "stored",
      configuredDefaultModel: "gpt-image-2",
    },
  ],
  video: [],
};

const skillTemplates: SkillTemplateSummary[] = [
  {
    id: "skill_art",
    projectId: "project_1",
    kind: "art",
    slug: "art-default",
    displayName: "Art Skill",
    enabled: true,
    presetCategories: ["ai-image"],
    triggerModes: ["insert_prompt", "direct_generate"],
    agentRoles: ["asset", "video_prompt"],
    indexStatus: "ready",
    activeSummary: "Use crisp highlights.",
    activeVersionId: "skill_version_1",
    versions: [
      {
        id: "skill_version_1",
        version: 1,
        sourceText: "Use crisp highlights.",
        status: "valid",
        diagnostics: [],
        createdAt: "2026-06-13T00:00:00.000Z",
        active: true,
      },
    ],
    createdAt: "2026-06-13T00:00:00.000Z",
    updatedAt: "2026-06-13T00:00:00.000Z",
  },
];

describe("SettingsCenter", () => {
  it("renders grouped settings modules with safe provider and skill panels", () => {
    const html = renderToStaticMarkup(
      <SettingsCenter
        projectId="project_1"
        initialSummary={settingsSummary}
        initialProviders={providerManagement}
        initialSkillTemplates={skillTemplates}
      />,
    );

    expect(html).toContain("Settings Center");
    expect(html).toContain("Providers and Models");
    expect(html).toContain("Agent Deployment");
    expect(html).toContain("Prompts and Skills");
    expect(html).toContain("Project Defaults");
    expect(html).toContain("Export JSON");
    expect(html).toContain("Import payload");
    expect(html).toContain("Total assets");
    expect(html).toContain("audio");
    expect(html).toContain("Version");
    expect(html).toContain("Image 2");
    expect(html).toContain("Art Skill");
    expect(html).not.toContain("sk-");
  });

  it("renders settings chrome in Chinese while keeping provider data unchanged", () => {
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="zh">
        <SettingsCenter
          projectId="project_1"
          initialSummary={settingsSummary}
          initialProviders={providerManagement}
          initialSkillTemplates={skillTemplates}
        />
      </I18nProvider>,
    );

    expect(html).toContain("设置中心");
    expect(html).toContain("供应商和模型");
    expect(html).toContain("Agent 部署");
    expect(html).toContain("导出 JSON");
    expect(html).toContain("导入载荷");
    expect(html).toContain("资产总数");
    expect(html).toContain("Image 2");
    expect(html).toContain("Art Skill");
  });
});
