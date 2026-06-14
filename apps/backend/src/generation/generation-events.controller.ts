import { Controller, Inject, Param, Sse } from "@nestjs/common";
import type {
  AgentCanvasActionJobInput,
  AgentCanvasActionJobOutput,
  AgentDeploymentRole,
  AgentStreamEventPayload,
  GenerationEvent,
  GenerationJobRecord,
} from "@guga-flow/shared-types";
import { AGENT_CANVAS_ACTION_KINDS, AGENT_DEPLOYMENT_ROLES } from "@guga-flow/shared-types";
import { Observable } from "rxjs";

import { GenerationService } from "./generation.service";

type AgentStreamActionKind = NonNullable<AgentStreamEventPayload["actionKind"]>;

@Controller("projects/:projectId/generation")
export class GenerationEventsController {
  constructor(@Inject(GenerationService) private readonly generationService: GenerationService) {}

  @Sse("events")
  events(@Param("projectId") projectId: string): Observable<{ type: string; data: GenerationEvent }> {
    return new Observable((subscriber) => {
      let closed = false;
      const emitSnapshot = async () => {
        try {
          const { jobs } = await this.generationService.listJobs(projectId);
          for (const job of jobs.slice(0, 50)) {
            if (closed) {
              return;
            }
            const payload = agentPayload(job);
            subscriber.next({
              type: "job.updated",
              data: {
                type: "job.updated",
                projectId,
                jobId: job.id,
                status: job.status,
                updatedAt: job.updatedAt,
                ...(payload ? { payload } : {}),
              },
            });
          }
        } catch (error) {
          subscriber.error(error);
        }
      };

      void emitSnapshot();
      const interval = setInterval(() => void emitSnapshot(), 5000);
      return () => {
        closed = true;
        clearInterval(interval);
      };
    });
  }
}

function agentPayload(job: GenerationJobRecord): AgentStreamEventPayload | undefined {
  if (job.operation !== "agent_canvas_action") {
    return undefined;
  }

  const input = dataObject(job.inputJson as AgentCanvasActionJobInput);
  const output = dataObject(job.outputJson as AgentCanvasActionJobOutput | undefined);
  const role = agentRole(input.role);
  const actionKind = agentActionKind(output.actionKind);
  return {
    kind: "agent_session",
    ...(role ? { role } : {}),
    ...(optionalString(input.message) ? { message: optionalString(input.message) } : {}),
    phase: agentPhase(job, actionKind),
    status: job.status,
    ...(agentSummary(job, output) ? { summary: agentSummary(job, output) } : {}),
    ...(actionKind ? { actionKind } : {}),
  };
}

function agentPhase(
  job: GenerationJobRecord,
  actionKind: AgentStreamEventPayload["actionKind"],
): AgentStreamEventPayload["phase"] {
  if (job.status === "queued") {
    return "queued";
  }
  if (job.status === "running" || job.status === "provider_waiting") {
    return "thinking";
  }
  if (job.status === "cancelled") {
    return "stopped";
  }
  if (job.status === "failed") {
    return "failed";
  }
  return actionKind ? "tool_result" : "completed";
}

function agentSummary(job: GenerationJobRecord, output: Record<string, unknown>): string | undefined {
  return optionalString(output.summary) ?? optionalString(job.errorMessage);
}

function agentRole(value: unknown): AgentDeploymentRole | undefined {
  return typeof value === "string" && AGENT_DEPLOYMENT_ROLES.includes(value as AgentDeploymentRole)
    ? (value as AgentDeploymentRole)
    : undefined;
}

function agentActionKind(value: unknown): AgentStreamActionKind | undefined {
  const actionKind = value as AgentStreamActionKind;
  return typeof value === "string" && AGENT_CANVAS_ACTION_KINDS.includes(actionKind)
    ? actionKind
    : undefined;
}

function dataObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
