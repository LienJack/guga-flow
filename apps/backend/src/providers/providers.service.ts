import { Injectable } from "@nestjs/common";
import type {
  ImageProviderCatalogItem,
  ImageProviderCatalogResult,
  VideoProviderCatalogItem,
  VideoProviderCatalogResult,
} from "@guga-flow/shared-types";

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

function videoProviderCatalog(config: AppConfig): VideoProviderCatalogItem[] {
  return [
    {
      id: "mock-video",
      displayName: "Mock Video",
      enabled: true,
      requiresApiKey: false,
      defaultModel: "mock-video-v1",
      models: [{ id: "mock-video-v1", displayName: "Mock Video v1", default: true }],
      supportedModes: ["image_to_video"],
      supportsFirstFrame: true,
      supportsLastFrame: false,
      supportsReferenceImages: true,
      maxReferenceImages: 99,
      supportsCancel: true,
      defaultDurationSeconds: 4,
      supportedDurationSeconds: [4, 5, 6, 8, 10],
      defaultResolution: "720p",
      supportedResolutions: ["720p"],
      defaultAspectRatio: "16:9",
      supportedAspectRatios: ["9:16", "16:9", "1:1"],
      parameters: [],
    },
    {
      id: "seedance",
      displayName: "Seedance",
      enabled: config.videoProviderKeysConfigured.seedance,
      disabledReason: config.videoProviderKeysConfigured.seedance
        ? undefined
        : disabledReason("Seedance"),
      requiresApiKey: true,
      defaultModel: "seedance-1-0-pro",
      models: [
        { id: "seedance-1-0-pro", displayName: "Seedance 1.0 Pro", default: true },
        { id: "seedance-1-0-lite", displayName: "Seedance 1.0 Lite" },
      ],
      supportedModes: ["text_to_video", "image_to_video"],
      supportsFirstFrame: true,
      supportsLastFrame: false,
      supportsReferenceImages: true,
      maxReferenceImages: 1,
      supportsCancel: true,
      defaultDurationSeconds: 5,
      supportedDurationSeconds: [5, 10],
      defaultResolution: "720p",
      supportedResolutions: ["720p", "1080p"],
      defaultAspectRatio: "16:9",
      supportedAspectRatios: ["9:16", "16:9", "1:1"],
      parameters: [
        {
          id: "cameraFixed",
          label: "Camera fixed",
          type: "boolean",
          defaultValue: false,
        },
      ],
    },
    {
      id: "happyhorse",
      displayName: "Happy Horse",
      enabled: config.videoProviderKeysConfigured.happyhorse,
      disabledReason: config.videoProviderKeysConfigured.happyhorse
        ? undefined
        : disabledReason("Happy Horse"),
      requiresApiKey: true,
      defaultModel: "alibaba/happy-horse/image-to-video",
      models: [
        {
          id: "alibaba/happy-horse/image-to-video",
          displayName: "Happy Horse Image to Video",
          default: true,
        },
      ],
      supportedModes: ["image_to_video"],
      supportsFirstFrame: true,
      supportsLastFrame: false,
      supportsReferenceImages: true,
      maxReferenceImages: 1,
      supportsCancel: true,
      defaultDurationSeconds: 5,
      supportedDurationSeconds: [5, 10],
      defaultResolution: "720p",
      supportedResolutions: ["720p", "1080p"],
      defaultAspectRatio: "16:9",
      supportedAspectRatios: ["9:16", "16:9", "1:1"],
      parameters: [
        {
          id: "motionStrength",
          label: "Motion strength",
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
  ];
}

export function buildImageProviderCatalog(config: AppConfig): ImageProviderCatalogResult {
  return {
    providers: imageProviderCatalog(config),
  };
}

export function buildVideoProviderCatalog(config: AppConfig): VideoProviderCatalogResult {
  return {
    providers: videoProviderCatalog(config),
  };
}

@Injectable()
export class ProvidersService {
  getImageProviders(): ImageProviderCatalogResult {
    return buildImageProviderCatalog(readAppConfig());
  }

  getVideoProviders(): VideoProviderCatalogResult {
    return buildVideoProviderCatalog(readAppConfig());
  }
}
