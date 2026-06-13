import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type {
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
import { SKILL_TEMPLATE_KINDS } from "@guga-flow/shared-types";

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

@Injectable()
export class SkillTemplatesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listSkillTemplates(projectId: string): Promise<SkillTemplateListResult> {
    await this.ensureProject(projectId);
    await this.ensureDefaultTemplates(projectId);
    const rows = (await this.skillPrisma().skillTemplate.findMany({
      where: { projectId },
      include: { versions: { orderBy: { version: "desc" } } },
      orderBy: [{ kind: "asc" }, { displayName: "asc" }],
    })) as SkillTemplateModel[];

    return { templates: rows.map((row) => this.toSummary(row)) };
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
  ): Promise<SkillTemplatePromptContext[]> {
    await this.ensureProject(projectId);
    await this.ensureDefaultTemplates(projectId);
    const allowed = new Set(kinds);
    const rows = (await this.skillPrisma().skillTemplate.findMany({
      where: { projectId, enabled: true },
      include: { versions: { orderBy: { version: "desc" } } },
      orderBy: [{ kind: "asc" }, { displayName: "asc" }],
    })) as SkillTemplateModel[];

    return rows
      .filter((row) => allowed.has(this.requireSkillKind(row.kind)))
      .map((row) => {
        const version = (row.versions ?? []).find((candidate) => candidate.id === row.activeVersionId);
        if (!version || version.status !== "valid") {
          return undefined;
        }
        return {
          id: row.id,
          kind: this.requireSkillKind(row.kind),
          slug: row.slug,
          displayName: row.displayName,
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
          return templates;
        }
      } catch {
        // Try the next plausible root.
      }
    }
    throw new Error("No default skill templates were found in data/skills");
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
    return {
      id: row.id,
      projectId: row.projectId,
      kind: this.requireSkillKind(row.kind),
      slug: row.slug,
      displayName: row.displayName,
      ...(row.description ? { description: row.description } : {}),
      enabled: row.enabled,
      ...(row.activeVersionId ? { activeVersionId: row.activeVersionId } : {}),
      versions: (row.versions ?? []).map((version) => this.toVersionSummary(version, row.activeVersionId)),
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
