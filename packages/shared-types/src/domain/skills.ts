export const SKILL_TEMPLATE_KINDS = ["story", "art", "production", "agent"] as const;
export type SkillTemplateKind = (typeof SKILL_TEMPLATE_KINDS)[number];

export const SKILL_TEMPLATE_VERSION_STATUSES = ["valid", "invalid"] as const;
export type SkillTemplateVersionStatus = (typeof SKILL_TEMPLATE_VERSION_STATUSES)[number];

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
  sourceText: string;
  versionId: string;
  version: number;
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
