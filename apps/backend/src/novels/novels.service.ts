import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateNovelDocumentInput,
  CreateNovelDocumentResult,
  DeleteNovelDocumentResult,
  ImportNovelSourceInput,
  ImportNovelSourceResult,
  NovelDocumentRecord,
  NovelLanguage,
  NovelSourceType,
  UpdateNovelDocumentInput,
  UpdateNovelDocumentResult,
} from "@guga-flow/shared-types";
import { NOVEL_LANGUAGES, NOVEL_SOURCE_TYPES } from "@guga-flow/shared-types";

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
}
