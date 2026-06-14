import { Controller, Inject, Param, Sse } from "@nestjs/common";
import type { GenerationEvent } from "@guga-flow/shared-types";
import { Observable } from "rxjs";

import { GenerationService } from "./generation.service";

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
            subscriber.next({
              type: "job.updated",
              data: {
                type: "job.updated",
                projectId,
                jobId: job.id,
                status: job.status,
                updatedAt: job.updatedAt,
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
