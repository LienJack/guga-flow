import type {
  CanvasSnapshotJson,
  ProgrammableProviderActionManifest,
  ProgrammableProviderManifest,
  ProgrammableProviderOutputMapping,
} from "@guga-flow/shared-types";

import type {
  ImageGenerationInput,
  ImageProvider,
  ImageProviderOutput,
  ImageProviderResult,
  MockAssetOutput,
  VideoGenerationInput,
  VideoProvider,
  VideoProviderTaskResult,
} from "./contracts";
import { ProviderError } from "./contracts";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface ProgrammableProviderRuntimeOptions {
  credentials?: Record<string, string>;
  fetchImpl?: FetchLike;
}

interface RuntimeContext {
  credential: Record<string, string>;
  input: Record<string, unknown>;
  task?: Record<string, unknown>;
}

const DEFAULT_TIMEOUT_MS = 15_000;
const MAX_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;
const BLOCKED_HOSTNAMES = new Set(["localhost", "localhost.localdomain"]);

export class ProgrammableImageProvider implements ImageProvider {
  readonly capability;
  private readonly fetchImpl: FetchLike;
  private readonly credentials: Record<string, string>;

  constructor(
    private readonly manifest: ProgrammableProviderManifest,
    options: ProgrammableProviderRuntimeOptions = {},
  ) {
    if (manifest.kind !== "image" || !manifest.image) {
      throw new ProviderError({
        provider: manifest.id,
        code: "PROGRAMMABLE_PROVIDER_INVALID_MANIFEST",
        message: `${manifest.id} is not an image provider manifest.`,
        retryable: false,
      });
    }
    this.capability = {
      id: manifest.id,
      displayName: manifest.displayName,
      requiresApiKey: manifest.credentials.some((credential) => credential.required),
    };
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.credentials = options.credentials ?? {};
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageProviderResult> {
    this.assertConfigured();
    const action = this.manifest.image?.action;
    if (!action?.output) {
      throw this.error("PROGRAMMABLE_PROVIDER_INVALID_MANIFEST", "Image provider manifest has no output mapping.");
    }
    const context = inputContext(this.credentials, input);
    const json = await executeActionRequest(this.manifest.id, action, context, this.fetchImpl);
    const output = outputFromMapping(action.output, json, {
      provider: this.manifest.id,
      model: input.model ?? this.manifest.defaultModel,
      prompt: input.prompt,
      referenceAssetIds: input.referenceAssetIds ?? [],
      assetPrefix: "programmable_image",
      storagePrefix: "programmable/images",
    });
    return { outputs: [output] };
  }

  private assertConfigured(): void {
    for (const credential of this.manifest.credentials) {
      if (credential.required && !this.credentials[credential.key]) {
        throw this.error("PROVIDER_NOT_CONFIGURED", `${this.manifest.displayName} is missing ${credential.label}.`);
      }
    }
  }

  private error(code: string, message: string): ProviderError {
    return new ProviderError({
      provider: this.manifest.id,
      code,
      message,
      retryable: false,
    });
  }
}

export class ProgrammableVideoProvider implements VideoProvider {
  readonly capability;
  private readonly fetchImpl: FetchLike;
  private readonly credentials: Record<string, string>;

  constructor(
    private readonly manifest: ProgrammableProviderManifest,
    options: ProgrammableProviderRuntimeOptions = {},
  ) {
    if (manifest.kind !== "video" || !manifest.video) {
      throw new ProviderError({
        provider: manifest.id,
        code: "PROGRAMMABLE_PROVIDER_INVALID_MANIFEST",
        message: `${manifest.id} is not a video provider manifest.`,
        retryable: false,
      });
    }
    this.capability = {
      id: manifest.id,
      displayName: manifest.displayName,
      requiresApiKey: manifest.credentials.some((credential) => credential.required),
    };
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.credentials = options.credentials ?? {};
  }

  async createTask(input: VideoGenerationInput): Promise<VideoProviderTaskResult> {
    this.assertConfigured();
    const action = this.manifest.video?.action;
    if (!action) {
      throw this.error("PROGRAMMABLE_PROVIDER_INVALID_MANIFEST", "Video provider manifest has no action mapping.");
    }
    const context = inputContext(this.credentials, input);
    const json = await executeActionRequest(this.manifest.id, action, context, this.fetchImpl);
    if (action.task) {
      const providerTaskId = stringAtPath(json, action.task.idPath);
      if (!providerTaskId) {
        throw this.error("PROVIDER_EMPTY_RESPONSE", "Programmable video provider did not return a task id.");
      }
      return {
        status: "provider_waiting",
        providerTaskId,
        rawJson: safeRawJson(json),
      };
    }
    if (!action.output) {
      throw this.error("PROGRAMMABLE_PROVIDER_INVALID_MANIFEST", "Video provider manifest has no output mapping.");
    }
    return {
      status: "succeeded",
      providerTaskId: stableId("programmable_video_task", `${this.manifest.id}-${input.prompt}`),
      output: outputFromMapping(action.output, json, {
        provider: this.manifest.id,
        model: input.model ?? this.manifest.defaultModel,
        prompt: input.prompt,
        referenceAssetIds: input.referenceAssetIds ?? [],
        assetPrefix: "programmable_video",
        storagePrefix: "programmable/videos",
      }),
      rawJson: safeRawJson(json),
    };
  }

  async getTask(providerTaskId: string): Promise<VideoProviderTaskResult> {
    const task = this.manifest.video?.action.task;
    if (!task?.pollRequest) {
      throw this.error("PROGRAMMABLE_PROVIDER_INVALID_MANIFEST", "Video provider manifest has no poll request.");
    }
    const context: RuntimeContext = {
      credential: this.credentials,
      input: {},
      task: { providerTaskId },
    };
    const json = await executeRequest(this.manifest.id, task.pollRequest, context, this.fetchImpl);
    const statusValue = task.statusPath ? stringAtPath(json, task.statusPath)?.toLowerCase() : undefined;
    if (statusValue && (task.failedValues ?? []).map((value) => value.toLowerCase()).includes(statusValue)) {
      return {
        status: "failed",
        providerTaskId,
        error: {
          provider: this.manifest.id,
          code: "PROVIDER_TASK_FAILED",
          message: sanitizeMessage(task.errorPath ? stringAtPath(json, task.errorPath) : undefined) ?? "Programmable provider task failed.",
          retryable: false,
        },
        rawJson: safeRawJson(json),
      };
    }
    if (statusValue && !(task.succeededValues ?? []).map((value) => value.toLowerCase()).includes(statusValue)) {
      return {
        status: "provider_waiting",
        providerTaskId,
        rawJson: safeRawJson(json),
      };
    }
    if (!task.output) {
      throw this.error("PROGRAMMABLE_PROVIDER_INVALID_MANIFEST", "Video task mapping has no output mapping.");
    }
    return {
      status: "succeeded",
      providerTaskId,
      output: outputFromMapping(task.output, json, {
        provider: this.manifest.id,
        model: this.manifest.defaultModel,
        prompt: undefined,
        referenceAssetIds: [],
        assetPrefix: "programmable_video",
        storagePrefix: "programmable/videos",
        providerTaskId,
      }),
      rawJson: safeRawJson(json),
    };
  }

  async cancelTask(providerTaskId: string): Promise<VideoProviderTaskResult> {
    const cancelRequest = this.manifest.video?.action.task?.cancelRequest;
    if (!cancelRequest) {
      return {
        status: "cancelled",
        providerTaskId,
      };
    }
    await executeRequest(
      this.manifest.id,
      cancelRequest,
      { credential: this.credentials, input: {}, task: { providerTaskId } },
      this.fetchImpl,
    );
    return {
      status: "cancelled",
      providerTaskId,
    };
  }

  async generateVideo(input: VideoGenerationInput): Promise<MockAssetOutput> {
    const result = await this.createTask(input);
    if (result.status === "succeeded" && result.output) {
      return result.output;
    }
    throw this.error("PROGRAMMABLE_PROVIDER_ASYNC_TASK", "Programmable video provider returned an async task.");
  }

  private assertConfigured(): void {
    for (const credential of this.manifest.credentials) {
      if (credential.required && !this.credentials[credential.key]) {
        throw this.error("PROVIDER_NOT_CONFIGURED", `${this.manifest.displayName} is missing ${credential.label}.`);
      }
    }
  }

  private error(code: string, message: string): ProviderError {
    return new ProviderError({
      provider: this.manifest.id,
      code,
      message,
      retryable: false,
    });
  }
}

export function createProgrammableImageProvider(
  manifest: ProgrammableProviderManifest,
  options: ProgrammableProviderRuntimeOptions = {},
): ImageProvider {
  return new ProgrammableImageProvider(manifest, options);
}

export function createProgrammableVideoProvider(
  manifest: ProgrammableProviderManifest,
  options: ProgrammableProviderRuntimeOptions = {},
): VideoProvider {
  return new ProgrammableVideoProvider(manifest, options);
}

async function executeActionRequest(
  provider: string,
  action: ProgrammableProviderActionManifest,
  context: RuntimeContext,
  fetchImpl: FetchLike,
): Promise<unknown> {
  return executeRequest(provider, action.request, context, fetchImpl);
}

async function executeRequest(
  provider: string,
  request: ProgrammableProviderActionManifest["request"],
  context: RuntimeContext,
  fetchImpl: FetchLike,
): Promise<unknown> {
  const url = renderTemplate(request.url, context);
  assertAllowedUrl(provider, url);
  const maxResponseBytes = Math.min(request.maxResponseBytes ?? DEFAULT_MAX_RESPONSE_BYTES, MAX_RESPONSE_BYTES);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Math.min(request.timeoutMs ?? DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS),
  );

  try {
    const response = await fetchImpl(url, {
      method: request.method,
      headers: guardedHeaders(provider, request.headers, context),
      body: request.bodyJson === undefined ? undefined : JSON.stringify(renderValue(request.bodyJson, context)),
      signal: controller.signal,
    });
    return readBoundedJson(response, provider, maxResponseBytes);
  } catch (error) {
    if (error instanceof ProviderError) {
      throw error;
    }
    throw new ProviderError({
      provider,
      code: "PROGRAMMABLE_PROVIDER_REQUEST_FAILED",
      message: sanitizeMessage(error instanceof Error ? error.message : undefined) ?? "Programmable provider request failed.",
      retryable: true,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function readBoundedJson(response: Response, provider: string, maxResponseBytes: number): Promise<unknown> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxResponseBytes) {
    throw new ProviderError({
      provider,
      code: "PROGRAMMABLE_PROVIDER_RESPONSE_TOO_LARGE",
      message: "Programmable provider response exceeded the configured size limit.",
      retryable: true,
    });
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxResponseBytes) {
    throw new ProviderError({
      provider,
      code: "PROGRAMMABLE_PROVIDER_RESPONSE_TOO_LARGE",
      message: "Programmable provider response exceeded the configured size limit.",
      retryable: true,
    });
  }
  const text = new TextDecoder().decode(bytes);
  let json: unknown = null;
  try {
    json = text.trim() ? JSON.parse(text) as unknown : {};
  } catch {
    json = { text };
  }
  if (!response.ok) {
    throw new ProviderError({
      provider,
      code: "PROGRAMMABLE_PROVIDER_HTTP_ERROR",
      message: sanitizeMessage(stringAtPath(json, "message") ?? stringAtPath(json, "error")) ?? `Programmable provider HTTP ${response.status}.`,
      retryable: response.status >= 500,
    });
  }
  return json;
}

function guardedHeaders(
  provider: string,
  headers: Record<string, string> | undefined,
  context: RuntimeContext,
): HeadersInit {
  const rendered: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    const normalized = key.toLowerCase();
    if (["host", "content-length", "connection", "transfer-encoding"].includes(normalized)) {
      throw new ProviderError({
        provider,
        code: "PROGRAMMABLE_PROVIDER_HEADER_BLOCKED",
        message: `Programmable provider header ${key} is not allowed.`,
        retryable: false,
      });
    }
    rendered[key] = renderTemplate(value, context);
  }
  if (!Object.keys(rendered).some((key) => key.toLowerCase() === "content-type")) {
    rendered["content-type"] = "application/json";
  }
  return rendered;
}

function assertAllowedUrl(provider: string, value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ProviderError({
      provider,
      code: "PROGRAMMABLE_PROVIDER_URL_BLOCKED",
      message: "Programmable provider URL is invalid.",
      retryable: false,
    });
  }
  if (url.protocol !== "https:") {
    throw blockedUrlError(provider);
  }
  const hostname = url.hostname.toLowerCase();
  const normalizedHostname = hostname.replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTNAMES.has(normalizedHostname) || normalizedHostname.endsWith(".localhost")) {
    throw blockedUrlError(provider);
  }
  const ipVersion = ipVersionForHostname(normalizedHostname);
  if (ipVersion === 4 && isPrivateIpv4(normalizedHostname)) {
    throw blockedUrlError(provider);
  }
  if (ipVersion === 6 && isPrivateIpv6(normalizedHostname)) {
    throw blockedUrlError(provider);
  }
}

function blockedUrlError(provider: string): ProviderError {
  return new ProviderError({
    provider,
    code: "PROGRAMMABLE_PROVIDER_URL_BLOCKED",
    message: "Programmable provider URL is blocked by the sandbox policy.",
    retryable: false,
  });
}

function ipVersionForHostname(value: string): 0 | 4 | 6 {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(value)) {
    return 4;
  }
  if (value.includes(":")) {
    return 6;
  }
  return 0;
}

function isPrivateIpv4(value: string): boolean {
  const parts = value.split(".").map(Number);
  const [a, b] = parts;
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return true;
  }
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b !== undefined && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(value: string): boolean {
  const mappedIpv4 = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedIpv4) {
    return isPrivateIpv4(mappedIpv4[1] ?? "");
  }
  if (value.startsWith("::ffff:")) {
    return true;
  }
  return value === "::" || value === "::1" || value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80");
}

function outputFromMapping(
  mapping: ProgrammableProviderOutputMapping,
  json: unknown,
  context: {
    provider: string;
    model: string;
    prompt?: string;
    referenceAssetIds: string[];
    assetPrefix: string;
    storagePrefix: string;
    providerTaskId?: string;
  },
): MockAssetOutput | ImageProviderOutput {
  const value = stringAtPath(json, mapping.path);
  if (!value) {
    throw new ProviderError({
      provider: context.provider,
      code: "PROVIDER_EMPTY_RESPONSE",
      message: "Programmable provider response did not include the configured output path.",
      retryable: false,
    });
  }
  const mimeType = mapping.mimeType ?? (context.assetPrefix.includes("video") ? "video/mp4" : "image/png");
  const digestInput = `${context.provider}-${context.model}-${context.prompt ?? ""}-${value}`;
  const extension = extensionForMime(mimeType);
  return {
    assetId: stableId(context.assetPrefix, digestInput),
    storageKey: `${context.storagePrefix}/${stableId("asset", digestInput)}.${extension}`,
    mimeType,
    provider: context.provider,
    model: context.model,
    prompt: context.prompt,
    referenceAssetIds: context.referenceAssetIds,
    providerTaskId: context.providerTaskId,
    remoteUrl: mapping.source === "url" ? value : undefined,
    bytesBase64: mapping.source === "base64" ? value : undefined,
    width: numberAtPath(json, mapping.widthPath),
    height: numberAtPath(json, mapping.heightPath),
    rawJson: safeRawJson(json),
  };
}

function inputContext(credentials: Record<string, string>, input: ImageGenerationInput | VideoGenerationInput): RuntimeContext {
  return {
    credential: credentials,
    input: {
      ...input,
      model: input.model,
      prompt: input.prompt,
    },
  };
}

function renderValue(value: unknown, context: RuntimeContext): unknown {
  if (typeof value === "string") {
    return renderTemplate(value, context);
  }
  if (Array.isArray(value)) {
    return value.map((item) => renderValue(item, context));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entryValue]) => [key, renderValue(entryValue, context)]),
    );
  }
  return value;
}

function renderTemplate(value: string, context: RuntimeContext): string {
  return value.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, path: string) => {
    const resolved = readContextPath(context, path.trim());
    return resolved === undefined || resolved === null ? "" : String(resolved);
  });
}

function readContextPath(context: RuntimeContext, path: string): unknown {
  const [root, ...segments] = path.split(".");
  if (root !== "credential" && root !== "input" && root !== "task") {
    return undefined;
  }
  return segments.reduce<unknown>((current, segment) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, context[root]);
}

function stringAtPath(value: unknown, path: string | undefined): string | undefined {
  const result = valueAtPath(value, path);
  return typeof result === "string" && result.trim() ? result.trim() : undefined;
}

function numberAtPath(value: unknown, path: string | undefined): number | undefined {
  const result = valueAtPath(value, path);
  return typeof result === "number" && Number.isFinite(result) ? result : undefined;
}

function valueAtPath(value: unknown, path: string | undefined): unknown {
  if (!path) {
    return undefined;
  }
  const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");
  return normalizedPath.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object") {
      return (current as Record<string, unknown>)[segment];
    }
    return undefined;
  }, value);
}

function sanitizeMessage(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9._-]+/gi, "[redacted]")
    .replace(/api[_-]?key['"]?\s*[:=]\s*['"]?[^'",\s]+/gi, "apiKey=[redacted]");
}

function safeRawJson(value: unknown): CanvasSnapshotJson {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return JSON.parse(JSON.stringify(value)) as CanvasSnapshotJson;
}

function stableId(prefix: string, value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const body = normalized || "programmable";
  const digest = stableDigest(value);
  const truncated = body.slice(0, 64).replace(/-+$/g, "");
  return `${prefix}_${truncated || "programmable"}-${digest}`;
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

function extensionForMime(mimeType: string): string {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  if (mimeType === "video/webm") {
    return "webm";
  }
  if (mimeType.startsWith("video/")) {
    return "mp4";
  }
  return "png";
}
