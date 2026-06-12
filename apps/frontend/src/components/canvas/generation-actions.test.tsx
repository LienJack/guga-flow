import type { CanvasNodeRecord, GenerationJobRecord, ImageNodeData } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { GenerationActions } from "./generation-actions";

vi.mock("../../lib/api", () => ({
  createGenerationJob: vi.fn(),
  retryGenerationJob: vi.fn(),
}));

describe("GenerationActions", () => {
  it("renders a Shot image generation action", () => {
    const html = renderToStaticMarkup(
      <GenerationActions
        generationJobs={[]}
        projectId="project_1"
        node={node("shot_1", "shot")}
        onGenerationChanged={vi.fn()}
      />,
    );

    expect(html).toContain("Generation");
    expect(html).toContain("Generate Image");
  });

  it("renders an ImageNode video generation action when an asset is bound", () => {
    const html = renderToStaticMarkup(
      <GenerationActions
        generationJobs={[]}
        projectId="project_1"
        node={node<ImageNodeData>("image_1", "image", { assetId: "asset_image_1" })}
      />,
    );

    expect(html).toContain("Generate Video");
  });

  it("does not render image-to-video action before an image asset exists", () => {
    const html = renderToStaticMarkup(
      <GenerationActions
        generationJobs={[]}
        projectId="project_1"
        node={node<ImageNodeData>("image_1", "image", {})}
      />,
    );

    expect(html).toBe("");
  });

  it("shows active status and retry affordance for selected node jobs", () => {
    const html = renderToStaticMarkup(
      <GenerationActions
        generationJobs={[
          generationJob("job_running", "shot_1", "running"),
          generationJob("job_failed", "shot_1", "failed"),
        ]}
        projectId="project_1"
        node={node("shot_1", "shot")}
      />,
    );

    expect(html).toContain("running");
    expect(html).toContain("Retry");
  });
});

function node<TData = Record<string, never>>(
  id: string,
  type: CanvasNodeRecord["type"],
  dataJson = {} as TData,
): CanvasNodeRecord<TData> {
  return {
    id,
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    tldrawShapeId: `shape:${id}`,
    type,
    title: id,
    x: 0,
    y: 0,
    width: 320,
    height: 220,
    zIndex: 0,
    status: "draft",
    dataJson,
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
  };
}

function generationJob(
  id: string,
  sourceNodeId: string,
  status: GenerationJobRecord["status"],
): GenerationJobRecord {
  return {
    id,
    projectId: "project_1",
    operation: "shot_to_image",
    status,
    provider: "mock-image",
    sourceNodeId,
    inputJson: {},
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
  };
}
