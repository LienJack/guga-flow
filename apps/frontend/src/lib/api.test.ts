import { afterEach, describe, expect, it, vi } from "vitest";

import { createCanvasEdge } from "./api";

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
});
