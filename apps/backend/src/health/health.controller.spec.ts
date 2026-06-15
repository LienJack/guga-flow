import os from "node:os";
import { describe, expect, it } from "vitest";

import { readAppConfig } from "../config/app-config";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports mock provider mode without exposing provider secrets", () => {
    const controller = new HealthController();
    const health = controller.getHealth();

    expect(health.status).toBe("ok");
    expect(health.version).toMatchObject({ appVersion: expect.any(String), apiVersion: "v1" });
    expect(health.debug).toMatchObject({
      aiDebugAvailable: true,
      aiDebugEnabled: false,
      credentialValuesExposed: false,
    });
    expect(health.providerMode.llm.selected).toBe("mock");
    expect(health.providerMode.editor.localEditorConfigured).toBe(false);
    expect(JSON.stringify(health)).not.toContain("API_KEY");
  });

  it("reports image provider key availability without exposing key values", () => {
    const config = readAppConfig({
      LLM_API_KEY: "sk-test-llm",
      ANTHROPIC_API_KEY: "sk-test-anthropic",
      OPENAI_API_KEY: "sk-test-openai",
      GEMINI_API_KEY: "sk-test-gemini",
      SEEDANCE_API_KEY: "sk-test-seedance",
      FAL_KEY: "sk-test-fal",
    });

    expect(config.realProviderKeysConfigured.llm).toBe(true);
    expect(config.realProviderKeysConfigured.image).toBe(true);
    expect(config.realProviderKeysConfigured.video).toBe(true);
    expect(config.llmProviderKeysConfigured).toEqual({
      generic: true,
      gemini: true,
      anthropic: true,
      ark: false,
    });
    expect(config.imageProviderKeysConfigured).toEqual({
      image2: true,
      banana: true,
    });
    expect(config.videoProviderKeysConfigured).toEqual({
      seedance: true,
      happyhorse: true,
    });
    expect(JSON.stringify(config)).not.toContain("sk-test-llm");
    expect(JSON.stringify(config)).not.toContain("sk-test-anthropic");
    expect(JSON.stringify(config)).not.toContain("sk-test-openai");
    expect(JSON.stringify(config)).not.toContain("sk-test-gemini");
    expect(JSON.stringify(config)).not.toContain("sk-test-seedance");
    expect(JSON.stringify(config)).not.toContain("sk-test-fal");
  });

  it("keeps local editor URL server-side while reporting configured state", () => {
    const config = readAppConfig({
      LOCAL_EDITOR_URL: "http://localhost:4300/editor-exports",
    });

    expect(Boolean(config.localEditorUrl)).toBe(true);
    expect(JSON.stringify(config)).toContain("localEditorUrl");

    const controller = new HealthController();
    const health = controller.getHealth();
    expect(health.providerMode.editor).toHaveProperty("localEditorConfigured");
    expect(JSON.stringify(health)).not.toContain("4300/editor-exports");
  });

  it("fails fast for invalid numeric configuration", () => {
    expect(() => readAppConfig({ PORT: "not-a-port" })).toThrow("PORT must be a positive integer");
  });

  it("allows local network frontend origins by default in development", () => {
    const config = readAppConfig({});
    const localIpv4 = Object.values(os.networkInterfaces())
      .flatMap((entries) => entries ?? [])
      .find((entry) => entry.family === "IPv4" && !entry.internal)?.address;

    expect(config.corsAllowedOrigins).toContain("http://localhost:3001");
    if (localIpv4) {
      expect(config.corsAllowedOrigins).toContain(`http://${localIpv4}:3001`);
    }
  });

  it("keeps AI debug disabled in production even when requested", () => {
    const config = readAppConfig({
      NODE_ENV: "production",
      AI_DEBUG_ENABLED: "true",
      BUILD_COMMIT: "abc123",
      BUILD_TIME: "2026-06-14T00:00:00.000Z",
      RELEASE_FEED_URL: "https://releases.example.com/guga-flow.json",
    });

    expect(config.aiDebugAvailable).toBe(false);
    expect(config.aiDebugEnabled).toBe(false);
    expect(config.buildCommit).toBe("abc123");
    expect(config.buildTime).toBe("2026-06-14T00:00:00.000Z");
    expect(config.releaseFeedUrl).toBe("https://releases.example.com/guga-flow.json");
  });
});
