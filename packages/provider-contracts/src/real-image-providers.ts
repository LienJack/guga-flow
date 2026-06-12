import type { CanvasSnapshotJson } from "@guga-flow/shared-types";

import type { ImageGenerationInput, ImageProvider, ImageProviderOutput, ImageProviderResult } from "./contracts";
import { ProviderError } from "./contracts";

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export interface RealImageProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: FetchLike;
}

const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_IMAGE2_MODEL = "gpt-image-2";
const DEFAULT_BANANA_MODEL = "gemini-2.5-flash-image";
const STABLE_ID_BODY_MAX_LENGTH = 64;

export class Image2Provider implements ImageProvider {
  readonly capability = {
    id: "image2",
    displayName: "Image2",
    requiresApiKey: true,
  };

  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: RealImageProviderOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_OPENAI_BASE_URL).replace(/\/+$/g, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageProviderResult> {
    failIfRequested(this.capability.id, input.forceFailure);
    this.assertConfigured();

    const model = input.model ?? DEFAULT_IMAGE2_MODEL;
    const response = await fetchWithProviderError(this.capability.id, () =>
      this.fetchImpl(`${this.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: composePrompt(input),
          n: normalizeCount(input.count, 4),
          size: openAiSizeFromAspectRatio(input.aspectRatio),
          quality: stringParam(input.providerParams, "quality") ?? undefined,
        }),
      }),
    );

    const json = await readJsonResponse(response, this.capability.id);
    const data = arrayProp(json, "data");
    const outputs = data.flatMap((item, index) =>
      openAiImageOutputFromItem(item, {
        input,
        model,
        provider: this.capability.id,
        index,
      }),
    );

    return nonEmptyResult(this.capability.id, outputs);
  }

  private assertConfigured(): void {
    if (this.apiKey) {
      return;
    }

    throw new ProviderError({
      provider: this.capability.id,
      code: "PROVIDER_NOT_CONFIGURED",
      message: "Image2 provider is disabled because no server-side API key is configured.",
      retryable: false,
    });
  }
}

export class BananaProvider implements ImageProvider {
  readonly capability = {
    id: "banana",
    displayName: "Banana",
    requiresApiKey: true,
  };

  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: RealImageProviderOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_GEMINI_BASE_URL).replace(/\/+$/g, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generateImage(input: ImageGenerationInput): Promise<ImageProviderResult> {
    failIfRequested(this.capability.id, input.forceFailure);
    this.assertConfigured();

    const model = input.model ?? DEFAULT_BANANA_MODEL;
    const response = await fetchWithProviderError(this.capability.id, () =>
      this.fetchImpl(
        `${this.baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(
          this.apiKey ?? "",
        )}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: composePrompt(input) }],
              },
            ],
            generationConfig: {
              responseModalities: ["IMAGE"],
              imageConfig: {
                aspectRatio: input.aspectRatio ?? "16:9",
                imageSize: stringParam(input.providerParams, "imageSize") ?? undefined,
              },
            },
          }),
        },
      ),
    );

    const json = await readJsonResponse(response, this.capability.id);
    const outputs = bananaOutputsFromResponse(json, {
      input,
      model,
      provider: this.capability.id,
    });

    return nonEmptyResult(this.capability.id, outputs);
  }

  private assertConfigured(): void {
    if (this.apiKey) {
      return;
    }

    throw new ProviderError({
      provider: this.capability.id,
      code: "PROVIDER_NOT_CONFIGURED",
      message: "Banana provider is disabled because no server-side API key is configured.",
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

function composePrompt(input: ImageGenerationInput): string {
  const negativePrompt = input.negativePrompt?.trim();
  if (!negativePrompt) {
    return input.prompt;
  }

  return `${input.prompt}\n\nAvoid: ${negativePrompt}`;
}

function normalizeCount(count: number | undefined, max: number): number {
  const normalized = Math.trunc(count ?? 1);
  if (!Number.isFinite(normalized)) {
    return 1;
  }

  return Math.min(Math.max(normalized, 1), max);
}

function openAiSizeFromAspectRatio(aspectRatio: ImageGenerationInput["aspectRatio"]): string {
  switch (aspectRatio) {
    case "9:16":
      return "1024x1536";
    case "1:1":
      return "1024x1024";
    case "16:9":
    default:
      return "1536x1024";
  }
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

function openAiImageOutputFromItem(
  item: unknown,
  context: {
    input: ImageGenerationInput;
    provider: string;
    model: string;
    index: number;
  },
): ImageProviderOutput[] {
  if (!isRecord(item)) {
    return [];
  }

  const bytesBase64 = stringProp(item, "b64_json");
  const remoteUrl = stringProp(item, "url");
  if (!bytesBase64 && !remoteUrl) {
    return [];
  }

  const prompt = stringProp(item, "revised_prompt") ?? context.input.prompt;
  const assetId = stableId(
    "provider_image",
    `${context.provider}-${context.input.projectId}-${context.input.prompt}-${context.index}-${bytesBase64 ?? remoteUrl}`,
  );
  return [
    {
      assetId,
      storageKey: storageKeyForOutput(context.provider, context.input.projectId, assetId, "png"),
      mimeType: "image/png",
      provider: context.provider,
      model: context.model,
      prompt,
      referenceAssetIds: context.input.referenceAssetIds ?? [],
      remoteUrl,
      bytesBase64,
      rawJson: {
        responseIndex: context.index,
        revisedPrompt: stringProp(item, "revised_prompt") ?? null,
        hasInlineBytes: Boolean(bytesBase64),
        hasRemoteUrl: Boolean(remoteUrl),
      },
    },
  ];
}

function bananaOutputsFromResponse(
  json: unknown,
  context: {
    input: ImageGenerationInput;
    provider: string;
    model: string;
  },
): ImageProviderOutput[] {
  const candidates = arrayProp(json, "candidates");
  const outputs: ImageProviderOutput[] = [];

  candidates.forEach((candidate, candidateIndex) => {
    const content = recordProp(candidate, "content");
    const parts = content ? arrayProp(content, "parts") : [];

    parts.forEach((part, partIndex) => {
      const inlineData = recordProp(part, "inlineData") ?? recordProp(part, "inline_data");
      const bytesBase64 = inlineData ? stringProp(inlineData, "data") : undefined;
      if (!bytesBase64) {
        return;
      }

      const mimeType = inlineData ? stringProp(inlineData, "mimeType") ?? stringProp(inlineData, "mime_type") : undefined;
      const assetId = stableId(
        "provider_image",
        `${context.provider}-${context.input.projectId}-${context.input.prompt}-${candidateIndex}-${partIndex}-${bytesBase64}`,
      );
      outputs.push({
        assetId,
        storageKey: storageKeyForOutput(
          context.provider,
          context.input.projectId,
          assetId,
          extensionForMime(mimeType),
        ),
        mimeType: mimeType ?? "image/png",
        provider: context.provider,
        model: context.model,
        prompt: context.input.prompt,
        referenceAssetIds: context.input.referenceAssetIds ?? [],
        bytesBase64,
        rawJson: {
          candidateIndex,
          partIndex,
          hasInlineBytes: true,
        },
      });
    });
  });

  return outputs;
}

function nonEmptyResult(provider: string, outputs: ImageProviderOutput[]): ImageProviderResult {
  if (outputs.length > 0) {
    return { outputs };
  }

  throw new ProviderError({
    provider,
    code: "PROVIDER_EMPTY_RESPONSE",
    message: `${provider} did not return any image outputs.`,
    retryable: false,
  });
}

function storageKeyForOutput(provider: string, projectId: string, assetId: string, extension: string): string {
  return `providers/${provider}/${safePathSegment(projectId)}/${assetId}.${extension}`;
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
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "") || "project";
}

function extensionForMime(mimeType: string | undefined): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    case "image/png":
    default:
      return "png";
  }
}

function stringParam(params: CanvasSnapshotJson | undefined, key: string): string | undefined {
  if (!isRecord(params)) {
    return undefined;
  }

  const value = params[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function extractProviderMessage(json: unknown): string {
  if (typeof json === "string") {
    return json.slice(0, 500);
  }

  if (isRecord(json)) {
    const error = recordProp(json, "error");
    const errorMessage = error ? stringProp(error, "message") : undefined;
    return errorMessage ?? stringProp(json, "message") ?? "provider request failed";
  }

  return "provider request failed";
}

function sanitizeProviderError(error: unknown): string {
  const message = error instanceof Error ? error.message : "network error";
  return message
    .replace(/([?&]key=)[^&\s]+/gi, "$1[redacted]")
    .replace(/(authorization:\s*bearer\s+)[^\s]+/gi, "$1[redacted]")
    .replace(/(bearer\s+)[^\s]+/gi, "$1[redacted]");
}

function arrayProp(value: unknown, key: string): unknown[] {
  if (!isRecord(value)) {
    return [];
  }

  const prop = value[key];
  return Array.isArray(prop) ? prop : [];
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
