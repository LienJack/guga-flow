import { describe, expect, it } from "vitest";

import { readAppConfig } from "../config/app-config";
import { buildImageProviderCatalog, buildVideoProviderCatalog } from "./providers.service";

describe("ProvidersService", () => {
  it("returns mock image enabled and real image providers disabled without keys", () => {
    const catalog = buildImageProviderCatalog(readAppConfig({}));

    expect(catalog.providers.map((provider) => provider.id)).toEqual([
      "mock-image",
      "image2",
      "banana",
    ]);
    expect(catalog.providers.find((provider) => provider.id === "mock-image")).toMatchObject({
      enabled: true,
      requiresApiKey: false,
    });
    expect(catalog.providers.find((provider) => provider.id === "image2")).toMatchObject({
      enabled: false,
      requiresApiKey: true,
      disabledReason: "Image 2 server-side key is not configured",
    });
    expect(catalog.providers.find((provider) => provider.id === "banana")).toMatchObject({
      enabled: false,
      requiresApiKey: true,
      disabledReason: "Nano Banana server-side key is not configured",
    });
    expect(JSON.stringify(catalog)).not.toContain("API_KEY");
    expect(JSON.stringify(catalog)).not.toContain("sk-test");
  });

  it("enables real image providers when their server-side keys are configured", () => {
    const catalog = buildImageProviderCatalog(
      readAppConfig({
        OPENAI_API_KEY: "sk-test-openai",
        GEMINI_API_KEY: "sk-test-gemini",
      }),
    );

    expect(catalog.providers.find((provider) => provider.id === "image2")).toMatchObject({
      enabled: true,
      defaultModel: "gpt-image-2",
      supportsMultipleOutputs: true,
      maxOutputs: 4,
    });
    expect(catalog.providers.find((provider) => provider.id === "banana")).toMatchObject({
      enabled: true,
      defaultModel: "gemini-2.5-flash-image",
      supportsReferenceImages: true,
      maxReferenceImages: 3,
    });
    expect(JSON.stringify(catalog)).not.toContain("sk-test-openai");
    expect(JSON.stringify(catalog)).not.toContain("sk-test-gemini");
  });

  it("returns mock video enabled and real video providers disabled without keys", () => {
    const catalog = buildVideoProviderCatalog(readAppConfig({}));

    expect(catalog.providers.map((provider) => provider.id)).toEqual([
      "mock-video",
      "seedance",
      "happyhorse",
    ]);
    expect(catalog.providers.find((provider) => provider.id === "mock-video")).toMatchObject({
      enabled: true,
      requiresApiKey: false,
      supportedModes: ["image_to_video"],
    });
    expect(catalog.providers.find((provider) => provider.id === "seedance")).toMatchObject({
      enabled: false,
      requiresApiKey: true,
      disabledReason: "Seedance server-side key is not configured",
    });
    expect(catalog.providers.find((provider) => provider.id === "happyhorse")).toMatchObject({
      enabled: false,
      requiresApiKey: true,
      disabledReason: "Happy Horse server-side key is not configured",
    });
    expect(JSON.stringify(catalog)).not.toContain("API_KEY");
    expect(JSON.stringify(catalog)).not.toContain("sk-test");
  });

  it("enables real video providers when their server-side keys are configured", () => {
    const catalog = buildVideoProviderCatalog(
      readAppConfig({
        SEEDANCE_API_KEY: "sk-test-seedance",
        FAL_KEY: "sk-test-fal",
      }),
    );

    expect(catalog.providers.find((provider) => provider.id === "seedance")).toMatchObject({
      enabled: true,
      defaultModel: "seedance-1-0-pro",
      supportsCancel: true,
      supportedResolutions: ["720p", "1080p"],
    });
    expect(catalog.providers.find((provider) => provider.id === "happyhorse")).toMatchObject({
      enabled: true,
      defaultModel: "alibaba/happy-horse/image-to-video",
      supportedModes: ["image_to_video"],
    });
    expect(JSON.stringify(catalog)).not.toContain("sk-test-seedance");
    expect(JSON.stringify(catalog)).not.toContain("sk-test-fal");
  });
});
