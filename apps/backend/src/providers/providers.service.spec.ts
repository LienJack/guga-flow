import { describe, expect, it } from "vitest";

import { readAppConfig } from "../config/app-config";
import { buildImageProviderCatalog } from "./providers.service";

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
});
