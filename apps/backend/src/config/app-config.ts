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
  realProviderKeysConfigured: {
    llm: boolean;
    image: boolean;
    video: boolean;
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
    realProviderKeysConfigured: {
      llm: Boolean(env.LLM_API_KEY),
      image: Boolean(env.IMAGE_API_KEY),
      video: Boolean(env.VIDEO_API_KEY),
    },
  };
}
