import type { VideoProvider } from "./contracts";
import { ProviderError } from "./contracts";
import { MockVideoProvider } from "./mock-providers";
import { HappyHorseProvider, SeedanceProvider, type RealVideoProviderOptions } from "./real-video-providers";

export interface VideoProviderRegistry {
  get(providerId?: string): VideoProvider;
  list(): VideoProvider[];
}

export interface VideoProviderRegistryOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: RealVideoProviderOptions["fetchImpl"];
  seedanceBaseUrl?: string;
  falBaseUrl?: string;
}

class StaticVideoProviderRegistry implements VideoProviderRegistry {
  private readonly providersById: Map<string, VideoProvider>;

  constructor(providers: VideoProvider[]) {
    this.providersById = new Map(providers.map((provider) => [provider.capability.id, provider]));
  }

  get(providerId = "mock-video"): VideoProvider {
    const provider = this.providersById.get(providerId);
    if (provider) {
      return provider;
    }

    throw new ProviderError({
      provider: providerId,
      code: "UNKNOWN_VIDEO_PROVIDER",
      message: `Unknown video provider: ${providerId}`,
      retryable: false,
    });
  }

  list(): VideoProvider[] {
    return [...this.providersById.values()];
  }
}

export function createVideoProviderRegistry(
  options: VideoProviderRegistryOptions = {},
): VideoProviderRegistry {
  const env = options.env ?? {};

  return new StaticVideoProviderRegistry([
    new MockVideoProvider(),
    new SeedanceProvider({
      apiKey: env.SEEDANCE_API_KEY ?? env.BYTEPLUS_API_KEY ?? env.ARK_API_KEY ?? env.MODELARK_API_KEY,
      baseUrl: options.seedanceBaseUrl,
      fetchImpl: options.fetchImpl,
    }),
    new HappyHorseProvider({
      apiKey: env.HAPPYHORSE_API_KEY ?? env.FAL_KEY ?? env.FAL_API_KEY ?? env.RUNWARE_API_KEY,
      baseUrl: options.falBaseUrl,
      fetchImpl: options.fetchImpl,
    }),
  ]);
}
