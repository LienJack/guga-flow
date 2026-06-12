import { describe, expect, it, vi } from "vitest";

import { createVideoProviderRegistry } from "./video-provider-registry";
import { HappyHorseProvider, SeedanceProvider } from "./real-video-providers";

describe("real video providers", () => {
  it("fails with a normalized non-retryable error when seedance has no key", async () => {
    const fetchImpl = vi.fn();
    const provider = new SeedanceProvider({ fetchImpl });

    await expect(
      provider.createTask({
        projectId: "project_1",
        prompt: "cinematic camera move",
      }),
    ).rejects.toMatchObject({
      provider: "seedance",
      code: "PROVIDER_NOT_CONFIGURED",
      retryable: false,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("submits seedance image-to-video tasks with normalized settings", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: "seedance_task_1" }));
    const provider = new SeedanceProvider({
      apiKey: "seedance-test-key",
      baseUrl: "https://seedance.example.test/api/v3",
      fetchImpl,
    });

    const result = await provider.createTask({
      projectId: "project_1",
      prompt: "slow dolly over frame",
      model: "seedance-1-0-pro",
      sourceImageAssetId: "https://cdn.example.test/source.png",
      durationSec: 5,
      aspectRatio: "16:9",
      resolution: "1080p",
      providerParams: { cameraFixed: true },
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://seedance.example.test/api/v3/contents/generations/tasks",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Bearer seedance-test-key",
          "content-type": "application/json",
        }),
      }),
    );
    const body = requestBodyFromFetchMock(fetchImpl);
    expect(body).toMatchObject({
      model: "seedance-1-0-pro",
      prompt: "slow dolly over frame",
      duration: 5,
      ratio: "16:9",
      resolution: "1080p",
      camera_fixed: true,
    });
    expect(body.content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "text", text: "slow dolly over frame" }),
        expect.objectContaining({
          type: "image_url",
          image_url: { url: "https://cdn.example.test/source.png" },
        }),
      ]),
    );
    expect(result).toMatchObject({
      status: "provider_waiting",
      providerTaskId: "seedance_task_1",
    });
  });

  it("normalizes seedance completed task video outputs", async () => {
    const provider = new SeedanceProvider({
      apiKey: "seedance-test-key",
      fetchImpl: vi.fn(async () =>
        jsonResponse({
          status: "succeeded",
          model: "seedance-1-0-pro",
          video: {
            url: "https://cdn.example.test/generated.mp4",
          },
        }),
      ),
    });

    const result = await provider.getTask("seedance_task_1");

    expect(result).toMatchObject({
      status: "succeeded",
      providerTaskId: "seedance_task_1",
      output: {
        provider: "seedance",
        model: "seedance-1-0-pro",
        mimeType: "video/mp4",
        remoteUrl: "https://cdn.example.test/generated.mp4",
        providerTaskId: "seedance_task_1",
      },
    });
    expect(result.output?.storageKey).toMatch(/^providers\/seedance\/tasks\/seedance_task_1\//);
  });

  it("submits happy horse queue tasks and resolves completed results", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ request_id: "fal_request_1" }))
      .mockResolvedValueOnce(jsonResponse({ status: "COMPLETED" }))
      .mockResolvedValueOnce(
        jsonResponse({
          video: {
            url: "https://fal-cdn.example.test/happy-horse.webm",
          },
        }),
      );
    const provider = new HappyHorseProvider({
      apiKey: "fal-test-key",
      baseUrl: "https://fal.example.test",
      fetchImpl,
    });

    const created = await provider.createTask({
      projectId: "project_1",
      prompt: "animated character frame",
      sourceImageAssetId: "https://cdn.example.test/source.png",
      durationSec: 10,
      aspectRatio: "9:16",
      resolution: "720p",
      providerParams: { motionStrength: "high" },
    });
    const result = await provider.getTask(created.providerTaskId);

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://fal.example.test/alibaba/happy-horse/image-to-video",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "Key fal-test-key",
          "content-type": "application/json",
        }),
      }),
    );
    expect(requestBodyFromFetchMock(fetchImpl)).toMatchObject({
      prompt: "animated character frame",
      image_url: "https://cdn.example.test/source.png",
      duration: 10,
      aspect_ratio: "9:16",
      resolution: "720p",
      motion_strength: "high",
    });
    expect(result).toMatchObject({
      status: "succeeded",
      providerTaskId: "fal_request_1",
      output: {
        provider: "happyhorse",
        mimeType: "video/webm",
        remoteUrl: "https://fal-cdn.example.test/happy-horse.webm",
      },
    });
  });

  it("normalizes retryable provider request failures without exposing key values", async () => {
    const provider = new HappyHorseProvider({
      apiKey: "secret-fal-key",
      fetchImpl: vi.fn(async () =>
        jsonResponse(
          {
            error: {
              message: "temporary queue failure",
            },
          },
          { status: 503 },
        ),
      ),
    });

    await expect(
      provider.createTask({
        projectId: "project_1",
        prompt: "fail",
      }),
    ).rejects.toMatchObject({
      provider: "happyhorse",
      code: "PROVIDER_REQUEST_FAILED",
      message: expect.not.stringContaining("secret-fal-key"),
      retryable: true,
    });
  });

  it("selects mock and real video providers by id", () => {
    const registry = createVideoProviderRegistry({
      env: {
        SEEDANCE_API_KEY: "seedance-test-key",
        FAL_KEY: "fal-test-key",
      },
    });

    expect(registry.get().capability.id).toBe("mock-video");
    expect(registry.get("seedance").capability.id).toBe("seedance");
    expect(registry.get("happyhorse").capability.id).toBe("happyhorse");
    expect(() => registry.get("missing-provider")).toThrow("Unknown video provider");
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
