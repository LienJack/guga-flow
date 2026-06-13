import { Body, Controller, Headers, Inject, Param, Post } from "@nestjs/common";

import {
  WorkerGenerationJobFailDto,
  WorkerGenerationJobSucceedDto,
  WorkerGenerationJobWaitDto,
  WorkerProviderRuntimeConfigDto,
} from "./dto";
import { GenerationService } from "./generation.service";

@Controller("worker/generation")
export class WorkerGenerationController {
  constructor(@Inject(GenerationService) private readonly generationService: GenerationService) {}

  @Post("jobs/claim")
  claimNextJob() {
    return this.generationService.claimNextJob();
  }

  @Post("jobs/:jobId/fail")
  failJob(@Param("jobId") jobId: string, @Body() body: WorkerGenerationJobFailDto) {
    return this.generationService.failJob(jobId, body.error);
  }

  @Post("jobs/:jobId/wait")
  waitJob(@Param("jobId") jobId: string, @Body() body: WorkerGenerationJobWaitDto) {
    return this.generationService.waitJob(jobId, body);
  }

  @Post("jobs/:jobId/succeed")
  succeedJob(@Param("jobId") jobId: string, @Body() body: WorkerGenerationJobSucceedDto) {
    return this.generationService.succeedJob(
      jobId,
      body.providerOutput,
      body.providerOutputs,
      body.packageOutput,
    );
  }

  @Post("providers/runtime")
  getProviderRuntimeConfig(
    @Body() body: WorkerProviderRuntimeConfigDto,
    @Headers("x-worker-token") workerToken?: string,
  ) {
    return this.generationService.getProviderRuntimeConfig(body, workerToken);
  }
}
