import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import type {
  AgentCanvasActionCreatedEdge,
  AgentCanvasActionCreatedNode,
  AgentCanvasActionJobInput,
  AgentCanvasActionJobOutput,
  AgentCanvasActionPreviousNodeSnapshot,
  AgentCanvasActionUpdatedNode,
  AgentDeploymentConfig,
  AgentDeploymentIssue,
  AgentDeploymentMode,
  AgentDeploymentRecord,
  AgentDeploymentResolvedRole,
  AgentDeploymentResult,
  AgentDeploymentRole,
  AgentDeploymentRoleMap,
  AgentRoleModelConfig,
  AgentMemoryListResult,
  AgentMemoryRecord,
  AgentMemoryScope,
  AgentMemorySource,
  CanvasEdgeRecord,
  CanvasEdgeRelation,
  CanvasNodeRecord,
  CanvasNodeType,
  CanvasSnapshotJson,
  ClearAgentMemoriesInput,
  ClearAgentMemoriesResult,
  CreateAgentCanvasActionInput,
  CreateAgentCanvasActionResult,
  CreateAgentMemoryInput,
  GenerationJobRecord,
  LlmProviderId,
  LlmProviderManagementItem,
  NodeStatus,
  Phase3CanvasNodeType,
  RecallAgentMemoriesInput,
  RecallAgentMemoriesResult,
  ResolveAgentRoleInput,
  ResolveAgentRoleResult,
  SkillTemplatePromptContext,
  UndoAgentCanvasActionResult,
  UpdateAgentDeploymentInput,
  UpdateAgentMemoryInput,
} from "@guga-flow/shared-types";
import {
  AGENT_DEPLOYMENT_MODES,
  AGENT_DEPLOYMENT_ROLES,
  AGENT_MEMORY_SCOPES,
  AGENT_MEMORY_SOURCES,
  LLM_PROVIDER_IDS,
  PHASE_3_CANVAS_NODE_TYPES,
  SKILL_TEMPLATE_KINDS,
} from "@guga-flow/shared-types";
import { Prisma, type CanvasEdgeRelation as PrismaCanvasEdgeRelation } from "../generated/prisma/client";

import { CanvasService } from "../canvas/canvas.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProvidersService } from "../providers/providers.service";
import { SkillTemplatesService } from "../skill-templates/skill-templates.service";

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

type CanvasNodeModel = {
  id: string;
  projectId: string;
  canvasDocumentId: string;
  tldrawShapeId: string;
  type: string;
  title: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  status: string;
  dataJson: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type AgentMemoryModel = {
  id: string;
  projectId: string;
  scope: string;
  title: string;
  content: string;
  summary: string;
  tagsJson: unknown;
  source: string;
  enabled: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type AgentDeploymentModel = {
  id: string;
  projectId: string;
  mode: string;
  rolesJson: unknown;
  version: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type ParsedAgentAction =
  | {
      kind: "create_node";
      type: Phase3CanvasNodeType;
      title: string;
    }
  | {
      kind: "update_node";
      nodeId: string;
      title: string;
    }
  | {
      kind: "create_edge";
      sourceNodeId: string;
      targetNodeId: string;
      relation: CanvasEdgeRelation;
    };

const DEFAULT_AGENT_ROLE: AgentDeploymentRole = "universal";
const DEFAULT_AGENT_DEPLOYMENT_CONFIG: AgentDeploymentConfig = {
  mode: "simple",
  primary: {
    provider: "mock-llm",
    model: "mock-storyboard",
    temperature: 0.2,
    maxOutputTokens: 4096,
  },
  roles: {},
};
const SUPPORTED_CREATE_TYPES = new Map<string, Phase3CanvasNodeType>([
  ["novel", "novel"],
  ["scene frame", "scene_frame"],
  ["scene_frame", "scene_frame"],
  ["scene", "scene"],
  ["shot", "shot"],
  ["character", "character_asset"],
  ["character asset", "character_asset"],
  ["location", "location_asset"],
  ["location asset", "location_asset"],
  ["image", "image"],
  ["video", "video"],
  ["editor package", "editor_package"],
  ["editor_package", "editor_package"],
]);

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function jsonValue<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAgentDeploymentMode(value: unknown): value is AgentDeploymentMode {
  return typeof value === "string" && AGENT_DEPLOYMENT_MODES.includes(value as AgentDeploymentMode);
}

function isAgentDeploymentRole(value: unknown): value is AgentDeploymentRole {
  return typeof value === "string" && AGENT_DEPLOYMENT_ROLES.includes(value as AgentDeploymentRole);
}

function isLlmProviderId(value: unknown): value is LlmProviderId {
  return typeof value === "string" && LLM_PROVIDER_IDS.includes(value as LlmProviderId);
}

function dataObject(value: unknown): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Agent canvas action failed";
}

function clampNumber(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.min(max, Math.max(min, value));
}

function clampInteger(value: unknown, min: number, max: number): number | undefined {
  const clamped = clampNumber(value, min, max);
  return clamped === undefined ? undefined : Math.round(clamped);
}

function isCanvasSnapshotJson(value: unknown): value is CanvasSnapshotJson {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return typeof value !== "number" || Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isCanvasSnapshotJson);
  }
  if (isPlainObject(value)) {
    return Object.values(value).every(isCanvasSnapshotJson);
  }
  return false;
}

@Injectable()
export class AgentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CanvasService) private readonly canvasService: CanvasService,
    @Inject(ProvidersService) private readonly providersService: ProvidersService,
    @Optional()
    @Inject(SkillTemplatesService)
    private readonly skillTemplatesService?: SkillTemplatesService,
  ) {}

  async getDeployment(projectId: string): Promise<AgentDeploymentResult> {
    await this.ensureProjectExists(projectId);
    const row = await this.findDeployment(projectId);
    return this.deploymentResult(this.toDeploymentRecord(projectId, row));
  }

  async updateDeployment(
    projectId: string,
    input: UpdateAgentDeploymentInput,
  ): Promise<AgentDeploymentResult> {
    await this.ensureProjectExists(projectId);
    const current = this.toDeploymentRecord(projectId, await this.findDeployment(projectId));
    const nextConfig = this.normalizeDeploymentConfig(
      {
        mode: input.mode ?? current.mode,
        primary: input.primary ?? current.primary,
        roles: input.roles ? this.normalizeRoleMap(input.roles, current.roles) : current.roles,
      },
      current,
    );

    const row = (await this.prisma.agentDeployment.upsert({
      where: { projectId },
      create: {
        projectId,
        mode: nextConfig.mode,
        rolesJson: jsonValue(this.toStoredDeploymentJson(nextConfig)),
        version: 1,
      },
      update: {
        mode: nextConfig.mode,
        rolesJson: jsonValue(this.toStoredDeploymentJson(nextConfig)),
        version: { increment: 1 },
      },
    })) as AgentDeploymentModel;

    return this.deploymentResult(this.toDeploymentRecord(projectId, row));
  }

  async resolveRole(
    projectId: string,
    input: ResolveAgentRoleInput,
  ): Promise<ResolveAgentRoleResult> {
    const role = this.requireAgentRole(input.role);
    const result = await this.getDeployment(projectId);
    const issues = result.issues.filter((issue) => issue.role === role);
    const config = result.resolvedRoles.find((resolved) => resolved.role === role);
    if (!config || issues.length > 0) {
      const detail = issues.map((issue) => issue.message).join("; ") || "role has no resolved provider/model";
      throw new BadRequestException(`Agent deployment for ${role} is invalid: ${detail}`);
    }
    return { config };
  }

  async createCanvasAction(
    projectId: string,
    input: CreateAgentCanvasActionInput,
  ): Promise<CreateAgentCanvasActionResult> {
    const message = this.normalizeMessage(input.message);
    const runtime = await this.resolveRole(projectId, { role: input.role ?? DEFAULT_AGENT_ROLE });
    await this.ensureProjectExists(projectId);
    const recall = await this.recallMemoriesForAction(projectId, message);
    const skillTemplates = this.skillTemplatesService
      ? await this.skillTemplatesService.activePromptContexts(projectId, SKILL_TEMPLATE_KINDS, {
          agentRole: runtime.config.role,
        })
      : [];
    const skillTemplateSummary = this.skillTemplateSummary(skillTemplates);

    const jobInput: AgentCanvasActionJobInput = {
      operation: "agent_canvas_action",
      projectId,
      role: runtime.config.role,
      provider: runtime.config.provider,
      model: runtime.config.model,
      message,
      ...(input.selectedNodeId ? { selectedNodeId: input.selectedNodeId } : {}),
      ...(input.sourceNodeId ? { sourceNodeId: input.sourceNodeId } : {}),
      ...(input.targetNodeId ? { targetNodeId: input.targetNodeId } : {}),
      ...(input.canvasX !== undefined ? { canvasX: input.canvasX } : {}),
      ...(input.canvasY !== undefined ? { canvasY: input.canvasY } : {}),
      ...(recall.memoryIds.length > 0 ? { memoryIds: recall.memoryIds } : {}),
      ...(recall.summary ? { memorySummary: recall.summary } : {}),
      ...(skillTemplates.length > 0 ? { skillTemplateIds: skillTemplates.map((template) => template.id) } : {}),
      ...(skillTemplateSummary ? { skillTemplateSummary } : {}),
    };

    const job = (await this.prisma.generationJob.create({
      data: {
        projectId,
        operation: "agent_canvas_action",
        status: "running",
        provider: runtime.config.provider,
        model: runtime.config.model,
        inputJson: jsonValue(jobInput),
      },
    })) as GenerationJobModel;

    try {
      const parsed = await this.parseAction(projectId, jobInput);
      const executed = await this.executeAction(projectId, job.id, jobInput, parsed);
      const output: AgentCanvasActionJobOutput = {
        operation: "agent_canvas_action",
        actionKind: parsed.kind,
        message,
        summary: executed.summary,
        ...(executed.createdNodes.length > 0 ? { createdNodes: executed.createdNodes } : {}),
        ...(executed.updatedNodes.length > 0 ? { updatedNodes: executed.updatedNodes } : {}),
        ...(executed.createdEdges.length > 0 ? { createdEdges: executed.createdEdges } : {}),
        completedAt: new Date().toISOString(),
      };
      const completed = (await this.prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "succeeded",
          outputJson: jsonValue(output),
          targetNodeId: executed.focusNodeId ?? null,
        },
      })) as GenerationJobModel;

      return {
        job: this.toGenerationJobRecord<AgentCanvasActionJobInput, AgentCanvasActionJobOutput>(
          completed,
        ),
        nodes: executed.nodes,
        edges: executed.edges,
        ...(executed.focusNodeId ? { focusNodeId: executed.focusNodeId } : {}),
      };
    } catch (error) {
      await this.prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage: errorMessage(error),
        },
      });
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException(errorMessage(error));
    }
  }

  async undoCanvasAction(projectId: string, jobId: string): Promise<UndoAgentCanvasActionResult> {
    const job = await this.findAgentActionJob(projectId, jobId);
    if (job.status !== "succeeded") {
      throw new BadRequestException("Only succeeded agent canvas actions can be undone");
    }
    const output = this.parseJobOutput(job.outputJson);
    if (output.undo) {
      throw new BadRequestException("Agent canvas action has already been undone");
    }

    const deletedEdgeIds = await this.undoCreatedEdges(projectId, job.id, output);
    const { deletedNodeIds, restoredNodes } = await this.undoNodes(projectId, job.id, output);
    const nextOutput: AgentCanvasActionJobOutput = {
      ...output,
      undo: {
        undoneAt: new Date().toISOString(),
        deletedNodeIds,
        deletedEdgeIds,
        restoredNodeIds: restoredNodes.map((node) => node.id),
      },
    };
    const updatedJob = (await this.prisma.generationJob.update({
      where: { id: job.id },
      data: { outputJson: jsonValue(nextOutput) },
    })) as GenerationJobModel;

    return {
      job: this.toGenerationJobRecord<AgentCanvasActionJobInput, AgentCanvasActionJobOutput>(
        updatedJob,
      ),
      restoredNodes,
      deletedNodeIds,
      deletedEdgeIds,
    };
  }

  async listMemories(projectId: string): Promise<AgentMemoryListResult> {
    await this.ensureProjectExists(projectId);
    const memories = (await this.prisma.agentMemory.findMany({
      where: { projectId },
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
    })) as AgentMemoryModel[];

    return { memories: memories.map((memory) => this.toMemoryRecord(memory)) };
  }

  async createMemory(
    projectId: string,
    input: CreateAgentMemoryInput,
  ): Promise<AgentMemoryRecord> {
    await this.ensureProjectExists(projectId);
    const content = this.normalizeMemoryContent(input.content);
    const memory = (await this.prisma.agentMemory.create({
      data: {
        projectId,
        scope: this.normalizeMemoryScope(input.scope),
        title: this.normalizeMemoryTitle(input.title),
        content,
        summary: this.memorySummary(content),
        tagsJson: jsonValue(this.normalizeMemoryTags(input.tags)),
        source: this.normalizeMemorySource(input.source),
        enabled: input.enabled ?? true,
      },
    })) as AgentMemoryModel;

    return this.toMemoryRecord(memory);
  }

  async updateMemory(
    projectId: string,
    memoryId: string,
    input: UpdateAgentMemoryInput,
  ): Promise<AgentMemoryRecord> {
    const existing = await this.findProjectMemory(projectId, memoryId);
    const data: {
      title?: string;
      content?: string;
      summary?: string;
      tagsJson?: Prisma.InputJsonValue;
      enabled?: boolean;
    } = {};
    if (input.title !== undefined) {
      data.title = this.normalizeMemoryTitle(input.title);
    }
    if (input.content !== undefined) {
      data.content = this.normalizeMemoryContent(input.content);
      data.summary = this.memorySummary(data.content);
    }
    if (input.tags !== undefined) {
      data.tagsJson = jsonValue(this.normalizeMemoryTags(input.tags));
    }
    if (input.enabled !== undefined) {
      data.enabled = input.enabled;
    }

    if (Object.keys(data).length === 0) {
      return this.toMemoryRecord(existing);
    }

    const updated = (await this.prisma.agentMemory.update({
      where: { id: existing.id },
      data,
    })) as AgentMemoryModel;

    return this.toMemoryRecord(updated);
  }

  async disableMemory(projectId: string, memoryId: string): Promise<AgentMemoryRecord> {
    await this.findProjectMemory(projectId, memoryId);
    const updated = (await this.prisma.agentMemory.update({
      where: { id: memoryId },
      data: { enabled: false },
    })) as AgentMemoryModel;

    return this.toMemoryRecord(updated);
  }

  async clearMemories(
    projectId: string,
    input: ClearAgentMemoriesInput = {},
  ): Promise<ClearAgentMemoriesResult> {
    await this.ensureProjectExists(projectId);
    const deleted = await this.prisma.agentMemory.deleteMany({
      where: {
        projectId,
        ...(input.includeDisabled === false ? { enabled: true } : {}),
      },
    });

    return { deletedCount: deleted.count };
  }

  async recallMemories(
    projectId: string,
    input: RecallAgentMemoriesInput,
  ): Promise<RecallAgentMemoriesResult> {
    await this.ensureProjectExists(projectId);
    const query = input.query.trim();
    const limit = Math.max(1, Math.min(input.limit ?? 5, 20));
    const memories = ((await this.prisma.agentMemory.findMany({
      where: { projectId, enabled: true },
      orderBy: { updatedAt: "desc" },
    })) as AgentMemoryModel[]).filter((memory) => memory.enabled);
    const terms = this.recallTerms(query);
    const scored = memories
      .map((memory) => ({ memory, score: this.memoryRecallScore(memory, terms) }))
      .filter((entry) => terms.length === 0 || entry.score > 0)
      .sort((a, b) => b.score - a.score || a.memory.title.localeCompare(b.memory.title))
      .slice(0, limit)
      .map((entry) => this.toMemoryRecord(entry.memory));

    return {
      memories: scored,
      memoryIds: scored.map((memory) => memory.id),
      summary: this.joinMemorySummary(scored),
    };
  }

  private async parseAction(
    projectId: string,
    input: AgentCanvasActionJobInput,
  ): Promise<ParsedAgentAction> {
    const message = input.message.trim();
    const createMatch = /^(?:create|add)\s+([a-z_ ]+)\s*[:：-]\s*(.+)$/i.exec(message);
    if (createMatch) {
      const typeLabel = createMatch[1]!.trim().toLowerCase();
      const type = SUPPORTED_CREATE_TYPES.get(typeLabel);
      const title = this.normalizeTitle(createMatch[2]);
      if (!type || !PHASE_3_CANVAS_NODE_TYPES.includes(type)) {
        throw new BadRequestException(`Agent cannot create canvas node type "${typeLabel}"`);
      }
      return { kind: "create_node", type, title };
    }

    const updateTitleMatch = /^(?:update|set|rename)(?:\s+(?:selected\s+)?node)?\s+(?:title|name)\s*(?:to|:|：)\s*(.+)$/i.exec(
      message,
    );
    if (updateTitleMatch) {
      const nodeId = input.selectedNodeId?.trim();
      if (!nodeId) {
        throw new BadRequestException("Updating a node requires a selected node");
      }
      await this.findProjectNode(projectId, nodeId);
      return { kind: "update_node", nodeId, title: this.normalizeTitle(updateTitleMatch[1]) };
    }

    const linkMatch = /^(?:link|connect)\s+(character|location|scene|generated image|generated video)$/i.exec(
      message,
    );
    if (linkMatch) {
      const relation = this.relationForLinkLabel(linkMatch[1]!);
      const sourceNodeId = input.sourceNodeId?.trim();
      const targetNodeId = input.targetNodeId?.trim();
      if (!sourceNodeId || !targetNodeId) {
        throw new BadRequestException("Link actions require source and target node ids");
      }
      const existing = await this.prisma.canvasEdge.findFirst({
        where: { projectId, sourceNodeId, targetNodeId, relation: relation as PrismaCanvasEdgeRelation },
      });
      if (existing) {
        throw new BadRequestException("The requested canvas edge already exists");
      }
      return { kind: "create_edge", sourceNodeId, targetNodeId, relation };
    }

    throw new BadRequestException(
      "Unsupported agent action. Try: create shot: title, update title: title, or link character/location/scene.",
    );
  }

  private async executeAction(
    projectId: string,
    jobId: string,
    input: AgentCanvasActionJobInput,
    parsed: ParsedAgentAction,
  ): Promise<{
    summary: string;
    createdNodes: AgentCanvasActionCreatedNode[];
    updatedNodes: AgentCanvasActionUpdatedNode[];
    createdEdges: AgentCanvasActionCreatedEdge[];
    nodes: CanvasNodeRecord[];
    edges: CanvasEdgeRecord[];
    focusNodeId?: string;
  }> {
    if (parsed.kind === "create_node") {
      const node = await this.canvasService.createNode(projectId, {
        tldrawShapeId: this.agentShapeId(jobId, parsed.type),
        type: parsed.type,
        title: parsed.title,
        x: input.canvasX ?? 120,
        y: input.canvasY ?? 120,
        width: this.defaultWidth(parsed.type),
        height: this.defaultHeight(parsed.type),
        dataJson: this.nodeDataForCreate(jobId, input.message, parsed.type, parsed.title),
      });
      return {
        summary: `Created ${this.readableNodeType(parsed.type)} node "${parsed.title}"`,
        createdNodes: [{ nodeId: node.node.id, type: parsed.type, title: node.node.title }],
        updatedNodes: [],
        createdEdges: [],
        nodes: [node.node],
        edges: [],
        focusNodeId: node.node.id,
      };
    }

    if (parsed.kind === "update_node") {
      const previous = await this.findProjectNode(projectId, parsed.nodeId);
      const updated = await this.canvasService.updateNode(projectId, parsed.nodeId, {
        title: parsed.title,
      });
      return {
        summary: `Updated node title to "${parsed.title}"`,
        createdNodes: [],
        updatedNodes: [
          {
            nodeId: updated.node.id,
            title: updated.node.title,
            previous: this.toPreviousSnapshot(previous),
          },
        ],
        createdEdges: [],
        nodes: [updated.node],
        edges: [],
        focusNodeId: updated.node.id,
      };
    }

    const edgeResult = await this.canvasService.createEdge(projectId, {
      sourceNodeId: parsed.sourceNodeId,
      targetNodeId: parsed.targetNodeId,
      relation: parsed.relation,
      dataJson: {
        agentAction: {
          jobId,
          message: input.message,
          actionKind: "create_edge",
        },
      },
    });
    const edges = edgeResult.edges ?? [edgeResult.edge];
    return {
      summary: `Linked nodes with ${parsed.relation}`,
      createdNodes: [],
      updatedNodes: [],
      createdEdges: edges.map((edge) => ({
        edgeId: edge.id,
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        relation: edge.relation,
      })),
      nodes: edgeResult.updatedNodes ?? [],
      edges,
      focusNodeId: parsed.targetNodeId,
    };
  }

  private async undoCreatedEdges(
    projectId: string,
    jobId: string,
    output: AgentCanvasActionJobOutput,
  ): Promise<string[]> {
    const deletedEdgeIds: string[] = [];
    for (const edge of [...(output.createdEdges ?? [])].reverse()) {
      const current = await this.prisma.canvasEdge.findFirst({
        where: { id: edge.edgeId, projectId },
      });
      if (!current || !this.agentActionMatches(current.dataJson, jobId)) {
        continue;
      }
      await this.canvasService.deleteEdge(projectId, edge.edgeId);
      deletedEdgeIds.push(edge.edgeId);
    }
    return deletedEdgeIds;
  }

  private async undoNodes(
    projectId: string,
    jobId: string,
    output: AgentCanvasActionJobOutput,
  ): Promise<{ deletedNodeIds: string[]; restoredNodes: CanvasNodeRecord[] }> {
    const deletedNodeIds: string[] = [];
    const restoredNodes: CanvasNodeRecord[] = [];

    for (const created of output.createdNodes ?? []) {
      const current = await this.prisma.canvasNode.findFirst({
        where: { id: created.nodeId, projectId },
      });
      if (!current || !this.canDeleteCreatedNode(current, created, jobId)) {
        continue;
      }
      const attachedEdges = await this.prisma.canvasEdge.findMany({
        where: {
          projectId,
          OR: [{ sourceNodeId: current.id }, { targetNodeId: current.id }],
        },
      });
      if (attachedEdges.length > 0) {
        continue;
      }
      await this.prisma.canvasNode.deleteMany({ where: { id: current.id, projectId } });
      deletedNodeIds.push(current.id);
    }

    for (const updated of output.updatedNodes ?? []) {
      const current = await this.prisma.canvasNode.findFirst({
        where: { id: updated.nodeId, projectId },
      });
      if (!current || current.title !== (updated.title ?? null)) {
        continue;
      }
      const restored = (await this.prisma.canvasNode.update({
        where: { id: current.id },
        data: {
          title: updated.previous.title ?? null,
          x: updated.previous.x,
          y: updated.previous.y,
          width: updated.previous.width,
          height: updated.previous.height,
          zIndex: updated.previous.zIndex,
          status: updated.previous.status,
          dataJson: jsonValue(updated.previous.dataJson),
        },
      })) as CanvasNodeModel;
      restoredNodes.push(this.toCanvasNodeRecord(restored));
    }

    return { deletedNodeIds, restoredNodes };
  }

  private async findAgentActionJob(projectId: string, jobId: string): Promise<GenerationJobModel> {
    await this.ensureProjectExists(projectId);
    const job = (await this.prisma.generationJob.findFirst({
      where: { id: jobId, projectId, operation: "agent_canvas_action" },
    })) as GenerationJobModel | null;
    if (!job) {
      throw new NotFoundException("Agent canvas action job not found");
    }
    return job;
  }

  private async findProjectNode(projectId: string, nodeId: string): Promise<CanvasNodeModel> {
    const node = (await this.prisma.canvasNode.findFirst({
      where: { id: nodeId, projectId },
    })) as CanvasNodeModel | null;
    if (!node) {
      throw new NotFoundException("Canvas node not found");
    }
    return node;
  }

  private async findProjectMemory(projectId: string, memoryId: string): Promise<AgentMemoryModel> {
    await this.ensureProjectExists(projectId);
    const memory = (await this.prisma.agentMemory.findFirst({
      where: { id: memoryId, projectId },
    })) as AgentMemoryModel | null;
    if (!memory) {
      throw new NotFoundException("Agent memory not found");
    }
    return memory;
  }

  private async recallMemoriesForAction(
    projectId: string,
    message: string,
  ): Promise<RecallAgentMemoriesResult> {
    return this.recallMemories(projectId, { query: message, limit: 5 });
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

  private async findDeployment(projectId: string): Promise<AgentDeploymentModel | undefined> {
    const row = (await this.prisma.agentDeployment.findUnique({
      where: { projectId },
    })) as AgentDeploymentModel | null;
    return row ?? undefined;
  }

  private toDeploymentRecord(
    projectId: string,
    row: AgentDeploymentModel | undefined,
  ): AgentDeploymentRecord {
    const stored = dataObject(row?.rolesJson);
    const config = this.normalizeDeploymentConfig(
      {
        mode: row?.mode,
        primary: stored.primary,
        roles: stored.roles,
      },
      DEFAULT_AGENT_DEPLOYMENT_CONFIG,
    );
    return {
      projectId,
      version: row?.version ?? 1,
      ...config,
      ...(row?.updatedAt ? { updatedAt: toIsoString(row.updatedAt) } : {}),
    };
  }

  private toStoredDeploymentJson(config: AgentDeploymentConfig): Record<string, unknown> {
    return {
      primary: config.primary,
      roles: config.roles,
    };
  }

  private normalizeDeploymentConfig(
    value: unknown,
    fallback: AgentDeploymentConfig,
  ): AgentDeploymentConfig {
    const data = dataObject(value);
    return {
      mode: isAgentDeploymentMode(data.mode) ? data.mode : fallback.mode,
      primary: this.normalizeRoleConfig(data.primary, fallback.primary),
      roles: this.normalizeRoleMap(data.roles, fallback.roles),
    };
  }

  private normalizeRoleMap(value: unknown, fallback: AgentDeploymentRoleMap = {}): AgentDeploymentRoleMap {
    const raw = dataObject(value);
    const roles: AgentDeploymentRoleMap = { ...fallback };
    for (const role of AGENT_DEPLOYMENT_ROLES) {
      if (!(role in raw)) {
        continue;
      }
      if (raw[role] === null) {
        delete roles[role];
        continue;
      }
      const config = this.normalizeRoleConfig(raw[role], roles[role] ?? {});
      if (Object.keys(config).length > 0) {
        roles[role] = config;
      } else {
        delete roles[role];
      }
    }
    return roles;
  }

  private normalizeRoleConfig(
    value: unknown,
    fallback: AgentRoleModelConfig = {},
  ): AgentRoleModelConfig {
    const raw = dataObject(value);
    const provider = isLlmProviderId(raw.provider) ? raw.provider : fallback.provider;
    const model = optionalString(raw.model) ?? fallback.model;
    const temperature = clampNumber(raw.temperature, 0, 2) ?? fallback.temperature;
    const maxOutputTokens = clampInteger(raw.maxOutputTokens, 1, 200000) ?? fallback.maxOutputTokens;
    const inherit = typeof raw.inherit === "boolean" ? raw.inherit : fallback.inherit;

    return {
      ...(provider ? { provider } : {}),
      ...(model ? { model } : {}),
      ...(temperature !== undefined ? { temperature } : {}),
      ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
      ...(inherit !== undefined ? { inherit } : {}),
    };
  }

  private async deploymentResult(record: AgentDeploymentRecord): Promise<AgentDeploymentResult> {
    const management = await this.providersService.getProviderManagement(record.projectId);
    const issues: AgentDeploymentIssue[] = [];
    const resolvedRoles: AgentDeploymentResolvedRole[] = [];
    for (const role of AGENT_DEPLOYMENT_ROLES) {
      const resolved = this.resolveDeploymentRole(record, role, management.llm);
      issues.push(...resolved.issues);
      if (resolved.config) {
        resolvedRoles.push(resolved.config);
      }
    }
    return {
      deployment: record,
      resolvedRoles,
      issues,
    };
  }

  private resolveDeploymentRole(
    deployment: AgentDeploymentConfig,
    role: AgentDeploymentRole,
    providers: readonly LlmProviderManagementItem[],
  ): { config?: AgentDeploymentResolvedRole; issues: AgentDeploymentIssue[] } {
    const { config, inheritedFrom, path } = this.roleConfigFor(deployment, role);
    const issues: AgentDeploymentIssue[] = [];
    const providerId = config.provider;
    const model = config.model;
    const issue = (field: string, message: string): void => {
      issues.push({ role, path: `${path}.${field}`, message });
    };

    if (!providerId) {
      issue("provider", "Provider is required");
    }
    if (!model) {
      issue("model", "Model is required");
    }
    const provider = providerId
      ? providers.find((candidate) => candidate.id === providerId)
      : undefined;
    if (providerId && !provider) {
      issue("provider", `Provider ${providerId} is not available`);
    }
    if (provider && !provider.configuredEnabled) {
      issue("provider", `${provider.displayName} is disabled for this project`);
    }
    if (provider && !provider.credentialConfigured) {
      issue("provider", `${provider.displayName} credential is not configured`);
    }
    if (provider && !provider.enabled && provider.configuredEnabled && provider.credentialConfigured) {
      issue("provider", provider.disabledReason ?? `${provider.displayName} is not enabled`);
    }
    const modelConfig = model ? provider?.models.find((candidate) => candidate.id === model) : undefined;
    if (provider && model && !modelConfig) {
      issue("model", `Model ${model} is not available for ${provider.displayName}`);
    }
    if (modelConfig?.disabled) {
      issue("model", `Model ${model} is disabled for ${provider?.displayName ?? providerId}`);
    }

    if (!providerId || !model) {
      return { issues };
    }
    return {
      config: {
        role,
        provider: providerId,
        model,
        ...(config.temperature !== undefined ? { temperature: config.temperature } : {}),
        ...(config.maxOutputTokens !== undefined ? { maxOutputTokens: config.maxOutputTokens } : {}),
        ...(inheritedFrom ? { inheritedFrom } : {}),
      },
      issues,
    };
  }

  private roleConfigFor(
    deployment: AgentDeploymentConfig,
    role: AgentDeploymentRole,
  ): { config: AgentRoleModelConfig; inheritedFrom?: "primary"; path: string } {
    if (deployment.mode === "simple") {
      return {
        config: deployment.primary,
        inheritedFrom: "primary",
        path: "deployment.primary",
      };
    }
    const roleConfig = deployment.roles[role];
    if (!roleConfig || roleConfig.inherit) {
      return {
        config: deployment.primary,
        inheritedFrom: "primary",
        path: "deployment.primary",
      };
    }
    return {
      config: this.normalizeRoleConfig(roleConfig, deployment.primary),
      path: `deployment.roles.${role}`,
    };
  }

  private requireAgentRole(value: unknown): AgentDeploymentRole {
    if (isAgentDeploymentRole(value)) {
      return value;
    }
    throw new BadRequestException(`Unsupported Agent role: ${String(value)}`);
  }

  private parseJobOutput(value: unknown): AgentCanvasActionJobOutput {
    const output = dataObject(value);
    if (output.operation !== "agent_canvas_action" || typeof output.summary !== "string") {
      throw new BadRequestException("Agent canvas action job is missing action output");
    }
    return output as unknown as AgentCanvasActionJobOutput;
  }

  private relationForLinkLabel(label: string): CanvasEdgeRelation {
    switch (label.toLowerCase()) {
      case "character":
        return "references_character";
      case "location":
        return "references_location";
      case "scene":
        return "belongs_to_scene";
      case "generated image":
        return "generated_image";
      case "generated video":
        return "generated_video";
      case "generated audio":
        return "generated_audio";
      default:
        throw new BadRequestException("Unsupported link relation");
    }
  }

  private normalizeMessage(value: string): string {
    const message = value.trim().replace(/\s+/g, " ");
    if (!message) {
      throw new BadRequestException("Agent message is required");
    }
    if (message.length > 1000) {
      throw new BadRequestException("Agent message is too long");
    }
    return message;
  }

  private normalizeTitle(value: string | undefined): string {
    const title = value?.trim().replace(/\s+/g, " ");
    if (!title) {
      throw new BadRequestException("Agent action title is required");
    }
    if (title.length > 160) {
      throw new BadRequestException("Agent action title is too long");
    }
    return title;
  }

  private normalizeMemoryTitle(value: string): string {
    const title = value.trim().replace(/\s+/g, " ");
    if (!title) {
      throw new BadRequestException("Agent memory title is required");
    }
    if (title.length > 160) {
      throw new BadRequestException("Agent memory title is too long");
    }
    return title;
  }

  private normalizeMemoryContent(value: string): string {
    const content = value.trim();
    if (!content) {
      throw new BadRequestException("Agent memory content is required");
    }
    if (content.length > 4000) {
      throw new BadRequestException("Agent memory content is too long");
    }
    return content;
  }

  private normalizeMemoryTags(values: readonly string[] | undefined): string[] {
    return Array.from(
      new Set(
        (values ?? [])
          .map((value) => value.trim().toLocaleLowerCase())
          .filter((value) => value.length > 0)
          .map((value) => value.slice(0, 40)),
      ),
    ).slice(0, 12);
  }

  private normalizeMemoryScope(value: AgentMemoryScope | undefined): AgentMemoryScope {
    return value && AGENT_MEMORY_SCOPES.includes(value) ? value : "project";
  }

  private normalizeMemorySource(value: AgentMemorySource | undefined): AgentMemorySource {
    return value && AGENT_MEMORY_SOURCES.includes(value) ? value : "manual";
  }

  private memorySummary(content: string): string {
    return content.length > 220 ? `${content.slice(0, 217).trim()}...` : content;
  }

  private skillTemplateSummary(templates: readonly SkillTemplatePromptContext[]): string | undefined {
    const summary = templates
      .map((template) => `${template.displayName} v${template.version}: ${template.summary}`)
      .join("\n");
    return summary || undefined;
  }

  private recallTerms(query: string): string[] {
    return Array.from(
      new Set(
        query
          .toLocaleLowerCase()
          .split(/[^a-z0-9\u4e00-\u9fff]+/u)
          .map((term) => term.trim())
          .filter((term) => term.length >= 2),
      ),
    );
  }

  private memoryRecallScore(memory: AgentMemoryModel, terms: readonly string[]): number {
    if (terms.length === 0) {
      return 1;
    }
    const tags = this.memoryTags(memory.tagsJson);
    const haystack = [
      memory.title,
      memory.summary,
      memory.content,
      ...tags.map((tag) => `#${tag}`),
      ...tags,
    ]
      .join(" ")
      .toLocaleLowerCase();
    return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
  }

  private joinMemorySummary(memories: readonly AgentMemoryRecord[]): string {
    return memories.map((memory) => `${memory.title}: ${memory.summary}`).join("\n");
  }

  private nodeDataForCreate(
    jobId: string,
    message: string,
    type: Phase3CanvasNodeType,
    title: string,
  ): Record<string, CanvasSnapshotJson> {
    const agentAction = {
      jobId,
      message,
      actionKind: "create_node",
    };
    switch (type) {
      case "novel":
        return { synopsis: title, agentAction };
      case "scene_frame":
        return { label: title, description: title, agentAction };
      case "scene":
        return { synopsis: title, agentAction };
      case "shot":
        return { visualDescription: title, action: title, agentAction };
      case "character_asset":
        return { name: title, role: "agent-created", agentAction };
      case "location_asset":
        return { name: title, environment: title, agentAction };
      case "image":
        return { prompt: title, agentAction };
      case "video":
        return { prompt: title, agentAction };
      case "editor_package":
        return { label: title, agentAction };
      default:
        return { label: title, agentAction };
    }
  }

  private agentShapeId(jobId: string, type: Phase3CanvasNodeType): string {
    return `shape:agent-${jobId}-${type}`.replace(/[^a-zA-Z0-9:_-]+/g, "-").slice(0, 150);
  }

  private defaultWidth(type: Phase3CanvasNodeType): number {
    return type === "scene_frame" ? 520 : 320;
  }

  private defaultHeight(type: Phase3CanvasNodeType): number {
    return type === "scene_frame" ? 260 : 220;
  }

  private readableNodeType(type: Phase3CanvasNodeType): string {
    return type.replace(/_/g, " ");
  }

  private toPreviousSnapshot(node: CanvasNodeModel): AgentCanvasActionPreviousNodeSnapshot {
    return {
      nodeId: node.id,
      tldrawShapeId: node.tldrawShapeId,
      type: node.type as CanvasNodeType,
      ...(node.title ? { title: node.title } : {}),
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      zIndex: node.zIndex,
      status: node.status as NodeStatus,
      dataJson: isCanvasSnapshotJson(node.dataJson) ? node.dataJson : {},
    };
  }

  private canDeleteCreatedNode(
    current: CanvasNodeModel,
    created: AgentCanvasActionCreatedNode,
    jobId: string,
  ): boolean {
    return (
      current.title === (created.title ?? null) &&
      current.type === created.type &&
      this.agentActionMatches(current.dataJson, jobId)
    );
  }

  private agentActionMatches(value: unknown, jobId: string): boolean {
    const agentAction = dataObject(dataObject(value).agentAction);
    return optionalString(agentAction.jobId) === jobId;
  }

  private toGenerationJobRecord<TInput, TOutput>(
    job: GenerationJobModel,
  ): GenerationJobRecord<TInput, TOutput> {
    return {
      id: job.id,
      projectId: job.projectId,
      operation: job.operation as GenerationJobRecord<TInput, TOutput>["operation"],
      status: job.status as GenerationJobRecord<TInput, TOutput>["status"],
      provider: job.provider,
      ...(job.model ? { model: job.model } : {}),
      ...(job.sourceNodeId ? { sourceNodeId: job.sourceNodeId } : {}),
      ...(job.targetNodeId ? { targetNodeId: job.targetNodeId } : {}),
      ...(job.providerTaskId ? { providerTaskId: job.providerTaskId } : {}),
      inputJson: job.inputJson as TInput,
      ...(job.outputJson ? { outputJson: job.outputJson as TOutput } : {}),
      ...(job.errorMessage ? { errorMessage: job.errorMessage } : {}),
      createdAt: toIsoString(job.createdAt),
      updatedAt: toIsoString(job.updatedAt),
    };
  }

  private toCanvasNodeRecord(node: CanvasNodeModel): CanvasNodeRecord {
    return {
      id: node.id,
      projectId: node.projectId,
      canvasDocumentId: node.canvasDocumentId,
      tldrawShapeId: node.tldrawShapeId,
      type: node.type as CanvasNodeType,
      ...(node.title ? { title: node.title } : {}),
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      zIndex: node.zIndex,
      status: node.status as NodeStatus,
      dataJson: isCanvasSnapshotJson(node.dataJson) ? node.dataJson : {},
      createdAt: toIsoString(node.createdAt),
      updatedAt: toIsoString(node.updatedAt),
    };
  }

  private toMemoryRecord(memory: AgentMemoryModel): AgentMemoryRecord {
    return {
      id: memory.id,
      projectId: memory.projectId,
      scope: this.normalizeMemoryScope(memory.scope as AgentMemoryScope),
      title: memory.title,
      content: memory.content,
      summary: memory.summary,
      tags: this.memoryTags(memory.tagsJson),
      source: this.normalizeMemorySource(memory.source as AgentMemorySource),
      enabled: memory.enabled,
      createdAt: toIsoString(memory.createdAt),
      updatedAt: toIsoString(memory.updatedAt),
    };
  }

  private memoryTags(value: unknown): string[] {
    return Array.isArray(value) && value.every((item): item is string => typeof item === "string")
      ? this.normalizeMemoryTags(value)
      : [];
  }
}
