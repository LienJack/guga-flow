export const AGENT_MEMORY_SCOPES = ["project", "agent"] as const;
export type AgentMemoryScope = (typeof AGENT_MEMORY_SCOPES)[number];

export const AGENT_MEMORY_SOURCES = ["manual", "agent_action", "system_summary"] as const;
export type AgentMemorySource = (typeof AGENT_MEMORY_SOURCES)[number];

export interface AgentMemoryRecord {
  id: string;
  projectId: string;
  scope: AgentMemoryScope;
  title: string;
  content: string;
  summary: string;
  tags: string[];
  source: AgentMemorySource;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentMemoryInput {
  scope?: AgentMemoryScope;
  title: string;
  content: string;
  tags?: string[];
  source?: AgentMemorySource;
  enabled?: boolean;
}

export interface UpdateAgentMemoryInput {
  title?: string;
  content?: string;
  tags?: string[];
  enabled?: boolean;
}

export interface AgentMemoryListResult {
  memories: AgentMemoryRecord[];
}

export interface RecallAgentMemoriesInput {
  query: string;
  limit?: number;
}

export interface RecallAgentMemoriesResult {
  memories: AgentMemoryRecord[];
  memoryIds: string[];
  summary: string;
}

export interface ClearAgentMemoriesInput {
  includeDisabled?: boolean;
}

export interface ClearAgentMemoriesResult {
  deletedCount: number;
}
