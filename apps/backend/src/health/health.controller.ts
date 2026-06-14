import { Controller, Get } from "@nestjs/common";

import { readAppConfig } from "../config/app-config";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    const config = readAppConfig();

    return {
      status: "ok",
      service: "guga-flow-backend",
      version: {
        appVersion: config.appVersion,
        apiVersion: "v1",
        buildCommit: config.buildCommit,
        buildTime: config.buildTime,
        nodeVersion: process.version,
        environment: config.nodeEnv,
      },
      debug: {
        aiDebugAvailable: config.aiDebugAvailable,
        aiDebugEnabled: config.aiDebugEnabled,
        safeTraceFields: ["traceId", "provider", "model", "latencyMs", "sanitizedError"],
        credentialValuesExposed: false,
      },
      providerMode: {
        llm: {
          selected: config.llmProvider,
          mockAvailable: true,
          realKeyConfigured: config.realProviderKeysConfigured.llm,
          configuredProviders: {
            generic: config.llmProviderKeysConfigured.generic,
            gemini: config.llmProviderKeysConfigured.gemini,
            anthropic: config.llmProviderKeysConfigured.anthropic,
            ark: config.llmProviderKeysConfigured.ark,
          },
        },
        image: {
          selected: config.imageProvider,
          mockAvailable: true,
          realKeyConfigured: config.realProviderKeysConfigured.image,
          configuredProviders: {
            image2: config.imageProviderKeysConfigured.image2,
            banana: config.imageProviderKeysConfigured.banana,
          },
        },
        video: {
          selected: config.videoProvider,
          mockAvailable: true,
          realKeyConfigured: config.realProviderKeysConfigured.video,
          configuredProviders: {
            seedance: config.videoProviderKeysConfigured.seedance,
            happyhorse: config.videoProviderKeysConfigured.happyhorse,
          },
        },
        editor: {
          selected: "local-http",
          mockAvailable: true,
          localEditorConfigured: Boolean(config.localEditorUrl),
        },
      },
    };
  }
}
