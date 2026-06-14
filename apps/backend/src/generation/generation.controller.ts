import { Body, Controller, Get, Inject, Param, Post } from "@nestjs/common";

import {
  CreateBatchImagesToVideosJobDto,
  CreateBatchShotsToImagesJobDto,
  CreateAssetAnalysisJobDto,
  CreateAssetImageGenerationJobDto,
  CreateAssetPromptPolishJobDto,
  CreateGenerationJobDto,
  CreateMediaMetadataJobDto,
} from "./dto";
import { GenerationService } from "./generation.service";

@Controller("projects/:projectId/generation/jobs")
export class GenerationController {
  constructor(@Inject(GenerationService) private readonly generationService: GenerationService) {}

  @Post()
  createJob(@Param("projectId") projectId: string, @Body() body: CreateGenerationJobDto) {
    return this.generationService.createJob(projectId, body);
  }

  @Post("asset-analysis")
  createAssetAnalysisJob(
    @Param("projectId") projectId: string,
    @Body() body: CreateAssetAnalysisJobDto,
  ) {
    return this.generationService.createAssetAnalysisJob(projectId, body);
  }

  @Post("media-metadata")
  createMediaMetadataJob(
    @Param("projectId") projectId: string,
    @Body() body: CreateMediaMetadataJobDto,
  ) {
    return this.generationService.createMediaMetadataJob(projectId, body);
  }

  @Post("asset-prompt-polish")
  createAssetPromptPolishJob(
    @Param("projectId") projectId: string,
    @Body() body: CreateAssetPromptPolishJobDto,
  ) {
    return this.generationService.createAssetPromptPolishJob(projectId, body);
  }

  @Post("asset-image-generation")
  createAssetImageGenerationJob(
    @Param("projectId") projectId: string,
    @Body() body: CreateAssetImageGenerationJobDto,
  ) {
    return this.generationService.createAssetImageGenerationJob(projectId, body);
  }

  @Post("batch-images-to-videos")
  createBatchImagesToVideosJob(
    @Param("projectId") projectId: string,
    @Body() body: CreateBatchImagesToVideosJobDto,
  ) {
    return this.generationService.createBatchImagesToVideosJobs(projectId, body);
  }

  @Post("batch-shots-to-images")
  createBatchShotsToImagesJob(
    @Param("projectId") projectId: string,
    @Body() body: CreateBatchShotsToImagesJobDto,
  ) {
    return this.generationService.createBatchShotsToImagesJobs(projectId, body);
  }

  @Get()
  listJobs(@Param("projectId") projectId: string) {
    return this.generationService.listJobs(projectId);
  }

  @Get("task-center")
  getTaskCenter(@Param("projectId") projectId: string) {
    return this.generationService.getTaskCenter(projectId);
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
