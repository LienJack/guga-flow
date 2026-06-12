import { afterEach, describe, expect, it, vi } from "vitest";
import type { StoryboardResult } from "@guga-flow/shared-types";

import {
  createCanvasEdge,
  createNovelDocument,
  generateStoryboardDraft,
  getActiveStoryboardDraft,
  importStoryboardToCanvas,
  importNovelSource,
  markStoryboardDraftReady,
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
