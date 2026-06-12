export interface ProjectRecord {
  id: string;
  ownerUserId: string;
  title: string;
  description?: string;
  defaultAspectRatio: "9:16" | "16:9" | "1:1";
  createdAt: string;
  updatedAt: string;
}

export interface NovelDocumentRecord {
  id: string;
  projectId: string;
  title: string;
  content: string;
  sourceType: "paste" | "txt" | "md";
  wordCount: number;
  language: "zh" | "en" | "ja" | "other";
  createdAt: string;
  updatedAt: string;
}
