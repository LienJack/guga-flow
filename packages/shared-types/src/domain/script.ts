export const SCRIPT_ADAPTATION_STRATEGIES = ["faithful", "short_drama", "visual_first"] as const;
export type ScriptAdaptationStrategy = (typeof SCRIPT_ADAPTATION_STRATEGIES)[number];

export const SCRIPT_DRAFT_STATUSES = ["draft", "selected", "exported"] as const;
export type ScriptDraftStatus = (typeof SCRIPT_DRAFT_STATUSES)[number];

export interface ScriptBeat {
  beatId: string;
  orderIndex: number;
  title: string;
  summary: string;
  sourceExcerpt?: string;
  eventIds?: string[];
}

export interface ScriptScene {
  sceneId: string;
  orderIndex: number;
  title: string;
  summary: string;
  beats: ScriptBeat[];
  dialogue?: string;
  shotHint?: string;
}

export interface ScriptDraftContent {
  title: string;
  logline: string;
  strategy: ScriptAdaptationStrategy;
  scenes: ScriptScene[];
}

export interface ScriptDraftRecord {
  id: string;
  projectId: string;
  novelDocumentId: string;
  version: number;
  title: string;
  strategy: ScriptAdaptationStrategy;
  status: ScriptDraftStatus;
  script: ScriptDraftContent;
  createdAt: string;
  updatedAt: string;
}

export interface CreateScriptDraftInput {
  title?: string;
  strategy?: ScriptAdaptationStrategy;
}

export interface CreateScriptDraftResult {
  scriptDraft: ScriptDraftRecord;
}

export interface ScriptDraftListResult {
  scriptDrafts: ScriptDraftRecord[];
}

export interface ScriptExportResult {
  scriptDraftId: string;
  filename: string;
  content: string;
}
