import type { ImageProvider } from "./contracts";
import { ProviderError } from "./contracts";
import { MockImageProvider } from "./mock-providers";
import { BananaProvider, Image2Provider, type RealImageProviderOptions } from "./real-image-providers";

export interface ImageProviderRegistry {
  get(providerId?: string): ImageProvider;
  list(): ImageProvider[];
}

export interface ImageProviderRegistryOptions {
  env?: Record<string, string | undefined>;
  fetchImpl?: RealImageProviderOptions["fetchImpl"];
  openAiBaseUrl?: string;
  geminiBaseUrl?: string;
}

class StaticImageProviderRegistry implements ImageProviderRegistry {
  private readonly providersById: Map<string, ImageProvider>;

  constructor(providers: ImageProvider[]) {
    this.providersById = new Map(providers.map((provider) => [provider.capability.id, provider]));
  }

  get(providerId = "mock-image"): ImageProvider {
    const provider = this.providersById.get(providerId);
    if (provider) {
      return provider;
    }

    throw new ProviderError({
      provider: providerId,
      code: "UNKNOWN_IMAGE_PROVIDER",
      message: `Unknown image provider: ${providerId}`,
      retryable: false,
    });
  }

  list(): ImageProvider[] {
    return [...this.providersById.values()];
  }
}

export function createImageProviderRegistry(
  options: ImageProviderRegistryOptions = {},
): ImageProviderRegistry {
  const env = options.env ?? {};

  return new StaticImageProviderRegistry([
    new MockImageProvider(),
    new Image2Provider({
      apiKey: env.OPENAI_API_KEY ?? env.IMAGE2_API_KEY,
      baseUrl: options.openAiBaseUrl,
      fetchImpl: options.fetchImpl,
    }),
    new BananaProvider({
      apiKey: env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY ?? env.BANANA_API_KEY,
      baseUrl: options.geminiBaseUrl,
      fetchImpl: options.fetchImpl,
    }),
  ]);
}
