import { BadRequestException } from "@nestjs/common";
import type {
  AgentCanvasActionJobOutput,
  CanvasEdgeRecord,
  CanvasNodeRecord,
  ProductionWorkspaceProjection,
  SceneFrameNodeData,
  ShotNodeData,
} from "@guga-flow/shared-types";
import { AGENT_DEPLOYMENT_ROLES } from "@guga-flow/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CanvasService } from "../canvas/canvas.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProvidersService } from "../providers/providers.service";
import { SkillTemplatesService } from "../skill-templates/skill-templates.service";
import { AgentsService } from "./agents.service";

const createdAt = new Date("2026-06-13T00:00:00.000Z");
const updatedAt = new Date("2026-06-13T00:05:00.000Z");

function generationJob(overrides: Record<string, unknown> = {}) {
  return {
    id: "job_1",
    projectId: "project_1",
    operation: "agent_canvas_action",
    status: "running",
    provider: "mock-llm",
    model: "mock-storyboard",
    sourceNodeId: null,
    targetNodeId: null,
    providerTaskId: null,
    inputJson: {},
    outputJson: null,
    errorMessage: null,
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function canvasNode<TData = Record<string, unknown>>(
  id: string,
  type: CanvasNodeRecord["type"],
  title: string,
  dataJson: TData,
): CanvasNodeRecord<TData> {
  return {
    id,
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    tldrawShapeId: `shape:${id}`,
    type,
    title,
    x: 10,
    y: 20,
    width: 320,
    height: 220,
    zIndex: 0,
    status: "draft",
    dataJson,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

function canvasNodeModel(overrides: Record<string, unknown> = {}) {
  return {
    id: "shot_1",
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    tldrawShapeId: "shape:shot_1",
    type: "shot",
    title: "Old title",
    x: 10,
    y: 20,
    width: 320,
    height: 220,
    zIndex: 0,
    status: "draft",
    dataJson: { visualDescription: "Old description" },
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function canvasEdge(
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
  relation: CanvasEdgeRecord["relation"],
): CanvasEdgeRecord {
  return {
    id,
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    sourceNodeId,
    targetNodeId,
    sourceShapeId: `shape:${sourceNodeId}`,
    targetShapeId: `shape:${targetNodeId}`,
    relation,
    dataJson: { agentAction: { jobId: "job_1" } },
    createdAt: createdAt.toISOString(),
  };
}

function productionWorkspace(): ProductionWorkspaceProjection {
  return {
    projectId: "project_1",
    storyboardTable: [],
    storyboardItems: [
      {
        itemId: "shot_1",
        shotNodeId: "shot_1",
        orderIndex: 1,
        title: "Shot 001",
        summary: "A rain reveal opens the sequence.",
        durationSeconds: 4,
        imagePrompt: "rain reveal image",
        videoPrompt: "slow push through rain",
        status: "draft",
        storyEventIds: [],
        referenceAssetIds: [],
        updatedAt: updatedAt.toISOString(),
      },
    ],
    videoTracks: [],
    assets: [],
    summary: {
      shotCount: 1,
      assetCount: 0,
      referenceAssetCount: 0,
      latestUpdatedAt: updatedAt.toISOString(),
      generationQueue: {
        counts: {
          queued: 0,
          running: 0,
          provider_waiting: 0,
          succeeded: 0,
          failed: 0,
          cancelled: 0,
        },
        queued: 0,
        running: 0,
        providerWaiting: 0,
        succeeded: 0,
        failed: 0,
        cancelled: 0,
      },
    },
    agentContext: {
      scriptPlanSummary: "No script plan.",
      storyboardTableSummary: "1 shots across 1 scene containers.",
      storyboardSummary: "Shot 001: A rain reveal opens the sequence.",
      assetSummary: "0 production assets, 0 visual variants.",
      generationSummary: "0 active generation jobs, 0 failed jobs.",
    },
  };
}

function agentMemory(overrides: Record<string, unknown> = {}) {
  return {
    id: "memory_1",
    projectId: "project_1",
    scope: "project",
    title: "Rainy neon palette",
    content: "Use rainy neon lighting for night chase sequences.",
    summary: "Use rainy neon lighting for night chase sequences.",
    tagsJson: ["style", "rain"],
    source: "manual",
    enabled: true,
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function agentDeployment(overrides: Record<string, unknown> = {}) {
  return {
    id: "agent_deployment_1",
    projectId: "project_1",
    mode: "simple",
    rolesJson: {
      primary: {
        provider: "mock-llm",
        model: "mock-storyboard",
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
      roles: {},
    },
    version: 1,
    createdAt,
    updatedAt,
    ...overrides,
  };
}

type MockCreateArgs = { data: Record<string, unknown> };
type MockUpdateArgs = { where: Record<string, unknown>; data: Record<string, unknown> };
type MockFindArgs = { where: Record<string, unknown> };

function createPrismaMock() {
  let deploymentRow: ReturnType<typeof agentDeployment> | null = null;
  return {
    project: {
      findUnique: vi.fn(async (): Promise<{ id: string } | null> => ({ id: "project_1" })),
    },
    agentDeployment: {
      findUnique: vi.fn(async (): Promise<ReturnType<typeof agentDeployment> | null> => deploymentRow),
      upsert: vi.fn(async (args: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        const data = deploymentRow ? args.update : args.create;
        deploymentRow = agentDeployment({
          mode: data.mode,
          rolesJson: data.rolesJson,
          version: deploymentRow ? deploymentRow.version + 1 : data.version ?? 1,
        });
        return deploymentRow;
      }),
    },
    generationJob: {
      create: vi.fn(async (args: MockCreateArgs) =>
        generationJob({
          status: args.data.status,
          inputJson: args.data.inputJson,
        }),
      ),
      update: vi.fn(async (args: MockUpdateArgs) =>
        generationJob({
          status: args.data.status ?? "succeeded",
          targetNodeId: args.data.targetNodeId ?? null,
          outputJson: args.data.outputJson ?? null,
          errorMessage: args.data.errorMessage ?? null,
        }),
      ),
      findFirst: vi.fn(
        async (_args: MockFindArgs): Promise<ReturnType<typeof generationJob> | null> => null,
      ),
    },
    canvasNode: {
      findFirst: vi.fn(
        async (_args: MockFindArgs): Promise<ReturnType<typeof canvasNodeModel> | null> => null,
      ),
      findMany: vi.fn(async (_args: MockFindArgs) => []),
      update: vi.fn(async (args: MockUpdateArgs) => {
        if (args.where.id === "board_1") {
          return canvasNodeModel({
            id: "board_1",
            tldrawShapeId: "shape:board_1",
            type: "scene_frame",
            title: "Agent Board",
            width: 520,
            height: 360,
            dataJson: args.data.dataJson,
          });
        }
        return canvasNodeModel({
          ...(args.data.title !== undefined ? { title: args.data.title } : {}),
          ...(args.data.dataJson !== undefined ? { dataJson: args.data.dataJson } : {}),
          ...(args.data.x !== undefined ? { x: args.data.x } : {}),
          ...(args.data.y !== undefined ? { y: args.data.y } : {}),
          ...(args.data.width !== undefined ? { width: args.data.width } : {}),
          ...(args.data.height !== undefined ? { height: args.data.height } : {}),
          ...(args.data.zIndex !== undefined ? { zIndex: args.data.zIndex } : {}),
          ...(args.data.status !== undefined ? { status: args.data.status } : {}),
        });
      }),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    canvasEdge: {
      findFirst: vi.fn(async (_args: MockFindArgs) => null),
      findMany: vi.fn(async (_args: MockFindArgs) => []),
    },
    agentMemory: {
      findMany: vi.fn(
        async (_args: MockFindArgs): Promise<ReturnType<typeof agentMemory>[]> => [],
      ),
      findFirst: vi.fn(
        async (_args: MockFindArgs): Promise<ReturnType<typeof agentMemory> | null> => null,
      ),
      create: vi.fn(async (args: MockCreateArgs) => agentMemory(args.data)),
      update: vi.fn(async (args: MockUpdateArgs) => agentMemory(args.data)),
      deleteMany: vi.fn(async () => ({ count: 2 })),
    },
  };
}

function createCanvasServiceMock() {
  const boardNode = canvasNode<SceneFrameNodeData>("board_1", "scene_frame", "Agent Board", {
    label: "Agent Board",
    description: "1 storyboard items",
    shotNodeIds: ["shot_1"],
  });

  return {
    createNode: vi.fn(async (_projectId: string, input: { type: CanvasNodeRecord["type"]; title?: string; dataJson?: unknown }) => ({
      node: canvasNode<ShotNodeData>("shot_agent_1", input.type, input.title ?? "Untitled", input.dataJson as ShotNodeData),
    })),
    updateNode: vi.fn(async (_projectId: string, nodeId: string, input: { title?: string }) => ({
      node: canvasNode<ShotNodeData>(nodeId, "shot", input.title ?? "Untitled", {
        visualDescription: "Old description",
      }),
    })),
    createEdge: vi.fn(async () => ({
      edge: canvasEdge("edge_1", "character_1", "shot_1", "references_character"),
      edges: [canvasEdge("edge_1", "character_1", "shot_1", "references_character")],
      updatedNodes: [canvasNode<ShotNodeData>("shot_1", "shot", "Shot 1", { characterAssetIds: ["character_1"] })],
    })),
    deleteEdge: vi.fn(async () => ({ deleted: true, edgeId: "edge_1", deletedEdgeIds: ["edge_1"], updatedNodes: [] })),
    createStoryboardMediaBoard: vi.fn(async () => ({
      workspace: productionWorkspace(),
      boardNode,
      nodes: [boardNode],
      edges: [],
      focusNodeId: "board_1",
    })),
  };
}

function createSkillTemplatesServiceMock() {
  return {
    activePromptContexts: vi.fn(async () => [
      {
        id: "skill_agent",
        kind: "agent" as const,
        slug: "agent-default",
        displayName: "Agent Skill",
        summary: "Prefer auditable node edits.",
        presetCategories: ["agent" as const],
        agentRoles: ["universal" as const, "supervision" as const],
        sourceText: "Prefer auditable node edits.",
        versionId: "skill_version_1",
        version: 1,
      },
    ]),
  };
}

function createProvidersServiceMock() {
  return {
    getProviderManagement: vi.fn(async () => ({
      llm: [
        {
          kind: "llm",
          id: "mock-llm",
          displayName: "Mock LLM",
          enabled: true,
          requiresApiKey: false,
          defaultModel: "mock-storyboard",
          models: [
            {
              id: "mock-storyboard",
              displayName: "Mock Storyboard",
              default: true,
              kind: "llm",
              modes: ["chat", "json"],
              supportsJsonMode: true,
            },
          ],
          supportedModes: ["chat", "json"],
          supportsJsonMode: true,
          supportsToolCalls: false,
          supportsVision: false,
          maxOutputTokens: 4096,
          parameters: [],
          configuredEnabled: true,
          credentialConfigured: true,
        },
      ],
      image: [],
      video: [],
    })),
  };
}

describe("AgentsService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let canvasService: ReturnType<typeof createCanvasServiceMock>;
  let providersService: ReturnType<typeof createProvidersServiceMock>;
  let skillTemplatesService: ReturnType<typeof createSkillTemplatesServiceMock>;
  let service: AgentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    canvasService = createCanvasServiceMock();
    providersService = createProvidersServiceMock();
    skillTemplatesService = createSkillTemplatesServiceMock();
    service = new AgentsService(
      prisma as unknown as PrismaService,
      canvasService as unknown as CanvasService,
      providersService as unknown as ProvidersService,
      skillTemplatesService as unknown as SkillTemplatesService,
    );
  });

  it("returns a default simple Agent deployment that resolves every role to the primary model", async () => {
    const result = await service.getDeployment("project_1");

    expect(result.deployment.mode).toBe("simple");
    expect(result.deployment.primary).toMatchObject({
      provider: "mock-llm",
      model: "mock-storyboard",
    });
    expect(result.issues).toEqual([]);
    expect(result.resolvedRoles).toHaveLength(AGENT_DEPLOYMENT_ROLES.length);
    expect(result.resolvedRoles[0]).toMatchObject({
      provider: "mock-llm",
      model: "mock-storyboard",
      inheritedFrom: "primary",
    });
  });

  it("stores advanced role overrides and resolves the selected role independently", async () => {
    const result = await service.updateDeployment("project_1", {
      mode: "advanced",
      roles: {
        storyboard: {
          provider: "mock-llm",
          model: "mock-storyboard",
          temperature: 0.1,
          maxOutputTokens: 2048,
          inherit: false,
        },
      },
    });

    expect(prisma.agentDeployment.upsert).toHaveBeenCalledWith({
      where: { projectId: "project_1" },
      create: expect.objectContaining({
        projectId: "project_1",
        mode: "advanced",
        rolesJson: expect.objectContaining({
          roles: expect.objectContaining({
            storyboard: expect.objectContaining({ temperature: 0.1, inherit: false }),
          }),
        }),
      }),
      update: expect.objectContaining({
        mode: "advanced",
        rolesJson: expect.objectContaining({
          roles: expect.objectContaining({
            storyboard: expect.objectContaining({ maxOutputTokens: 2048 }),
          }),
        }),
      }),
    });
    expect(result.deployment.mode).toBe("advanced");
    expect(result.resolvedRoles.find((role) => role.role === "storyboard")).toMatchObject({
      role: "storyboard",
      provider: "mock-llm",
      model: "mock-storyboard",
      temperature: 0.1,
      maxOutputTokens: 2048,
    });
  });

  it("creates a shot node and records a succeeded agent action job", async () => {
    prisma.agentMemory.findMany.mockResolvedValue([
      agentMemory({
        id: "memory_style",
        title: "Rainy neon palette",
        tagsJson: ["style", "rain"],
      }),
    ]);

    const result = await service.createCanvasAction("project_1", {
      message: "create shot: rainy neon subway entrance",
      canvasX: 480,
      canvasY: 240,
    });

    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operation: "agent_canvas_action",
        status: "running",
        provider: "mock-llm",
        model: "mock-storyboard",
        inputJson: expect.objectContaining({
          role: "universal",
          provider: "mock-llm",
          model: "mock-storyboard",
          memoryIds: ["memory_style"],
          memorySummary: expect.stringContaining("Rainy neon palette"),
          skillTemplateIds: ["skill_agent"],
          skillTemplateSummary: expect.stringContaining("Agent Skill v1"),
        }),
      }),
    });
    expect(skillTemplatesService.activePromptContexts).toHaveBeenCalledWith(
      "project_1",
      [
        "story",
        "art",
        "production",
        "agent",
        "ai-image",
        "ai-text",
        "ai-video",
        "ai-audio",
      ],
      { agentRole: "universal" },
    );
    expect(canvasService.createNode).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        type: "shot",
        title: "rainy neon subway entrance",
        x: 480,
        y: 240,
        dataJson: expect.objectContaining({
          agentAction: expect.objectContaining({ jobId: "job_1" }),
        }),
      }),
    );
    expect(prisma.generationJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        status: "succeeded",
        outputJson: expect.objectContaining({
          actionKind: "create_node",
          createdNodes: [{ nodeId: "shot_agent_1", type: "shot", title: "rainy neon subway entrance" }],
        }),
        targetNodeId: "shot_agent_1",
      }),
    });
    expect(result.focusNodeId).toBe("shot_agent_1");
  });

  it("creates storyboard boards through the production agent tool boundary", async () => {
    const result = await service.createProductionAction("project_1", {
      action: "create_storyboard_board",
      title: "Agent Board",
      itemIds: ["shot_1", "shot_1", " "],
      columns: 3,
    });

    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        operation: "agent_canvas_action",
        status: "running",
        provider: "mock-llm",
        model: "mock-storyboard",
        inputJson: expect.objectContaining({
          role: "production",
          productionAction: "create_storyboard_board",
          title: "Agent Board",
          itemIds: ["shot_1"],
          columns: 3,
        }),
      }),
    });
    expect(canvasService.createStoryboardMediaBoard).toHaveBeenCalledWith("project_1", {
      itemIds: ["shot_1"],
      title: "Agent Board",
      columns: 3,
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "board_1" },
      data: {
        dataJson: expect.objectContaining({
          label: "Agent Board",
          agentAction: expect.objectContaining({
            jobId: "job_1",
            actionKind: "create_storyboard_board",
          }),
        }),
      },
    });
    expect(prisma.generationJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        status: "succeeded",
        outputJson: expect.objectContaining({
          actionKind: "create_storyboard_board",
          summary: expect.stringContaining("Agent Board"),
          createdNodes: [{ nodeId: "board_1", type: "scene_frame", title: "Agent Board" }],
        }),
        targetNodeId: "board_1",
      }),
    });
    expect(result.focusNodeId).toBe("board_1");
    expect(result.workspace.storyboardItems).toHaveLength(1);
    expect(result.nodes[0]?.dataJson).toMatchObject({
      agentAction: {
        jobId: "job_1",
        actionKind: "create_storyboard_board",
      },
    });
  });

  it("blocks agent canvas actions before job creation when deployment config is invalid", async () => {
    prisma.agentDeployment.findUnique.mockResolvedValue(
      agentDeployment({
        mode: "advanced",
        rolesJson: {
          primary: {
            provider: "mock-llm",
            model: "mock-storyboard",
          },
          roles: {
            production: {
              provider: "generic-llm",
              model: "chat-model",
              inherit: false,
            },
          },
        },
      }),
    );

    await expect(
      service.createCanvasAction("project_1", {
        role: "production",
        message: "create shot: failed deployment gate",
      }),
    ).rejects.toThrow("Provider generic-llm is not available");

    expect(prisma.generationJob.create).not.toHaveBeenCalled();
    expect(canvasService.createNode).not.toHaveBeenCalled();
  });

  it("records failed production agent jobs when the controlled canvas tool fails", async () => {
    canvasService.createStoryboardMediaBoard.mockRejectedValueOnce(
      new BadRequestException("Storyboard board requires at least one item"),
    );

    await expect(
      service.createProductionAction("project_1", {
        action: "create_storyboard_board",
        title: "Empty Board",
      }),
    ).rejects.toThrow("Storyboard board requires at least one item");

    expect(prisma.generationJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        status: "failed",
        errorMessage: "Storyboard board requires at least one item",
      }),
    });
    expect(prisma.canvasNode.update).not.toHaveBeenCalled();
  });

  it("creates, recalls, disables, and clears visible project memories", async () => {
    prisma.agentMemory.findMany.mockResolvedValue([
      agentMemory({ id: "memory_1" }),
      agentMemory({
        id: "memory_disabled",
        title: "Muted colors",
        enabled: false,
        tagsJson: ["style"],
      }),
    ]);
    prisma.agentMemory.findFirst.mockResolvedValue(agentMemory({ id: "memory_1" }));

    const created = await service.createMemory("project_1", {
      title: " Rainy neon palette ",
      content: " Use rainy neon lighting for night chase sequences. ",
      tags: ["Style", "rain", "rain"],
    });
    const list = await service.listMemories("project_1");
    const recall = await service.recallMemories("project_1", {
      query: "rainy neon shot",
      limit: 5,
    });
    const disabled = await service.disableMemory("project_1", "memory_1");
    const cleared = await service.clearMemories("project_1");

    expect(created.tags).toEqual(["style", "rain"]);
    expect(list.memories).toHaveLength(2);
    expect(recall.memoryIds).toContain("memory_1");
    expect(recall.memoryIds).not.toContain("memory_disabled");
    expect(disabled.enabled).toBe(false);
    expect(cleared.deletedCount).toBe(2);
  });

  it("records failed audit jobs for unsupported messages without mutating the canvas", async () => {
    await expect(
      service.createCanvasAction("project_1", { message: "delete everything" }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(canvasService.createNode).not.toHaveBeenCalled();
    expect(prisma.generationJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        status: "failed",
        errorMessage: expect.stringContaining("Unsupported agent action"),
      }),
    });
  });

  it("creates semantic edges through the canvas service", async () => {
    const result = await service.createCanvasAction("project_1", {
      message: "link character",
      sourceNodeId: "character_1",
      targetNodeId: "shot_1",
    });

    expect(canvasService.createEdge).toHaveBeenCalledWith(
      "project_1",
      expect.objectContaining({
        sourceNodeId: "character_1",
        targetNodeId: "shot_1",
        relation: "references_character",
        dataJson: expect.objectContaining({
          agentAction: expect.objectContaining({ actionKind: "create_edge" }),
        }),
      }),
    );
    expect(result.edges[0]?.relation).toBe("references_character");
    expect(result.job.outputJson?.createdEdges?.[0]?.edgeId).toBe("edge_1");
  });

  it("undoes an update action by restoring the captured previous node snapshot", async () => {
    const output: AgentCanvasActionJobOutput = {
      operation: "agent_canvas_action",
      actionKind: "update_node",
      message: "update title: New title",
      summary: "Updated node title to New title",
      updatedNodes: [
        {
          nodeId: "shot_1",
          title: "New title",
          previous: {
            nodeId: "shot_1",
            tldrawShapeId: "shape:shot_1",
            type: "shot",
            title: "Old title",
            x: 10,
            y: 20,
            width: 320,
            height: 220,
            zIndex: 0,
            status: "draft",
            dataJson: { visualDescription: "Old description" },
          },
        },
      ],
      completedAt: "2026-06-13T00:01:00.000Z",
    };
    prisma.generationJob.findFirst.mockResolvedValue(
      generationJob({
        status: "succeeded",
        outputJson: output,
      }),
    );
    prisma.canvasNode.findFirst.mockResolvedValue(canvasNodeModel({ title: "New title" }));

    const result = await service.undoCanvasAction("project_1", "job_1");

    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "shot_1" },
      data: expect.objectContaining({
        title: "Old title",
        dataJson: { visualDescription: "Old description" },
      }),
    });
    expect(result.restoredNodes[0]?.title).toBe("Old title");
    expect(prisma.generationJob.update).toHaveBeenCalledWith({
      where: { id: "job_1" },
      data: expect.objectContaining({
        outputJson: expect.objectContaining({
          undo: expect.objectContaining({ restoredNodeIds: ["shot_1"] }),
        }),
      }),
    });
  });
});
