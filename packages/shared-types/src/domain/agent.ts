import type { LlmProviderId } from "./generation";

export const AGENT_MEMORY_SCOPES = ["project", "agent"] as const;
export type AgentMemoryScope = (typeof AGENT_MEMORY_SCOPES)[number];

export const AGENT_MEMORY_SOURCES = ["manual", "agent_action", "system_summary"] as const;
export type AgentMemorySource = (typeof AGENT_MEMORY_SOURCES)[number];

export const AGENT_MEMORY_TYPES = ["message", "summary", "manual_preference", "tool_result"] as const;
export type AgentMemoryType = (typeof AGENT_MEMORY_TYPES)[number];

export const AGENT_DEPLOYMENT_ROLES = [
  "script",
  "production",
  "universal",
  "supervision",
  "skeleton",
  "adaptation",
  "storyboard",
  "asset",
  "video_prompt",
] as const;
export type AgentDeploymentRole = (typeof AGENT_DEPLOYMENT_ROLES)[number];

export const AGENT_DEPLOYMENT_MODES = ["simple", "advanced"] as const;
export type AgentDeploymentMode = (typeof AGENT_DEPLOYMENT_MODES)[number];

export interface AgentRoleModelConfig {
  provider?: LlmProviderId;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  inherit?: boolean;
}

export type AgentDeploymentRoleMap = Partial<Record<AgentDeploymentRole, AgentRoleModelConfig>>;

export interface AgentDeploymentConfig {
  mode: AgentDeploymentMode;
  primary: AgentRoleModelConfig;
  roles: AgentDeploymentRoleMap;
}

export interface AgentDeploymentRecord extends AgentDeploymentConfig {
  projectId: string;
  version: number;
  updatedAt?: string;
}

export interface AgentDeploymentResolvedRole {
  role: AgentDeploymentRole;
  provider: LlmProviderId;
  model: string;
  temperature?: number;
  maxOutputTokens?: number;
  inheritedFrom?: "primary";
}

export interface AgentDeploymentIssue {
  role?: AgentDeploymentRole;
  path: string;
  message: string;
}

export interface AgentDeploymentResult {
  deployment: AgentDeploymentRecord;
  resolvedRoles: AgentDeploymentResolvedRole[];
  issues: AgentDeploymentIssue[];
}

export interface UpdateAgentDeploymentInput {
  mode?: AgentDeploymentMode;
  primary?: AgentRoleModelConfig;
  roles?: AgentDeploymentRoleMap;
}

export interface ResolveAgentRoleInput {
  role: AgentDeploymentRole;
}

export interface ResolveAgentRoleResult {
  config: AgentDeploymentResolvedRole;
}

export interface AgentMemoryRecord {
  id: string;
  projectId: string;
  scope: AgentMemoryScope;
  type: AgentMemoryType;
  title: string;
  content: string;
  summary: string;
  tags: string[];
  agentRole?: AgentDeploymentRole;
  contextNodeId?: string;
  tokenEstimate: number;
  safetyFiltered: boolean;
  source: AgentMemorySource;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAgentMemoryInput {
  scope?: AgentMemoryScope;
  type?: AgentMemoryType;
  title: string;
  content: string;
  tags?: string[];
  agentRole?: AgentDeploymentRole;
  contextNodeId?: string;
  source?: AgentMemorySource;
  enabled?: boolean;
}

export interface UpdateAgentMemoryInput {
  type?: AgentMemoryType;
  title?: string;
  content?: string;
  tags?: string[];
  agentRole?: AgentDeploymentRole;
  contextNodeId?: string;
  enabled?: boolean;
}

export interface AgentMemoryListResult {
  memories: AgentMemoryRecord[];
}

export interface RecallAgentMemoriesInput {
  query: string;
  role?: AgentDeploymentRole;
  contextNodeId?: string;
  tokenBudget?: number;
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
