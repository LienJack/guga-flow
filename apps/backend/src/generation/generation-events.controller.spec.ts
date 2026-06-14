import type { GenerationJobRecord } from "@guga-flow/shared-types";
import { firstValueFrom } from "rxjs";
import { describe, expect, it, vi } from "vitest";

import { GenerationService } from "./generation.service";
import { GenerationEventsController } from "./generation-events.controller";

describe("GenerationEventsController", () => {
  it("adds agent stream payloads to agent canvas job snapshots", async () => {
    const service = {
      listJobs: vi.fn(async () => ({
        jobs: [
          generationJob({
            inputJson: {
              operation: "agent_canvas_action",
              projectId: "project_1",
              role: "production",
              provider: "mock-llm",
              model: "mock-storyboard",
              message: "create storyboard board",
            },
            outputJson: {
              operation: "agent_canvas_action",
              actionKind: "create_storyboard_board",
              message: "create storyboard board",
              summary: "Created storyboard board \"Agent Board\"",
              completedAt: "2026-06-14T00:00:00.000Z",
            },
          }),
        ],
        queueSummary: {},
      })),
    };
    const controller = new GenerationEventsController(service as unknown as GenerationService);

    const event = await firstValueFrom(controller.events("project_1"));

    expect(event.type).toBe("job.updated");
    expect(event.data).toMatchObject({
      type: "job.updated",
      projectId: "project_1",
      jobId: "job_1",
      status: "succeeded",
      payload: {
        kind: "agent_session",
        role: "production",
        phase: "tool_result",
        status: "succeeded",
        actionKind: "create_storyboard_board",
        summary: "Created storyboard board \"Agent Board\"",
      },
    });
  });
});

function generationJob(overrides: Partial<GenerationJobRecord> = {}): GenerationJobRecord {
  return {
    id: "job_1",
    projectId: "project_1",
    operation: "agent_canvas_action",
    status: "succeeded",
    provider: "mock-llm",
    model: "mock-storyboard",
    inputJson: {},
    outputJson: null,
    createdAt: "2026-06-14T00:00:00.000Z",
    updatedAt: "2026-06-14T00:01:00.000Z",
    ...overrides,
  };
}
