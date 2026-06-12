import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import { CreateBatchImagesToVideosJobDto, CreateGenerationJobDto } from "./dto";
import { GenerationService } from "./generation.service";

@Controller("projects/:projectId/generation/jobs")
export class GenerationController {
  constructor(@Inject(GenerationService) private readonly generationService: GenerationService) {}

  @Post()
  createJob(@Param("projectId") projectId: string, @Body() body: CreateGenerationJobDto) {
    return this.generationService.createJob(projectId, body);
  }

  @Post("batch-images-to-videos")
  createBatchImagesToVideosJob(
    @Param("projectId") projectId: string,
    @Body() body: CreateBatchImagesToVideosJobDto,
  ) {
    return this.generationService.createBatchImagesToVideosJobs(projectId, body);
  }

  @Get()
  listJobs(@Param("projectId") projectId: string) {
    return this.generationService.listJobs(projectId);
  }

  @Get(":jobId")
  getJob(@Param("projectId") projectId: string, @Param("jobId") jobId: string) {
    return this.generationService.getJob(projectId, jobId);
  }

  @Post(":jobId/retry")
  retryJob(@Param("projectId") projectId: string, @Param("jobId") jobId: string) {
    return this.generationService.retryJob(projectId, jobId);
  }

  @Post(":jobId/cancel")
  cancelJob(@Param("projectId") projectId: string, @Param("jobId") jobId: string) {
    return this.generationService.cancelJob(projectId, jobId);
  }
}
