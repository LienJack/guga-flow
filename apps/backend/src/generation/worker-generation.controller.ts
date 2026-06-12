import { Body, Controller, Inject, Param, Post } from "@nestjs/common";

import { WorkerGenerationJobFailDto, WorkerGenerationJobSucceedDto } from "./dto";
import { GenerationService } from "./generation.service";

@Controller("worker/generation/jobs")
export class WorkerGenerationController {
  constructor(@Inject(GenerationService) private readonly generationService: GenerationService) {}

  @Post("claim")
  claimNextJob() {
    return this.generationService.claimNextJob();
  }

  @Post(":jobId/fail")
  failJob(@Param("jobId") jobId: string, @Body() body: WorkerGenerationJobFailDto) {
    return this.generationService.failJob(jobId, body.error);
  }

  @Post(":jobId/succeed")
  succeedJob(@Param("jobId") jobId: string, @Body() body: WorkerGenerationJobSucceedDto) {
    return this.generationService.succeedJob(jobId, body.providerOutput, body.providerOutputs);
  }
}
