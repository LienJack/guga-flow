import type {
  CanvasNodeRecord,
  GenerationJobRecord,
  ImageNodeData,
  ImageProviderCatalogResult,
  ShotNodeData,
} from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  buildBatchShotsToImagesJobInput,
  buildGenerationJobInputForOperation,
  GenerationActions,
  GenerationBatchActions,
} from "./generation-actions";

vi.mock("../../lib/api", () => ({
  cancelGenerationJob: vi.fn(),
  createBatchImagesToVideosJobs: vi.fn(),
  createBatchShotsToImagesJobs: vi.fn(),
  createGenerationJob: vi.fn(),
  getImageProviderCatalog: vi.fn(),
  getVideoProviderCatalog: vi.fn(),
  retryGenerationJob: vi.fn(),
}));

describe("GenerationActions", () => {
  it("renders a Shot image generation action", () => {
    const html = renderToStaticMarkup(
      <GenerationActions
        generationJobs={[]}
        imageProviderCatalog={catalogFixture()}
        projectId="project_1"
        node={node("shot_1", "shot")}
        onGenerationChanged={vi.fn()}
      />,
    );

    expect(html).toContain("Generation");
    expect(html).toContain("Generate Image");
    expect(html).toContain("Provider");
    expect(html).toContain("Mock Image");
  });

  it("renders disabled real image providers without secret values", () => {
    const html = renderToStaticMarkup(
      <GenerationActions
        generationJobs={[]}
        imageProviderCatalog={catalogFixture()}
        projectId="project_1"
        node={node("shot_1", "shot")}
      />,
    );

    expect(html).toContain("Image 2 unavailable");
    expect(html).toContain("Nano Banana unavailable");
    expect(html).toContain("Image 2 server-side key is not configured");
    expect(html).not.toContain("sk-test");
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
    expect(html).toContain("Provider");
    expect(html).toContain("Mock Video");
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

  it("builds image generation job inputs with selected provider settings", () => {
    expect(
      buildGenerationJobInputForOperation("shot_to_image", "shot_1", {
        provider: "image2",
        model: "gpt-image-2",
        aspectRatio: "9:16",
        count: 3,
        providerParams: { quality: "high" },
      }),
    ).toEqual({
      operation: "shot_to_image",
      sourceNodeId: "shot_1",
      provider: "image2",
      model: "gpt-image-2",
      aspectRatio: "9:16",
      count: 3,
      providerParams: { quality: "high" },
    });

    expect(
      buildGenerationJobInputForOperation("image_to_video", "image_1", undefined, {
        videoProvider: "seedance",
        videoModel: "seedance-1-0-pro",
        videoAspectRatio: "16:9",
        durationSeconds: 5,
        resolution: "1080p",
        videoProviderParams: { cameraFixed: true },
      }),
    ).toEqual({
      operation: "image_to_video",
      sourceNodeId: "image_1",
      videoProvider: "seedance",
      videoModel: "seedance-1-0-pro",
      videoAspectRatio: "16:9",
      durationSeconds: 5,
      resolution: "1080p",
      videoProviderParams: { cameraFixed: true },
    });
  });

  it("renders batch image actions for selected Shot nodes", () => {
    const html = renderToStaticMarkup(
      <GenerationBatchActions
        generationJobs={[]}
        projectId="project_1"
        shotNodes={[
          node<ShotNodeData>("shot_1", "shot", { imagePrompt: "frame one" }),
          node<ShotNodeData>("shot_2", "shot", { imagePrompt: "frame two" }),
        ]}
      />,
    );

    expect(html).toContain("Batch Image");
    expect(html).toContain("2/2");
    expect(html).toContain("Mock Image");
  });

  it("renders batch video actions for selected Image nodes", () => {
    const html = renderToStaticMarkup(
      <GenerationBatchActions
        generationJobs={[generationJob("job_running", "image_2", "running")]}
        projectId="project_1"
        imageNodes={[
          node<ImageNodeData>("image_1", "image", { assetId: "asset_image_1" }),
          node<ImageNodeData>("image_2", "image", { assetId: "asset_image_2" }),
        ]}
      />,
    );

    expect(html).toContain("Batch Video");
    expect(html).toContain("1/2");
    expect(html).toContain("Mock Video");
  });

  it("builds batch shot image inputs with selected provider settings", () => {
    expect(
      buildBatchShotsToImagesJobInput(["shot_1", "shot_2"], {
        provider: "image2",
        model: "gpt-image-2",
        aspectRatio: "16:9",
        count: 2,
        providerParams: { quality: "medium" },
      }),
    ).toEqual({
      operation: "batch_shots_to_images",
      sourceNodeIds: ["shot_1", "shot_2"],
      provider: "image2",
      model: "gpt-image-2",
      aspectRatio: "16:9",
      count: 2,
      providerParams: { quality: "medium" },
    });
  });
});

function catalogFixture(): ImageProviderCatalogResult {
  return {
    providers: [
      {
        id: "mock-image",
        displayName: "Mock Image",
        enabled: true,
        requiresApiKey: false,
        defaultModel: "mock-image-v1",
        models: [{ id: "mock-image-v1", displayName: "Mock Image v1", default: true }],
        supportedModes: ["text_to_image", "multi_reference"],
        supportsReferenceImages: true,
        maxReferenceImages: 99,
        supportsMultipleOutputs: false,
        maxOutputs: 1,
        defaultAspectRatio: "16:9",
        supportedAspectRatios: ["9:16", "16:9", "1:1"],
        parameters: [],
      },
      {
        id: "image2",
        displayName: "Image 2",
        enabled: false,
        disabledReason: "Image 2 server-side key is not configured",
        requiresApiKey: true,
        defaultModel: "gpt-image-2",
        models: [{ id: "gpt-image-2", displayName: "GPT Image 2", default: true }],
        supportedModes: ["text_to_image", "multi_reference"],
        supportsReferenceImages: true,
        maxReferenceImages: 4,
        supportsMultipleOutputs: true,
        maxOutputs: 4,
        defaultAspectRatio: "16:9",
        supportedAspectRatios: ["9:16", "16:9", "1:1"],
        parameters: [
          {
            id: "quality",
            label: "Quality",
            type: "select",
            defaultValue: "medium",
            options: [
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ],
          },
        ],
      },
      {
        id: "banana",
        displayName: "Nano Banana",
        enabled: false,
        disabledReason: "Nano Banana server-side key is not configured",
        requiresApiKey: true,
        defaultModel: "gemini-2.5-flash-image",
        models: [{ id: "gemini-2.5-flash-image", displayName: "Gemini 2.5 Flash Image", default: true }],
        supportedModes: ["text_to_image", "multi_reference"],
        supportsReferenceImages: true,
        maxReferenceImages: 3,
        supportsMultipleOutputs: false,
        maxOutputs: 1,
        defaultAspectRatio: "16:9",
        supportedAspectRatios: ["9:16", "16:9", "1:1"],
        parameters: [
          {
            id: "imageSize",
            label: "Image size",
            type: "select",
            defaultValue: "1K",
            options: [
              { value: "1K", label: "1K" },
              { value: "2K", label: "2K" },
            ],
          },
        ],
      },
    ],
  };
}

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
