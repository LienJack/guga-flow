import { Injectable } from "@nestjs/common";
import type { ImageProviderCatalogItem, ImageProviderCatalogResult } from "@guga-flow/shared-types";

import type { AppConfig } from "../config/app-config";
import { readAppConfig } from "../config/app-config";

function disabledReason(displayName: string): string {
  return `${displayName} server-side key is not configured`;
}

function imageProviderCatalog(config: AppConfig): ImageProviderCatalogItem[] {
  return [
    {
      id: "mock-image",
      displayName: "Mock Image",
      enabled: true,
      requiresApiKey: false,
      defaultModel: "mock-image-v1",
      models: [{ id: "mock-image-v1", displayName: "Mock Image v1", default: true }],
      supportedModes: ["text_to_image", "multi_reference"],
      supportsReferenceImages: true,
      maxReferenceImages: 99,
      supportsMultipleOutputs: false,
      maxOutputs: 1,
      defaultAspectRatio: "16:9",
      supportedAspectRatios: ["9:16", "16:9", "1:1"],
      parameters: [],
    },
    {
      id: "image2",
      displayName: "Image 2",
      enabled: config.imageProviderKeysConfigured.image2,
      disabledReason: config.imageProviderKeysConfigured.image2
        ? undefined
        : disabledReason("Image 2"),
      requiresApiKey: true,
      defaultModel: "gpt-image-2",
      models: [{ id: "gpt-image-2", displayName: "GPT Image 2", default: true }],
      supportedModes: ["text_to_image", "image_to_image", "multi_reference"],
      supportsReferenceImages: true,
      maxReferenceImages: 4,
      supportsMultipleOutputs: true,
      maxOutputs: 4,
      defaultAspectRatio: "16:9",
      supportedAspectRatios: ["9:16", "16:9", "1:1"],
      parameters: [
        {
          id: "quality",
          label: "Quality",
          type: "select",
          defaultValue: "medium",
          options: [
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ],
        },
      ],
    },
    {
      id: "banana",
      displayName: "Nano Banana",
      enabled: config.imageProviderKeysConfigured.banana,
      disabledReason: config.imageProviderKeysConfigured.banana
        ? undefined
        : disabledReason("Nano Banana"),
      requiresApiKey: true,
      defaultModel: "gemini-2.5-flash-image",
      models: [
        {
          id: "gemini-2.5-flash-image",
          displayName: "Gemini 2.5 Flash Image",
          default: true,
        },
      ],
      supportedModes: ["text_to_image", "multi_reference"],
      supportsReferenceImages: true,
      maxReferenceImages: 3,
      supportsMultipleOutputs: false,
      maxOutputs: 1,
      defaultAspectRatio: "16:9",
      supportedAspectRatios: ["9:16", "16:9", "1:1"],
      parameters: [
        {
          id: "imageSize",
          label: "Image size",
          type: "select",
          defaultValue: "1K",
          options: [
            { value: "1K", label: "1K" },
            { value: "2K", label: "2K" },
          ],
        },
      ],
    },
  ];
}

export function buildImageProviderCatalog(config: AppConfig): ImageProviderCatalogResult {
  return {
    providers: imageProviderCatalog(config),
  };
}

@Injectable()
export class ProvidersService {
  getImageProviders(): ImageProviderCatalogResult {
    return buildImageProviderCatalog(readAppConfig());
  }
}
