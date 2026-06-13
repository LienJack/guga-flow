import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  PROJECT_ASPECT_RATIOS,
  type CreateProjectInput,
  type GenerationCreativeSettings,
  type ProjectAspectRatio,
  type ProjectDetail,
  type ProjectListItem,
  type UpdateProjectInput,
  normalizeGenerationCreativeSettings,
} from "@guga-flow/shared-types";

import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { LocalStorageService } from "../storage/local-storage.service";

const DEFAULT_USER_ID = "default-user";
const DEFAULT_PROJECT_ASPECT_RATIO: ProjectAspectRatio = "9:16";

type ProjectModel = {
  id: string;
  ownerUserId: string;
  title: string;
  description: string | null;
  defaultAspectRatio: string;
  generationSettingsJson: unknown | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  _count?: {
    assets?: number;
  };
};

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeText(value: string): string {
  return value.trim();
}

function normalizeDescription(value: string | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function toProjectAspectRatio(value: string | undefined): ProjectAspectRatio {
  if (PROJECT_ASPECT_RATIOS.includes(value as ProjectAspectRatio)) {
    return value as ProjectAspectRatio;
  }

  return DEFAULT_PROJECT_ASPECT_RATIO;
}

function normalizeProjectGenerationSettings(value: unknown): GenerationCreativeSettings | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const normalized = normalizeGenerationCreativeSettings(value);
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function toInputJsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function projectGenerationSettingsJson(value: unknown): Prisma.InputJsonValue | undefined {
  const normalized = normalizeProjectGenerationSettings(value);
  return normalized ? toInputJsonValue(normalized) : undefined;
}

function nullableProjectGenerationSettingsJson(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return projectGenerationSettingsJson(value) ?? Prisma.JsonNull;
}

@Injectable()
export class ProjectsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(LocalStorageService) private readonly storage: LocalStorageService,
  ) {}

  async listProjects(): Promise<ProjectListItem[]> {
    const projects = await this.prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { assets: true } } },
    });

    return projects.map((project) => this.toProjectRecord(project));
  }

  async createProject(input: CreateProjectInput): Promise<ProjectDetail> {
    await this.ensureDefaultUser();

    const title = normalizeText(input.title);
    if (!title) {
      throw new BadRequestException("Project title is required");
    }

    const project = await this.prisma.project.create({
      data: {
        ownerUserId: DEFAULT_USER_ID,
        title,
        description: normalizeDescription(input.description),
        defaultAspectRatio: input.defaultAspectRatio ?? DEFAULT_PROJECT_ASPECT_RATIO,
        generationSettingsJson: projectGenerationSettingsJson(input.generationSettings),
      },
      include: { _count: { select: { assets: true } } },
    });

    return this.toProjectRecord(project);
  }

  async getProject(projectId: string): Promise<ProjectDetail> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { _count: { select: { assets: true } } },
    });

    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return this.toProjectRecord(project);
  }

  async updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectDetail> {
    await this.getProject(projectId);

    const data: {
      title?: string;
      description?: string | null;
      defaultAspectRatio?: ProjectAspectRatio;
      generationSettingsJson?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
    } = {};

    if (input.title !== undefined) {
      const title = normalizeText(input.title);
      if (!title) {
        throw new BadRequestException("Project title is required");
      }
      data.title = title;
    }

    const description = normalizeDescription(input.description);
    if (description !== undefined) {
      data.description = description;
    }

    if (input.defaultAspectRatio !== undefined) {
      data.defaultAspectRatio = input.defaultAspectRatio;
    }

    if (input.generationSettings !== undefined) {
      data.generationSettingsJson = nullableProjectGenerationSettingsJson(input.generationSettings);
    }

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data,
      include: { _count: { select: { assets: true } } },
    });

    return this.toProjectRecord(project);
  }

  async duplicateProject(projectId: string): Promise<ProjectDetail> {
    const source = await this.getProject(projectId);
    await this.ensureDefaultUser();

    const duplicate = await this.prisma.project.create({
      data: {
        ownerUserId: DEFAULT_USER_ID,
        title: `${source.title} Copy`,
        description: source.description ?? null,
        defaultAspectRatio: source.defaultAspectRatio,
        generationSettingsJson: projectGenerationSettingsJson(source.generationSettings),
      },
      include: { _count: { select: { assets: true } } },
    });

    return this.toProjectRecord(duplicate);
  }

  async deleteProject(projectId: string): Promise<{ deleted: true }> {
    await this.getProject(projectId);
    const assets = await this.prisma.asset.findMany({
      where: { projectId },
      select: { storageKey: true },
    });

    for (const asset of assets) {
      await this.storage.deleteObject(asset.storageKey);
    }

    await this.prisma.project.delete({ where: { id: projectId } });

    return { deleted: true };
  }

  private async ensureDefaultUser(): Promise<void> {
    await this.prisma.user.upsert({
      where: { id: DEFAULT_USER_ID },
      update: {},
      create: {
        id: DEFAULT_USER_ID,
        email: "default@guga-flow.local",
        name: "Default User",
      },
    });
  }

  private toProjectRecord(project: ProjectModel): ProjectDetail {
    return {
      id: project.id,
      ownerUserId: project.ownerUserId,
      title: project.title,
      description: project.description ?? undefined,
      defaultAspectRatio: toProjectAspectRatio(project.defaultAspectRatio),
      generationSettings: normalizeProjectGenerationSettings(project.generationSettingsJson),
      createdAt: toIsoString(project.createdAt),
      updatedAt: toIsoString(project.updatedAt),
      assetCount: project._count?.assets ?? 0,
    };
  }
}
