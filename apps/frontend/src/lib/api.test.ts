import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoryboardResult } from "@guga-flow/shared-types";

import {
  composeShotPrompt,
  createBatchImagesToVideosJobs,
  createBatchShotsToImagesJobs,
  createEditorExport,
  createGenerationJob,
  createCanvasEdge,
  createCreativeStoryboard,
  createNovelDocument,
  editorExportDownloadUrl,
  generateStoryboardDraft,
  getActiveStoryboardDraft,
  getEditorExport,
  getImageProviderCatalog,
  importStoryboardToCanvas,
  importNovelSource,
  listEditorExports,
  listGenerationJobs,
  markStoryboardDraftReady,
  retryGenerationJob,
  sendEditorExportToLocalEditor,
  updateStoryboardDraft,
} from "./api";

describe("frontend api client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
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
          timelineJson: { selectedVideoNodeIds: ["video_1", "video_2"], sortMode: "canvas_x" },
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
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3002/api/v1/projects/project_1/editor-exports",
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
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
