import type { StoryTimelineEvent } from "./storyboard";

export interface NovelChapterSummary {
  chapterIndex: number;
  title: string;
  startOffset: number;
  endOffset: number;
  wordCount: number;
  summary: string;
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

export interface ExtractNovelEventsResult {
  eventGraph: NovelEventGraphRecord;
}
