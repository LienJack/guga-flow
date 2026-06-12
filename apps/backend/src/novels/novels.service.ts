import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateNovelDocumentInput,
  CreateNovelDocumentResult,
  DeleteNovelDocumentResult,
  GenerateStoryboardResult,
  ImportNovelSourceInput,
  ImportNovelSourceResult,
  MarkStoryboardDraftReadyResult,
  NovelDocumentRecord,
  NovelLanguage,
  NovelSourceType,
  StoryboardDraftRecord,
  StoryboardDraftStatus,
  StoryboardValidationIssue,
  StoryboardValidationResult,
  UpdateStoryboardDraftInput,
  UpdateStoryboardDraftResult,
  UpdateNovelDocumentInput,
  UpdateNovelDocumentResult,
} from "@guga-flow/shared-types";
import {
  NOVEL_LANGUAGES,
  NOVEL_SOURCE_TYPES,
  STORYBOARD_DRAFT_STATUSES,
  validateStoryboardResult,
} from "@guga-flow/shared-types";
import { createMockProviderRegistry } from "@guga-flow/provider-contracts";

import { readAppConfig } from "../config/app-config";
import { PrismaService } from "../prisma/prisma.service";

type NovelDocumentModel = {
  id: string;
  projectId: string;
  title: string;
  content: string;
  sourceType: string;
  wordCount: number;
  language: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type StoryboardDraftModel = {
  id: string;
  projectId: string;
  novelDocumentId: string;
  status: string;
  storyboardJson: unknown | null;
  validationIssuesJson: unknown;
  provider: string;
  model: string | null;
  errorMessage: string | null;
  readyForImport: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function normalizeText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new BadRequestException(`${fieldName} is required`);
  }
  return trimmed;
}

function normalizeSourceType(value: NovelSourceType | undefined): NovelSourceType {
  if (value && NOVEL_SOURCE_TYPES.includes(value)) {
    return value;
  }
  return "paste";
}

function normalizeImportSourceType(value: ImportNovelSourceInput["sourceType"]): Exclude<NovelSourceType, "paste"> {
  if (value === "txt" || value === "md") {
    return value;
  }
  throw new BadRequestException("Novel source type must be txt or md");
}

function normalizeLanguage(value: NovelLanguage | undefined, content: string): NovelLanguage {
  if (value && NOVEL_LANGUAGES.includes(value)) {
    return value;
  }

  if (/[\u3040-\u30ff]/u.test(content)) {
    return "ja";
  }
  if (/[\u3400-\u9fff]/u.test(content)) {
    return "zh";
  }
  if (/[a-z]/iu.test(content)) {
    return "en";
  }
  return "other";
}

function countWords(content: string): number {
  const cjkMatches = content.match(/[\u3040-\u30ff\u3400-\u9fff]/gu) ?? [];
  const latinText = content.replace(/[\u3040-\u30ff\u3400-\u9fff]/gu, " ");
  const wordMatches = latinText.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) ?? [];
  return cjkMatches.length + wordMatches.length;
}

@Injectable()
export class NovelsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listNovels(projectId: string): Promise<NovelDocumentRecord[]> {
    await this.ensureProjectExists(projectId);
    const novels = await this.prisma.novelDocument.findMany({
      where: { projectId },
      orderBy: { updatedAt: "desc" },
    });

    return novels.map((novel) => this.toNovelRecord(novel));
  }

  async createNovel(
    projectId: string,
    input: CreateNovelDocumentInput,
  ): Promise<CreateNovelDocumentResult> {
    await this.ensureProjectExists(projectId);
    const content = normalizeText(input.content, "Novel content");
    const novel = await this.prisma.novelDocument.create({
      data: {
        projectId,
        title: normalizeText(input.title, "Novel title"),
        content,
        sourceType: normalizeSourceType(input.sourceType),
        wordCount: countWords(content),
        language: normalizeLanguage(input.language, content),
      },
    });

    return { novel: this.toNovelRecord(novel) };
  }

  async importSource(
    projectId: string,
    input: ImportNovelSourceInput,
  ): Promise<ImportNovelSourceResult> {
    return this.createNovel(projectId, {
      title: input.title,
      content: input.content,
      sourceType: normalizeImportSourceType(input.sourceType),
      language: input.language,
    });
  }

  async getNovel(projectId: string, novelId: string): Promise<NovelDocumentRecord> {
    const novel = await this.findNovel(projectId, novelId);
    return this.toNovelRecord(novel);
  }

  async updateNovel(
    projectId: string,
    novelId: string,
    input: UpdateNovelDocumentInput,
  ): Promise<UpdateNovelDocumentResult> {
    const existing = await this.findNovel(projectId, novelId);
    const content = input.content === undefined ? existing.content : normalizeText(input.content, "Novel content");
    const language =
      input.content !== undefined || input.language !== undefined
        ? normalizeLanguage(input.language, content)
        : undefined;

    const novel = await this.prisma.novelDocument.update({
      where: { id: existing.id },
      data: {
        title:
          input.title === undefined
            ? undefined
            : normalizeText(input.title, "Novel title"),
        content: input.content === undefined ? undefined : content,
        wordCount: input.content === undefined ? undefined : countWords(content),
        language,
      },
    });

    return { novel: this.toNovelRecord(novel) };
  }

  async deleteNovel(projectId: string, novelId: string): Promise<DeleteNovelDocumentResult> {
    const existing = await this.findNovel(projectId, novelId);
    await this.prisma.novelDocument.delete({ where: { id: existing.id } });
    return { deleted: true, novelId: existing.id };
  }

  async generateStoryboard(
    projectId: string,
    novelId: string,
  ): Promise<GenerateStoryboardResult> {
    const novel = await this.findNovel(projectId, novelId);
    const config = readAppConfig();
    const provider = createMockProviderRegistry().llm;
    let validation: StoryboardValidationResult;

    try {
      const candidate = await provider.generateStoryboard({
        projectId,
        title: novel.title,
        novelText: novel.content,
      });
      validation = validateStoryboardResult(candidate);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Storyboard generation failed",
      );
    }

    if (!validation.success) {
      return { validation };
    }

    const draft = await this.prisma.storyboardDraft.create({
      data: {
        projectId,
        novelDocumentId: novel.id,
        status: "valid",
        storyboardJson: validation.data,
        validationIssuesJson: [],
        provider: provider.capability.id,
        model: config.llmModel,
        errorMessage: null,
        readyForImport: false,
      },
    });

    return {
      draft: this.toStoryboardDraftRecord(draft),
      validation,
    };
  }

  async getActiveStoryboardDraft(
    projectId: string,
    novelId: string,
  ): Promise<StoryboardDraftRecord> {
    await this.findNovel(projectId, novelId);
    const draft = await this.prisma.storyboardDraft.findFirst({
      where: { projectId, novelDocumentId: novelId },
      orderBy: { updatedAt: "desc" },
    });
    if (!draft) {
      throw new NotFoundException("Storyboard draft not found");
    }

    return this.toStoryboardDraftRecord(draft);
  }

  async updateStoryboardDraft(
    projectId: string,
    novelId: string,
    draftId: string,
    input: UpdateStoryboardDraftInput,
  ): Promise<UpdateStoryboardDraftResult> {
    const existing = await this.findStoryboardDraft(projectId, novelId, draftId);
    const validation = validateStoryboardResult(input.storyboard);
    if (!validation.success) {
      throw new BadRequestException(this.validationMessage(validation.issues));
    }

    const draft = await this.prisma.storyboardDraft.update({
      where: { id: existing.id },
      data: {
        status: "valid",
        storyboardJson: validation.data,
        validationIssuesJson: [],
        errorMessage: null,
        readyForImport: false,
      },
    });

    return { draft: this.toStoryboardDraftRecord(draft) };
  }

  async markStoryboardDraftReady(
    projectId: string,
    novelId: string,
    draftId: string,
  ): Promise<MarkStoryboardDraftReadyResult> {
    const existing = await this.findStoryboardDraft(projectId, novelId, draftId);
    const validation = validateStoryboardResult(existing.storyboardJson);
    if (!validation.success) {
      throw new BadRequestException(this.validationMessage(validation.issues));
    }

    const draft = await this.prisma.storyboardDraft.update({
      where: { id: existing.id },
      data: {
        status: "ready",
        storyboardJson: validation.data,
        validationIssuesJson: [],
        errorMessage: null,
        readyForImport: true,
      },
    });

    return { draft: this.toStoryboardDraftRecord(draft) };
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
  }

  private async findNovel(projectId: string, novelId: string): Promise<NovelDocumentModel> {
    const novel = await this.prisma.novelDocument.findFirst({
      where: { id: novelId, projectId },
    });
    if (!novel) {
      throw new NotFoundException("Novel not found");
    }
    return novel;
  }

  private async findStoryboardDraft(
    projectId: string,
    novelId: string,
    draftId: string,
  ): Promise<StoryboardDraftModel> {
    await this.findNovel(projectId, novelId);
    const draft = await this.prisma.storyboardDraft.findFirst({
      where: { id: draftId, projectId, novelDocumentId: novelId },
    });
    if (!draft) {
      throw new NotFoundException("Storyboard draft not found");
    }
    return draft;
  }

  private toNovelRecord(novel: NovelDocumentModel): NovelDocumentRecord {
    return {
      id: novel.id,
      projectId: novel.projectId,
      title: novel.title,
      content: novel.content,
      sourceType: NOVEL_SOURCE_TYPES.includes(novel.sourceType as NovelSourceType)
        ? (novel.sourceType as NovelSourceType)
        : "paste",
      wordCount: novel.wordCount,
      language: NOVEL_LANGUAGES.includes(novel.language as NovelLanguage)
        ? (novel.language as NovelLanguage)
        : "other",
      createdAt: toIsoString(novel.createdAt),
      updatedAt: toIsoString(novel.updatedAt),
    };
  }

  private toStoryboardDraftRecord(draft: StoryboardDraftModel): StoryboardDraftRecord {
    const validation = validateStoryboardResult(draft.storyboardJson);
    return {
      id: draft.id,
      projectId: draft.projectId,
      novelDocumentId: draft.novelDocumentId,
      status: this.toStoryboardDraftStatus(draft.status),
      storyboard: validation.success ? validation.data : undefined,
      validationIssues: this.toValidationIssues(draft.validationIssuesJson),
      provider: draft.provider,
      model: draft.model ?? undefined,
      errorMessage: draft.errorMessage ?? undefined,
      readyForImport: draft.readyForImport,
      createdAt: toIsoString(draft.createdAt),
      updatedAt: toIsoString(draft.updatedAt),
    };
  }

  private toStoryboardDraftStatus(value: string): StoryboardDraftStatus {
    return STORYBOARD_DRAFT_STATUSES.includes(value as StoryboardDraftStatus)
      ? (value as StoryboardDraftStatus)
      : "invalid";
  }

  private toValidationIssues(value: unknown): StoryboardValidationIssue[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.flatMap((item) => {
      if (
        typeof item === "object" &&
        item !== null &&
        Array.isArray((item as { path?: unknown }).path) &&
        typeof (item as { message?: unknown }).message === "string"
      ) {
        return [
          {
            path: (item as { path: unknown[] }).path.filter(
              (part): part is string | number =>
                typeof part === "string" || typeof part === "number",
            ),
            message: (item as { message: string }).message,
          },
        ];
      }
      return [];
    });
  }

  private validationMessage(issues: StoryboardValidationIssue[]): string {
    return issues.length > 0
      ? issues.map((issue) => issue.message).join(", ")
      : "Storyboard draft is invalid";
  }
}
