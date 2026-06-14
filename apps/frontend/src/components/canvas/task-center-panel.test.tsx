import type { TaskCenterResult } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { TaskCenterPanel } from "./task-center-panel";

describe("TaskCenterPanel", () => {
  it("renders task center rows, safe diagnostics, and recovery actions", () => {
    const html = renderToStaticMarkup(
      <TaskCenterPanel
        taskCenter={taskCenter()}
        onCancelTask={vi.fn()}
        onRetryTask={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    );

    expect(html).toContain("Tasks");
    expect(html).toContain("Image To Video");
    expect(html).toContain("video / failed");
    expect(html).toContain("Provider failed with [secret]");
    expect(html).toContain("trace_project_1_job_1");
    expect(html).toContain("Retry task");
    expect(html).toContain("Clear task");
    expect(html).toContain("Locate task node");
  });
});

function taskCenter(): TaskCenterResult {
  return {
    items: [
      {
        taskId: "job_1",
        taskClass: "video",
        operation: "image_to_video",
        title: "Image To Video",
        status: "failed",
        provider: "mock-video",
        model: "mock-video-v1",
        traceId: "trace_project_1_job_1",
        reason: "Provider failed with [secret]",
        related: { nodeId: "video_1" },
        actions: { canRetry: true, canCancel: false, canClear: true },
        createdAt: "2026-06-14T00:00:00.000Z",
        updatedAt: "2026-06-14T00:05:00.000Z",
      },
      {
        taskId: "agent_job",
        taskClass: "agent",
        operation: "agent_canvas_action",
        title: "Agent Canvas Action",
        status: "running",
        provider: "mock-llm",
        traceId: "trace_project_1_agent_job",
        related: {},
        actions: { canRetry: false, canCancel: true, canClear: false },
        createdAt: "2026-06-14T00:00:00.000Z",
        updatedAt: "2026-06-14T00:05:00.000Z",
      },
    ],
    diagnostics: [
      {
        traceId: "trace_project_1_job_1",
        projectId: "project_1",
        taskId: "job_1",
        surface: "video",
        category: "provider",
        severity: "error",
        safeMessage: "Provider failed with [secret]",
        timestamp: "2026-06-14T00:05:00.000Z",
      },
    ],
    queueSummary: {
      counts: {
        queued: 0,
        running: 1,
        provider_waiting: 0,
        succeeded: 0,
        failed: 1,
        cancelled: 0,
      },
      queued: 0,
      running: 1,
      providerWaiting: 0,
      succeeded: 0,
      failed: 1,
      cancelled: 0,
    },
  };
}
