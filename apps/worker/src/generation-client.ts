import type {
  ClaimGenerationJobResult,
  GeneratedMediaProviderOutput,
  GenerationJobInput,
  GenerationJobRecord,
  ProviderFailure,
  WorkerGenerationJobWaitInput,
} from "@guga-flow/shared-types";

export interface GenerationWorkerClient {
  claimNextJob(): Promise<ClaimGenerationJobResult<GenerationJobInput>>;
  succeedJob(
    jobId: string,
    providerOutput: GeneratedMediaProviderOutput,
    providerOutputs?: GeneratedMediaProviderOutput[],
  ): Promise<GenerationJobRecord>;
  waitJob(jobId: string, input: WorkerGenerationJobWaitInput): Promise<GenerationJobRecord>;
  failJob(jobId: string, error: ProviderFailure): Promise<GenerationJobRecord>;
}

type FetchLike = typeof fetch;

export class HttpGenerationWorkerClient implements GenerationWorkerClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string, private readonly fetchImpl: FetchLike = fetch) {
    this.baseUrl = baseUrl.replace(/\/+$/g, "");
  }

  claimNextJob(): Promise<ClaimGenerationJobResult<GenerationJobInput>> {
    return this.post("/worker/generation/jobs/claim");
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
