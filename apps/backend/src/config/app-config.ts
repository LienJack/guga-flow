export interface AppConfig {
  port: number;
  corsAllowedOrigins: string[];
  databaseUrl: string;
  redisUrl: string;
  assetStorageDir: string;
  uploadStorageDir: string;
  exportStorageDir: string;
  llmProvider: string;
  llmModel: string;
  imageProvider: string;
  videoProvider: string;
  localEditorUrl?: string;
  workerConcurrency: number;
  providerConfigEncryptionKey?: string;
  workerApiToken?: string;
  sessionSecret: string;
  sessionTtlSeconds: number;
  defaultAdminEmail: string;
  defaultAdminPassword: string;
  realProviderKeysConfigured: {
    llm: boolean;
    image: boolean;
    video: boolean;
  };
  llmProviderKeysConfigured: {
    generic: boolean;
    gemini: boolean;
    anthropic: boolean;
    ark: boolean;
  };
  imageProviderKeysConfigured: {
    image2: boolean;
    banana: boolean;
  };
  videoProviderKeysConfigured: {
    seedance: boolean;
    happyhorse: boolean;
  };
}

const DEFAULT_DATABASE_URL = "postgresql://admin:admin@localhost:5432/guga_flow";

function readNumber(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}

function readList(value: string | undefined, fallback: string[]): string[] {
  if (!value) {
    return fallback;
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function readAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const genericLlmKeyConfigured = Boolean(env.LLM_API_KEY || env.OPENAI_API_KEY);
  const geminiLlmKeyConfigured = Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY);
  const anthropicLlmKeyConfigured = Boolean(env.ANTHROPIC_API_KEY);
  const arkLlmKeyConfigured = Boolean(env.ARK_API_KEY || env.MODELARK_API_KEY);
  const image2KeyConfigured = Boolean(env.OPENAI_API_KEY || env.IMAGE2_API_KEY);
  const bananaKeyConfigured = Boolean(env.GEMINI_API_KEY || env.GOOGLE_API_KEY || env.BANANA_API_KEY);
  const seedanceKeyConfigured = Boolean(
    env.SEEDANCE_API_KEY || env.BYTEPLUS_API_KEY || env.ARK_API_KEY || env.MODELARK_API_KEY,
  );
  const happyhorseKeyConfigured = Boolean(
    env.HAPPYHORSE_API_KEY || env.FAL_KEY || env.FAL_API_KEY || env.RUNWARE_API_KEY,
  );

  return {
    port: readNumber("PORT", env.PORT, 3002),
    corsAllowedOrigins: readList(env.CORS_ALLOWED_ORIGINS, [
      "http://localhost:3000",
      "http://localhost:3001",
    ]),
    databaseUrl: env.DATABASE_URL || DEFAULT_DATABASE_URL,
    redisUrl: env.REDIS_URL || "redis://localhost:6379",
    assetStorageDir: env.ASSET_STORAGE_DIR || "data/assets",
    uploadStorageDir: env.UPLOAD_STORAGE_DIR || "data/uploads",
    exportStorageDir: env.EXPORT_STORAGE_DIR || "data/exports",
    llmProvider: env.LLM_PROVIDER || "mock",
    llmModel: env.LLM_MODEL || "mock-storyboard",
    imageProvider: env.IMAGE_PROVIDER || "mock-image",
    videoProvider: env.VIDEO_PROVIDER || "mock-video",
    localEditorUrl: env.LOCAL_EDITOR_URL || undefined,
    workerConcurrency: readNumber("WORKER_CONCURRENCY", env.WORKER_CONCURRENCY, 2),
    providerConfigEncryptionKey: env.PROVIDER_CONFIG_ENCRYPTION_KEY || undefined,
    workerApiToken: env.WORKER_API_TOKEN || undefined,
    sessionSecret: env.AUTH_SESSION_SECRET || env.SESSION_SECRET || "guga-flow-dev-session-secret",
    sessionTtlSeconds: readNumber("AUTH_SESSION_TTL_SECONDS", env.AUTH_SESSION_TTL_SECONDS, 60 * 60 * 24 * 7),
    defaultAdminEmail: env.DEFAULT_ADMIN_EMAIL || "admin@guga-flow.local",
    defaultAdminPassword: env.DEFAULT_ADMIN_PASSWORD || "guga-flow-dev",
    realProviderKeysConfigured: {
      llm: genericLlmKeyConfigured || geminiLlmKeyConfigured || anthropicLlmKeyConfigured || arkLlmKeyConfigured,
      image: Boolean(env.IMAGE_API_KEY || image2KeyConfigured || bananaKeyConfigured),
      video: Boolean(env.VIDEO_API_KEY || seedanceKeyConfigured || happyhorseKeyConfigured),
    },
    llmProviderKeysConfigured: {
      generic: genericLlmKeyConfigured,
      gemini: geminiLlmKeyConfigured,
      anthropic: anthropicLlmKeyConfigured,
      ark: arkLlmKeyConfigured,
    },
    imageProviderKeysConfigured: {
      image2: image2KeyConfigured,
      banana: bananaKeyConfigured,
    },
    videoProviderKeysConfigured: {
      seedance: seedanceKeyConfigured,
      happyhorse: happyhorseKeyConfigured,
    },
  };
}
