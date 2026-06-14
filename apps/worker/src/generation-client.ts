import type {
  AiTextGenerationJobOutput,
  AssetImageGenerationJobOutput,
  AssetPromptPolishJobOutput,
  ClaimGenerationJobResult,
  EditorExportPackageOutput,
  AssetAnalysisJobOutput,
  GeneratedMediaProviderOutput,
  GenerationJobInput,
  GenerationJobRecord,
  ManagedProviderId,
  ManagedProviderKind,
  MediaMetadataJobOutput,
  ProviderFailure,
  ProviderRuntimeConfig,
  SceneFrameExtractionJobOutput,
  WorkerGenerationJobWaitInput,
} from "@guga-flow/shared-types";

export interface GenerationWorkerClient {
  claimNextJob(): Promise<ClaimGenerationJobResult<GenerationJobInput>>;
  getProviderRuntimeConfig(
    projectId: string,
    kind: ManagedProviderKind,
    provider: ManagedProviderId,
  ): Promise<ProviderRuntimeConfig>;
  getAssetBytes(projectId: string, assetId: string): Promise<{ body: Buffer; mimeType: string }>;
  succeedJob(
    jobId: string,
    providerOutput: GeneratedMediaProviderOutput,
    providerOutputs?: GeneratedMediaProviderOutput[],
  ): Promise<GenerationJobRecord>;
  succeedEditorExportJob(
    jobId: string,
    packageOutput: EditorExportPackageOutput,
  ): Promise<GenerationJobRecord>;
  succeedAssetAnalysisJob(
    jobId: string,
    assetAnalysisOutput: AssetAnalysisJobOutput,
  ): Promise<GenerationJobRecord>;
  succeedMediaMetadataJob(
    jobId: string,
    mediaMetadataOutput: MediaMetadataJobOutput,
  ): Promise<GenerationJobRecord>;
  succeedSceneFrameExtractionJob(
    jobId: string,
    sceneFrameExtractionOutput: SceneFrameExtractionJobOutput,
  ): Promise<GenerationJobRecord>;
  succeedAssetPromptPolishJob(
    jobId: string,
    assetPromptPolishOutput: AssetPromptPolishJobOutput,
  ): Promise<GenerationJobRecord>;
  succeedAssetImageGenerationJob(
    jobId: string,
    assetImageGenerationOutput: AssetImageGenerationJobOutput,
  ): Promise<GenerationJobRecord>;
  succeedTextGenerationJob(
    jobId: string,
    textGenerationOutput: AiTextGenerationJobOutput,
  ): Promise<GenerationJobRecord>;
  waitJob(jobId: string, input: WorkerGenerationJobWaitInput): Promise<GenerationJobRecord>;
  failJob(jobId: string, error: ProviderFailure): Promise<GenerationJobRecord>;
}

type FetchLike = typeof fetch;

export class HttpGenerationWorkerClient implements GenerationWorkerClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly fetchImpl: FetchLike = fetch,
    private readonly workerApiToken: string | undefined = process.env.WORKER_API_TOKEN,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/g, "");
  }

  claimNextJob(): Promise<ClaimGenerationJobResult<GenerationJobInput>> {
    return this.post("/worker/generation/jobs/claim");
  }

  getProviderRuntimeConfig(
    projectId: string,
    kind: ManagedProviderKind,
    provider: ManagedProviderId,
  ): Promise<ProviderRuntimeConfig> {
    return this.post("/worker/generation/providers/runtime", {
      projectId,
      kind,
      provider,
    });
  }

  async getAssetBytes(projectId: string, assetId: string): Promise<{ body: Buffer; mimeType: string }> {
    const response = await this.fetchImpl(
      `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/assets/${encodeURIComponent(assetId)}/preview`,
    );
    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Worker asset fetch failed with ${response.status}: ${responseText}`);
    }

    return {
      body: Buffer.from(await response.arrayBuffer()),
      mimeType: response.headers.get("content-type") ?? "application/octet-stream",
    };
  }

  succeedJob(
    jobId: string,
    providerOutput: GeneratedMediaProviderOutput,
    providerOutputs?: GeneratedMediaProviderOutput[],
  ): Promise<GenerationJobRecord> {
    return this.post(`/worker/generation/jobs/${encodeURIComponent(jobId)}/succeed`, {
      providerOutput,
      providerOutputs,
    });
  }

  succeedEditorExportJob(
    jobId: string,
    packageOutput: EditorExportPackageOutput,
  ): Promise<GenerationJobRecord> {
    return this.post(`/worker/generation/jobs/${encodeURIComponent(jobId)}/succeed`, {
      packageOutput,
    });
  }

  succeedAssetAnalysisJob(
    jobId: string,
    assetAnalysisOutput: AssetAnalysisJobOutput,
  ): Promise<GenerationJobRecord> {
    return this.post(`/worker/generation/jobs/${encodeURIComponent(jobId)}/succeed`, {
      assetAnalysisOutput,
    });
  }

  succeedMediaMetadataJob(
    jobId: string,
    mediaMetadataOutput: MediaMetadataJobOutput,
  ): Promise<GenerationJobRecord> {
    return this.post(`/worker/generation/jobs/${encodeURIComponent(jobId)}/succeed`, {
      mediaMetadataOutput,
    });
  }

  succeedSceneFrameExtractionJob(
    jobId: string,
    sceneFrameExtractionOutput: SceneFrameExtractionJobOutput,
  ): Promise<GenerationJobRecord> {
    return this.post(`/worker/generation/jobs/${encodeURIComponent(jobId)}/succeed`, {
      sceneFrameExtractionOutput,
    });
  }

  succeedAssetPromptPolishJob(
    jobId: string,
    assetPromptPolishOutput: AssetPromptPolishJobOutput,
  ): Promise<GenerationJobRecord> {
    return this.post(`/worker/generation/jobs/${encodeURIComponent(jobId)}/succeed`, {
      assetPromptPolishOutput,
    });
  }

  succeedAssetImageGenerationJob(
    jobId: string,
    assetImageGenerationOutput: AssetImageGenerationJobOutput,
  ): Promise<GenerationJobRecord> {
    return this.post(`/worker/generation/jobs/${encodeURIComponent(jobId)}/succeed`, {
      assetImageGenerationOutput,
    });
  }

  succeedTextGenerationJob(
    jobId: string,
    textGenerationOutput: AiTextGenerationJobOutput,
  ): Promise<GenerationJobRecord> {
    return this.post(`/worker/generation/jobs/${encodeURIComponent(jobId)}/succeed`, {
      textGenerationOutput,
    });
  }

  waitJob(jobId: string, input: WorkerGenerationJobWaitInput): Promise<GenerationJobRecord> {
    return this.post(`/worker/generation/jobs/${encodeURIComponent(jobId)}/wait`, input);
  }

  failJob(jobId: string, error: ProviderFailure): Promise<GenerationJobRecord> {
    return this.post(`/worker/generation/jobs/${encodeURIComponent(jobId)}/fail`, { error });
  }

  private async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.workerApiToken ? { "x-worker-token": this.workerApiToken } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Worker API ${path} failed with ${response.status}: ${responseText}`);
    }

    return (await response.json()) as T;
  }
}

export function backendWorkerBaseUrlFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  return env.BACKEND_INTERNAL_URL ?? env.BACKEND_URL ?? "http://localhost:3002/api/v1";
}
