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
  sourceType: "paste" | "txt" | "md";
  wordCount: number;
  language: "zh" | "en" | "ja" | "other";
  createdAt: string;
  updatedAt: string;
}
