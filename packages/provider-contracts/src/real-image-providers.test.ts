import { describe, expect, it, vi } from "vitest";

import { createImageProviderRegistry } from "./image-provider-registry";
import { BananaProvider, Image2Provider } from "./real-image-providers";

describe("real image providers", () => {
  it("fails with a normalized non-retryable error when image2 has no key", async () => {
    const fetchImpl = vi.fn();
    const provider = new Image2Provider({ fetchImpl });

    await expect(
      provider.generateImage({
        projectId: "project_1",
        prompt: "cinematic rooftop",
      }),
    ).rejects.toMatchObject({
      provider: "image2",
      code: "PROVIDER_NOT_CONFIGURED",
      retryable: false,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("normalizes image2 inline image outputs and request settings", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        data: [
          { b64_json: "base64-image-a", revised_prompt: "revised prompt a" },
          { b64_json: "base64-image-b" },
        ],
      }),
    );
    const provider = new Image2Provider({
      apiKey: "sk-test-openai",
      baseUrl: "https://example-openai.test/v1",
      fetchImpl,
    });

    const result = await provider.generateImage({
      projectId: "project_1",
      prompt: "cinematic rooftop",
      negativePrompt: "text",
      model: "gpt-image-2",
      aspectRatio: "9:16",
      count: 2,
      referenceAssetIds: ["asset_ref_1"],
      providerParams: { quality: "high" },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://example-openai.test/v1/images/generations",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer sk-test-openai",
          "content-type": "application/json",
        }),
      }),
    );
    const body = requestBodyFromFetchMock(fetchImpl);
    expect(body).toMatchObject({
      model: "gpt-image-2",
      n: 2,
      size: "1024x1536",
      quality: "high",
    });
    expect(body.prompt).toContain("Avoid: text");
    expect(result.outputs).toHaveLength(2);
    expect(result.outputs[0]).toMatchObject({
      provider: "image2",
      model: "gpt-image-2",
      prompt: "revised prompt a",
      mimeType: "image/png",
      bytesBase64: "base64-image-a",
      referenceAssetIds: ["asset_ref_1"],
    });
    expect(result.outputs[0]?.storageKey).toMatch(/^providers\/image2\/project_1\/provider_image_/);
  });

  it("normalizes image2 remote URL outputs", async () => {
    const provider = new Image2Provider({
      apiKey: "sk-test-openai",
      fetchImpl: vi.fn(async () =>
        jsonResponse({
          data: [{ url: "https://cdn.example.test/generated.png" }],
        }),
      ),
    });

    const result = await provider.generateImage({
      projectId: "project_1",
      prompt: "remote output",
    });

    expect(result.outputs[0]).toMatchObject({
      provider: "image2",
      remoteUrl: "https://cdn.example.test/generated.png",
      bytesBase64: undefined,
    });
  });

  it("normalizes banana inline image outputs", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        candidates: [
          {
            content: {
              parts: [
                { text: "ignored caption" },
                {
                  inlineData: {
                    mimeType: "image/webp",
                    data: "base64-webp",
                  },
                },
              ],
            },
          },
        ],
      }),
    );
    const provider = new BananaProvider({
      apiKey: "gemini-test-key",
      baseUrl: "https://gemini.example.test/v1beta",
      fetchImpl,
    });

    const result = await provider.generateImage({
      projectId: "project_1",
      prompt: "consistent character study",
      model: "gemini-2.5-flash-image",
      aspectRatio: "1:1",
      referenceAssetIds: ["asset_ref_1"],
      providerParams: { imageSize: "2K" },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://gemini.example.test/v1beta/models/gemini-2.5-flash-image:generateContent?key=gemini-test-key",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
        }),
      }),
    );
    const body = requestBodyFromFetchMock(fetchImpl);
    expect(body).toMatchObject({
      generationConfig: {
        responseModalities: ["IMAGE"],
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: "2K",
        },
      },
    });
    expect(result.outputs).toHaveLength(1);
    expect(result.outputs[0]).toMatchObject({
      provider: "banana",
      model: "gemini-2.5-flash-image",
      mimeType: "image/webp",
      bytesBase64: "base64-webp",
      referenceAssetIds: ["asset_ref_1"],
    });
    expect(result.outputs[0]?.storageKey).toMatch(/\.webp$/);
  });

  it("normalizes retryable provider request failures without exposing key values", async () => {
    const provider = new BananaProvider({
      apiKey: "secret-gemini-key",
      fetchImpl: vi.fn(async () =>
        jsonResponse(
          {
            error: {
              message: "temporary upstream failure",
            },
          },
          { status: 503 },
        ),
      ),
    });

    await expect(
      provider.generateImage({
        projectId: "project_1",
        prompt: "fail",
      }),
    ).rejects.toMatchObject({
      provider: "banana",
      code: "PROVIDER_REQUEST_FAILED",
      message: expect.not.stringContaining("secret-gemini-key"),
      retryable: true,
    });
  });

  it("normalizes fetch failures without exposing query-string keys", async () => {
    const provider = new BananaProvider({
      apiKey: "secret-gemini-key",
      fetchImpl: vi.fn(async () => {
        throw new Error("fetch failed for https://gemini.example.test?key=secret-gemini-key");
      }),
    });

    await expect(
      provider.generateImage({
        projectId: "project_1",
        prompt: "network fail",
      }),
    ).rejects.toMatchObject({
      provider: "banana",
      code: "PROVIDER_REQUEST_FAILED",
      message: expect.not.stringContaining("secret-gemini-key"),
      retryable: true,
    });
  });

  it("selects mock and real providers by id", () => {
    const registry = createImageProviderRegistry({
      env: {
        OPENAI_API_KEY: "sk-test-openai",
        GEMINI_API_KEY: "gemini-test-key",
      },
    });

    expect(registry.get().capability.id).toBe("mock-image");
    expect(registry.get("image2").capability.id).toBe("image2");
    expect(registry.get("banana").capability.id).toBe("banana");
    expect(() => registry.get("missing-provider")).toThrow("Unknown image provider");
  });
});

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      "content-type": "application/json",
    },
  });
}

function requestBodyFromFetchMock(fetchImpl: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const calls = fetchImpl.mock.calls as Array<[string | URL, RequestInit?]>;
  return JSON.parse(String(calls[0]?.[1]?.body)) as Record<string, unknown>;
}
