import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type {
  ListSkillTemplatesInput,
  SkillTemplateKind,
  SkillTemplateListResult,
  SkillTemplatePromptContext,
  SkillTemplateResult,
  SkillTemplateSummary,
  SkillTemplateValidationDiagnostic,
  SkillTemplateVersionStatus,
  SkillTemplateVersionSummary,
  UpdateSkillTemplateSourceInput,
} from "@guga-flow/shared-types";
import {
  SKILL_TEMPLATE_KINDS,
  filterSkillTemplateSummaries,
  skillTemplateMetadata,
} from "@guga-flow/shared-types";

import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type SkillTemplateVersionModel = {
  id: string;
  skillTemplateId: string;
  version: number;
  sourceText: string;
  status: string;
  diagnosticsJson: unknown;
  createdAt: Date | string;
};

type SkillTemplateModel = {
  id: string;
  projectId: string;
  kind: string;
  slug: string;
  displayName: string;
  description: string | null;
  enabled: boolean;
  activeVersionId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  versions?: SkillTemplateVersionModel[];
};

type SkillTemplateDelegate = {
  findMany(args?: unknown): Promise<unknown[]>;
  findUnique(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
};

type SkillTemplateVersionDelegate = {
  create(args: unknown): Promise<unknown>;
  findUnique(args: unknown): Promise<unknown | null>;
};

type PrismaWithSkillTemplates = PrismaService & {
  skillTemplate: SkillTemplateDelegate;
  skillTemplateVersion: SkillTemplateVersionDelegate;
};

type DefaultSkillTemplate = {
  kind: SkillTemplateKind;
  slug: string;
  displayName: string;
  description?: string;
  sourceText: string;
};

const BUILT_IN_DEFAULT_SKILL_TEMPLATES: DefaultSkillTemplate[] = [
  {
    kind: "story",
    slug: "story-default",
    displayName: "Story Skill",
    description: "Default rules for adapting story beats into short-form visual scenes.",
    sourceText:
      "Prioritize concrete story beats over exposition. Preserve character motivation, conflict, and consequence. When expanding a scene, keep the cause-and-effect chain visible in every shot.",
  },
  {
    kind: "art",
    slug: "art-default",
    displayName: "Art Skill",
    description: "Default visual style guidance for image and video prompts.",
    sourceText:
      "Keep visual direction specific, inspectable, and production-ready. Describe palette, lighting, composition, texture, and continuity anchors. Avoid vague mood-only style words when a concrete camera or art direction choice is possible.",
  },
  {
    kind: "production",
    slug: "production-default",
    displayName: "Production Skill",
    description: "Default production constraints for repeatable short-video generation.",
    sourceText:
      "Favor repeatable shot instructions that survive provider changes. Keep prompts concise enough for model limits, call out required references, and preserve export-facing details such as duration, sequence order, subtitles, and packaging notes.",
  },
  {
    kind: "agent",
    slug: "agent-default",
    displayName: "Agent Skill",
    description: "Default rules for conversational canvas operations.",
    sourceText:
      "Canvas agent actions must be explicit, reversible, and auditable. Prefer creating or updating existing canvas records over hidden state. When a user asks for structural changes, keep the action summary tied to concrete node or edge ids.",
  },
  {
    kind: "ai-image",
    slug: "ai-image-default",
    displayName: "AI Image Preset",
    description: "Default image-generation preset for reference-aware visual prompts.",
    sourceText:
      "Describe the subject, camera framing, lighting, material details, and reference usage in concrete terms. Keep style guidance inspectable and avoid vague atmosphere-only prompts.",
  },
  {
    kind: "ai-text",
    slug: "ai-text-default",
    displayName: "AI Text Preset",
    description: "Default text-generation preset for story, caption, and prompt expansion nodes.",
    sourceText:
      "Use upstream context explicitly. Preserve named entities, causal order, and production intent. Return concise text that can be reused by downstream visual or script nodes.",
  },
  {
    kind: "ai-video",
    slug: "ai-video-default",
    displayName: "AI Video Preset",
    description: "Default video-generation preset for motion, continuity, and provider-ready prompts.",
    sourceText:
      "Specify motion, camera movement, temporal continuity, duration expectations, and reference media usage. Keep each instruction compatible with short video generation and editor export.",
  },
  {
    kind: "ai-audio",
    slug: "ai-audio-default",
    displayName: "AI Audio Preset",
    description: "Default audio-generation preset for voice, narration, and background sound direction.",
    sourceText:
      "Describe voice character, pacing, emotion, environment, and timing. Keep audio direction reusable by TTS, narration, ambience, and shot-level sound references.",
  },
];

const CODE_LIKE_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  { pattern: /\bexport\s+default\b/i, message: "ES module exports are not allowed in skill text" },
  { pattern: /\bimport\s+.+\s+from\b/i, message: "Imports are not allowed in skill text" },
  { pattern: /\brequire\s*\(/i, message: "require() calls are not allowed in skill text" },
  { pattern: /\bfunction\s+[A-Za-z0-9_$]+\s*\(/i, message: "Functions are not allowed in skill text" },
  { pattern: /=>/, message: "Arrow functions are not allowed in skill text" },
  { pattern: /<script\b/i, message: "Script tags are not allowed in skill text" },
];

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function jsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function diagnosticsFromJson(value: unknown): SkillTemplateValidationDiagnostic[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isPlainObject(item)) {
        return undefined;
      }
      const path = optionalString(item.path);
      const message = optionalString(item.message);
      return path && message ? { path, message } : undefined;
    })
    .filter((item): item is SkillTemplateValidationDiagnostic => Boolean(item));
}

function defaultSkillRoots(): string[] {
  return [
    resolve(process.cwd(), "data/skills"),
    resolve(process.cwd(), "../../data/skills"),
    resolve(__dirname, "../../../../data/skills"),
  ];
}

function defaultTemplateKey(template: Pick<DefaultSkillTemplate, "kind" | "slug">): string {
  return `${template.kind}:${template.slug}`;
}

function mergeBuiltInDefaultTemplates(templates: readonly DefaultSkillTemplate[]): DefaultSkillTemplate[] {
  const byKey = new Map(templates.map((template) => [defaultTemplateKey(template), template]));
  for (const template of BUILT_IN_DEFAULT_SKILL_TEMPLATES) {
    if (!byKey.has(defaultTemplateKey(template))) {
      byKey.set(defaultTemplateKey(template), template);
    }
  }
  return Array.from(byKey.values());
}

function summarizeSourceText(sourceText: string): string {
  const compact = sourceText.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177).trim()}...` : compact;
}

function skillTemplateIndexStatus(input: {
  description: string | null;
  enabled: boolean;
  activeVersion?: SkillTemplateVersionSummary;
}): SkillTemplateSummary["indexStatus"] {
  if (!input.enabled) {
    return "disabled";
  }
  if (input.activeVersion?.status === "invalid") {
    return "invalid_source";
  }
  if (!input.description?.trim()) {
    return "missing_description";
  }
  return "ready";
}

@Injectable()
export class SkillTemplatesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listSkillTemplates(
    projectId: string,
    filters: ListSkillTemplatesInput = {},
  ): Promise<SkillTemplateListResult> {
    await this.ensureProject(projectId);
    await this.ensureDefaultTemplates(projectId);
    const rows = (await this.skillPrisma().skillTemplate.findMany({
      where: { projectId },
      include: { versions: { orderBy: { version: "desc" } } },
      orderBy: [{ kind: "asc" }, { displayName: "asc" }],
    })) as SkillTemplateModel[];

    return { templates: filterSkillTemplateSummaries(rows.map((row) => this.toSummary(row)), filters) };
  }

  async updateSkillTemplateSource(
    projectId: string,
    kindValue: string,
    slug: string,
    input: UpdateSkillTemplateSourceInput,
  ): Promise<SkillTemplateResult> {
    await this.ensureProject(projectId);
    await this.ensureDefaultTemplates(projectId);
    const kind = this.requireSkillKind(kindValue);
    const template = await this.requireTemplate(projectId, kind, slug);
    const sourceText = this.normalizeSourceText(input.sourceText);
    const diagnostics = this.validateSourceText(sourceText);
    const status: SkillTemplateVersionStatus = diagnostics.length ? "invalid" : "valid";
    const nextVersion = Math.max(0, ...(template.versions ?? []).map((version) => version.version)) + 1;
    const version = (await this.skillPrisma().skillTemplateVersion.create({
      data: {
        skillTemplateId: template.id,
        version: nextVersion,
        sourceText,
        status,
        diagnosticsJson: jsonValue(diagnostics),
      },
    })) as SkillTemplateVersionModel;

    if (status === "valid") {
      await this.skillPrisma().skillTemplate.update({
        where: { id: template.id },
        data: { activeVersionId: version.id, enabled: true },
      });
    }

    return { template: this.toSummary(await this.requireTemplate(projectId, kind, slug)) };
  }

  async activateSkillTemplateVersion(
    projectId: string,
    kindValue: string,
    slug: string,
    versionId: string,
  ): Promise<SkillTemplateResult> {
    await this.ensureProject(projectId);
    await this.ensureDefaultTemplates(projectId);
    const kind = this.requireSkillKind(kindValue);
    const template = await this.requireTemplate(projectId, kind, slug);
    const version = (template.versions ?? []).find((candidate) => candidate.id === versionId);
    if (!version) {
      throw new NotFoundException("Skill template version not found");
    }
    if (version.status !== "valid") {
      throw new BadRequestException("Only valid skill template versions can be activated");
    }
    await this.skillPrisma().skillTemplate.update({
      where: { id: template.id },
      data: { activeVersionId: version.id, enabled: true },
    });

    return { template: this.toSummary(await this.requireTemplate(projectId, kind, slug)) };
  }

  async activePromptContexts(
    projectId: string,
    kinds: readonly SkillTemplateKind[] = SKILL_TEMPLATE_KINDS,
    filters: Omit<ListSkillTemplatesInput, "triggerMode"> = {},
  ): Promise<SkillTemplatePromptContext[]> {
    await this.ensureProject(projectId);
    await this.ensureDefaultTemplates(projectId);
    const allowed = new Set(kinds);
    const rows = (await this.skillPrisma().skillTemplate.findMany({
      where: { projectId, enabled: true },
      include: { versions: { orderBy: { version: "desc" } } },
      orderBy: [{ kind: "asc" }, { displayName: "asc" }],
    })) as SkillTemplateModel[];

    return filterSkillTemplateSummaries(
      rows.filter((row) => allowed.has(this.requireSkillKind(row.kind))).map((row) => this.toSummary(row)),
      filters,
    )
      .map((summary) => {
        const version = summary.versions.find((candidate) => candidate.id === summary.activeVersionId);
        if (!version || version.status !== "valid") {
          return undefined;
        }
        return {
          id: summary.id,
          kind: summary.kind,
          slug: summary.slug,
          displayName: summary.displayName,
          summary: summary.activeSummary ?? summarizeSourceText(version.sourceText),
          presetCategories: summary.presetCategories,
          agentRoles: summary.agentRoles,
          sourceText: version.sourceText,
          versionId: version.id,
          version: version.version,
        };
      })
      .filter((item): item is SkillTemplatePromptContext => Boolean(item));
  }

  private async ensureDefaultTemplates(projectId: string): Promise<void> {
    const defaults = await this.loadDefaultTemplates();
    for (const template of defaults) {
      const existing = await this.skillPrisma().skillTemplate.findUnique({
        where: {
          projectId_kind_slug: {
            projectId,
            kind: template.kind,
            slug: template.slug,
          },
        },
      });
      if (existing) {
        continue;
      }

      const created = (await this.skillPrisma().skillTemplate.create({
        data: {
          projectId,
          kind: template.kind,
          slug: template.slug,
          displayName: template.displayName,
          description: template.description,
          enabled: true,
          versions: {
            create: {
              version: 1,
              sourceText: template.sourceText,
              status: "valid",
              diagnosticsJson: [],
            },
          },
        },
        include: { versions: { orderBy: { version: "desc" } } },
      })) as SkillTemplateModel;
      const versionId = created.versions?.[0]?.id;
      if (versionId) {
        await this.skillPrisma().skillTemplate.update({
          where: { id: created.id },
          data: { activeVersionId: versionId },
        });
      }
    }
  }

  private async loadDefaultTemplates(): Promise<DefaultSkillTemplate[]> {
    for (const root of defaultSkillRoots()) {
      try {
        const entries = await readdir(root);
        const templates = await Promise.all(
          entries
            .filter((entry) => entry.endsWith(".json"))
            .sort()
            .map((entry) => this.readDefaultTemplate(join(root, entry))),
        );
        if (templates.length > 0) {
          return mergeBuiltInDefaultTemplates(templates);
        }
      } catch {
        // Try the next plausible root.
      }
    }
    return [...BUILT_IN_DEFAULT_SKILL_TEMPLATES];
  }

  private async readDefaultTemplate(path: string): Promise<DefaultSkillTemplate> {
    const parsed = JSON.parse(await readFile(path, "utf8")) as unknown;
    if (!isPlainObject(parsed)) {
      throw new Error(`Skill template ${path} must be a JSON object`);
    }
    const kind = this.requireSkillKind(optionalString(parsed.kind) ?? "");
    const slug = this.normalizeSlug(optionalString(parsed.slug) ?? "");
    const displayName = this.normalizeDisplayName(optionalString(parsed.displayName) ?? "");
    const sourceText = this.normalizeSourceText(optionalString(parsed.sourceText) ?? "");
    const diagnostics = this.validateSourceText(sourceText);
    if (diagnostics.length > 0) {
      throw new Error(`Default skill template ${path} is invalid: ${diagnostics[0]?.message}`);
    }
    return {
      kind,
      slug,
      displayName,
      description: optionalString(parsed.description),
      sourceText,
    };
  }

  private async requireTemplate(
    projectId: string,
    kind: SkillTemplateKind,
    slug: string,
  ): Promise<SkillTemplateModel> {
    const template = (await this.skillPrisma().skillTemplate.findUnique({
      where: {
        projectId_kind_slug: {
          projectId,
          kind,
          slug,
        },
      },
      include: { versions: { orderBy: { version: "desc" } } },
    })) as SkillTemplateModel | null;
    if (!template) {
      throw new NotFoundException("Skill template not found");
    }
    return template;
  }

  private async ensureProject(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
  }

  private skillPrisma(): PrismaWithSkillTemplates {
    return this.prisma as PrismaWithSkillTemplates;
  }

  private requireSkillKind(value: string): SkillTemplateKind {
    if ((SKILL_TEMPLATE_KINDS as readonly string[]).includes(value)) {
      return value as SkillTemplateKind;
    }
    throw new BadRequestException(`Unsupported skill template kind: ${value}`);
  }

  private normalizeSlug(value: string): string {
    const slug = value.trim();
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug)) {
      throw new BadRequestException("Skill template slug must be lowercase kebab-case");
    }
    return slug;
  }

  private normalizeDisplayName(value: string): string {
    const displayName = value.trim();
    if (!displayName || displayName.length > 120) {
      throw new BadRequestException("Skill template display name must be 1-120 characters");
    }
    return displayName;
  }

  private normalizeSourceText(value: string): string {
    const sourceText = value.trim();
    if (!sourceText) {
      throw new BadRequestException("Skill template source text is required");
    }
    return sourceText;
  }

  private validateSourceText(sourceText: string): SkillTemplateValidationDiagnostic[] {
    const diagnostics: SkillTemplateValidationDiagnostic[] = [];
    if (sourceText.length > 20_000) {
      diagnostics.push({
        path: "sourceText",
        message: "Skill template source text must be 20,000 characters or fewer",
      });
    }
    for (const check of CODE_LIKE_PATTERNS) {
      if (check.pattern.test(sourceText)) {
        diagnostics.push({ path: "sourceText", message: check.message });
      }
    }
    return diagnostics;
  }

  private toSummary(row: SkillTemplateModel): SkillTemplateSummary {
    const kind = this.requireSkillKind(row.kind);
    const versions = (row.versions ?? []).map((version) => this.toVersionSummary(version, row.activeVersionId));
    const activeVersion = versions.find((version) => version.id === row.activeVersionId);
    const metadata = skillTemplateMetadata(kind);
    return {
      id: row.id,
      projectId: row.projectId,
      kind,
      slug: row.slug,
      displayName: row.displayName,
      ...(row.description ? { description: row.description } : {}),
      enabled: row.enabled,
      ...metadata,
      indexStatus: skillTemplateIndexStatus({
        description: row.description,
        enabled: row.enabled,
        activeVersion,
      }),
      ...(activeVersion ? { activeSummary: summarizeSourceText(activeVersion.sourceText) } : {}),
      ...(row.activeVersionId ? { activeVersionId: row.activeVersionId } : {}),
      versions,
      createdAt: toIsoString(row.createdAt),
      updatedAt: toIsoString(row.updatedAt),
    };
  }

  private toVersionSummary(
    version: SkillTemplateVersionModel,
    activeVersionId: string | null,
  ): SkillTemplateVersionSummary {
    return {
      id: version.id,
      version: version.version,
      sourceText: version.sourceText,
      status: version.status === "valid" ? "valid" : "invalid",
      diagnostics: diagnosticsFromJson(version.diagnosticsJson),
      createdAt: toIsoString(version.createdAt),
      active: version.id === activeVersionId,
    };
  }
}
