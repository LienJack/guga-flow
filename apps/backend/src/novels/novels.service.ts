import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateCreativeStoryboardInput,
  CreateCreativeStoryboardResult,
  CreateNovelDocumentInput,
  CreateNovelDocumentResult,
  DeleteNovelDocumentResult,
  GenerateStoryboardResult,
  GenerationJobRecord,
  GenerationJobStatus,
  ImportNovelSourceInput,
  ImportNovelSourceResult,
  MarkStoryboardDraftReadyResult,
  NovelDocumentRecord,
  NovelToStoryboardJobInput,
  NovelToStoryboardJobOutput,
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
  CREATIVE_AGENT_MODES,
  NOVEL_LANGUAGES,
  NOVEL_SOURCE_TYPES,
  STORYBOARD_DRAFT_STATUSES,
  validateStoryboardResult,
} from "@guga-flow/shared-types";
import { createMockProviderRegistry } from "@guga-flow/provider-contracts";

import { readAppConfig } from "../config/app-config";
import { Prisma } from "../generated/prisma/client";
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

type GenerationJobModel = {
  id: string;
  projectId: string;
  operation: string;
  status: string;
  provider: string;
  model: string | null;
  sourceNodeId: string | null;
  targetNodeId: string | null;
  providerTaskId: string | null;
  inputJson: unknown;
  outputJson: unknown | null;
  errorMessage: string | null;
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

function normalizeCreativeMode(value: CreateCreativeStoryboardInput["mode"]): NovelToStoryboardJobInput["mode"] {
  if (value && CREATIVE_AGENT_MODES.includes(value)) {
    return value;
  }
  return "novice";
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeTargetDurationSeconds(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Number.isInteger(value) || value < 15 || value > 180) {
    throw new BadRequestException("Target duration must be between 15 and 180 seconds");
  }
  return value;
}

function creativeBriefTitle(idea: string): string {
  const normalized = idea.replace(/\s+/g, " ").trim();
  return normalized.length > 42 ? `${normalized.slice(0, 42).trim()}...` : normalized;
}

function creativeBriefSource(input: NovelToStoryboardJobInput): string {
  const lines = [`Creative idea: ${input.idea}`];
  if (input.audience) {
    lines.push(`Audience: ${input.audience}`);
  }
  if (input.stylePrompt) {
    lines.push(`Style: ${input.stylePrompt}`);
  }
  if (input.targetDurationSeconds) {
    lines.push(`Target duration: ${input.targetDurationSeconds} seconds`);
  }
  lines.push(`Interaction layer: ${input.mode}`);
  return lines.join("\n");
}

function countWords(content: string): number {
  const cjkMatches = content.match(/[\u3040-\u30ff\u3400-\u9fff]/gu) ?? [];
  const latinText = content.replace(/[\u3040-\u30ff\u3400-\u9fff]/gu, " ");
  const wordMatches = latinText.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) ?? [];
  return cjkMatches.length + wordMatches.length;
}

function jsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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

  async createCreativeStoryboard(
    projectId: string,
    input: CreateCreativeStoryboardInput,
  ): Promise<CreateCreativeStoryboardResult> {
    await this.ensureProjectExists(projectId);
    const idea = normalizeText(input.idea, "Creative idea");
    const mode = normalizeCreativeMode(input.mode);
    const config = readAppConfig();
    const provider = createMockProviderRegistry().llm;
    const jobInput: NovelToStoryboardJobInput = {
      operation: "novel_to_storyboard",
      projectId,
      idea,
      mode,
      audience: normalizeOptionalText(input.audience),
      stylePrompt: normalizeOptionalText(input.stylePrompt),
      targetDurationSeconds: normalizeTargetDurationSeconds(input.targetDurationSeconds),
      provider: provider.capability.id,
      model: config.llmModel,
      forceFailure: input.forceFailure,
    };
    const sourceContent = creativeBriefSource(jobInput);

    const job = (await this.prisma.generationJob.create({
      data: {
        projectId,
        operation: "novel_to_storyboard",
        status: "running",
        provider: provider.capability.id,
        model: config.llmModel,
        inputJson: jsonValue(jobInput),
      },
    })) as GenerationJobModel;

    try {
      const novel = await this.prisma.novelDocument.create({
        data: {
          projectId,
          title: creativeBriefTitle(idea),
          content: sourceContent,
          sourceType: "paste",
          wordCount: countWords(sourceContent),
          language: normalizeLanguage(undefined, sourceContent),
        },
      });
      const candidate = await provider.generateStoryboard({
        projectId,
        title: novel.title,
        novelText: novel.content,
        forceFailure: input.forceFailure,
      });
      const validation = validateStoryboardResult(candidate);
      if (!validation.success) {
        await this.prisma.generationJob.update({
          where: { id: job.id },
          data: {
            status: "failed",
            outputJson: jsonValue({ validation }),
            errorMessage: this.validationMessage(validation.issues),
          },
        });
        throw new BadRequestException(this.validationMessage(validation.issues));
      }

      const draft = await this.prisma.storyboardDraft.create({
        data: {
          projectId,
          novelDocumentId: novel.id,
          status: "ready",
          storyboardJson: validation.data,
          validationIssuesJson: [],
          provider: provider.capability.id,
          model: config.llmModel,
          errorMessage: null,
          readyForImport: true,
        },
      });
      const output: NovelToStoryboardJobOutput = {
        operation: "novel_to_storyboard",
        novelDocumentId: novel.id,
        storyboardDraftId: draft.id,
        provider: provider.capability.id,
        model: config.llmModel,
        completedAt: new Date().toISOString(),
      };
      const completedJob = (await this.prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "succeeded",
          outputJson: jsonValue(output),
          errorMessage: null,
        },
      })) as GenerationJobModel;

      return {
        novel: this.toNovelRecord(novel),
        draft: this.toStoryboardDraftRecord(draft),
        validation,
        job: this.toGenerationJobRecord<NovelToStoryboardJobInput, NovelToStoryboardJobOutput>(
          completedJob,
        ),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : "Creative storyboard generation failed";
      await this.prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          outputJson: jsonValue({
            error: {
              provider: provider.capability.id,
              message,
              retryable: true,
            },
          }),
          errorMessage: message,
        },
      });
      throw new BadRequestException(message);
    }
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

  private toGenerationJobRecord<TInput, TOutput>(
    job: GenerationJobModel,
  ): GenerationJobRecord<TInput, TOutput> {
    return {
      id: job.id,
      projectId: job.projectId,
      operation: "novel_to_storyboard",
      status: job.status as GenerationJobStatus,
      provider: job.provider,
      model: job.model ?? undefined,
      sourceNodeId: job.sourceNodeId ?? undefined,
      targetNodeId: job.targetNodeId ?? undefined,
      providerTaskId: job.providerTaskId ?? undefined,
      inputJson: job.inputJson as TInput,
      outputJson: job.outputJson === null ? undefined : (job.outputJson as TOutput),
      errorMessage: job.errorMessage ?? undefined,
      createdAt: toIsoString(job.createdAt),
      updatedAt: toIsoString(job.updatedAt),
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
