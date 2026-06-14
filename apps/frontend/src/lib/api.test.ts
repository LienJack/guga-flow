import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoryboardResult } from "@guga-flow/shared-types";

import {
  composeShotPrompt,
  activateProgrammableProviderVersion,
  activateSkillTemplateVersion,
  createBatchImagesToVideosJobs,
  createBatchShotsToImagesJobs,
  createAgentCanvasAction,
  createAgentMemory,
  createAssetAnalysisJob,
  createEditorExport,
  createGenerationJob,
  createProgrammableProvider,
  createProject,
  createCanvasEdge,
  createCreativeStoryboard,
  createNovelDocument,
  createScriptDraft,
  discoverProviderModels,
  editorExportDownloadUrl,
  exportCanvasFragment,
  exportProjectSettings,
  extractNovelEvents,
  extractNovelChapterEvents,
  exportScriptDraft,
  generateStoryboardFromScriptDraft,
  generateStoryboardDraft,
  generationEventsUrl,
  getActiveStoryboardDraft,
  getAgentDeployment,
  getCurrentSession,
  getEditorExport,
  getImageProviderCatalog,
  getLlmProviderCatalog,
  getNovelEventGraph,
  getNovelChapter,
  getProviderManagement,
  getProjectSettingsSummary,
  getProjectImageProviderCatalog,
  getProjectLlmProviderCatalog,
  getProjectVideoProviderCatalog,
  batchAssets,
  createAssetCollection,
  createAssetTag,
  listAssetCollections,
  listProgrammableProviders,
  getProject,
  importStoryboardToCanvas,
  importCanvasFragment,
  importNovelSource,
  listAssets,
  listAssetTags,
  listNovelChapters,
  listScriptDrafts,
  listEditorExports,
  listAgentMemories,
  listGenerationJobs,
  listProjects,
  listWorkflows,
  listSkillTemplates,
  markStoryboardDraftReady,
  retryGenerationJob,
  runWorkflow,
  resolveAgentRole,
  recallAgentMemories,
  testProviderConfig,
  disableProgrammableProvider,
  disableAgentMemory,
  clearAgentMemories,
  updateProject,
  validateProjectSettingsImport,
  updateProviderConfig,
  updateProgrammableProviderSource,
  updateAgentDeployment,
  updateSkillTemplateSource,
  sendEditorExportToLocalEditor,
  updateStoryboardDraft,
  updateNovelChapter,
  updateScriptDraft,
  undoAgentCanvasAction,
  createWorkflowDefinition,
  createWorkflowVersion,
  activateWorkflowVersion,
  login,
  logout,
} from "./api";
import { getAuthToken, setAuthToken } from "./session";

describe("frontend api client", () => {
  afterEach(() => {
    setAuthToken(null);
    vi.unstubAllGlobals();
  });

  it("persists bearer sessions and attaches them to protected API calls", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = String(input);
      if (url.endsWith("/auth/login")) {
        return Response.json({
          token: "session_token",
          user: { id: "default-user", email: "admin@guga-flow.local" },
          expiresAt: "2026-06-21T00:00:00.000Z",
        });
      }
      if (url.endsWith("/auth/session")) {
        return Response.json({
          authenticated: true,
          user: { id: "default-user", email: "admin@guga-flow.local" },
          expiresAt: "2026-06-21T00:00:00.000Z",
        });
      }
      if (url.endsWith("/auth/logout")) {
        return Response.json({ ok: true });
      }
      return Response.json([]);
    });
    vi.stubGlobal("fetch", fetchMock);

    await login({ email: "admin@guga-flow.local", password: "guga-flow-dev" });
    await getCurrentSession();
    await listProjects();
    await logout();

    expect(getAuthToken()).toBeUndefined();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/auth/session",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer session_token",
        },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3002/api/v1/projects",
      expect.objectContaining({
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer session_token",
        },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:3002/api/v1/auth/logout",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer session_token",
        },
      }),
    );
  });

  it("posts semantic canvas edge payloads", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        edge: {
          id: "edge_1",
          projectId: "project_1",
          canvasDocumentId: "canvas_1",
          sourceNodeId: "character_1",
          targetNodeId: "shot_1",
          relation: "references_character",
          createdAt: "2026-06-12T00:00:00.000Z",
        },
        edges: [],
        updatedNodes: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createCanvasEdge("project_1", {
      sourceNodeId: "character_1",
      targetNodeId: "shot_1",
      relation: "references_character",
      visualArrowShapeId: "shape:arrow-1",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3002/api/v1/projects/project_1/canvas/edges",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          sourceNodeId: "character_1",
          targetNodeId: "shot_1",
          relation: "references_character",
          visualArrowShapeId: "shape:arrow-1",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("calls asset library filtering, taxonomy, and batch endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json([]));
    vi.stubGlobal("fetch", fetchMock);

    await listAssets("project_1", {
      query: "hero frame",
      type: "image",
      collectionId: "collection_1",
      tagIds: ["tag_1", "tag_2"],
    });
    await listAssetCollections("project_1");
    await createAssetCollection("project_1", { name: "Characters", kind: "character" });
    await listAssetTags("project_1");
    await createAssetTag("project_1", { name: "approved", color: "#2f7d46" });
    await batchAssets("project_1", {
      assetIds: ["asset_1"],
      action: "add_tags",
      tagIds: ["tag_1"],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/projects/project_1/assets?query=hero+frame&type=image&collectionId=collection_1&tagIds=tag_1%2Ctag_2",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/projects/project_1/assets/collections",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3002/api/v1/projects/project_1/assets/collections",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Characters", kind: "character" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:3002/api/v1/projects/project_1/assets/tags",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "http://localhost:3002/api/v1/projects/project_1/assets/tags",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "approved", color: "#2f7d46" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "http://localhost:3002/api/v1/projects/project_1/assets/batch",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          assetIds: ["asset_1"],
          action: "add_tags",
          tagIds: ["tag_1"],
        }),
      }),
    );
  });

  it("calls infinite canvas P1 workflow, fragment, analysis, and event endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({}));
    vi.stubGlobal("fetch", fetchMock);
    const manifest = {
      format: "guga-flow-canvas-fragment" as const,
      schemaVersion: 1 as const,
      sourceProjectId: "source_project",
      exportedAt: "2026-06-14T00:00:00.000Z",
      nodes: [],
      edges: [],
      assets: [],
    };
    const workflowSource = { nodes: [] };
    const workflowMapping = {
      fields: [{ id: "prompt", type: "text" as const, required: true }],
      outputs: [{ kind: "image" as const }],
    };

    await createAssetAnalysisJob("project_1", {
      operation: "asset_caption",
      assetIds: ["asset_1"],
    });
    await exportCanvasFragment("project_1", { nodeIds: ["node_1"] });
    await importCanvasFragment("project_1", { manifest });
    await listWorkflows("project_1");
    await createWorkflowDefinition("project_1", {
      kind: "comfyui",
      provider: "comfyui",
      displayName: "Reference Upscale",
      sourceJson: workflowSource,
      mappingJson: workflowMapping,
    });
    await createWorkflowVersion("project_1", "workflow_1", {
      sourceJson: workflowSource,
      mappingJson: workflowMapping,
    });
    await activateWorkflowVersion("project_1", "workflow_1", "version_2");
    await runWorkflow("project_1", "workflow_1", {
      sourceNodeId: "image_1",
      outputKind: "image",
      referenceAssetIds: ["asset_1"],
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/projects/project_1/generation/jobs/asset-analysis",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ operation: "asset_caption", assetIds: ["asset_1"] }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/projects/project_1/canvas/fragments/export",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ nodeIds: ["node_1"] }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3002/api/v1/projects/project_1/canvas/fragments/import",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ manifest }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:3002/api/v1/projects/project_1/workflows",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "http://localhost:3002/api/v1/projects/project_1/workflows",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          kind: "comfyui",
          provider: "comfyui",
          displayName: "Reference Upscale",
          sourceJson: workflowSource,
          mappingJson: workflowMapping,
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "http://localhost:3002/api/v1/projects/project_1/workflows/workflow_1/versions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ sourceJson: workflowSource, mappingJson: workflowMapping }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "http://localhost:3002/api/v1/projects/project_1/workflows/workflow_1/versions/version_2/activate",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      8,
      "http://localhost:3002/api/v1/projects/project_1/workflows/workflow_1/run",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          sourceNodeId: "image_1",
          outputKind: "image",
          referenceAssetIds: ["asset_1"],
        }),
      }),
    );
    expect(generationEventsUrl("project_1")).toBe(
      "http://localhost:3002/api/v1/projects/project_1/generation/events",
    );
  });

  it("calls agent canvas action endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        job: {
          id: "job_1",
          projectId: "project_1",
          operation: "agent_canvas_action",
          status: "succeeded",
          provider: "mock-llm",
          model: "mock-storyboard",
          inputJson: {
            operation: "agent_canvas_action",
            role: "universal",
            provider: "mock-llm",
            model: "mock-storyboard",
            message: "create shot: rain reveal",
          },
          outputJson: {
            operation: "agent_canvas_action",
            actionKind: "create_node",
            message: "create shot: rain reveal",
            summary: "Created shot",
            createdNodes: [{ nodeId: "shot_1", type: "shot", title: "rain reveal" }],
            completedAt: "2026-06-13T00:00:00.000Z",
          },
          createdAt: "2026-06-13T00:00:00.000Z",
          updatedAt: "2026-06-13T00:00:00.000Z",
        },
        nodes: [],
        edges: [],
        restoredNodes: [],
        deletedNodeIds: [],
        deletedEdgeIds: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createAgentCanvasAction("project_1", {
      message: "create shot: rain reveal",
      selectedNodeId: "shot_selected",
      sourceNodeId: "character_1",
      targetNodeId: "shot_selected",
    });
    await undoAgentCanvasAction("project_1", "job_1");
    await getAgentDeployment("project_1");
    await updateAgentDeployment("project_1", {
      mode: "advanced",
      roles: {
        script: {
          provider: "mock-llm",
          model: "mock-storyboard",
        },
      },
    });
    await resolveAgentRole("project_1", { role: "script" });
    await listAgentMemories("project_1");
    await createAgentMemory("project_1", {
      title: "Rainy neon palette",
      content: "Use rainy neon lighting.",
      tags: ["style"],
    });
    await disableAgentMemory("project_1", "memory_1");
    await clearAgentMemories("project_1", { includeDisabled: true });
    await recallAgentMemories("project_1", { query: "rainy neon", limit: 3 });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/projects/project_1/agents/canvas-actions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          message: "create shot: rain reveal",
          selectedNodeId: "shot_selected",
          sourceNodeId: "character_1",
          targetNodeId: "shot_selected",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/projects/project_1/agents/canvas-actions/job_1/undo",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3002/api/v1/projects/project_1/agents/deployment",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:3002/api/v1/projects/project_1/agents/deployment",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          mode: "advanced",
          roles: {
            script: {
              provider: "mock-llm",
              model: "mock-storyboard",
            },
          },
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "http://localhost:3002/api/v1/projects/project_1/agents/deployment/resolve",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ role: "script" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "http://localhost:3002/api/v1/projects/project_1/agents/memories",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "http://localhost:3002/api/v1/projects/project_1/agents/memories",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "Rainy neon palette",
          content: "Use rainy neon lighting.",
          tags: ["style"],
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      8,
      "http://localhost:3002/api/v1/projects/project_1/agents/memories/memory_1/disable",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      9,
      "http://localhost:3002/api/v1/projects/project_1/agents/memories/clear",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ includeDisabled: true }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      10,
      "http://localhost:3002/api/v1/projects/project_1/agents/memories/recall",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ query: "rainy neon", limit: 3 }),
      }),
    );
  });

  it("calls the Shot prompt compose endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        shotNodeId: "shot_1",
        sourceNodeIds: {
          shotNodeId: "shot_1",
          characterNodeIds: ["character_1"],
          referenceAssetIds: [],
        },
        referenceAssetIds: [],
        negativePrompt: "",
        image: {
          channel: "image",
          prompt: "image prompt",
          negativePrompt: "",
          parts: [],
          missingContext: [],
        },
        video: {
          channel: "video",
          prompt: "video prompt",
          negativePrompt: "",
          parts: [],
          missingContext: [],
        },
        debugParts: [],
        missingContext: [],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await composeShotPrompt("project_1", "shot_1", {
      globalStylePrompt: "ink wash",
      modelPromptSuffix: "clean frame",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3002/api/v1/projects/project_1/prompts/shot/shot_1/compose",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          globalStylePrompt: "ink wash",
          modelPromptSuffix: "clean frame",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("calls project metadata endpoints with generation settings", async () => {
    const project = {
      id: "project_1",
      ownerUserId: "default-user",
      title: "Demo Project",
      defaultAspectRatio: "9:16",
      generationSettings: {
        visualStyle: "cinematic noir",
        aspectRatio: "16:9",
        visualManual: {
          artStyle: "project rainy noir",
        },
        directorManual: {
          cameraLanguage: "controlled push-ins",
        },
        subtitle: { status: "requested_unresolved", label: "Captions" },
      },
      assetCount: 0,
      createdAt: "2026-06-13T00:00:00.000Z",
      updatedAt: "2026-06-13T00:00:00.000Z",
    };
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json(project));
    vi.stubGlobal("fetch", fetchMock);

    await createProject({
      title: "Demo Project",
      generationSettings: {
        visualStyle: "cinematic noir",
        aspectRatio: "16:9",
        visualManual: {
          artStyle: "project rainy noir",
        },
      },
    });
    await getProject("project_1");
    await updateProject("project_1", {
      generationSettings: {
        subtitle: { label: "Captions" },
        directorManual: {
          cameraLanguage: "controlled push-ins",
        },
      },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/projects",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "Demo Project",
          generationSettings: {
            visualStyle: "cinematic noir",
            aspectRatio: "16:9",
            visualManual: {
              artStyle: "project rainy noir",
            },
          },
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/projects/project_1",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3002/api/v1/projects/project_1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          generationSettings: {
            subtitle: { label: "Captions" },
            directorManual: {
              cameraLanguage: "controlled push-ins",
            },
          },
        }),
      }),
    );
  });

  it("calls project settings center endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        project: {
          id: "project_1",
          title: "Demo Project",
          defaultAspectRatio: "16:9",
          generationSettingsCount: 1,
        },
        modules: [],
        resourceCounts: {},
        fileSummary: { totalAssets: 0, totalSizeBytes: 0, byType: [], uploadStorageConfigured: true },
        version: {
          service: "guga-flow",
          appVersion: "0.1.0",
          apiVersion: "v1",
          generatedAt: "2026-06-13T00:00:00.000Z",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getProjectSettingsSummary("project_1");
    await exportProjectSettings("project_1");
    await validateProjectSettingsImport("project_1", {
      payload: { version: "1.0", project: { id: "project_1" }, providers: [], skillTemplates: [] },
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/projects/project_1/settings",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/projects/project_1/settings/export",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3002/api/v1/projects/project_1/settings/import/validate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          payload: { version: "1.0", project: { id: "project_1" }, providers: [], skillTemplates: [] },
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("calls project-scoped generation job endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        job: {
          id: "job_1",
          projectId: "project_1",
          operation: "shot_to_image",
          status: "queued",
          provider: "mock-image",
          sourceNodeId: "shot_1",
          inputJson: {},
          createdAt: "2026-06-12T00:00:00.000Z",
          updatedAt: "2026-06-12T00:00:00.000Z",
        },
        jobs: [],
        retryJob: {
          id: "job_retry",
          projectId: "project_1",
          operation: "shot_to_image",
          status: "queued",
          provider: "mock-image",
          sourceNodeId: "shot_1",
          inputJson: {},
          createdAt: "2026-06-12T00:00:00.000Z",
          updatedAt: "2026-06-12T00:00:00.000Z",
        },
        queueSummary: {
          queued: 1,
          running: 0,
          failed: 0,
          counts: {
            queued: 1,
            running: 0,
            provider_waiting: 0,
            succeeded: 0,
            failed: 0,
            cancelled: 0,
          },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createGenerationJob("project_1", {
      operation: "shot_to_image",
      sourceNodeId: "shot_1",
      provider: "image2",
      model: "gpt-image-2",
      aspectRatio: "9:16",
      count: 2,
      providerParams: { quality: "high" },
    });
    await listGenerationJobs("project_1");
    await retryGenerationJob("project_1", "job_1");
    await getImageProviderCatalog();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/projects/project_1/generation/jobs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          operation: "shot_to_image",
          sourceNodeId: "shot_1",
          provider: "image2",
          model: "gpt-image-2",
          aspectRatio: "9:16",
          count: 2,
          providerParams: { quality: "high" },
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/projects/project_1/generation/jobs",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3002/api/v1/projects/project_1/generation/jobs/job_1/retry",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:3002/api/v1/providers/image",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
  });

  it("calls project-scoped batch generation endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        jobs: [],
        skipped: [],
        queueSummary: {
          queued: 0,
          running: 0,
          failed: 0,
          counts: {
            queued: 0,
            running: 0,
            provider_waiting: 0,
            succeeded: 0,
            failed: 0,
            cancelled: 0,
          },
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createBatchShotsToImagesJobs("project_1", {
      operation: "batch_shots_to_images",
      sourceNodeIds: ["shot_1", "shot_2"],
      provider: "mock-image",
      model: "mock-image-v1",
      aspectRatio: "16:9",
      count: 1,
      providerParams: {},
    });
    await createBatchImagesToVideosJobs("project_1", {
      operation: "batch_images_to_videos",
      sourceNodeIds: ["image_1"],
      videoProvider: "mock-video",
      videoModel: "mock-video-v1",
      videoAspectRatio: "16:9",
      durationSeconds: 4,
      resolution: "720p",
      videoProviderParams: {},
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/projects/project_1/generation/jobs/batch-shots-to-images",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          operation: "batch_shots_to_images",
          sourceNodeIds: ["shot_1", "shot_2"],
          provider: "mock-image",
          model: "mock-image-v1",
          aspectRatio: "16:9",
          count: 1,
          providerParams: {},
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/projects/project_1/generation/jobs/batch-images-to-videos",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          operation: "batch_images_to_videos",
          sourceNodeIds: ["image_1"],
          videoProvider: "mock-video",
          videoModel: "mock-video-v1",
          videoAspectRatio: "16:9",
          durationSeconds: 4,
          resolution: "720p",
          videoProviderParams: {},
        }),
      }),
    );
  });

  it("calls project-scoped provider management endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        image: [],
        video: [],
        provider: {
          id: "image2",
          kind: "image",
          displayName: "Image 2",
          enabled: true,
        },
        status: "succeeded",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await getLlmProviderCatalog();
    await getProviderManagement("project_1");
    await getProjectLlmProviderCatalog("project_1");
    await getProjectImageProviderCatalog("project_1");
    await getProjectVideoProviderCatalog("project_1");
    await updateProviderConfig("project_1", "image", "image2", {
      enabled: true,
      defaultModel: "gpt-image-2",
      params: {
        protocol: "openai_compatible",
        baseUrl: "https://api.example.test",
      },
      credential: { action: "set", value: "sk-client-test" },
    });
    await discoverProviderModels("project_1", {
      kind: "image",
      provider: "image2",
      protocol: "openai_compatible",
      baseUrl: "https://api.example.test",
      credential: { source: "temporary", value: "sk-client-test" },
    });
    await testProviderConfig("project_1", "image", "image2", {
      model: "gpt-image-2",
    });
    await listProgrammableProviders("project_1");
    await createProgrammableProvider("project_1", { sourceCode: "export default {}" });
    await updateProgrammableProviderSource("project_1", "image", "custom:atlas-cloud", {
      sourceCode: "export default { id: 'custom:atlas-cloud' }",
    });
    await activateProgrammableProviderVersion("project_1", "image", "custom:atlas-cloud", {
      versionId: "programmable_version_1",
    });
    await disableProgrammableProvider("project_1", "image", "custom:atlas-cloud");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/providers/llm",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/projects/project_1/providers",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3002/api/v1/projects/project_1/providers/llm",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:3002/api/v1/projects/project_1/providers/image",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "http://localhost:3002/api/v1/projects/project_1/providers/video",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "http://localhost:3002/api/v1/projects/project_1/providers/image/image2",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          enabled: true,
          defaultModel: "gpt-image-2",
          params: {
            protocol: "openai_compatible",
            baseUrl: "https://api.example.test",
          },
          credential: { action: "set", value: "sk-client-test" },
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "http://localhost:3002/api/v1/projects/project_1/providers/discover-models",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          kind: "image",
          provider: "image2",
          protocol: "openai_compatible",
          baseUrl: "https://api.example.test",
          credential: { source: "temporary", value: "sk-client-test" },
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      8,
      "http://localhost:3002/api/v1/projects/project_1/providers/image/image2/test",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ model: "gpt-image-2" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      9,
      "http://localhost:3002/api/v1/projects/project_1/providers/programmable",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      10,
      "http://localhost:3002/api/v1/projects/project_1/providers/programmable",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ sourceCode: "export default {}" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      11,
      "http://localhost:3002/api/v1/projects/project_1/providers/programmable/image/custom%3Aatlas-cloud/source",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ sourceCode: "export default { id: 'custom:atlas-cloud' }" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      12,
      "http://localhost:3002/api/v1/projects/project_1/providers/programmable/image/custom%3Aatlas-cloud/activate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ versionId: "programmable_version_1" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      13,
      "http://localhost:3002/api/v1/projects/project_1/providers/programmable/image/custom%3Aatlas-cloud/disable",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("calls project-scoped skill template endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        templates: [],
        template: {
          id: "skill_1",
          projectId: "project_1",
          kind: "art",
          slug: "art-default",
          displayName: "Art Skill",
          enabled: true,
          presetCategories: ["ai-image"],
          triggerModes: ["insert_prompt", "direct_generate"],
          agentRoles: ["asset", "video_prompt"],
          indexStatus: "ready",
          versions: [],
          createdAt: "2026-06-13T00:00:00.000Z",
          updatedAt: "2026-06-13T00:00:00.000Z",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await listSkillTemplates("project_1", {
      category: "ai-image",
      query: "cyan",
      agentRole: "asset",
      triggerMode: "insert_prompt",
      templateIds: ["skill_1"],
    });
    await updateSkillTemplateSource("project_1", "art", "art-default", {
      sourceText: "Use crisp cyan highlights.",
    });
    await activateSkillTemplateVersion("project_1", "art", "art-default", {
      versionId: "skill_version_1",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/projects/project_1/skills?query=cyan&category=ai-image&triggerMode=insert_prompt&agentRole=asset&templateIds=skill_1",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/projects/project_1/skills/art/art-default/source",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ sourceText: "Use crisp cyan highlights." }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3002/api/v1/projects/project_1/skills/art/art-default/activate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ versionId: "skill_version_1" }),
      }),
    );
  });

  it("passes API error messages through the shared request wrapper", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json(
        { message: ["Invalid semantic relation", "Target node not found"] },
        { status: 400, statusText: "Bad Request" },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createCanvasEdge("project_1", {
        sourceNodeId: "character_1",
        targetNodeId: "location_1",
        relation: "references_character",
      }),
    ).rejects.toThrow("Invalid semantic relation, Target node not found");
  });

  it("calls project-scoped editor export endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        export: {
          id: "export_1",
          projectId: "project_1",
          status: "queued",
          timelineJson: {
            selectedVideoNodeIds: ["video_1", "video_2"],
            sortMode: "canvas_x",
            exportPreset: "hd_1080p",
          },
          createdAt: "2026-06-13T00:00:00.000Z",
          updatedAt: "2026-06-13T00:00:00.000Z",
        },
        exports: [],
        job: {
          id: "job_export_1",
          projectId: "project_1",
          operation: "editor_export",
          status: "queued",
          provider: "mock-editor",
          model: "zip-v1",
          inputJson: {},
          createdAt: "2026-06-13T00:00:00.000Z",
          updatedAt: "2026-06-13T00:00:00.000Z",
        },
        queueSummary: {
          queued: 1,
          running: 0,
          failed: 0,
          counts: {
            queued: 1,
            running: 0,
            provider_waiting: 0,
            succeeded: 0,
            failed: 0,
            cancelled: 0,
          },
        },
        sent: false,
        errorMessage: "LOCAL_EDITOR_URL is not configured",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createEditorExport("project_1", {
      videoNodeIds: ["video_1", "video_2"],
      sortMode: "canvas_x",
      exportPreset: "hd_1080p",
      sourceEditorExportId: "export_previous",
    });
    await listEditorExports("project_1");
    await getEditorExport("project_1", "export_1");
    await sendEditorExportToLocalEditor("project_1", "export_1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/projects/project_1/editor-exports",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          videoNodeIds: ["video_1", "video_2"],
          sortMode: "canvas_x",
          exportPreset: "hd_1080p",
          sourceEditorExportId: "export_previous",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/projects/project_1/editor-exports",
      expect.objectContaining({
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3002/api/v1/projects/project_1/editor-exports/export_1",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:3002/api/v1/projects/project_1/editor-exports/export_1/send",
      expect.objectContaining({ method: "POST" }),
    );
    expect(editorExportDownloadUrl("project_1", "export_1")).toBe(
      "http://localhost:3002/api/v1/projects/project_1/editor-exports/export_1/download",
    );
  });

  it("calls project-scoped novel source endpoints", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        novel: {
          id: "novel_1",
          projectId: "project_1",
          title: "Rooftop story",
          content: "Hero watches the city.",
          sourceType: "paste",
          wordCount: 4,
          language: "en",
          createdAt: "2026-06-12T00:00:00.000Z",
          updatedAt: "2026-06-12T00:00:00.000Z",
        },
        eventGraph: {
          id: "event_graph_1",
          projectId: "project_1",
          novelDocumentId: "novel_1",
          chapters: [],
          events: [],
          createdAt: "2026-06-13T00:00:00.000Z",
          updatedAt: "2026-06-13T00:00:00.000Z",
        },
        chapters: [],
        chapter: {
          chapterIndex: 1,
          title: "Chapter 1",
          startOffset: 0,
          endOffset: 20,
          wordCount: 4,
          summary: "Hero watches the city.",
          eventState: "pending",
          eventCount: 0,
          eventIds: [],
          content: "Hero watches the city.",
          events: [],
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await createNovelDocument("project_1", {
      title: "Rooftop story",
      content: "Hero watches the city.",
    });
    await importNovelSource("project_1", {
      title: "Markdown story",
      content: "# Scene\nHero watches the city.",
      sourceType: "md",
    });
    await createCreativeStoryboard("project_1", {
      idea: "A courier finds a glowing signal under a rainy overpass.",
      mode: "advanced",
      audience: "short drama viewers",
      stylePrompt: "rainy neon thriller",
      targetDurationSeconds: 45,
    });
    await extractNovelEvents("project_1", "novel_1", { chapterIndexes: [1] });
    await listNovelChapters("project_1", "novel_1");
    await getNovelChapter("project_1", "novel_1", 1);
    await updateNovelChapter("project_1", "novel_1", 1, {
      content: "Hero raises a signal flare.",
    });
    await extractNovelChapterEvents("project_1", "novel_1", 1, { forceFailure: true });
    await getNovelEventGraph("project_1", "novel_1");
    await listScriptDrafts("project_1", "novel_1");
    await createScriptDraft("project_1", "novel_1", { strategy: "short_drama" });
    await updateScriptDraft("project_1", "novel_1", "script_1", {
      workspace: {
        storySkeleton: {
          title: "Rooftop story",
          logline: "Skeleton logline",
          sourceChapterIndexes: [1],
          sourceEventIds: ["chapter_1_event_1"],
          beats: [
            {
              beatId: "beat_1",
              orderIndex: 1,
              title: "Opening beat",
              summary: "Hero sees the signal.",
              chapterIndex: 1,
              eventIds: ["chapter_1_event_1"],
            },
          ],
        },
        adaptationStrategy: {
          strategy: "short_drama",
          summary: "Short drama hook first.",
          targetFormat: "Short-drama",
        },
        script: {
          title: "Rooftop story",
          logline: "Script logline",
          strategy: "short_drama",
          scenes: [],
        },
      },
    });
    await exportScriptDraft("project_1", "novel_1", "script_1");
    await generateStoryboardFromScriptDraft("project_1", "novel_1", "script_1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/projects/project_1/novels",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "Rooftop story",
          content: "Hero watches the city.",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/projects/project_1/novels/import",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "Markdown story",
          content: "# Scene\nHero watches the city.",
          sourceType: "md",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3002/api/v1/projects/project_1/novels/creative-brief",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          idea: "A courier finds a glowing signal under a rainy overpass.",
          mode: "advanced",
          audience: "short drama viewers",
          stylePrompt: "rainy neon thriller",
          targetDurationSeconds: 45,
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/extract-events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ chapterIndexes: [1] }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/chapters",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      6,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/chapters/1",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      7,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/chapters/1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ content: "Hero raises a signal flare." }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      8,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/chapters/1/extract-events",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ forceFailure: true }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      9,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/event-graph",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      10,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/script-drafts",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      11,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/script-drafts",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ strategy: "short_drama" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      12,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/script-drafts/script_1",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining("storySkeleton"),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      13,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/script-drafts/script_1/export",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      14,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/script-drafts/script_1/generate-storyboard",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("calls storyboard draft lifecycle endpoints", async () => {
    const storyboard = {
      title: "Rooftop story",
      logline: "A compact test storyboard.",
      characters: [
        {
          tempId: "char_hero",
          name: "Hero",
          role: "protagonist",
          appearance: "A consistent lead.",
          personality: "Focused.",
          identityPrompt: "consistent hero",
        },
      ],
      locations: [
        {
          tempId: "loc_rooftop",
          name: "Rooftop",
          type: "exterior",
          description: "A city rooftop.",
          lighting: "evening",
          atmosphere: "quiet",
          locationPrompt: "cinematic rooftop",
        },
      ],
      scenes: [
        {
          tempId: "scene_1",
          title: "Opening",
          sourceExcerpt: "Hero watches the city.",
          summary: "Hero enters the frame.",
          mood: "focused",
          characterTempIds: ["char_hero"],
          locationTempId: "loc_rooftop",
          shots: [
            {
              tempId: "shot_1",
              shotIndex: 1,
              title: "Hero watches",
              durationSec: 4,
              visualDescription: "Hero watches the skyline.",
              action: "looks out",
              cameraMovement: "slow push in",
              characterTempIds: ["char_hero"],
              locationTempId: "loc_rooftop",
              imagePrompt: "hero on a rooftop",
              videoPrompt: "slow push in on hero",
            },
          ],
        },
      ],
    } satisfies StoryboardResult;
    const draft = {
      id: "draft_1",
      projectId: "project_1",
      novelDocumentId: "novel_1",
      status: "valid",
      storyboard,
      validationIssues: [],
      provider: "mock-llm",
      model: "mock-storyboard",
      readyForImport: false,
      createdAt: "2026-06-12T00:00:00.000Z",
      updatedAt: "2026-06-12T00:00:00.000Z",
    };
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ draft, validation: { success: true, data: storyboard, issues: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    await generateStoryboardDraft("project_1", "novel_1");
    await getActiveStoryboardDraft("project_1", "novel_1");
    await updateStoryboardDraft("project_1", "novel_1", "draft_1", { storyboard });
    await markStoryboardDraftReady("project_1", "novel_1", "draft_1");
    await importStoryboardToCanvas("project_1", {
      novelDocumentId: "novel_1",
      storyboardDraftId: "draft_1",
      duplicatePolicy: "new_version",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/generate-storyboard",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/storyboard-draft",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/storyboard-draft/draft_1",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ storyboard }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      "http://localhost:3002/api/v1/projects/project_1/novels/novel_1/storyboard-draft/draft_1/ready",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      "http://localhost:3002/api/v1/projects/project_1/canvas/import-storyboard",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          novelDocumentId: "novel_1",
          storyboardDraftId: "draft_1",
          duplicatePolicy: "new_version",
        }),
      }),
    );
  });
});
