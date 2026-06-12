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
      providerMode: {
        llm: {
          selected: config.llmProvider,
          mockAvailable: true,
          realKeyConfigured: config.realProviderKeysConfigured.llm,
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
        },
      },
    };
  }
}
