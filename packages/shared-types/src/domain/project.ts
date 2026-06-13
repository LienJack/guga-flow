import type {
  GenerationJobRecord,
  NovelToStoryboardJobInput,
  NovelToStoryboardJobOutput,
} from "./generation";
import type { GenerateStoryboardResult, StoryboardDraftRecord } from "./storyboard";

export const PROJECT_ASPECT_RATIOS = ["9:16", "16:9", "1:1"] as const;
export type ProjectAspectRatio = (typeof PROJECT_ASPECT_RATIOS)[number];

export interface ProjectRecord {
  id: string;
  ownerUserId: string;
  title: string;
  description?: string;
  defaultAspectRatio: ProjectAspectRatio;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListItem extends ProjectRecord {
  assetCount: number;
}

export interface ProjectDetail extends ProjectRecord {
  assetCount: number;
}

export const NOVEL_SOURCE_TYPES = ["paste", "txt", "md"] as const;
export type NovelSourceType = (typeof NOVEL_SOURCE_TYPES)[number];

export const NOVEL_LANGUAGES = ["zh", "en", "ja", "other"] as const;
export type NovelLanguage = (typeof NOVEL_LANGUAGES)[number];

export const CREATIVE_AGENT_MODES = ["novice", "advanced", "professional"] as const;
export type CreativeAgentMode = (typeof CREATIVE_AGENT_MODES)[number];

export interface CreateProjectInput {
  title: string;
  description?: string;
  defaultAspectRatio?: ProjectAspectRatio;
}

export interface UpdateProjectInput {
  title?: string;
  description?: string;
  defaultAspectRatio?: ProjectAspectRatio;
}

export interface NovelDocumentRecord {
  id: string;
  projectId: string;
  title: string;
  content: string;
  sourceType: NovelSourceType;
  wordCount: number;
  language: NovelLanguage;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNovelDocumentInput {
  title: string;
  content: string;
  sourceType?: NovelSourceType;
  language?: NovelLanguage;
}

export interface ImportNovelSourceInput {
  title: string;
  content: string;
  sourceType: Exclude<NovelSourceType, "paste">;
  language?: NovelLanguage;
}

export interface CreateCreativeStoryboardInput {
  idea: string;
  mode?: CreativeAgentMode;
  audience?: string;
  stylePrompt?: string;
  targetDurationSeconds?: number;
  forceFailure?: boolean;
}

export interface UpdateNovelDocumentInput {
  title?: string;
  content?: string;
  language?: NovelLanguage;
}

export interface CreateNovelDocumentResult {
  novel: NovelDocumentRecord;
}

export interface ImportNovelSourceResult {
  novel: NovelDocumentRecord;
}

export interface CreateCreativeStoryboardResult extends GenerateStoryboardResult {
  novel: NovelDocumentRecord;
  draft: StoryboardDraftRecord;
  job: GenerationJobRecord<NovelToStoryboardJobInput, NovelToStoryboardJobOutput>;
}

export interface UpdateNovelDocumentResult {
  novel: NovelDocumentRecord;
}

export interface DeleteNovelDocumentResult {
  deleted: true;
  novelId: string;
}
