import { beforeEach, describe, expect, it, vi } from "vitest";

import { readAppConfig } from "../config/app-config";
import { PrismaService } from "../prisma/prisma.service";
import {
  buildImageProviderCatalog,
  buildVideoProviderCatalog,
  ProvidersService,
} from "./providers.service";

type ProviderConfigRow = {
  id: string;
  projectId: string;
  kind: "image" | "video";
  provider: string;
  enabled: boolean;
  displayName: string | null;
  defaultModel: string | null;
  paramsJson: unknown | null;
  secretJson: unknown | null;
  lastTestStatus: string | null;
  lastTestedAt: Date | string | null;
  lastTestModel: string | null;
  lastTestMessage: string | null;
};

type ProviderConfigWhere = {
  projectId_kind_provider: {
    projectId: string;
    kind: "image" | "video";
    provider: string;
  };
};

const VALID_PROGRAMMABLE_IMAGE_SOURCE = `
export default {
  id: "custom:atlas-cloud",
  kind: "image",
  displayName: "Atlas Cloud",
  description: "Programmable image provider",
  credentials: [{ key: "apiKey", label: "API Key", type: "password", required: true }],
  models: [{ id: "atlas-image-v1", displayName: "Atlas Image v1" }],
  defaultModel: "atlas-image-v1",
  supportedModes: ["text_to_image"],
  defaultAspectRatio: "16:9",
  supportedAspectRatios: ["16:9", "9:16"],
  parameters: [],
  image: {
    supportsReferenceImages: false,
    maxReferenceImages: 0,
    supportsMultipleOutputs: false,
    maxOutputs: 1,
    action: {
      request: {
        method: "POST",
        url: "https://api.example.test/images",
        headers: { Authorization: "Bearer {{credential.apiKey}}" },
        bodyJson: { prompt: "{{input.prompt}}", model: "{{input.model}}" },
      },
      output: { source: "url", path: "data.url", mimeType: "image/png" },
    },
  },
};
`;

function providerConfigKey(where: ProviderConfigWhere["projectId_kind_provider"]): string {
  return `${where.projectId}:${where.kind}:${where.provider}`;
}

function createPrismaMock() {
  const providerConfigs = new Map<string, ProviderConfigRow>();
  const programmableProviders = new Map<string, any>();
  const programmableVersions = new Map<string, any>();

  function programmableProviderKey(input: { projectId: string; kind: string; provider: string }): string {
    return `${input.projectId}:${input.kind}:${input.provider}`;
  }

  function programmableProviderWithVersions(row: any): any {
    const versions = Array.from(programmableVersions.values())
      .filter((version) => version.programmableProviderId === row.id)
      .sort((a, b) => b.version - a.version);
    return {
      ...row,
      versions,
    };
  }

  const prisma = {
    project: {
      findUnique: vi.fn(async () => ({ id: "project_1" })),
    },
    providerConfig: {
      findMany: vi.fn(async () => Array.from(providerConfigs.values())),
      findUnique: vi.fn(async (args: { where: ProviderConfigWhere }) => {
        const key = providerConfigKey(args.where.projectId_kind_provider);
        return providerConfigs.get(key) ?? null;
      }),
      upsert: vi.fn(async (args: {
        where: ProviderConfigWhere;
        create: Partial<ProviderConfigRow> & {
          projectId: string;
          kind: "image" | "video";
          provider: string;
        };
        update: Partial<ProviderConfigRow>;
      }) => {
        const key = providerConfigKey(args.where.projectId_kind_provider);
        const current = providerConfigs.get(key);
        const row: ProviderConfigRow = current
          ? {
              ...current,
              ...args.update,
            }
          : {
              id: `provider_config_${providerConfigs.size + 1}`,
              projectId: args.create.projectId,
              kind: args.create.kind,
              provider: args.create.provider,
              enabled: args.create.enabled ?? false,
              displayName: args.create.displayName ?? null,
              defaultModel: args.create.defaultModel ?? null,
              paramsJson: args.create.paramsJson ?? null,
              secretJson: args.create.secretJson ?? null,
              lastTestStatus: args.create.lastTestStatus ?? null,
              lastTestedAt: args.create.lastTestedAt ?? null,
              lastTestModel: args.create.lastTestModel ?? null,
              lastTestMessage: args.create.lastTestMessage ?? null,
            };
        providerConfigs.set(key, row);
        return row;
      }),
    },
    programmableProvider: {
      findMany: vi.fn(async (args?: any) => {
        let rows = Array.from(programmableProviders.values());
        if (args?.where?.projectId) {
          rows = rows.filter((row) => row.projectId === args.where.projectId);
        }
        if (args?.where?.activeVersionId?.not === null) {
          rows = rows.filter((row) => row.activeVersionId !== null);
        }
        return rows.map(programmableProviderWithVersions);
      }),
      findUnique: vi.fn(async (args: any) => {
        if (args.where?.id) {
          const row = programmableProviders.get(args.where.id);
          return row ? programmableProviderWithVersions(row) : null;
        }
        const key = programmableProviderKey(args.where.projectId_kind_provider);
        const row = programmableProviders.get(key);
        return row ? programmableProviderWithVersions(row) : null;
      }),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async (args: any) => {
        const id = `programmable_provider_${programmableProviders.size + 1}`;
        const row = {
          id,
          projectId: args.data.projectId,
          kind: args.data.kind,
          provider: args.data.provider,
          displayName: args.data.displayName,
          description: args.data.description ?? null,
          activeVersionId: args.data.activeVersionId ?? null,
          createdAt: new Date("2026-06-13T00:00:00.000Z"),
          updatedAt: new Date("2026-06-13T00:00:00.000Z"),
        };
        programmableProviders.set(programmableProviderKey(row), row);
        const createVersion = args.data.versions?.create;
        if (createVersion) {
          const version = {
            id: `programmable_version_${programmableVersions.size + 1}`,
            programmableProviderId: id,
            version: createVersion.version,
            sourceCode: createVersion.sourceCode,
            manifestJson: createVersion.manifestJson,
            status: createVersion.status,
            diagnosticsJson: createVersion.diagnosticsJson,
            createdAt: new Date("2026-06-13T00:00:00.000Z"),
          };
          programmableVersions.set(version.id, version);
        }
        return programmableProviderWithVersions(row);
      }),
      update: vi.fn(async (args: any) => {
        const row = Array.from(programmableProviders.values()).find((candidate) => candidate.id === args.where.id);
        if (!row) {
          throw new Error("Programmable provider not found");
        }
        Object.assign(row, args.data, { updatedAt: new Date("2026-06-13T00:00:00.000Z") });
        return programmableProviderWithVersions(row);
      }),
    },
    programmableProviderVersion: {
      findMany: vi.fn(async () => Array.from(programmableVersions.values())),
      findUnique: vi.fn(async (args: any) => programmableVersions.get(args.where.id) ?? null),
      create: vi.fn(async (args: any) => {
        const version = {
          id: `programmable_version_${programmableVersions.size + 1}`,
          programmableProviderId: args.data.programmableProviderId,
          version: args.data.version,
          sourceCode: args.data.sourceCode,
          manifestJson: args.data.manifestJson,
          status: args.data.status,
          diagnosticsJson: args.data.diagnosticsJson,
          createdAt: new Date("2026-06-13T00:00:00.000Z"),
        };
        programmableVersions.set(version.id, version);
        return version;
      }),
    },
  };

  return prisma;
}

describe("ProvidersService", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.stubEnv("OPENAI_API_KEY", "");
    vi.stubEnv("IMAGE2_API_KEY", "");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_API_KEY", "");
    vi.stubEnv("BANANA_API_KEY", "");
    vi.stubEnv("SEEDANCE_API_KEY", "");
    vi.stubEnv("BYTEPLUS_API_KEY", "");
    vi.stubEnv("ARK_API_KEY", "");
    vi.stubEnv("MODELARK_API_KEY", "");
    vi.stubEnv("HAPPYHORSE_API_KEY", "");
    vi.stubEnv("FAL_KEY", "");
    vi.stubEnv("FAL_API_KEY", "");
    vi.stubEnv("RUNWARE_API_KEY", "");
    vi.stubEnv("PROVIDER_CONFIG_ENCRYPTION_KEY", "provider-config-test-key");
    vi.stubEnv("WORKER_API_TOKEN", "worker-secret");
  });

  it("returns mock image enabled and real image providers disabled without keys", () => {
    const catalog = buildImageProviderCatalog(readAppConfig({}));

    expect(catalog.providers.map((provider) => provider.id)).toEqual([
      "mock-image",
      "image2",
      "banana",
      "generic-image",
    ]);
    expect(catalog.providers.find((provider) => provider.id === "mock-image")).toMatchObject({
      enabled: true,
      requiresApiKey: false,
    });
    expect(catalog.providers.find((provider) => provider.id === "image2")).toMatchObject({
      enabled: false,
      requiresApiKey: true,
      disabledReason: "Image 2 server-side key is not configured",
    });
    expect(catalog.providers.find((provider) => provider.id === "banana")).toMatchObject({
      enabled: false,
      requiresApiKey: true,
      disabledReason: "Nano Banana server-side key is not configured",
    });
    expect(catalog.providers.find((provider) => provider.id === "generic-image")).toMatchObject({
      enabled: false,
      requiresApiKey: true,
      defaultModel: "gpt-image-1",
    });
    expect(JSON.stringify(catalog)).not.toContain("API_KEY");
    expect(JSON.stringify(catalog)).not.toContain("sk-test");
  });

  it("enables real image providers when their server-side keys are configured", () => {
    const catalog = buildImageProviderCatalog(
      readAppConfig({
        OPENAI_API_KEY: "sk-test-openai",
        GEMINI_API_KEY: "sk-test-gemini",
      }),
    );

    expect(catalog.providers.find((provider) => provider.id === "image2")).toMatchObject({
      enabled: true,
      defaultModel: "gpt-image-2",
      supportsMultipleOutputs: true,
      maxOutputs: 4,
    });
    expect(catalog.providers.find((provider) => provider.id === "banana")).toMatchObject({
      enabled: true,
      defaultModel: "gemini-2.5-flash-image",
      supportsReferenceImages: true,
      maxReferenceImages: 3,
    });
    expect(JSON.stringify(catalog)).not.toContain("sk-test-openai");
    expect(JSON.stringify(catalog)).not.toContain("sk-test-gemini");
  });

  it("returns mock video enabled and real video providers disabled without keys", () => {
    const catalog = buildVideoProviderCatalog(readAppConfig({}));

    expect(catalog.providers.map((provider) => provider.id)).toEqual([
      "mock-video",
      "seedance",
      "happyhorse",
      "generic-video",
    ]);
    expect(catalog.providers.find((provider) => provider.id === "mock-video")).toMatchObject({
      enabled: true,
      requiresApiKey: false,
      supportedModes: ["image_to_video"],
    });
    expect(catalog.providers.find((provider) => provider.id === "seedance")).toMatchObject({
      enabled: false,
      requiresApiKey: true,
      disabledReason: "Seedance server-side key is not configured",
    });
    expect(catalog.providers.find((provider) => provider.id === "happyhorse")).toMatchObject({
      enabled: false,
      requiresApiKey: true,
      disabledReason: "Happy Horse server-side key is not configured",
    });
    expect(catalog.providers.find((provider) => provider.id === "generic-video")).toMatchObject({
      enabled: false,
      requiresApiKey: true,
      defaultModel: "video-model",
    });
    expect(JSON.stringify(catalog)).not.toContain("API_KEY");
    expect(JSON.stringify(catalog)).not.toContain("sk-test");
  });

  it("enables real video providers when their server-side keys are configured", () => {
    const catalog = buildVideoProviderCatalog(
      readAppConfig({
        SEEDANCE_API_KEY: "sk-test-seedance",
        FAL_KEY: "sk-test-fal",
      }),
    );

    expect(catalog.providers.find((provider) => provider.id === "seedance")).toMatchObject({
      enabled: true,
      defaultModel: "seedance-1-0-pro",
      supportsCancel: true,
      supportedResolutions: ["720p", "1080p"],
    });
    expect(catalog.providers.find((provider) => provider.id === "happyhorse")).toMatchObject({
      enabled: true,
      defaultModel: "alibaba/happy-horse/image-to-video",
      supportedModes: ["image_to_video"],
    });
    expect(JSON.stringify(catalog)).not.toContain("sk-test-seedance");
    expect(JSON.stringify(catalog)).not.toContain("sk-test-fal");
  });

  it("returns project-scoped management metadata without exposing stored credentials", async () => {
    const prisma = createPrismaMock();
    const service = new ProvidersService(prisma as unknown as PrismaService);

    const initial = await service.getProviderManagement("project_1");
    expect(initial.image.find((provider) => provider.id === "mock-image")).toMatchObject({
      enabled: true,
      credentialConfigured: true,
    });
    expect(initial.image.find((provider) => provider.id === "image2")).toMatchObject({
      enabled: false,
      credentialConfigured: false,
      disabledReason: "Image 2 server-side key is not configured",
    });

    const updated = await service.updateProviderConfig("project_1", "image", "image2", {
      enabled: true,
      defaultModel: "gpt-image-2",
      params: {
        protocol: "openai_compatible",
        baseUrl: "https://api.example.test",
        safeParams: {
          quality: "medium",
          apiKey: "should-be-trimmed-by-shared-normalizer",
        },
      },
      credential: { action: "set", value: "sk-secret-provider-key" },
    });

    expect(updated.provider).toMatchObject({
      id: "image2",
      enabled: true,
      configuredEnabled: true,
      credentialConfigured: true,
      credentialSource: "stored",
      defaultModel: "gpt-image-2",
      params: {
        protocol: "openai_compatible",
        baseUrl: "https://api.example.test",
        safeParams: {
          quality: "medium",
        },
      },
    });
    expect(JSON.stringify(updated)).not.toContain("sk-secret-provider-key");

    const projectCatalog = await service.getProjectImageProviders("project_1");
    expect(projectCatalog.providers.find((provider) => provider.id === "image2")).toMatchObject({
      enabled: true,
      defaultModel: "gpt-image-2",
    });
    expect(JSON.stringify(projectCatalog)).not.toContain("credentialSource");
    expect(JSON.stringify(projectCatalog)).not.toContain("sk-secret-provider-key");

    const runtime = await service.getRuntimeProviderConfig(
      "project_1",
      "image",
      "image2",
      "worker-secret",
    );
    expect(runtime.env).toEqual({
      IMAGE2_API_KEY: "sk-secret-provider-key",
      OPENAI_API_KEY: "sk-secret-provider-key",
    });
  });

  it("requires the worker token before returning stored provider credentials", async () => {
    const prisma = createPrismaMock();
    const service = new ProvidersService(prisma as unknown as PrismaService);

    await service.updateProviderConfig("project_1", "image", "image2", {
      enabled: true,
      defaultModel: "gpt-image-2",
      credential: { action: "set", value: "sk-secret-provider-key" },
    });

    await expect(
      service.getRuntimeProviderConfig("project_1", "image", "image2", "wrong-token"),
    ).rejects.toThrow("Worker runtime config token is invalid");
  });

  it("rejects project provider defaults that are not in the provider catalog", async () => {
    const prisma = createPrismaMock();
    const service = new ProvidersService(prisma as unknown as PrismaService);

    await expect(
      service.updateProviderConfig("project_1", "video", "seedance", {
        defaultModel: "seedance-not-real",
      }),
    ).rejects.toThrow("Model seedance-not-real is not available for Seedance");
    expect(prisma.providerConfig.upsert).not.toHaveBeenCalled();
  });

  it("records failed provider tests when credentials are missing", async () => {
    const prisma = createPrismaMock();
    const service = new ProvidersService(prisma as unknown as PrismaService);

    const result = await service.testProviderConfig("project_1", "video", "seedance", {
      model: "seedance-1-0-lite",
    });

    expect(result).toMatchObject({
      kind: "video",
      provider: "seedance",
      status: "failed",
      model: "seedance-1-0-lite",
      credentialConfigured: false,
      message: "Missing provider credential for Seedance",
    });
    expect(prisma.providerConfig.upsert).toHaveBeenCalledTimes(1);

    const management = await service.getProviderManagement("project_1");
    expect(management.video.find((provider) => provider.id === "seedance")?.lastTest).toMatchObject({
      status: "failed",
      model: "seedance-1-0-lite",
      message: "Missing provider credential for Seedance",
    });
  });

  it("discovers temporary OpenAI-compatible models without persisting secrets", async () => {
    const prisma = createPrismaMock();
    const service = new ProvidersService(prisma as unknown as PrismaService);
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: [
            { id: "gpt-image-1" },
            { id: "seedance-1-0-pro" },
            { id: "gpt-4.1-mini" },
          ],
        }),
        { headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await service.discoverModels("project_1", {
      kind: "image",
      provider: "generic-image",
      protocol: "openai_compatible",
      baseUrl: "https://api.example.test",
      credential: { source: "temporary", value: "sk-temporary-key" },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.test/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer sk-temporary-key" }),
        redirect: "manual",
      }),
    );
    expect(result).toEqual({
      ok: true,
      detectedProtocol: "openai_compatible",
      message: "Model endpoint reachable",
      modelGroups: {
        image: ["gpt-image-1"],
        video: ["seedance-1-0-pro"],
        chat: ["gpt-4.1-mini"],
      },
      rawCount: 3,
    });
    expect(JSON.stringify(result)).not.toContain("sk-temporary-key");
    expect(prisma.providerConfig.upsert).not.toHaveBeenCalled();
  });

  it("maps HTML model discovery responses to a safe API base URL error", async () => {
    const prisma = createPrismaMock();
    const service = new ProvidersService(prisma as unknown as PrismaService);
    vi.stubGlobal("fetch", vi.fn(async () =>
      new Response("<html>login</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    ));

    const result = await service.discoverModels("project_1", {
      kind: "image",
      protocol: "openai_compatible",
      baseUrl: "https://example.test/login",
      credential: { source: "temporary", value: "sk-temporary-key" },
    });

    expect(result).toMatchObject({
      ok: false,
      detectedProtocol: "openai_compatible",
      message: "Base URL returned HTML; use an API endpoint",
      rawCount: 0,
    });
    expect(JSON.stringify(result)).not.toContain("<html>");
    expect(JSON.stringify(result)).not.toContain("sk-temporary-key");
  });

  it("allows mock provider tests without credentials", async () => {
    const prisma = createPrismaMock();
    const service = new ProvidersService(prisma as unknown as PrismaService);

    const result = await service.testProviderConfig("project_1", "image", "mock-image", {});

    expect(result).toMatchObject({
      kind: "image",
      provider: "mock-image",
      status: "succeeded",
      model: "mock-image-v1",
      credentialConfigured: true,
      message: "Mock Image is configured for mock-image-v1",
    });
  });

  it("creates programmable providers as inactive validated versions without leaking secrets", async () => {
    const prisma = createPrismaMock();
    const service = new ProvidersService(prisma as unknown as PrismaService);

    const result = await service.createProgrammableProvider("project_1", {
      sourceCode: VALID_PROGRAMMABLE_IMAGE_SOURCE,
    });

    expect(result.provider).toMatchObject({
      kind: "image",
      provider: "custom:atlas-cloud",
      displayName: "Atlas Cloud",
      activeVersionId: undefined,
      enabled: false,
      credentialConfigured: false,
      versions: [
        {
          version: 1,
          status: "valid",
          active: false,
          diagnostics: [],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("sk-secret-provider-key");
    expect(JSON.stringify(result)).not.toContain("Authorization");
  });

  it("activates programmable providers, stores credentials through ProviderConfig, and gates runtime config", async () => {
    const prisma = createPrismaMock();
    const service = new ProvidersService(prisma as unknown as PrismaService);
    const created = await service.createProgrammableProvider("project_1", {
      sourceCode: VALID_PROGRAMMABLE_IMAGE_SOURCE,
    });
    const versionId = created.provider.versions[0]?.id;
    expect(versionId).toBeTruthy();

    const activated = await service.activateProgrammableProviderVersion(
      "project_1",
      "image",
      "custom:atlas-cloud",
      versionId ?? "",
    );
    expect(activated.provider).toMatchObject({
      activeVersionId: versionId,
      enabled: true,
      credentialConfigured: false,
      versions: [
        expect.objectContaining({
          id: versionId,
          active: true,
        }),
      ],
    });

    const uncredentialedManagement = await service.getProviderManagement("project_1");
    expect(uncredentialedManagement.image.find((provider) => provider.id === "custom:atlas-cloud")).toMatchObject({
      enabled: false,
      configuredEnabled: true,
      credentialConfigured: false,
      disabledReason: "Atlas Cloud server-side key is not configured",
    });

    await service.updateProviderConfig("project_1", "image", "custom:atlas-cloud", {
      enabled: true,
      defaultModel: "atlas-image-v1",
      credential: { action: "set", value: "sk-secret-provider-key" },
    });

    const management = await service.getProviderManagement("project_1");
    expect(management.image.find((provider) => provider.id === "custom:atlas-cloud")).toMatchObject({
      displayName: "Atlas Cloud",
      enabled: true,
      credentialConfigured: true,
      credentialSource: "stored",
      defaultModel: "atlas-image-v1",
    });
    expect(JSON.stringify(management)).not.toContain("sk-secret-provider-key");

    const projectCatalog = await service.getProjectImageProviders("project_1");
    expect(projectCatalog.providers.find((provider) => provider.id === "custom:atlas-cloud")).toMatchObject({
      enabled: true,
      defaultModel: "atlas-image-v1",
      models: [{ id: "atlas-image-v1", displayName: "Atlas Image v1", default: true }],
    });
    expect(JSON.stringify(projectCatalog)).not.toContain("credentialSource");
    expect(JSON.stringify(projectCatalog)).not.toContain("sk-secret-provider-key");

    await expect(
      service.getRuntimeProviderConfig("project_1", "image", "custom:atlas-cloud", "wrong-token"),
    ).rejects.toThrow("Worker runtime config token is invalid");

    const runtime = await service.getRuntimeProviderConfig(
      "project_1",
      "image",
      "custom:atlas-cloud",
      "worker-secret",
    );
    expect(runtime.env).toEqual({});
    expect(runtime.programmableProvider).toMatchObject({
      versionId,
      manifest: {
        id: "custom:atlas-cloud",
        kind: "image",
        displayName: "Atlas Cloud",
      },
      credentials: {
        apiKey: "sk-secret-provider-key",
      },
    });
  });

  it("keeps the active programmable version when a new source update is invalid", async () => {
    const prisma = createPrismaMock();
    const service = new ProvidersService(prisma as unknown as PrismaService);
    const created = await service.createProgrammableProvider("project_1", {
      sourceCode: VALID_PROGRAMMABLE_IMAGE_SOURCE,
    });
    const versionId = created.provider.versions[0]?.id ?? "";
    await service.activateProgrammableProviderVersion("project_1", "image", "custom:atlas-cloud", versionId);

    const result = await service.updateProgrammableProviderSource("project_1", "image", "custom:atlas-cloud", {
      sourceCode: VALID_PROGRAMMABLE_IMAGE_SOURCE.replace(
        'url: "https://api.example.test/images"',
        'url: fetch("https://api.example.test/images")',
      ),
    });

    expect(result.provider.activeVersionId).toBe(versionId);
    expect(result.provider.versions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ version: 1, status: "valid", active: true }),
        expect.objectContaining({
          version: 2,
          status: "invalid",
          active: false,
          diagnostics: expect.arrayContaining([
            expect.objectContaining({ message: expect.stringContaining("Call expressions are not allowed") }),
          ]),
        }),
      ]),
    );
  });

  it("can roll back programmable providers by activating an earlier valid version", async () => {
    const prisma = createPrismaMock();
    const service = new ProvidersService(prisma as unknown as PrismaService);
    const created = await service.createProgrammableProvider("project_1", {
      sourceCode: VALID_PROGRAMMABLE_IMAGE_SOURCE,
    });
    const version1Id = created.provider.versions[0]?.id ?? "";

    const updated = await service.updateProgrammableProviderSource("project_1", "image", "custom:atlas-cloud", {
      sourceCode: VALID_PROGRAMMABLE_IMAGE_SOURCE.replace("Atlas Cloud", "Atlas Cloud Next"),
    });
    const version2Id = updated.provider.versions.find((version) => version.version === 2)?.id ?? "";
    await service.activateProgrammableProviderVersion("project_1", "image", "custom:atlas-cloud", version2Id);
    const rolledBack = await service.activateProgrammableProviderVersion(
      "project_1",
      "image",
      "custom:atlas-cloud",
      version1Id,
    );

    expect(rolledBack.provider).toMatchObject({
      activeVersionId: version1Id,
      displayName: "Atlas Cloud",
    });
    expect(rolledBack.provider.versions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: version1Id, active: true }),
        expect.objectContaining({ id: version2Id, active: false }),
      ]),
    );
  });

  it("records programmable provider tests as safe config checks when credentials are missing", async () => {
    const prisma = createPrismaMock();
    const service = new ProvidersService(prisma as unknown as PrismaService);
    const created = await service.createProgrammableProvider("project_1", {
      sourceCode: VALID_PROGRAMMABLE_IMAGE_SOURCE,
    });
    await service.activateProgrammableProviderVersion(
      "project_1",
      "image",
      "custom:atlas-cloud",
      created.provider.versions[0]?.id ?? "",
    );
    vi.mocked(prisma.providerConfig.upsert).mockClear();

    const result = await service.testProviderConfig("project_1", "image", "custom:atlas-cloud", {
      model: "atlas-image-v1",
    });

    expect(result).toMatchObject({
      kind: "image",
      provider: "custom:atlas-cloud",
      status: "failed",
      model: "atlas-image-v1",
      credentialConfigured: false,
      message: "Missing provider credential for Atlas Cloud",
    });
    expect(prisma.providerConfig.upsert).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain("sk-secret-provider-key");
  });
});
