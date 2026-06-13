import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateCreativeStoryboardInput,
  CreateCreativeStoryboardResult,
  CreateNovelDocumentInput,
  CreateNovelDocumentResult,
  DeleteNovelDocumentResult,
  ExtractNovelEventsResult,
  GenerateStoryboardResult,
  GenerationJobRecord,
  GenerationJobStatus,
  ImportNovelSourceInput,
  ImportNovelSourceResult,
  MarkStoryboardDraftReadyResult,
  NovelDocumentRecord,
  NovelEventGraphRecord,
  NovelChapterSummary,
  NovelToStoryboardJobInput,
  NovelToStoryboardJobOutput,
  NovelLanguage,
  NovelSourceType,
  StoryboardDraftRecord,
  StoryboardDraftStatus,
  CreateScriptDraftInput,
  CreateScriptDraftResult,
  ScriptAdaptationStrategy,
  ScriptBeat,
  ScriptDraftContent,
  ScriptDraftListResult,
  ScriptDraftRecord,
  ScriptDraftStatus,
  ScriptExportResult,
  ScriptScene,
  StoryboardResult,
  StoryTimelineEvent,
  StorySeedReference,
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
  SCRIPT_ADAPTATION_STRATEGIES,
  SCRIPT_DRAFT_STATUSES,
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

type NovelEventGraphModel = {
  id: string;
  projectId: string;
  novelDocumentId: string;
  chaptersJson: unknown;
  eventsJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ScriptDraftModel = {
  id: string;
  projectId: string;
  novelDocumentId: string;
  version: number;
  title: string;
  strategy: string;
  status: string;
  scriptJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ReferenceImageNodeModel = {
  id: string;
  title: string | null;
  type: string;
  dataJson: unknown;
};

type ReferenceAssetModel = {
  id: string;
  type: string;
  mimeType: string;
  originalFilename: string | null;
};

type ParsedNovelChapter = NovelChapterSummary & {
  text: string;
};

interface CreativeStorySeedResolution {
  referenceAssetIds: string[];
  referenceImageNodeIds: string[];
  referencePrompt?: string;
  storySeedReferences: StorySeedReference[];
}

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

function normalizeStringList(value: readonly string[] | undefined, fieldName: string): string[] {
  const ids = Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean)));
  if (ids.length > 8) {
    throw new BadRequestException(`${fieldName} supports up to 8 references`);
  }
  return ids;
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
  if (input.referenceAssetIds?.length) {
    lines.push(`Reference image assets: ${input.referenceAssetIds.join(", ")}`);
  }
  if (input.referenceImageNodeIds?.length) {
    lines.push(`Reference image nodes: ${input.referenceImageNodeIds.join(", ")}`);
  }
  if (input.referencePrompt) {
    lines.push(`Reference instruction: ${input.referencePrompt}`);
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

function applyStorySeedReferences(
  storyboard: StoryboardResult,
  seeds: CreativeStorySeedResolution,
): StoryboardResult {
  if (seeds.referenceAssetIds.length === 0 && seeds.storySeedReferences.length === 0) {
    return storyboard;
  }

  return {
    ...storyboard,
    storySeedReferences: mergeStorySeedReferences(
      storyboard.storySeedReferences ?? [],
      seeds.storySeedReferences,
    ),
    characters: storyboard.characters.map((character, index) =>
      index === 0
        ? {
            ...character,
            referenceAssetIds: uniqueStrings([
              ...(character.referenceAssetIds ?? []),
              ...seeds.referenceAssetIds,
            ]),
          }
        : character,
    ),
    locations: storyboard.locations.map((location, index) =>
      index === 0
        ? {
            ...location,
            referenceAssetIds: uniqueStrings([
              ...(location.referenceAssetIds ?? []),
              ...seeds.referenceAssetIds,
            ]),
          }
        : location,
    ),
    scenes: storyboard.scenes.map((scene) => ({
      ...scene,
      shots: scene.shots.map((shot) => ({
        ...shot,
        referenceAssetIds: uniqueStrings([
          ...(shot.referenceAssetIds ?? []),
          ...seeds.referenceAssetIds,
        ]),
      })),
    })),
  };
}

function mergeStorySeedReferences(
  current: readonly StorySeedReference[],
  next: readonly StorySeedReference[],
): StorySeedReference[] {
  const references = [...current, ...next];
  const seen = new Set<string>();
  return references.filter((reference) => {
    const key = [
      reference.assetId ? `asset:${reference.assetId}` : "",
      reference.imageNodeId ? `node:${reference.imageNodeId}` : "",
      reference.prompt ? `prompt:${reference.prompt}` : "",
    ].filter(Boolean).join("|");
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function optionalDataString(value: unknown, key: string): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : undefined;
}

function truncateText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 3).trim()}...` : normalized;
}

function isChapterHeading(line: string): boolean {
  const trimmed = line.trim();
  return (
    /^#{1,6}\s+\S/.test(trimmed) ||
    /^chapter\s+\d+[\s:.-]/iu.test(trimmed) ||
    /^chapter\s+\d+$/iu.test(trimmed) ||
    /^第[一二三四五六七八九十百千0-9]+[章节回][\s:：.-]*/u.test(trimmed)
  );
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

  async extractChapterEvents(
    projectId: string,
    novelId: string,
  ): Promise<ExtractNovelEventsResult> {
    const novel = await this.findNovel(projectId, novelId);
    const { chapters, events } = this.extractEventGraph(novel);
    const eventGraph = (await this.prisma.novelEventGraph.create({
      data: {
        projectId,
        novelDocumentId: novel.id,
        chaptersJson: jsonValue(chapters),
        eventsJson: jsonValue(events),
      },
    })) as NovelEventGraphModel;

    return { eventGraph: this.toNovelEventGraphRecord(eventGraph) };
  }

  async getLatestEventGraph(
    projectId: string,
    novelId: string,
  ): Promise<NovelEventGraphRecord> {
    await this.findNovel(projectId, novelId);
    const eventGraph = await this.findLatestEventGraph(projectId, novelId);
    if (!eventGraph) {
      throw new NotFoundException("Novel event graph not found");
    }
    return this.toNovelEventGraphRecord(eventGraph);
  }

  async listScriptDrafts(
    projectId: string,
    novelId: string,
  ): Promise<ScriptDraftListResult> {
    await this.findNovel(projectId, novelId);
    const scriptDrafts = (await this.prisma.scriptDraft.findMany({
      where: { projectId, novelDocumentId: novelId },
      orderBy: { version: "desc" },
    })) as ScriptDraftModel[];

    return { scriptDrafts: scriptDrafts.map((draft) => this.toScriptDraftRecord(draft)) };
  }

  async createScriptDraft(
    projectId: string,
    novelId: string,
    input: CreateScriptDraftInput,
  ): Promise<CreateScriptDraftResult> {
    const novel = await this.findNovel(projectId, novelId);
    const strategy = this.normalizeScriptStrategy(input.strategy);
    const latestDrafts = (await this.prisma.scriptDraft.findMany({
      where: { projectId, novelDocumentId: novel.id },
      orderBy: { version: "desc" },
      take: 1,
    })) as ScriptDraftModel[];
    const version = (latestDrafts[0]?.version ?? 0) + 1;
    const eventGraph = await this.findLatestEventGraph(projectId, novel.id);
    const title = normalizeOptionalText(input.title) ?? `${novel.title} Script v${version}`;
    const script = this.buildScriptDraftContent(
      novel,
      strategy,
      version,
      eventGraph ? this.toNovelEventGraphRecord(eventGraph) : undefined,
      title,
    );

    const scriptDraft = (await this.prisma.scriptDraft.create({
      data: {
        projectId,
        novelDocumentId: novel.id,
        version,
        title: script.title,
        strategy,
        status: "draft",
        scriptJson: jsonValue(script),
      },
    })) as ScriptDraftModel;

    return { scriptDraft: this.toScriptDraftRecord(scriptDraft) };
  }

  async exportScriptDraft(
    projectId: string,
    novelId: string,
    scriptDraftId: string,
  ): Promise<ScriptExportResult> {
    const scriptDraft = await this.findScriptDraft(projectId, novelId, scriptDraftId);
    const record = this.toScriptDraftRecord(scriptDraft);
    await this.prisma.scriptDraft.update({
      where: { id: scriptDraft.id },
      data: { status: "exported" },
    });

    return {
      scriptDraftId: scriptDraft.id,
      filename: this.scriptExportFilename(record),
      content: this.scriptExportContent(record.script),
    };
  }

  async generateStoryboardFromScriptDraft(
    projectId: string,
    novelId: string,
    scriptDraftId: string,
  ): Promise<GenerateStoryboardResult> {
    const scriptDraft = await this.findScriptDraft(projectId, novelId, scriptDraftId);
    const record = this.toScriptDraftRecord(scriptDraft);
    const validation = validateStoryboardResult(this.storyboardFromScriptDraft(record));
    if (!validation.success) {
      return { validation };
    }

    const draft = (await this.prisma.storyboardDraft.create({
      data: {
        projectId,
        novelDocumentId: novelId,
        status: "valid",
        storyboardJson: validation.data,
        validationIssuesJson: [],
        provider: "local-script-workbench",
        model: "deterministic-script-v1",
        errorMessage: null,
        readyForImport: false,
      },
    })) as StoryboardDraftModel;
    await this.prisma.scriptDraft.update({
      where: { id: scriptDraft.id },
      data: { status: "selected" },
    });

    return {
      draft: this.toStoryboardDraftRecord(draft),
      validation,
    };
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
    const storySeeds = await this.resolveCreativeStorySeeds(projectId, input);
    const jobInput: NovelToStoryboardJobInput = {
      operation: "novel_to_storyboard",
      projectId,
      idea,
      mode,
      audience: normalizeOptionalText(input.audience),
      stylePrompt: normalizeOptionalText(input.stylePrompt),
      targetDurationSeconds: normalizeTargetDurationSeconds(input.targetDurationSeconds),
      referenceAssetIds: storySeeds.referenceAssetIds,
      referenceImageNodeIds: storySeeds.referenceImageNodeIds,
      referencePrompt: storySeeds.referencePrompt,
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
        sourceNodeId: storySeeds.referenceImageNodeIds[0],
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
        referenceAssetIds: storySeeds.referenceAssetIds,
        referenceImageNodeIds: storySeeds.referenceImageNodeIds,
        referencePrompt: storySeeds.referencePrompt,
        forceFailure: input.forceFailure,
      });
      const validation = validateStoryboardResult(
        applyStorySeedReferences(candidate, storySeeds),
      );
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
        referenceAssetIds: storySeeds.referenceAssetIds,
        referenceImageNodeIds: storySeeds.referenceImageNodeIds,
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
      const eventGraph = await this.findLatestEventGraph(projectId, novel.id);
      validation = validateStoryboardResult(
        eventGraph
          ? this.applyEventGraphToStoryboard(candidate, this.toNovelEventGraphRecord(eventGraph))
          : candidate,
      );
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

  private async resolveCreativeStorySeeds(
    projectId: string,
    input: CreateCreativeStoryboardInput,
  ): Promise<CreativeStorySeedResolution> {
    const directAssetIds = normalizeStringList(input.referenceAssetIds, "Reference assets");
    const referenceImageNodeIds = normalizeStringList(input.referenceImageNodeIds, "Reference image nodes");
    const referencePrompt = normalizeOptionalText(input.referencePrompt);

    const imageNodes =
      referenceImageNodeIds.length > 0
        ? ((await this.prisma.canvasNode.findMany({
            where: { id: { in: referenceImageNodeIds }, projectId, type: "image" },
            select: { id: true, title: true, type: true, dataJson: true },
          })) as ReferenceImageNodeModel[])
        : [];
    if (imageNodes.length !== referenceImageNodeIds.length) {
      throw new BadRequestException("Reference ImageNodes must be image nodes in this project");
    }

    const assetIdByImageNodeId = new Map<string, string>();
    imageNodes.forEach((node) => {
      const assetId = optionalDataString(node.dataJson, "assetId");
      if (!assetId) {
        throw new BadRequestException("Reference ImageNodes must have an attached asset");
      }
      assetIdByImageNodeId.set(node.id, assetId);
    });

    const referenceAssetIds = uniqueStrings([
      ...directAssetIds,
      ...referenceImageNodeIds.flatMap((nodeId) => {
        const assetId = assetIdByImageNodeId.get(nodeId);
        return assetId ? [assetId] : [];
      }),
    ]);

    const assets =
      referenceAssetIds.length > 0
        ? ((await this.prisma.asset.findMany({
            where: { id: { in: referenceAssetIds }, projectId, type: "image" },
            select: { id: true, type: true, mimeType: true, originalFilename: true },
          })) as ReferenceAssetModel[])
        : [];
    if (assets.length !== referenceAssetIds.length) {
      throw new BadRequestException("Reference assets must be image assets in this project");
    }

    const imageNodeIdByAssetId = new Map<string, string>();
    for (const [imageNodeId, assetId] of assetIdByImageNodeId.entries()) {
      if (!imageNodeIdByAssetId.has(assetId)) {
        imageNodeIdByAssetId.set(assetId, imageNodeId);
      }
    }
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));

    return {
      referenceAssetIds,
      referenceImageNodeIds,
      referencePrompt,
      storySeedReferences: referenceAssetIds.map((assetId, index) => ({
        assetId,
        label: assetById.get(assetId)?.originalFilename ?? `Story seed ${index + 1}`,
        ...(imageNodeIdByAssetId.get(assetId)
          ? { imageNodeId: imageNodeIdByAssetId.get(assetId) }
          : {}),
        ...(referencePrompt ? { prompt: referencePrompt } : {}),
      })),
    };
  }

  private async findLatestEventGraph(
    projectId: string,
    novelId: string,
  ): Promise<NovelEventGraphModel | null> {
    return (await this.prisma.novelEventGraph.findFirst({
      where: { projectId, novelDocumentId: novelId },
      orderBy: { createdAt: "desc" },
    })) as NovelEventGraphModel | null;
  }

  private async findScriptDraft(
    projectId: string,
    novelId: string,
    scriptDraftId: string,
  ): Promise<ScriptDraftModel> {
    await this.findNovel(projectId, novelId);
    const scriptDraft = await this.prisma.scriptDraft.findFirst({
      where: { id: scriptDraftId, projectId, novelDocumentId: novelId },
    });
    if (!scriptDraft) {
      throw new NotFoundException("Script draft not found");
    }
    return scriptDraft as ScriptDraftModel;
  }

  private normalizeScriptStrategy(
    value: ScriptAdaptationStrategy | undefined,
  ): ScriptAdaptationStrategy {
    return value && SCRIPT_ADAPTATION_STRATEGIES.includes(value) ? value : "faithful";
  }

  private buildScriptDraftContent(
    novel: NovelDocumentModel,
    strategy: ScriptAdaptationStrategy,
    version: number,
    eventGraph?: NovelEventGraphRecord,
    title = `${novel.title} Script v${version}`,
  ): ScriptDraftContent {
    const beats =
      eventGraph && eventGraph.events.length > 0
        ? this.scriptBeatsFromEventGraph(eventGraph)
        : this.fallbackScriptBeats(novel);
    const scenes = this.scriptScenesFromBeats(beats.length > 0 ? beats : this.fallbackScriptBeats(novel));
    const strategyLabel =
      strategy === "short_drama"
        ? "Short-drama"
        : strategy === "visual_first"
          ? "Visual-first"
          : "Faithful";

    return {
      title,
      logline: `${strategyLabel} adaptation of ${novel.title} across ${scenes.length} scene${scenes.length === 1 ? "" : "s"}.`,
      strategy,
      scenes,
    };
  }

  private scriptBeatsFromEventGraph(eventGraph: NovelEventGraphRecord): ScriptBeat[] {
    return eventGraph.events.slice(0, 12).map((event, index) => ({
      beatId: `beat_${index + 1}`,
      orderIndex: index + 1,
      title: event.title ?? `Event ${index + 1}`,
      summary: truncateText(event.summary, 220),
      ...(event.sourceExcerpt ? { sourceExcerpt: event.sourceExcerpt } : {}),
      eventIds: [event.eventId],
    }));
  }

  private fallbackScriptBeats(novel: NovelDocumentModel): ScriptBeat[] {
    const paragraphs = novel.content
      .split(/\n{2,}/)
      .map((paragraph) => truncateText(paragraph, 260))
      .filter((paragraph) => paragraph.length > 0);
    const candidates =
      paragraphs.length > 1
        ? paragraphs
        : novel.content
            .split(/(?<=[.!?。！？])\s+/u)
            .map((sentence) => truncateText(sentence, 260))
            .filter((sentence) => sentence.length > 0);
    const excerpts = candidates.length > 0 ? candidates : [truncateText(novel.content, 260)];

    return excerpts.slice(0, 9).map((excerpt, index) => ({
      beatId: `beat_${index + 1}`,
      orderIndex: index + 1,
      title: `Beat ${index + 1}`,
      summary: this.eventSummary(excerpt),
      sourceExcerpt: excerpt,
    }));
  }

  private scriptScenesFromBeats(beats: ScriptBeat[]): ScriptScene[] {
    const scenes: ScriptScene[] = [];
    for (let index = 0; index < beats.length; index += 3) {
      const sceneBeats = beats.slice(index, index + 3);
      const firstBeat = sceneBeats[0];
      if (!firstBeat) {
        continue;
      }
      const sceneIndex = scenes.length + 1;
      const summary = truncateText(
        sceneBeats.map((beat) => beat.summary).join(" "),
        320,
      );
      scenes.push({
        sceneId: `script_scene_${sceneIndex}`,
        orderIndex: sceneIndex,
        title: `Scene ${sceneIndex}: ${firstBeat.title}`,
        summary,
        beats: sceneBeats,
        dialogue: `Narration: ${summary}`,
        shotHint: "Convert each beat into one clear visual shot.",
      });
    }
    return scenes;
  }

  private scriptExportContent(script: ScriptDraftContent): string {
    const lines = [`# ${script.title}`, "", script.logline, "", `Strategy: ${script.strategy}`, ""];
    script.scenes.forEach((scene) => {
      lines.push(`## ${scene.orderIndex}. ${scene.title}`, "", scene.summary);
      if (scene.dialogue) {
        lines.push("", scene.dialogue);
      }
      lines.push("");
      scene.beats.forEach((beat) => {
        lines.push(`- ${beat.orderIndex}. ${beat.title}: ${beat.summary}`);
        if (beat.sourceExcerpt) {
          lines.push(`  Source: ${beat.sourceExcerpt}`);
        }
      });
      lines.push("");
    });
    return lines.join("\n").trimEnd();
  }

  private scriptExportFilename(scriptDraft: ScriptDraftRecord): string {
    const slug = scriptDraft.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
    return `${slug || "script-draft"}-v${scriptDraft.version}.txt`;
  }

  private storyboardFromScriptDraft(scriptDraft: ScriptDraftRecord): StoryboardResult {
    const scenes =
      scriptDraft.script.scenes.length > 0
        ? scriptDraft.script.scenes
        : this.scriptScenesFromBeats([
            {
              beatId: "beat_1",
              orderIndex: 1,
              title: scriptDraft.title,
              summary: scriptDraft.script.logline,
              sourceExcerpt: scriptDraft.script.logline,
            },
          ]);
    const timelineEvents = this.timelineEventsFromScriptScenes(scenes);
    const knownEventIds = new Set(timelineEvents.map((event) => event.eventId));

    return {
      title: scriptDraft.script.title,
      logline: scriptDraft.script.logline,
      storyBlueprint: {
        worldSummary: `Storyboard generated from script draft v${scriptDraft.version}.`,
        ...(timelineEvents.length > 0 ? { timelineEvents } : {}),
        adaptationNotes: `Script strategy: ${scriptDraft.strategy}`,
      },
      characters: [
        {
          tempId: "char_script_lead",
          name: "Lead",
          role: "protagonist",
          appearance: "A consistent lead adapted from the script source.",
          personality: "Goal-driven and visually readable.",
          identityPrompt: "consistent lead character, cinematic adaptation, production reference",
        },
      ],
      locations: [
        {
          tempId: "loc_script_primary",
          name: "Primary Story Location",
          type: "exterior",
          description: "A flexible cinematic location derived from the script beats.",
          lighting: "motivated cinematic lighting",
          atmosphere: "story-driven and focused",
          locationPrompt: "cinematic production setting, coherent geography, story-driven lighting",
        },
      ],
      scenes: scenes.map((scene) => {
        const sceneEventIds = uniqueStrings(
          scene.beats.flatMap((beat) => beat.eventIds ?? []).filter((eventId) => knownEventIds.has(eventId)),
        );
        return {
          tempId: `scene_script_${scene.orderIndex}`,
          title: scene.title,
          sourceExcerpt: scene.beats[0]?.sourceExcerpt ?? scene.summary,
          summary: scene.summary,
          mood: scriptDraft.strategy === "short_drama" ? "heightened" : "cinematic",
          timeOfDay: "story time",
          characterTempIds: ["char_script_lead"],
          locationTempId: "loc_script_primary",
          ...(sceneEventIds.length > 0 ? { storyEventIds: sceneEventIds } : {}),
          shots: scene.beats.map((beat, beatIndex) => {
            const shotEventIds = uniqueStrings(
              (beat.eventIds ?? []).filter((eventId) => knownEventIds.has(eventId)),
            );
            return {
              tempId: `shot_script_${scene.orderIndex}_${beatIndex + 1}`,
              shotIndex: beatIndex + 1,
              title: beat.title,
              sourceExcerpt: beat.sourceExcerpt ?? beat.summary,
              durationSec: scriptDraft.strategy === "short_drama" ? 4 : 5,
              visualDescription: `Cinematic frame for ${beat.summary}`,
              action: beat.summary,
              cameraMovement:
                scriptDraft.strategy === "visual_first"
                  ? "dynamic visual tracking movement"
                  : "controlled push in",
              mood: scriptDraft.strategy === "short_drama" ? "urgent" : "focused",
              narration: scene.dialogue,
              characterTempIds: ["char_script_lead"],
              locationTempId: "loc_script_primary",
              ...(shotEventIds.length > 0 ? { storyEventIds: shotEventIds } : {}),
              imagePrompt: `cinematic storyboard frame, ${beat.summary}`,
              videoPrompt: `animate the beat with coherent motion: ${beat.summary}`,
            };
          }),
        };
      }),
    };
  }

  private timelineEventsFromScriptScenes(scenes: ScriptScene[]): StoryTimelineEvent[] {
    const events = new Map<string, StoryTimelineEvent>();
    scenes.forEach((scene) => {
      scene.beats.forEach((beat) => {
        (beat.eventIds ?? []).forEach((eventId) => {
          if (events.has(eventId)) {
            return;
          }
          events.set(eventId, {
            eventId,
            title: beat.title,
            orderIndex: events.size + 1,
            sourceExcerpt: beat.sourceExcerpt,
            summary: beat.summary,
            estimatedDurationSec: 8,
          });
        });
      });
    });
    return Array.from(events.values());
  }

  private extractEventGraph(novel: NovelDocumentModel): {
    chapters: NovelChapterSummary[];
    events: StoryTimelineEvent[];
  } {
    const chapters = this.splitChapters(novel.content);
    const events: StoryTimelineEvent[] = [];
    chapters.forEach((chapter) => {
      this.eventExcerptsForChapter(chapter).forEach((excerpt, eventIndex) => {
        const orderIndex = events.length + 1;
        events.push({
          eventId: `chapter_${chapter.chapterIndex}_event_${eventIndex + 1}`,
          title: `${chapter.title} Event ${eventIndex + 1}`,
          orderIndex,
          chapterIndex: chapter.chapterIndex,
          sourceExcerpt: excerpt,
          summary: this.eventSummary(excerpt),
          conflict: `Chapter ${chapter.chapterIndex} turning point`,
          result: `Advances event ${orderIndex}`,
          estimatedDurationSec: 12,
        });
      });
    });

    return {
      chapters: chapters.map(({ text: _text, ...chapter }) => chapter),
      events,
    };
  }

  private splitChapters(content: string): ParsedNovelChapter[] {
    const lines = content.split(/\r?\n/);
    const chapters: ParsedNovelChapter[] = [];
    let currentTitle = "Chapter 1";
    let currentStart = 0;
    let currentLines: string[] = [];
    let offset = 0;
    let sawHeading = false;

    const pushChapter = (endOffset: number) => {
      const text = currentLines.join("\n").trim();
      if (!text) {
        return;
      }
      const chapterIndex = chapters.length + 1;
      chapters.push({
        chapterIndex,
        title: currentTitle || `Chapter ${chapterIndex}`,
        startOffset: currentStart,
        endOffset,
        wordCount: countWords(text),
        summary: truncateText(text, 180),
        text,
      });
    };

    for (const line of lines) {
      const lineStart = offset;
      const lineEnd = lineStart + line.length;
      const heading = isChapterHeading(line);
      if (heading) {
        if (sawHeading || currentLines.join("").trim()) {
          pushChapter(lineStart);
        }
        sawHeading = true;
        currentTitle = line.replace(/^#{1,6}\s*/, "").trim() || `Chapter ${chapters.length + 1}`;
        currentStart = lineEnd + 1;
        currentLines = [];
      } else {
        currentLines.push(line);
      }
      offset = lineEnd + 1;
    }
    pushChapter(content.length);

    if (chapters.length === 0) {
      const text = content.trim();
      return [
        {
          chapterIndex: 1,
          title: "Chapter 1",
          startOffset: 0,
          endOffset: content.length,
          wordCount: countWords(text),
          summary: truncateText(text, 180),
          text,
        },
      ];
    }

    return chapters.map((chapter, index) => ({
      ...chapter,
      chapterIndex: index + 1,
      title: chapter.title || `Chapter ${index + 1}`,
    }));
  }

  private eventExcerptsForChapter(chapter: ParsedNovelChapter): string[] {
    const paragraphExcerpts = chapter.text
      .split(/\n{2,}/)
      .map((paragraph) => truncateText(paragraph, 280))
      .filter((paragraph) => paragraph.length > 0);
    const candidates =
      paragraphExcerpts.length > 1
        ? paragraphExcerpts
        : chapter.text
            .split(/(?<=[.!?。！？])\s+/u)
            .map((sentence) => truncateText(sentence, 280))
            .filter((sentence) => sentence.length > 0);

    return candidates.slice(0, 3).length > 0 ? candidates.slice(0, 3) : [chapter.summary];
  }

  private eventSummary(excerpt: string): string {
    return truncateText(excerpt.split(/(?<=[.!?。！？])\s+/u)[0] ?? excerpt, 180);
  }

  private applyEventGraphToStoryboard(
    storyboard: StoryboardResult,
    eventGraph: NovelEventGraphRecord,
  ): StoryboardResult {
    if (eventGraph.events.length === 0) {
      return storyboard;
    }
    const events = eventGraph.events;
    const eventForIndex = (index: number) => events[index % events.length]!;

    return {
      ...storyboard,
      storyBlueprint: {
        ...(storyboard.storyBlueprint ?? {}),
        worldSummary:
          storyboard.storyBlueprint?.worldSummary ??
          eventGraph.chapters.map((chapter) => chapter.summary).join(" "),
        timelineEvents: events,
      },
      scenes: storyboard.scenes.map((scene, sceneIndex) => {
        const sceneEvent = eventForIndex(sceneIndex);
        return {
          ...scene,
          sourceExcerpt: scene.sourceExcerpt || sceneEvent.sourceExcerpt || scene.sourceExcerpt,
          storyEventIds: [sceneEvent.eventId],
          shots: scene.shots.map((shot, shotIndex) => {
            const event = eventForIndex(sceneIndex + shotIndex);
            return {
              ...shot,
              sourceExcerpt: shot.sourceExcerpt ?? event.sourceExcerpt,
              storyEventIds: [event.eventId],
            };
          }),
        };
      }),
    };
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

  private toNovelEventGraphRecord(eventGraph: NovelEventGraphModel): NovelEventGraphRecord {
    return {
      id: eventGraph.id,
      projectId: eventGraph.projectId,
      novelDocumentId: eventGraph.novelDocumentId,
      chapters: this.toChapterSummaries(eventGraph.chaptersJson),
      events: this.toStoryEvents(eventGraph.eventsJson),
      createdAt: toIsoString(eventGraph.createdAt),
      updatedAt: toIsoString(eventGraph.updatedAt),
    };
  }

  private toScriptDraftRecord(draft: ScriptDraftModel): ScriptDraftRecord {
    const strategy = this.normalizeScriptStrategy(draft.strategy as ScriptAdaptationStrategy);
    return {
      id: draft.id,
      projectId: draft.projectId,
      novelDocumentId: draft.novelDocumentId,
      version: draft.version,
      title: draft.title,
      strategy,
      status: this.toScriptDraftStatus(draft.status),
      script: this.toScriptContent(draft.scriptJson, {
        title: draft.title,
        strategy,
      }),
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

  private toChapterSummaries(value: unknown): NovelChapterSummary[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => {
        if (typeof item !== "object" || item === null || Array.isArray(item)) {
          return undefined;
        }
        const record = item as Record<string, unknown>;
        if (
          typeof record.chapterIndex !== "number" ||
          typeof record.title !== "string" ||
          typeof record.startOffset !== "number" ||
          typeof record.endOffset !== "number" ||
          typeof record.wordCount !== "number" ||
          typeof record.summary !== "string"
        ) {
          return undefined;
        }
        return {
          chapterIndex: record.chapterIndex,
          title: record.title,
          startOffset: record.startOffset,
          endOffset: record.endOffset,
          wordCount: record.wordCount,
          summary: record.summary,
        };
      })
      .filter((item): item is NovelChapterSummary => Boolean(item));
  }

  private toStoryEvents(value: unknown): StoryTimelineEvent[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value
      .map((item) => {
        if (typeof item !== "object" || item === null || Array.isArray(item)) {
          return undefined;
        }
        const record = item as Record<string, unknown>;
        if (
          typeof record.eventId !== "string" ||
          typeof record.orderIndex !== "number" ||
          typeof record.summary !== "string"
        ) {
          return undefined;
        }
        return {
          eventId: record.eventId,
          ...(typeof record.title === "string" ? { title: record.title } : {}),
          orderIndex: record.orderIndex,
          ...(typeof record.chapterIndex === "number" ? { chapterIndex: record.chapterIndex } : {}),
          ...(typeof record.sourceExcerpt === "string" ? { sourceExcerpt: record.sourceExcerpt } : {}),
          summary: record.summary,
          ...(Array.isArray(record.characters)
            ? { characters: record.characters.filter((item): item is string => typeof item === "string") }
            : {}),
          ...(typeof record.locationName === "string" ? { locationName: record.locationName } : {}),
          ...(typeof record.emotion === "string" ? { emotion: record.emotion } : {}),
          ...(typeof record.conflict === "string" ? { conflict: record.conflict } : {}),
          ...(typeof record.result === "string" ? { result: record.result } : {}),
          ...(typeof record.estimatedDurationSec === "number"
            ? { estimatedDurationSec: record.estimatedDurationSec }
            : {}),
        };
      })
      .filter((item): item is StoryTimelineEvent => Boolean(item));
  }

  private toStoryboardDraftStatus(value: string): StoryboardDraftStatus {
    return STORYBOARD_DRAFT_STATUSES.includes(value as StoryboardDraftStatus)
      ? (value as StoryboardDraftStatus)
      : "invalid";
  }

  private toScriptDraftStatus(value: string): ScriptDraftStatus {
    return SCRIPT_DRAFT_STATUSES.includes(value as ScriptDraftStatus)
      ? (value as ScriptDraftStatus)
      : "draft";
  }

  private toScriptContent(
    value: unknown,
    fallback: { title: string; strategy: ScriptAdaptationStrategy },
  ): ScriptDraftContent {
    const fallbackContent: ScriptDraftContent = {
      title: fallback.title,
      logline: `Script draft for ${fallback.title}.`,
      strategy: fallback.strategy,
      scenes: [],
    };
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return fallbackContent;
    }

    const record = value as Record<string, unknown>;
    return {
      title: typeof record.title === "string" && record.title.trim() ? record.title : fallback.title,
      logline:
        typeof record.logline === "string" && record.logline.trim()
          ? record.logline
          : fallbackContent.logline,
      strategy: this.normalizeScriptStrategy(record.strategy as ScriptAdaptationStrategy | undefined),
      scenes: Array.isArray(record.scenes)
        ? record.scenes.flatMap((scene, index) => this.toScriptScene(scene, index))
        : [],
    };
  }

  private toScriptScene(value: unknown, index: number): ScriptScene[] {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return [];
    }
    const record = value as Record<string, unknown>;
    const beats = Array.isArray(record.beats)
      ? record.beats.flatMap((beat, beatIndex) => this.toScriptBeat(beat, beatIndex))
      : [];
    if (beats.length === 0) {
      return [];
    }

    const orderIndex = typeof record.orderIndex === "number" ? record.orderIndex : index + 1;
    const title =
      typeof record.title === "string" && record.title.trim()
        ? record.title
        : `Scene ${orderIndex}`;
    const summary =
      typeof record.summary === "string" && record.summary.trim()
        ? record.summary
        : beats.map((beat) => beat.summary).join(" ");

    return [
      {
        sceneId:
          typeof record.sceneId === "string" && record.sceneId.trim()
            ? record.sceneId
            : `script_scene_${orderIndex}`,
        orderIndex,
        title,
        summary,
        beats,
        ...(typeof record.dialogue === "string" && record.dialogue.trim()
          ? { dialogue: record.dialogue }
          : {}),
        ...(typeof record.shotHint === "string" && record.shotHint.trim()
          ? { shotHint: record.shotHint }
          : {}),
      },
    ];
  }

  private toScriptBeat(value: unknown, index: number): ScriptBeat[] {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      return [];
    }
    const record = value as Record<string, unknown>;
    const summary = typeof record.summary === "string" ? record.summary.trim() : "";
    if (!summary) {
      return [];
    }
    const orderIndex = typeof record.orderIndex === "number" ? record.orderIndex : index + 1;
    return [
      {
        beatId:
          typeof record.beatId === "string" && record.beatId.trim()
            ? record.beatId
            : `beat_${orderIndex}`,
        orderIndex,
        title:
          typeof record.title === "string" && record.title.trim()
            ? record.title
            : `Beat ${orderIndex}`,
        summary,
        ...(typeof record.sourceExcerpt === "string" && record.sourceExcerpt.trim()
          ? { sourceExcerpt: record.sourceExcerpt }
          : {}),
        ...(Array.isArray(record.eventIds)
          ? { eventIds: record.eventIds.filter((item): item is string => typeof item === "string") }
          : {}),
      },
    ];
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
