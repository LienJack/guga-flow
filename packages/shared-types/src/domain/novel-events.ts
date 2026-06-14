import type { NovelDocumentRecord } from "./project";
import type { StoryTimelineEvent } from "./storyboard";

export const NOVEL_CHAPTER_EVENT_STATES = ["pending", "succeeded", "failed"] as const;
export type NovelChapterEventState = (typeof NOVEL_CHAPTER_EVENT_STATES)[number];

export interface NovelChapterSummary {
  chapterIndex: number;
  title: string;
  startOffset: number;
  endOffset: number;
  wordCount: number;
  summary: string;
  eventState: NovelChapterEventState;
  eventCount: number;
  eventIds: string[];
  errorReason?: string;
  extractedAt?: string;
}

export interface NovelChapterDetail extends NovelChapterSummary {
  content: string;
  events: StoryTimelineEvent[];
}

export interface NovelEventGraphRecord {
  id: string;
  projectId: string;
  novelDocumentId: string;
  chapters: NovelChapterSummary[];
  events: StoryTimelineEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface NovelChapterListResult {
  chapters: NovelChapterSummary[];
  eventGraph?: NovelEventGraphRecord;
}

export interface NovelChapterDetailResult {
  chapter: NovelChapterDetail;
  eventGraph?: NovelEventGraphRecord;
}

export interface UpdateNovelChapterInput {
  title?: string;
  content?: string;
}

export interface UpdateNovelChapterResult {
  novel: NovelDocumentRecord;
  chapter: NovelChapterDetail;
  eventGraph?: NovelEventGraphRecord;
}

export interface ExtractNovelEventsInput {
  chapterIndexes?: number[];
  forceFailureChapterIndexes?: number[];
}

export interface ExtractNovelEventsResult {
  eventGraph: NovelEventGraphRecord;
}

export interface ExtractNovelChapterEventsInput {
  forceFailure?: boolean;
}

export interface ExtractNovelChapterEventsResult {
  eventGraph: NovelEventGraphRecord;
  chapter: NovelChapterDetail;
}
