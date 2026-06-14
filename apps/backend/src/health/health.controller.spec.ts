import { describe, expect, it } from "vitest";

import { readAppConfig } from "../config/app-config";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("reports mock provider mode without exposing provider secrets", () => {
    const controller = new HealthController();
    const health = controller.getHealth();

    expect(health.status).toBe("ok");
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
});
