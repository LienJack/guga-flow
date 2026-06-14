import type { AgentDeploymentRole } from "./agent";

export const SKILL_TEMPLATE_KINDS = [
  "story",
  "art",
  "production",
  "agent",
  "ai-image",
  "ai-text",
  "ai-video",
  "ai-audio",
] as const;
export type SkillTemplateKind = (typeof SKILL_TEMPLATE_KINDS)[number];

export const SKILL_TEMPLATE_VERSION_STATUSES = ["valid", "invalid"] as const;
export type SkillTemplateVersionStatus = (typeof SKILL_TEMPLATE_VERSION_STATUSES)[number];

export const SKILL_TEMPLATE_PRESET_CATEGORIES = [
  "ai-image",
  "ai-text",
  "ai-video",
  "ai-audio",
  "story",
  "production",
  "agent",
] as const;
export type SkillTemplatePresetCategory = (typeof SKILL_TEMPLATE_PRESET_CATEGORIES)[number];

export const SKILL_TEMPLATE_TRIGGER_MODES = ["insert_prompt", "direct_generate"] as const;
export type SkillTemplateTriggerMode = (typeof SKILL_TEMPLATE_TRIGGER_MODES)[number];

export const SKILL_TEMPLATE_INDEX_STATUSES = [
  "ready",
  "disabled",
  "missing_description",
  "invalid_source",
] as const;
export type SkillTemplateIndexStatus = (typeof SKILL_TEMPLATE_INDEX_STATUSES)[number];

export interface SkillTemplateKindMetadata {
  presetCategories: SkillTemplatePresetCategory[];
  triggerModes: SkillTemplateTriggerMode[];
  agentRoles: AgentDeploymentRole[];
}

export const SKILL_TEMPLATE_KIND_METADATA = {
  story: {
    presetCategories: ["story", "ai-text"],
    triggerModes: ["insert_prompt", "direct_generate"],
    agentRoles: ["script", "adaptation", "storyboard"],
  },
  art: {
    presetCategories: ["ai-image"],
    triggerModes: ["insert_prompt", "direct_generate"],
    agentRoles: ["asset", "video_prompt"],
  },
  production: {
    presetCategories: ["production", "ai-video"],
    triggerModes: ["insert_prompt", "direct_generate"],
    agentRoles: ["production", "video_prompt"],
  },
  agent: {
    presetCategories: ["agent"],
    triggerModes: ["direct_generate"],
    agentRoles: ["universal", "supervision"],
  },
  "ai-image": {
    presetCategories: ["ai-image"],
    triggerModes: ["insert_prompt", "direct_generate"],
    agentRoles: ["asset", "video_prompt"],
  },
  "ai-text": {
    presetCategories: ["ai-text", "story"],
    triggerModes: ["insert_prompt", "direct_generate"],
    agentRoles: ["script", "adaptation", "storyboard"],
  },
  "ai-video": {
    presetCategories: ["ai-video", "production"],
    triggerModes: ["insert_prompt", "direct_generate"],
    agentRoles: ["production", "video_prompt"],
  },
  "ai-audio": {
    presetCategories: ["ai-audio", "production"],
    triggerModes: ["insert_prompt", "direct_generate"],
    agentRoles: ["production"],
  },
} as const satisfies Record<SkillTemplateKind, SkillTemplateKindMetadata>;

export interface SkillTemplateValidationDiagnostic {
  path: string;
  message: string;
}

export interface SkillTemplateVersionSummary {
  id: string;
  version: number;
  sourceText: string;
  status: SkillTemplateVersionStatus;
  diagnostics: SkillTemplateValidationDiagnostic[];
  createdAt: string;
  active: boolean;
}

export interface SkillTemplateSummary {
  id: string;
  projectId: string;
  kind: SkillTemplateKind;
  slug: string;
  displayName: string;
  description?: string;
  enabled: boolean;
  presetCategories: SkillTemplatePresetCategory[];
  triggerModes: SkillTemplateTriggerMode[];
  agentRoles: AgentDeploymentRole[];
  indexStatus: SkillTemplateIndexStatus;
  activeSummary?: string;
  activeVersionId?: string;
  versions: SkillTemplateVersionSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface SkillTemplatePromptContext {
  id: string;
  kind: SkillTemplateKind;
  slug: string;
  displayName: string;
  summary: string;
  presetCategories: SkillTemplatePresetCategory[];
  agentRoles: AgentDeploymentRole[];
  sourceText: string;
  versionId: string;
  version: number;
}

export interface ListSkillTemplatesInput {
  query?: string;
  category?: SkillTemplatePresetCategory;
  triggerMode?: SkillTemplateTriggerMode;
  agentRole?: AgentDeploymentRole;
  templateIds?: string[];
}

export interface SkillTemplateListResult {
  templates: SkillTemplateSummary[];
}

export interface SkillTemplateResult {
  template: SkillTemplateSummary;
}

export interface UpdateSkillTemplateSourceInput {
  sourceText: string;
}

export interface ActivateSkillTemplateVersionInput {
  versionId: string;
}

export function skillTemplateMetadata(kind: SkillTemplateKind): SkillTemplateKindMetadata {
  const metadata = SKILL_TEMPLATE_KIND_METADATA[kind];
  return {
    presetCategories: [...metadata.presetCategories],
    triggerModes: [...metadata.triggerModes],
    agentRoles: [...metadata.agentRoles],
  };
}

export function filterSkillTemplateSummaries(
  templates: readonly SkillTemplateSummary[],
  filters: ListSkillTemplatesInput = {},
): SkillTemplateSummary[] {
  const query = filters.query?.trim().toLocaleLowerCase();
  const templateIds = new Set(filters.templateIds ?? []);

  return templates.filter((template) => {
    if (templateIds.size > 0 && !templateIds.has(template.id)) {
      return false;
    }
    if (filters.category && !template.presetCategories.includes(filters.category)) {
      return false;
    }
    if (filters.triggerMode && !template.triggerModes.includes(filters.triggerMode)) {
      return false;
    }
    if (filters.agentRole && !template.agentRoles.includes(filters.agentRole)) {
      return false;
    }
    if (!query) {
      return true;
    }

    return [
      template.displayName,
      template.slug,
      template.kind,
      template.description,
      template.activeSummary,
      ...template.presetCategories,
      ...template.agentRoles,
    ]
      .filter((value): value is string => typeof value === "string")
      .some((value) => value.toLocaleLowerCase().includes(query));
  });
}
