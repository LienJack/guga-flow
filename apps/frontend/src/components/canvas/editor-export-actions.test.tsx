import type {
  CanvasNodeRecord,
  EditorExportRecord,
  EditorExportSendResult,
  VideoNodeData,
} from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  buildCreateEditorExportInput,
  EditorExportActions,
  isExportableVideoNode,
} from "./editor-export-actions";
import { I18nProvider } from "../../lib/i18n";

vi.mock("../../lib/api", () => ({
  createEditorExport: vi.fn(),
  editorExportDownloadUrl: vi.fn((projectId: string, exportId: string) => `/exports/${projectId}/${exportId}.zip`),
  listEditorExports: vi.fn(async () => ({ exports: [] })),
  sendEditorExportToLocalEditor: vi.fn(),
}));

describe("EditorExportActions", () => {
  it("renders export controls for selected VideoNodes", () => {
    const html = renderToStaticMarkup(
      <EditorExportActions
        generationJobs={[]}
        projectId="project_1"
        videoNodes={[videoNode("video_1"), videoNode("video_2")]}
        onGenerationChanged={vi.fn()}
      />,
    );

    expect(html).toContain("Editor Export");
    expect(html).toContain("2 videos selected");
    expect(html).toContain("Shot Index");
    expect(html).toContain("Canvas X");
    expect(html).toContain("Manual");
    expect(html).toContain("Edit ZIP");
    expect(html).toContain("GIF");
    expect(html).toContain("Images");
    expect(html).toContain("HD");
    expect(html).toContain("Queue Export");
  });

  it("renders export controls in Chinese when a locale provider is present", () => {
    const html = renderToStaticMarkup(
      <I18nProvider initialLocale="zh">
        <EditorExportActions
          generationJobs={[]}
          projectId="project_1"
          videoNodes={[videoNode("video_1"), videoNode("video_2")]}
        />
      </I18nProvider>,
    );

    expect(html).toContain("剪辑导出");
    expect(html).toContain("已选择 2 个视频");
    expect(html).toContain("镜头顺序");
    expect(html).toContain("排队导出");
  });

  it("builds create-export input from selected videos and sort mode", () => {
    expect(
      buildCreateEditorExportInput([videoNode("video_1"), videoNode("video_2")], "canvas_x", "hd_1080p"),
    ).toEqual({
      videoNodeIds: ["video_1", "video_2"],
      sortMode: "canvas_x",
      exportPreset: "hd_1080p",
    });
    expect(
      buildCreateEditorExportInput(
        [videoNode("video_1"), videoNode("video_2")],
        "manual",
        "gif_preview",
        "export_previous",
      ),
    ).toEqual({
      videoNodeIds: ["video_1", "video_2"],
      sortMode: "manual",
      exportPreset: "gif_preview",
      sourceEditorExportId: "export_previous",
    });
  });

  it("detects exportable VideoNodes with bound assets", () => {
    expect(isExportableVideoNode(videoNode("video_1"))).toBe(true);
    expect(isExportableVideoNode({ ...videoNode("video_2"), dataJson: {} })).toBe(false);
    expect(isExportableVideoNode({ ...videoNode("image_1"), type: "image" })).toBe(false);
  });

  it("keeps package download visible when local editor send fails", () => {
    const exportRecord: EditorExportRecord = {
      id: "export_1",
      projectId: "project_1",
      packageAssetId: "asset_package_1",
      status: "succeeded",
      timelineJson: {
        sortMode: "shot_index",
        exportPreset: "standard_zip",
        metadata: {
          selectedVideoNodeIds: ["video_1", "video_2"],
        },
      },
      createdAt: "2026-06-13T00:00:00.000Z",
      updatedAt: "2026-06-13T00:05:00.000Z",
    };
    const sendResult: EditorExportSendResult = {
      export: exportRecord,
      sent: false,
      errorMessage: "LOCAL_EDITOR_URL is not configured",
    };

    const html = renderToStaticMarkup(
      <EditorExportActions
        generationJobs={[]}
        initialExports={[exportRecord]}
        initialSendResult={sendResult}
        projectId="project_1"
        videoNodes={[videoNode("video_1"), videoNode("video_2")]}
      />,
    );

    expect(html).toContain("Download");
    expect(html).toContain("Queue Revision");
    expect(html).toContain("History match: Edit ZIP / Shot Index / export_1");
    expect(html).toContain("/exports/project_1/export_1.zip");
    expect(html).toContain("LOCAL_EDITOR_URL is not configured");
  });

  it("does not reuse a completed export from a different sort mode", () => {
    const exportRecord: EditorExportRecord = {
      id: "export_canvas_x",
      projectId: "project_1",
      packageAssetId: "asset_package_1",
      status: "succeeded",
      timelineJson: {
        selectedVideoNodeIds: ["video_1", "video_2"],
        sortMode: "canvas_x",
        exportPreset: "standard_zip",
      },
      createdAt: "2026-06-13T00:00:00.000Z",
      updatedAt: "2026-06-13T00:05:00.000Z",
    };

    const html = renderToStaticMarkup(
      <EditorExportActions
        generationJobs={[]}
        initialExports={[exportRecord]}
        projectId="project_1"
        videoNodes={[videoNode("video_1"), videoNode("video_2")]}
      />,
    );

    expect(html).not.toContain("Download");
    expect(html).not.toContain("/exports/project_1/export_canvas_x.zip");
  });

  it("does not reuse a completed export from a different preset", () => {
    const exportRecord: EditorExportRecord = {
      id: "export_hd",
      projectId: "project_1",
      packageAssetId: "asset_package_1",
      status: "succeeded",
      timelineJson: {
        selectedVideoNodeIds: ["video_1", "video_2"],
        sortMode: "shot_index",
        exportPreset: "hd_1080p",
      },
      createdAt: "2026-06-13T00:00:00.000Z",
      updatedAt: "2026-06-13T00:05:00.000Z",
    };

    const html = renderToStaticMarkup(
      <EditorExportActions
        generationJobs={[]}
        initialExports={[exportRecord]}
        projectId="project_1"
        videoNodes={[videoNode("video_1"), videoNode("video_2")]}
      />,
    );

    expect(html).not.toContain("Download");
    expect(html).not.toContain("/exports/project_1/export_hd.zip");
  });
});

function videoNode(id: string): CanvasNodeRecord<VideoNodeData> {
  return {
    id,
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    tldrawShapeId: `shape:${id}`,
    type: "video",
    title: id,
    x: 0,
    y: 0,
    width: 320,
    height: 180,
    zIndex: 0,
    status: "succeeded",
    dataJson: {
      assetId: `asset_${id}`,
      durationSeconds: 5,
    },
    createdAt: "2026-06-13T00:00:00.000Z",
    updatedAt: "2026-06-13T00:00:00.000Z",
  };
}
