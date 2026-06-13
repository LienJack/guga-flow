import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PrismaService } from "../prisma/prisma.service";
import { SkillTemplatesService } from "./skill-templates.service";

const createdAt = new Date("2026-06-13T00:00:00.000Z");
const updatedAt = new Date("2026-06-13T00:05:00.000Z");

type TemplateRow = {
  id: string;
  projectId: string;
  kind: string;
  slug: string;
  displayName: string;
  description: string | null;
  enabled: boolean;
  activeVersionId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type VersionRow = {
  id: string;
  skillTemplateId: string;
  version: number;
  sourceText: string;
  status: string;
  diagnosticsJson: unknown;
  createdAt: Date;
};

function createPrismaMock() {
  const templates = new Map<string, TemplateRow>();
  const versions = new Map<string, VersionRow>();

  function key(input: { projectId: string; kind: string; slug: string }): string {
    return `${input.projectId}:${input.kind}:${input.slug}`;
  }

  function withVersions(row: TemplateRow): TemplateRow & { versions: VersionRow[] } {
    return {
      ...row,
      versions: Array.from(versions.values())
        .filter((version) => version.skillTemplateId === row.id)
        .sort((a, b) => b.version - a.version),
    };
  }

  const prisma = {
    project: {
      findUnique: vi.fn(async () => ({ id: "project_1" })),
    },
    skillTemplate: {
      findMany: vi.fn(async (args?: any) => {
        let rows = Array.from(
          new Map(Array.from(templates.values()).map((row) => [row.id, row])).values(),
        );
        if (args?.where?.projectId) {
          rows = rows.filter((row) => row.projectId === args.where.projectId);
        }
        if (args?.where?.enabled !== undefined) {
          rows = rows.filter((row) => row.enabled === args.where.enabled);
        }
        return rows.map(withVersions);
      }),
      findUnique: vi.fn(async (args: any) => {
        const row = args.where?.id
          ? templates.get(args.where.id)
          : templates.get(key(args.where.projectId_kind_slug));
        return row ? withVersions(row) : null;
      }),
      create: vi.fn(async (args: any) => {
        const id = `skill_template_${templates.size + 1}`;
        const row: TemplateRow = {
          id,
          projectId: args.data.projectId,
          kind: args.data.kind,
          slug: args.data.slug,
          displayName: args.data.displayName,
          description: args.data.description ?? null,
          enabled: args.data.enabled ?? true,
          activeVersionId: args.data.activeVersionId ?? null,
          createdAt,
          updatedAt,
        };
        templates.set(key(row), row);
        templates.set(row.id, row);
        const createVersion = args.data.versions?.create;
        if (createVersion) {
          const version: VersionRow = {
            id: `skill_version_${versions.size + 1}`,
            skillTemplateId: row.id,
            version: createVersion.version,
            sourceText: createVersion.sourceText,
            status: createVersion.status,
            diagnosticsJson: createVersion.diagnosticsJson,
            createdAt,
          };
          versions.set(version.id, version);
        }
        return withVersions(row);
      }),
      update: vi.fn(async (args: any) => {
        const row = templates.get(args.where.id);
        if (!row) {
          throw new Error("Skill template not found");
        }
        Object.assign(row, args.data, { updatedAt });
        return withVersions(row);
      }),
    },
    skillTemplateVersion: {
      findUnique: vi.fn(async (args: any) => versions.get(args.where.id) ?? null),
      create: vi.fn(async (args: any) => {
        const version: VersionRow = {
          id: `skill_version_${versions.size + 1}`,
          skillTemplateId: args.data.skillTemplateId,
          version: args.data.version,
          sourceText: args.data.sourceText,
          status: args.data.status,
          diagnosticsJson: args.data.diagnosticsJson,
          createdAt,
        };
        versions.set(version.id, version);
        return version;
      }),
    },
  };

  return prisma;
}

describe("SkillTemplatesService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: SkillTemplatesService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new SkillTemplatesService(prisma as unknown as PrismaService);
  });

  it("seeds file-backed templates and returns active prompt contexts", async () => {
    const result = await service.listSkillTemplates("project_1");

    expect(result.templates.map((template) => template.kind).sort()).toEqual([
      "agent",
      "art",
      "production",
      "story",
    ]);
    expect(result.templates.every((template) => template.activeVersionId)).toBe(true);
    expect(result.templates.find((template) => template.kind === "art")?.versions[0]).toMatchObject({
      version: 1,
      status: "valid",
      active: true,
    });

    const contexts = await service.activePromptContexts("project_1", ["story", "art", "production"]);
    expect(contexts.map((context) => context.kind).sort()).toEqual(["art", "production", "story"]);
    expect(contexts.find((context) => context.kind === "art")?.sourceText).toContain("visual direction");
  });

  it("saves versions, blocks invalid activation, and rolls back to earlier valid text", async () => {
    const seeded = await service.listSkillTemplates("project_1");
    const art = seeded.templates.find((template) => template.kind === "art");
    const version1Id = art?.activeVersionId ?? "";

    const updated = await service.updateSkillTemplateSource("project_1", "art", "art-default", {
      sourceText: "Use bold silhouettes and one clear continuity anchor per shot.",
    });
    const version2Id = updated.template.activeVersionId ?? "";

    expect(updated.template.versions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ version: 2, status: "valid", active: true }),
        expect.objectContaining({ id: version1Id, version: 1, active: false }),
      ]),
    );
    await expect(
      service.updateSkillTemplateSource("project_1", "art", "art-default", {
        sourceText: "export default function skill() { return 'run'; }",
      }),
    ).resolves.toMatchObject({
      template: {
        activeVersionId: version2Id,
        versions: expect.arrayContaining([
          expect.objectContaining({ version: 3, status: "invalid", active: false }),
        ]),
      },
    });
    const invalidVersion = (await service.listSkillTemplates("project_1")).templates
      .find((template) => template.kind === "art")
      ?.versions.find((version) => version.status === "invalid");

    await expect(
      service.activateSkillTemplateVersion(
        "project_1",
        "art",
        "art-default",
        invalidVersion?.id ?? "",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    const rolledBack = await service.activateSkillTemplateVersion(
      "project_1",
      "art",
      "art-default",
      version1Id,
    );
    expect(rolledBack.template.activeVersionId).toBe(version1Id);
    const contexts = await service.activePromptContexts("project_1", ["art"]);
    expect(contexts[0]?.sourceText).toContain("visual direction");
  });
});
