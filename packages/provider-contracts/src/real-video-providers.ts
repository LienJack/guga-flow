import type { CanvasSnapshotJson, ProviderProtocol } from "@guga-flow/shared-types";

import type { MockAssetOutput, VideoGenerationInput, VideoProvider, VideoProviderTaskResult } from "./contracts";
import { ProviderError } from "./contracts";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface RealVideoProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
}

export interface GenericVideoProviderOptions extends RealVideoProviderOptions {
  protocol?: ProviderProtocol;
}

const DEFAULT_SEEDANCE_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3";
const DEFAULT_FAL_QUEUE_BASE_URL = "https://queue.fal.run";
const DEFAULT_SEEDANCE_MODEL = "seedance-1-0-pro";
const DEFAULT_HAPPYHORSE_MODEL = "alibaba/happy-horse/image-to-video";
const STABLE_ID_BODY_MAX_LENGTH = 64;

export class SeedanceProvider implements VideoProvider {
  readonly capability = {
    id: "seedance",
    displayName: "Seedance",
    requiresApiKey: true,
  };

  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: RealVideoProviderOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_SEEDANCE_BASE_URL).replace(/\/+$/g, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createTask(input: VideoGenerationInput): Promise<VideoProviderTaskResult> {
    failIfRequested(this.capability.id, input.forceFailure);
    this.assertConfigured();

    const model = input.model ?? DEFAULT_SEEDANCE_MODEL;
    const response = await fetchWithProviderError(this.capability.id, () =>
      this.fetchImpl(`${this.baseUrl}/contents/generations/tasks`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: input.prompt,
          content: seedanceContent(input),
          duration: input.durationSec,
          ratio: input.aspectRatio,
          resolution: input.resolution,
          camera_fixed: booleanParam(input.providerParams, "cameraFixed"),
        }),
      }),
    );
    const json = await readJsonResponse(response, this.capability.id);
    const providerTaskId = taskIdFromJson(json);
    if (!providerTaskId) {
      throw emptyTaskIdError(this.capability.id);
    }

    return waitingResult(this.capability.id, providerTaskId, model);
  }

  async getTask(providerTaskId: string): Promise<VideoProviderTaskResult> {
    this.assertConfigured();

    const response = await fetchWithProviderError(this.capability.id, () =>
      this.fetchImpl(`${this.baseUrl}/contents/generations/tasks/${encodeURIComponent(providerTaskId)}`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
        },
      }),
    );
    const json = await readJsonResponse(response, this.capability.id);
    return taskResultFromJson(json, {
      provider: this.capability.id,
      providerTaskId,
      model: stringPropFromAny(json, "model") ?? DEFAULT_SEEDANCE_MODEL,
    });
  }

  async cancelTask(providerTaskId: string): Promise<VideoProviderTaskResult> {
    this.assertConfigured();

    const response = await fetchWithProviderError(this.capability.id, () =>
      this.fetchImpl(`${this.baseUrl}/contents/generations/tasks/${encodeURIComponent(providerTaskId)}`, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
        },
      }),
    );
    await readJsonResponse(response, this.capability.id);

    return cancelledResult(this.capability.id, providerTaskId);
  }

  async generateVideo(input: VideoGenerationInput): Promise<MockAssetOutput> {
    const created = await this.createTask(input);
    const result = created.status === "succeeded" ? created : await this.getTask(created.providerTaskId);
    return outputOrPendingError(this.capability.id, result);
  }

  private assertConfigured(): void {
    if (this.apiKey) {
      return;
    }

    throw new ProviderError({
      provider: this.capability.id,
      code: "PROVIDER_NOT_CONFIGURED",
      message: "Seedance provider is disabled because no server-side API key is configured.",
      retryable: false,
    });
  }
}

export class HappyHorseProvider implements VideoProvider {
  readonly capability = {
    id: "happyhorse",
    displayName: "Happy Horse",
    requiresApiKey: true,
  };

  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: RealVideoProviderOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_FAL_QUEUE_BASE_URL).replace(/\/+$/g, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createTask(input: VideoGenerationInput): Promise<VideoProviderTaskResult> {
    failIfRequested(this.capability.id, input.forceFailure);
    this.assertConfigured();

    const model = input.model ?? DEFAULT_HAPPYHORSE_MODEL;
    const response = await fetchWithProviderError(this.capability.id, () =>
      this.fetchImpl(this.modelUrl(model), {
        method: "POST",
        headers: {
          authorization: `Key ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          prompt: input.prompt,
          image_url: sourceImageUrl(input),
          duration: input.durationSec,
          aspect_ratio: input.aspectRatio,
          resolution: input.resolution,
          motion_strength: stringParam(input.providerParams, "motionStrength"),
        }),
      }),
    );
    const json = await readJsonResponse(response, this.capability.id);
    const providerTaskId = taskIdFromJson(json);
    if (!providerTaskId) {
      throw emptyTaskIdError(this.capability.id);
    }

    return waitingResult(this.capability.id, providerTaskId, model);
  }

  async getTask(providerTaskId: string): Promise<VideoProviderTaskResult> {
    this.assertConfigured();

    const statusResponse = await fetchWithProviderError(this.capability.id, () =>
      this.fetchImpl(`${this.modelUrl(DEFAULT_HAPPYHORSE_MODEL)}/requests/${encodeURIComponent(providerTaskId)}/status`, {
        method: "GET",
        headers: {
          authorization: `Key ${this.apiKey}`,
        },
      }),
    );
    const statusJson = await readJsonResponse(statusResponse, this.capability.id);
    const status = taskStatusFromJson(statusJson);
    if (status !== "succeeded") {
      return taskResultFromJson(statusJson, {
        provider: this.capability.id,
        providerTaskId,
        model: DEFAULT_HAPPYHORSE_MODEL,
      });
    }

    const resultResponse = await fetchWithProviderError(this.capability.id, () =>
      this.fetchImpl(`${this.modelUrl(DEFAULT_HAPPYHORSE_MODEL)}/requests/${encodeURIComponent(providerTaskId)}`, {
        method: "GET",
        headers: {
          authorization: `Key ${this.apiKey}`,
        },
      }),
    );
    const resultJson = await readJsonResponse(resultResponse, this.capability.id);
    return taskResultFromJson(resultJson, {
      provider: this.capability.id,
      providerTaskId,
      model: DEFAULT_HAPPYHORSE_MODEL,
    });
  }

  async cancelTask(providerTaskId: string): Promise<VideoProviderTaskResult> {
    this.assertConfigured();

    const response = await fetchWithProviderError(this.capability.id, () =>
      this.fetchImpl(`${this.modelUrl(DEFAULT_HAPPYHORSE_MODEL)}/requests/${encodeURIComponent(providerTaskId)}/cancel`, {
        method: "DELETE",
        headers: {
          authorization: `Key ${this.apiKey}`,
        },
      }),
    );
    await readJsonResponse(response, this.capability.id);

    return cancelledResult(this.capability.id, providerTaskId);
  }

  async generateVideo(input: VideoGenerationInput): Promise<MockAssetOutput> {
    const created = await this.createTask(input);
    const result = created.status === "succeeded" ? created : await this.getTask(created.providerTaskId);
    return outputOrPendingError(this.capability.id, result);
  }

  private modelUrl(model: string): string {
    return `${this.baseUrl}/${model.replace(/^\/+/, "")}`;
  }

  private assertConfigured(): void {
    if (this.apiKey) {
      return;
    }

    throw new ProviderError({
      provider: this.capability.id,
      code: "PROVIDER_NOT_CONFIGURED",
      message: "Happy Horse provider is disabled because no server-side API key is configured.",
      retryable: false,
    });
  }
}

export class GenericVideoProvider implements VideoProvider {
  readonly capability = {
    id: "generic-video",
    displayName: "Generic Video Provider",
    requiresApiKey: true,
  };

  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly protocol: ProviderProtocol;
  private readonly fetchImpl: FetchLike;

  constructor(options: GenericVideoProviderOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? "https://api.example.invalid/v1").replace(/\/+$/g, "");
    this.protocol = options.protocol ?? "openai_compatible";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async createTask(input: VideoGenerationInput): Promise<VideoProviderTaskResult> {
    failIfRequested(this.capability.id, input.forceFailure);
    if (this.protocol === "mock") {
      const model = input.model ?? "mock-generic-video-v1";
      const providerTaskId = stableId("generic_video_task", `${input.projectId}-${input.prompt}-${model}`);
      return {
        status: "succeeded",
        providerTaskId,
        output: {
          assetId: stableId("provider_video", `${this.capability.id}-${providerTaskId}`),
          storageKey: `providers/${this.capability.id}/tasks/${safePathSegment(providerTaskId)}/output.mp4`,
          mimeType: "video/mp4",
          provider: this.capability.id,
          model,
          referenceAssetIds: input.referenceAssetIds ?? [],
          providerTaskId,
          rawJson: { protocol: "mock" },
        },
        rawJson: rawTaskJson(this.capability.id, providerTaskId, model),
      };
    }
    this.assertConfigured();

    const model = input.model ?? "video-model";
    const response = await fetchWithProviderError(this.capability.id, () =>
      this.fetchImpl(`${genericTaskBase(this.baseUrl)}/video/generations`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: input.prompt,
          first_frame_asset_id: input.firstFrameAssetId ?? input.sourceImageAssetId,
          last_frame_asset_id: input.lastFrameAssetId,
          reference_asset_ids: input.referenceAssetIds ?? [],
          duration: input.durationSec,
          aspect_ratio: input.aspectRatio,
          resolution: input.resolution,
          ...(isRecord(input.providerParams) ? input.providerParams : {}),
        }),
      }),
    );
    const json = await readJsonResponse(response, this.capability.id);
    const remoteUrl = findVideoUrl(json);
    const providerTaskId = taskIdFromJson(json) ?? stableId("generic_video_task", `${input.projectId}-${input.prompt}`);
    if (remoteUrl) {
      return {
        status: "succeeded",
        providerTaskId,
        output: videoOutputFromRemoteUrl(remoteUrl, {
          provider: this.capability.id,
          providerTaskId,
          model,
        }),
        rawJson: rawTaskJson(this.capability.id, providerTaskId, model),
      };
    }

    return waitingResult(this.capability.id, providerTaskId, model);
  }

  async getTask(providerTaskId: string): Promise<VideoProviderTaskResult> {
    if (this.protocol === "mock") {
      return {
        status: "succeeded",
        providerTaskId,
        output: {
          assetId: stableId("provider_video", `${this.capability.id}-${providerTaskId}`),
          storageKey: `providers/${this.capability.id}/tasks/${safePathSegment(providerTaskId)}/output.mp4`,
          mimeType: "video/mp4",
          provider: this.capability.id,
          model: "mock-generic-video-v1",
          referenceAssetIds: [],
          providerTaskId,
        },
        rawJson: rawTaskJson(this.capability.id, providerTaskId, "mock-generic-video-v1"),
      };
    }
    this.assertConfigured();

    const response = await fetchWithProviderError(this.capability.id, () =>
      this.fetchImpl(`${genericTaskBase(this.baseUrl)}/tasks/${encodeURIComponent(providerTaskId)}`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
        },
      }),
    );
    const json = await readJsonResponse(response, this.capability.id);
    return taskResultFromJson(json, {
      provider: this.capability.id,
      providerTaskId,
      model: stringPropFromAny(json, "model") ?? "video-model",
    });
  }

  async cancelTask(providerTaskId: string): Promise<VideoProviderTaskResult> {
    if (this.protocol === "mock") {
      return cancelledResult(this.capability.id, providerTaskId);
    }
    this.assertConfigured();
    const response = await fetchWithProviderError(this.capability.id, () =>
      this.fetchImpl(`${genericTaskBase(this.baseUrl)}/tasks/${encodeURIComponent(providerTaskId)}/cancel`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
        },
      }),
    );
    await readJsonResponse(response, this.capability.id);
    return cancelledResult(this.capability.id, providerTaskId);
  }

  async generateVideo(input: VideoGenerationInput): Promise<MockAssetOutput> {
    const created = await this.createTask(input);
    return outputOrPendingError(this.capability.id, created);
  }

  private assertConfigured(): void {
    if (this.apiKey) {
      return;
    }

    throw new ProviderError({
      provider: this.capability.id,
      code: "PROVIDER_NOT_CONFIGURED",
      message: "Generic video provider is disabled because no server-side API key is configured.",
      retryable: false,
    });
  }
}

function failIfRequested(provider: string, forceFailure?: boolean): void {
  if (!forceFailure) {
    return;
  }

  throw new ProviderError({
    provider,
    code: "PROVIDER_FAILURE_REQUESTED",
    message: `${provider} failure requested`,
    retryable: true,
  });
}

function seedanceContent(input: VideoGenerationInput): Array<Record<string, CanvasSnapshotJson>> {
  const imageUrl = sourceImageUrl(input);
  return [
    { type: "text", text: input.prompt },
    ...(imageUrl
      ? [
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ]
      : []),
  ];
}

function sourceImageUrl(input: VideoGenerationInput): string | undefined {
  return stringParam(input.providerParams, "sourceImageUrl") ?? input.sourceImageAssetId;
}

function genericTaskBase(baseUrl: string): string {
  return baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
}

async function readJsonResponse(response: Response, provider: string): Promise<unknown> {
  const text = await response.text();
  let json: unknown = null;

  if (text.trim()) {
    try {
      json = JSON.parse(text) as unknown;
    } catch {
      json = text;
    }
  }

  if (response.ok) {
    return json;
  }

  throw new ProviderError({
    provider,
    code: "PROVIDER_REQUEST_FAILED",
    message: `${provider} request failed with ${response.status}: ${extractProviderMessage(json)}`,
    retryable: response.status === 429 || response.status >= 500,
  });
}

async function fetchWithProviderError(
  provider: string,
  runFetch: () => Promise<Response>,
): Promise<Response> {
  try {
    return await runFetch();
  } catch (error) {
    throw new ProviderError({
      provider,
      code: "PROVIDER_REQUEST_FAILED",
      message: `${provider} request failed: ${sanitizeProviderError(error)}`,
      retryable: true,
    });
  }
}

function taskResultFromJson(
  json: unknown,
  context: { provider: string; providerTaskId: string; model: string },
): VideoProviderTaskResult {
  const status = taskStatusFromJson(json);
  const remoteUrl = findVideoUrl(json);
  if (remoteUrl) {
    return {
      status: "succeeded",
      providerTaskId: context.providerTaskId,
      output: videoOutputFromRemoteUrl(remoteUrl, context),
      rawJson: rawTaskJson(context.provider, context.providerTaskId, context.model),
    };
  }
  if (status === "provider_waiting") {
    return waitingResult(context.provider, context.providerTaskId, context.model);
  }
  if (status === "cancelled") {
    return cancelledResult(context.provider, context.providerTaskId);
  }
  if (status === "failed") {
    return failedResult(context.provider, context.providerTaskId, extractProviderMessage(json));
  }

  return failedResult(context.provider, context.providerTaskId, "provider task completed without video output");
}

function taskStatusFromJson(json: unknown): VideoProviderTaskResult["status"] {
  const status = stringPropFromAny(json, "status") ?? stringPropFromAny(json, "state") ?? "";
  const normalized = status.trim().toLowerCase();

  if (["completed", "complete", "succeeded", "success", "done"].includes(normalized)) {
    return "succeeded";
  }
  if (["failed", "failure", "error"].includes(normalized)) {
    return "failed";
  }
  if (["cancelled", "canceled"].includes(normalized)) {
    return "cancelled";
  }

  return "provider_waiting";
}

function waitingResult(provider: string, providerTaskId: string, model: string): VideoProviderTaskResult {
  return {
    status: "provider_waiting",
    providerTaskId,
    rawJson: rawTaskJson(provider, providerTaskId, model),
  };
}

function cancelledResult(provider: string, providerTaskId: string): VideoProviderTaskResult {
  return {
    status: "cancelled",
    providerTaskId,
    rawJson: rawTaskJson(provider, providerTaskId),
  };
}

function failedResult(provider: string, providerTaskId: string, message: string): VideoProviderTaskResult {
  return {
    status: "failed",
    providerTaskId,
    error: {
      provider,
      code: "PROVIDER_TASK_FAILED",
      message,
      retryable: false,
    },
    rawJson: rawTaskJson(provider, providerTaskId),
  };
}

function rawTaskJson(provider: string, providerTaskId: string, model?: string): CanvasSnapshotJson {
  return {
    provider,
    providerTaskId,
    ...(model ? { model } : {}),
  };
}

function outputOrPendingError(provider: string, result: VideoProviderTaskResult): MockAssetOutput {
  if (result.status === "succeeded" && result.output) {
    return result.output;
  }

  throw new ProviderError({
    provider,
    code: result.status === "failed" ? result.error?.code ?? "PROVIDER_TASK_FAILED" : "PROVIDER_TASK_PENDING",
    message:
      result.status === "failed"
        ? result.error?.message ?? `${provider} video task failed.`
        : `${provider} video task is still waiting for provider completion.`,
    retryable: result.status === "provider_waiting",
  });
}

function videoOutputFromRemoteUrl(
  remoteUrl: string,
  context: { provider: string; providerTaskId: string; model: string },
): MockAssetOutput {
  const extension = extensionForUrl(remoteUrl);
  const assetId = stableId("provider_video", `${context.provider}-${context.providerTaskId}-${remoteUrl}`);
  return {
    assetId,
    storageKey: `providers/${context.provider}/tasks/${safePathSegment(context.providerTaskId)}/${assetId}.${extension}`,
    mimeType: mimeTypeForExtension(extension),
    provider: context.provider,
    model: context.model,
    referenceAssetIds: [],
    remoteUrl,
    providerTaskId: context.providerTaskId,
  };
}

function taskIdFromJson(json: unknown): string | undefined {
  return (
    stringPropFromAny(json, "request_id") ??
    stringPropFromAny(json, "requestId") ??
    stringPropFromAny(json, "task_id") ??
    stringPropFromAny(json, "taskId") ??
    stringPropFromAny(json, "id")
  );
}

function findVideoUrl(value: unknown, depth = 0): string | undefined {
  if (depth > 8) {
    return undefined;
  }
  if (typeof value === "string") {
    return looksLikeVideoUrl(value) ? value : undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findVideoUrl(item, depth + 1);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  if (!isRecord(value)) {
    return undefined;
  }

  for (const key of ["video_url", "videoUrl", "url", "file_url", "fileUrl"]) {
    const prop = value[key];
    if (typeof prop === "string" && looksLikeVideoUrl(prop)) {
      return prop;
    }
  }
  for (const prop of Object.values(value)) {
    const found = findVideoUrl(prop, depth + 1);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function looksLikeVideoUrl(value: string): boolean {
  return /^https:\/\//i.test(value) && /\.(mp4|webm|mov)(\?|#|$)/i.test(value);
}

function emptyTaskIdError(provider: string): ProviderError {
  return new ProviderError({
    provider,
    code: "PROVIDER_EMPTY_RESPONSE",
    message: `${provider} did not return a provider task id.`,
    retryable: false,
  });
}

function extractProviderMessage(json: unknown): string {
  if (typeof json === "string") {
    return json.slice(0, 500);
  }

  if (isRecord(json)) {
    const error = recordProp(json, "error");
    const errorMessage = error ? stringProp(error, "message") : undefined;
    return (
      errorMessage ??
      stringProp(json, "message") ??
      stringProp(json, "detail") ??
      stringPropFromAny(json, "error_message") ??
      "provider request failed"
    );
  }

  return "provider request failed";
}

function sanitizeProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : "network error";
  return message
    .replace(/([?&](key|token|api_key)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/(authorization:\s*(bearer|key)\s+)[^\s]+/gi, "$1[redacted]")
    .replace(/((bearer|key)\s+)[^\s]+/gi, "$1[redacted]");
}

function stableId(prefix: string, value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const body = normalized || "provider";
  const digest = stableDigest(value);
  const truncated = body.slice(0, STABLE_ID_BODY_MAX_LENGTH).replace(/-+$/g, "");
  return `${prefix}_${truncated || "provider"}-${digest}`;
}

function stableDigest(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first ^= code;
    first = Math.imul(first, 0x01000193);
    second ^= code + index;
    second = Math.imul(second, 0x85ebca6b);
  }

  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`.slice(0, 10);
}

function safePathSegment(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "task";
}

function extensionForUrl(remoteUrl: string): string {
  const pathname = remoteUrl.split(/[?#]/)[0] ?? "";
  const extension = pathname.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "webm":
      return "webm";
    case "mov":
      return "mov";
    case "mp4":
    default:
      return "mp4";
  }
}

function mimeTypeForExtension(extension: string): string {
  switch (extension) {
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    case "mp4":
    default:
      return "video/mp4";
  }
}

function stringParam(params: CanvasSnapshotJson | undefined, key: string): string | undefined {
  if (!isRecord(params)) {
    return undefined;
  }

  const value = params[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function booleanParam(params: CanvasSnapshotJson | undefined, key: string): boolean | undefined {
  if (!isRecord(params)) {
    return undefined;
  }

  const value = params[key];
  return typeof value === "boolean" ? value : undefined;
}

function stringPropFromAny(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const direct = stringProp(value, key);
  if (direct) {
    return direct;
  }
  for (const prop of Object.values(value)) {
    const found = stringPropFromAny(prop, key);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function recordProp(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const prop = value[key];
  return isRecord(prop) ? prop : undefined;
}

function stringProp(value: Record<string, unknown>, key: string): string | undefined {
  const prop = value[key];
  return typeof prop === "string" && prop.length > 0 ? prop : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
