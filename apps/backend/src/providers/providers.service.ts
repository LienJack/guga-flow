import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type {
  ImageProviderCatalogItem,
  ImageProviderCatalogResult,
  ImageProviderId,
  ImageProviderManagementItem,
  ManagedProviderKind,
  ManagedProviderId,
  ProgrammableProviderDefinitionResult,
  ProgrammableProviderDefinitionSummary,
  ProgrammableProviderId,
  ProgrammableProviderManifest,
  ProgrammableProviderRuntimeConfig,
  ProgrammableProviderValidationDiagnostic,
  ProgrammableProviderVersionStatus,
  ProviderConnectionTestResult,
  ProviderConnectionTestSummary,
  ProviderCredentialSource,
  ProviderConfigParams,
  ProviderConfigUpdateResult,
  ProviderManagementItem,
  ProviderManagementResult,
  ProviderModelDiscoveryResult,
  ProviderProtocol,
  ProviderRuntimeConfig,
  UpdateProviderConfigInput,
  VideoProviderCatalogItem,
  VideoProviderCatalogResult,
  VideoProviderId,
  VideoProviderManagementItem,
} from "@guga-flow/shared-types";
import {
  managedProviderId,
  managedProviderKind,
  normalizeProviderConnectionTestInput,
  normalizeProviderModelDiscoveryInput,
  normalizeUpdateProviderConfigInput,
  programmableProviderId,
} from "@guga-flow/shared-types";
import { parseProgrammableProviderManifestSource } from "@guga-flow/provider-contracts";

import type { AppConfig } from "../config/app-config";
import { readAppConfig } from "../config/app-config";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type ProviderConfigModel = {
  id: string;
  projectId: string;
  kind: string;
  provider: string;
  enabled: boolean;
  displayName: string | null;
  defaultModel: string | null;
  paramsJson: unknown | null;
  secretJson?: unknown | null;
  lastTestStatus?: string | null;
  lastTestedAt?: Date | string | null;
  lastTestModel?: string | null;
  lastTestMessage?: string | null;
};

type ProgrammableProviderVersionModel = {
  id: string;
  programmableProviderId: string;
  version: number;
  sourceCode: string;
  manifestJson: unknown | null;
  status: string;
  diagnosticsJson: unknown;
  createdAt: Date | string;
};

type ProgrammableProviderModel = {
  id: string;
  projectId: string;
  kind: string;
  provider: string;
  displayName: string;
  description: string | null;
  activeVersionId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  versions?: ProgrammableProviderVersionModel[];
};

type ProgrammableProviderDelegate = {
  findMany(args?: unknown): Promise<unknown[]>;
  findUnique(args: unknown): Promise<unknown | null>;
  findFirst(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
};

type ProgrammableProviderVersionDelegate = {
  findMany(args?: unknown): Promise<unknown[]>;
  findUnique(args: unknown): Promise<unknown | null>;
  create(args: unknown): Promise<unknown>;
};

type PrismaWithProgrammableProviders = PrismaService & {
  programmableProvider: ProgrammableProviderDelegate;
  programmableProviderVersion: ProgrammableProviderVersionDelegate;
};

type ProviderMetadata = ImageProviderCatalogItem | VideoProviderCatalogItem;

type SecretEnvelope = {
  v: 1;
  alg: "aes-256-gcm";
  iv: string;
  tag: string;
  data: string;
};

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
      supportedModes: ["text_to_image", "image_to_image", "multi_reference"],
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
    {
      id: "generic-image",
      displayName: "Generic Image Provider",
      enabled: false,
      disabledReason: disabledReason("Generic Image Provider"),
      requiresApiKey: true,
      defaultModel: "gpt-image-1",
      models: [{ id: "gpt-image-1", displayName: "GPT Image compatible", default: true }],
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
    {
      id: "generic-video",
      displayName: "Generic Video Provider",
      enabled: false,
      disabledReason: disabledReason("Generic Video Provider"),
      requiresApiKey: true,
      defaultModel: "video-model",
      models: [{ id: "video-model", displayName: "Video model", default: true }],
      supportedModes: ["text_to_video", "image_to_video", "reference_to_video"],
      supportsFirstFrame: true,
      supportsLastFrame: true,
      supportsReferenceImages: true,
      maxReferenceImages: 4,
      supportsCancel: false,
      defaultDurationSeconds: 5,
      supportedDurationSeconds: [4, 5, 6, 8, 10],
      defaultResolution: "720p",
      supportedResolutions: ["720p", "1080p"],
      defaultAspectRatio: "16:9",
      supportedAspectRatios: ["9:16", "16:9", "1:1"],
      parameters: [],
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
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getImageProviders(): ImageProviderCatalogResult {
    return buildImageProviderCatalog(readAppConfig());
  }

  getVideoProviders(): VideoProviderCatalogResult {
    return buildVideoProviderCatalog(readAppConfig());
  }

  async listProgrammableProviders(projectId: string): Promise<{ providers: ProgrammableProviderDefinitionSummary[] }> {
    await this.ensureProject(projectId);
    const rows = await this.programmablePrisma().programmableProvider.findMany({
      where: { projectId },
      include: { versions: { orderBy: { version: "desc" } } },
      orderBy: { createdAt: "desc" },
    }) as ProgrammableProviderModel[];
    const configs = await this.providerConfigs(projectId);
    return {
      providers: rows.map((row) => this.toProgrammableProviderSummary(row, configs.get(configKey(row.kind, row.provider)))),
    };
  }

  async createProgrammableProvider(
    projectId: string,
    input: { sourceCode: string },
  ): Promise<ProgrammableProviderDefinitionResult> {
    await this.ensureProject(projectId);
    const parsed = parseProgrammableProviderManifestSource(input.sourceCode);
    if (!parsed.success) {
      throw new BadRequestException(programmableDiagnosticsMessage(parsed.diagnostics));
    }
    const manifest = parsed.manifest;
    const existing = await this.programmablePrisma().programmableProvider.findUnique({
      where: {
        projectId_kind_provider: {
          projectId,
          kind: manifest.kind,
          provider: manifest.id,
        },
      },
    });
    if (existing) {
      throw new BadRequestException(`Programmable provider ${manifest.id} already exists`);
    }

    const row = await this.programmablePrisma().programmableProvider.create({
      data: {
        projectId,
        kind: manifest.kind,
        provider: manifest.id,
        displayName: manifest.displayName,
        description: manifest.description,
        versions: {
          create: {
            version: 1,
            sourceCode: input.sourceCode,
            manifestJson: manifest as unknown as Prisma.InputJsonValue,
            status: "valid",
            diagnosticsJson: [],
          },
        },
      },
      include: { versions: { orderBy: { version: "desc" } } },
    }) as ProgrammableProviderModel;

    return { provider: this.toProgrammableProviderSummary(row) };
  }

  async updateProgrammableProviderSource(
    projectId: string,
    kindValue: string,
    providerValue: string,
    input: { sourceCode: string },
  ): Promise<ProgrammableProviderDefinitionResult> {
    await this.ensureProject(projectId);
    const kind = this.requireManagedKind(kindValue);
    const providerId = this.requireProgrammableProviderId(providerValue);
    const existing = await this.requireProgrammableProvider(projectId, kind, providerId);
    const nextVersion = Math.max(0, ...(existing.versions ?? []).map((version) => version.version)) + 1;
    const parsed = parseProgrammableProviderManifestSource(input.sourceCode);
    const status: ProgrammableProviderVersionStatus = parsed.success ? "valid" : "invalid";
    const manifest = parsed.success ? parsed.manifest : undefined;
    if (manifest && (manifest.kind !== kind || manifest.id !== providerId)) {
      throw new BadRequestException("Updated programmable provider source must keep the same kind and id");
    }
    await this.programmablePrisma().programmableProviderVersion.create({
      data: {
        programmableProviderId: existing.id,
        version: nextVersion,
        sourceCode: input.sourceCode,
        manifestJson: manifest ? manifest as unknown as Prisma.InputJsonValue : Prisma.JsonNull,
        status,
        diagnosticsJson: parsed.success ? [] : parsed.diagnostics as unknown as Prisma.InputJsonValue,
      },
    });
    if (manifest) {
      await this.programmablePrisma().programmableProvider.update({
        where: { id: existing.id },
        data: {
          displayName: manifest.displayName,
          description: manifest.description,
        },
      });
    }

    return {
      provider: this.toProgrammableProviderSummary(
        await this.requireProgrammableProvider(projectId, kind, providerId),
      ),
    };
  }

  async activateProgrammableProviderVersion(
    projectId: string,
    kindValue: string,
    providerValue: string,
    versionId: string,
  ): Promise<ProgrammableProviderDefinitionResult> {
    await this.ensureProject(projectId);
    const kind = this.requireManagedKind(kindValue);
    const providerId = this.requireProgrammableProviderId(providerValue);
    const provider = await this.requireProgrammableProvider(projectId, kind, providerId);
    const version = (provider.versions ?? []).find((candidate) => candidate.id === versionId);
    if (!version) {
      throw new NotFoundException("Programmable provider version not found");
    }
    if (version.status !== "valid" || !isProgrammableManifest(version.manifestJson)) {
      throw new BadRequestException("Only valid programmable provider versions can be activated");
    }
    await this.programmablePrisma().programmableProvider.update({
      where: { id: provider.id },
      data: { activeVersionId: version.id },
    });
    await this.prisma.providerConfig.upsert({
      where: {
        projectId_kind_provider: {
          projectId,
          kind,
          provider: providerId,
        },
      },
      create: {
        projectId,
        kind,
        provider: providerId,
        enabled: true,
        displayName: version.manifestJson.displayName,
        defaultModel: version.manifestJson.defaultModel,
      },
      update: {
        enabled: true,
        displayName: version.manifestJson.displayName,
        defaultModel: version.manifestJson.defaultModel,
      },
    });

    return {
      provider: this.toProgrammableProviderSummary(
        await this.requireProgrammableProvider(projectId, kind, providerId),
        await this.providerConfig(projectId, kind, providerId),
      ),
    };
  }

  async disableProgrammableProvider(
    projectId: string,
    kindValue: string,
    providerValue: string,
  ): Promise<ProgrammableProviderDefinitionResult> {
    await this.ensureProject(projectId);
    const kind = this.requireManagedKind(kindValue);
    const providerId = this.requireProgrammableProviderId(providerValue);
    const provider = await this.requireProgrammableProvider(projectId, kind, providerId);
    await this.prisma.providerConfig.upsert({
      where: {
        projectId_kind_provider: {
          projectId,
          kind,
          provider: providerId,
        },
      },
      create: {
        projectId,
        kind,
        provider: providerId,
        enabled: false,
        displayName: provider.displayName,
      },
      update: {
        enabled: false,
      },
    });
    return {
      provider: this.toProgrammableProviderSummary(
        await this.requireProgrammableProvider(projectId, kind, providerId),
        await this.providerConfig(projectId, kind, providerId),
      ),
    };
  }

  async getProjectImageProviders(projectId: string): Promise<ImageProviderCatalogResult> {
    const result = await this.getProviderManagement(projectId);
    return {
      providers: result.image.map(stripImageManagementMetadata),
    };
  }

  async getProjectVideoProviders(projectId: string): Promise<VideoProviderCatalogResult> {
    const result = await this.getProviderManagement(projectId);
    return {
      providers: result.video.map(stripVideoManagementMetadata),
    };
  }

  async getProviderManagement(projectId: string): Promise<ProviderManagementResult> {
    await this.ensureProject(projectId);
    const config = readAppConfig();
    const rows = await this.providerConfigs(projectId);
    const programmable = await this.activeProgrammableProviderMetadata(projectId);
    return {
      image: [...imageProviderCatalog(config), ...programmable.image].map((provider) =>
        this.toImageManagementItem(provider, rows.get(configKey("image", provider.id)), config),
      ),
      video: [...videoProviderCatalog(config), ...programmable.video].map((provider) =>
        this.toVideoManagementItem(provider, rows.get(configKey("video", provider.id)), config),
      ),
    };
  }

  async discoverModels(projectId: string, input: unknown): Promise<ProviderModelDiscoveryResult> {
    await this.ensureProject(projectId);
    const normalized = normalizeProviderModelDiscoveryInput(input);
    const protocol = normalized.protocol ?? "openai_compatible";
    if (protocol === "mock") {
      return mockDiscoveryResult(normalized.kind);
    }

    const saved = normalized.provider
      ? await this.providerConfig(projectId, normalized.kind, normalized.provider)
      : undefined;
    const savedParams = providerConfigParams(saved?.paramsJson);
    const baseUrl = normalized.baseUrl ?? savedParams?.baseUrl;
    if (!baseUrl) {
      throw new BadRequestException("Provider base URL is required for model discovery");
    }
    const safeBaseUrl = parseHttpBaseUrl(baseUrl);
    const credential = normalized.credential?.value
      ?? (saved?.secretJson ? unsealSecret(saved.secretJson, readAppConfig()) : undefined);
    if (!credential) {
      throw new BadRequestException("server-side key is not configured");
    }

    const response = await fetch(modelDiscoveryUrl(safeBaseUrl, protocol), {
      headers: modelDiscoveryHeaders(credential, protocol),
      redirect: "manual",
    });
    const text = await response.text();
    if (isRedirectStatus(response.status)) {
      return failedDiscovery(protocol, response.status, "Base URL appears to redirect; use an API base URL");
    }
    if (looksLikeHtml(text, response.headers.get("content-type"))) {
      return failedDiscovery(protocol, response.status, "Base URL returned HTML; use an API endpoint");
    }
    if (response.status === 401 || response.status === 403) {
      return failedDiscovery(protocol, response.status, "API key is invalid or unauthorized");
    }
    if (!response.ok) {
      return failedDiscovery(protocol, response.status, `Model discovery failed with ${response.status}`);
    }

    const json = parseJson(text);
    const modelIds = extractModelIds(json);
    const modelGroups = groupModelIds(modelIds);
    return {
      ok: true,
      detectedProtocol: protocol,
      message: modelIds.length ? "Model endpoint reachable" : "Model endpoint reachable, but no models were returned",
      modelGroups,
      rawCount: modelIds.length,
    };
  }

  async updateProviderConfig(
    projectId: string,
    kindValue: string,
    providerValue: string,
    input: unknown,
  ): Promise<ProviderConfigUpdateResult> {
    await this.ensureProject(projectId);
    const kind = this.requireManagedKind(kindValue);
    const providerId = this.requireManagedProviderId(kind, providerValue);
    const metadata = await this.requireMetadata(projectId, kind, providerId);
    const normalized = normalizeUpdateProviderConfigInput(input);
    const defaultModel = normalized.defaultModel ?? undefined;
    if (defaultModel && !metadata.models.some((model) => model.id === defaultModel) && !isGenericProvider(providerId)) {
      throw new BadRequestException(`Model ${defaultModel} is not available for ${metadata.displayName}`);
    }

    const current = await this.prisma.providerConfig.findUnique({
      where: {
        projectId_kind_provider: {
          projectId,
          kind,
          provider: providerId,
        },
      },
    });
    const nextSecretJson = this.nextSecretJson(current as ProviderConfigModel | null, normalized);
    const data = {
      enabled: normalized.enabled ?? current?.enabled ?? defaultConfiguredEnabled(metadata),
      displayName: metadata.displayName,
      defaultModel: defaultModel ?? current?.defaultModel ?? metadata.defaultModel,
      paramsJson: normalized.params
        ? normalized.params as Prisma.InputJsonValue
        : current?.paramsJson === undefined
          ? undefined
          : current.paramsJson as Prisma.InputJsonValue,
      secretJson: nextSecretJson,
    };
    const row = (await this.prisma.providerConfig.upsert({
      where: {
        projectId_kind_provider: {
          projectId,
          kind,
          provider: providerId,
        },
      },
      create: {
        projectId,
        kind,
        provider: providerId,
        ...data,
      },
      update: data,
    })) as ProviderConfigModel;

    return {
      provider: this.toManagementItem(kind, metadata, row, readAppConfig()),
    };
  }

  async getRuntimeProviderConfig(
    projectId: string,
    kindValue: string,
    providerValue: string,
    workerToken?: string,
  ): Promise<ProviderRuntimeConfig> {
    const kind = this.requireManagedKind(kindValue);
    const providerId = this.requireManagedProviderId(kind, providerValue);
    const config = readAppConfig();
    await this.ensureProject(projectId);
    const programmableRuntime = await this.programmableRuntimeConfig(projectId, kind, providerId);
    const row = (await this.prisma.providerConfig.findUnique({
      where: {
        projectId_kind_provider: {
          projectId,
          kind,
          provider: providerId,
        },
      },
    })) as ProviderConfigModel | null;
    const storedCredential = row?.secretJson ? unsealSecret(row.secretJson, config) : undefined;
    if (storedCredential || programmableRuntime) {
      assertWorkerRuntimeConfigAuthorized(config, workerToken);
    }

    return {
      kind,
      provider: providerId,
      env: runtimeEnvForProvider(kind, providerId, storedCredential),
      params: providerConfigParams(row?.paramsJson),
      programmableProvider: programmableRuntime
        ? {
            ...programmableRuntime,
            credentials: programmableCredentials(programmableRuntime.manifest, storedCredential),
          }
        : undefined,
    };
  }

  async testProviderConfig(
    projectId: string,
    kindValue: string,
    providerValue: string,
    input: unknown,
  ): Promise<ProviderConnectionTestResult> {
    await this.ensureProject(projectId);
    const kind = this.requireManagedKind(kindValue);
    const providerId = this.requireManagedProviderId(kind, providerValue);
    const metadata = await this.requireMetadata(projectId, kind, providerId);
    const normalized = normalizeProviderConnectionTestInput(input);
    const model = normalized.model ?? metadata.defaultModel;
    if (!metadata.models.some((candidate) => candidate.id === model)) {
      throw new BadRequestException(`Model ${model} is not available for ${metadata.displayName}`);
    }

    const row = (await this.prisma.providerConfig.findUnique({
      where: {
        projectId_kind_provider: {
          projectId,
          kind,
          provider: providerId,
        },
      },
    })) as ProviderConfigModel | null;
    const credentialConfigured =
      !metadata.requiresApiKey || Boolean(credentialSourceForProvider(kind, providerId, row ?? undefined, readAppConfig()));
    const status = credentialConfigured ? "succeeded" : "failed";
    const result: ProviderConnectionTestResult = {
      kind,
      provider: providerId,
      status,
      testedAt: new Date().toISOString(),
      model,
      message: credentialConfigured
        ? `${metadata.displayName} is configured for ${model}`
        : `Missing provider credential for ${metadata.displayName}`,
      credentialConfigured,
    };

    return this.recordProviderTestResult(projectId, kind, providerId, result);
  }

  async recordProviderTestResult(
    projectId: string,
    kind: ManagedProviderKind,
    provider: ManagedProviderId,
    result: ProviderConnectionTestResult,
  ): Promise<ProviderConnectionTestResult> {
    await this.prisma.providerConfig.upsert({
      where: {
        projectId_kind_provider: {
          projectId,
          kind,
          provider,
        },
      },
      create: {
        projectId,
        kind,
        provider,
        enabled: true,
        defaultModel: result.model,
        lastTestStatus: result.status,
        lastTestedAt: result.testedAt,
        lastTestModel: result.model,
        lastTestMessage: result.message,
      },
      update: {
        lastTestStatus: result.status,
        lastTestedAt: result.testedAt,
        lastTestModel: result.model,
        lastTestMessage: result.message,
      },
    });
    return result;
  }

  private async ensureProject(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException("Project not found");
    }
  }

  private async providerConfigs(projectId: string): Promise<Map<string, ProviderConfigModel>> {
    const rows = (await this.prisma.providerConfig.findMany({
      where: { projectId },
    })) as ProviderConfigModel[];
    return new Map(rows.map((row) => [configKey(row.kind, row.provider), row]));
  }

  private async providerConfig(
    projectId: string,
    kind: ManagedProviderKind,
    provider: ManagedProviderId,
  ): Promise<ProviderConfigModel | undefined> {
    const row = (await this.prisma.providerConfig.findUnique({
      where: {
        projectId_kind_provider: {
          projectId,
          kind,
          provider,
        },
      },
    })) as ProviderConfigModel | null;
    return row ?? undefined;
  }

  private programmablePrisma(): PrismaWithProgrammableProviders {
    return this.prisma as PrismaWithProgrammableProviders;
  }

  private async requireProgrammableProvider(
    projectId: string,
    kind: ManagedProviderKind,
    provider: ProgrammableProviderId,
  ): Promise<ProgrammableProviderModel> {
    const row = await this.programmablePrisma().programmableProvider.findUnique({
      where: {
        projectId_kind_provider: {
          projectId,
          kind,
          provider,
        },
      },
      include: { versions: { orderBy: { version: "desc" } } },
    }) as ProgrammableProviderModel | null;
    if (!row) {
      throw new NotFoundException("Programmable provider not found");
    }
    return row;
  }

  private async activeProgrammableProviderMetadata(projectId: string): Promise<{
    image: ImageProviderCatalogItem[];
    video: VideoProviderCatalogItem[];
  }> {
    const rows = await this.programmablePrisma().programmableProvider.findMany({
      where: { projectId, activeVersionId: { not: null } },
      include: { versions: { orderBy: { version: "desc" } } },
      orderBy: { createdAt: "desc" },
    }) as ProgrammableProviderModel[];

    return rows.reduce<{ image: ImageProviderCatalogItem[]; video: VideoProviderCatalogItem[] }>(
      (catalog, row) => {
        const manifest = activeManifest(row);
        if (!manifest) {
          return catalog;
        }
        if (manifest.kind === "image" && manifest.image) {
          catalog.image.push(imageMetadataFromProgrammableManifest(manifest, row.activeVersionId ?? undefined));
        }
        if (manifest.kind === "video" && manifest.video) {
          catalog.video.push(videoMetadataFromProgrammableManifest(manifest, row.activeVersionId ?? undefined));
        }
        return catalog;
      },
      { image: [], video: [] },
    );
  }

  private async programmableRuntimeConfig(
    projectId: string,
    kind: ManagedProviderKind,
    provider: ManagedProviderId,
  ): Promise<Omit<ProgrammableProviderRuntimeConfig, "credentials"> | undefined> {
    const programmableId = programmableProviderId(provider);
    if (!programmableId) {
      return undefined;
    }
    const row = await this.requireProgrammableProvider(projectId, kind, programmableId);
    const manifest = activeManifest(row);
    if (!manifest) {
      throw new BadRequestException("Programmable provider has no active version");
    }
    return {
      versionId: row.activeVersionId ?? "",
      manifest,
    };
  }

  private toProgrammableProviderSummary(
    row: ProgrammableProviderModel,
    config?: ProviderConfigModel,
  ): ProgrammableProviderDefinitionSummary {
    const active = activeManifest(row);
    return {
      id: row.id,
      kind: this.requireManagedKind(row.kind),
      provider: this.requireProgrammableProviderId(row.provider),
      displayName: active?.displayName ?? row.displayName,
      description: active?.description ?? row.description ?? undefined,
      activeVersionId: row.activeVersionId ?? undefined,
      versions: (row.versions ?? []).map((version) => ({
        id: version.id,
        version: version.version,
        status: version.status === "valid" ? "valid" : "invalid",
        diagnostics: diagnosticsArray(version.diagnosticsJson),
        createdAt: toIsoString(version.createdAt),
        active: version.id === row.activeVersionId,
      })),
      enabled: config?.enabled ?? false,
      credentialConfigured: Boolean(config?.secretJson),
      lastTest: lastTestSummary(config),
    };
  }

  private toImageManagementItem(
    provider: ImageProviderCatalogItem,
    row: ProviderConfigModel | undefined,
    config: AppConfig,
  ): ImageProviderManagementItem {
    return {
      ...this.applyProjectConfig("image", provider, row, config),
      kind: "image",
    };
  }

  private toVideoManagementItem(
    provider: VideoProviderCatalogItem,
    row: ProviderConfigModel | undefined,
    config: AppConfig,
  ): VideoProviderManagementItem {
    return {
      ...this.applyProjectConfig("video", provider, row, config),
      kind: "video",
    };
  }

  private toManagementItem(
    kind: ManagedProviderKind,
    provider: ProviderMetadata,
    row: ProviderConfigModel | undefined,
    config: AppConfig,
  ): ProviderManagementItem {
    return kind === "image"
      ? this.toImageManagementItem(provider as ImageProviderCatalogItem, row, config)
      : this.toVideoManagementItem(provider as VideoProviderCatalogItem, row, config);
  }

  private applyProjectConfig<TProvider extends ProviderMetadata>(
    kind: ManagedProviderKind,
    provider: TProvider,
    row: ProviderConfigModel | undefined,
    config: AppConfig,
  ): TProvider & {
    configuredEnabled: boolean;
    credentialConfigured: boolean;
    credentialSource?: ProviderCredentialSource;
    configuredDefaultModel?: string;
    lastTest?: ProviderConnectionTestSummary;
  } {
    const configuredDefaultModel = row?.defaultModel ?? undefined;
    const params = providerConfigParams(row?.paramsJson);
    const providerModels =
      configuredDefaultModel && !provider.models.some((model) => model.id === configuredDefaultModel)
        ? [{ id: configuredDefaultModel, displayName: configuredDefaultModel, default: true }, ...provider.models]
        : provider.models;
    const defaultModel =
      configuredDefaultModel && providerModels.some((model) => model.id === configuredDefaultModel)
        ? configuredDefaultModel
        : provider.defaultModel;
    const credentialSource = credentialSourceForProvider(kind, provider.id, row, config);
    const credentialConfigured = provider.requiresApiKey ? Boolean(credentialSource) : true;
    const configuredEnabled = row?.enabled ?? defaultConfiguredEnabled(provider);
    const enabled = provider.requiresApiKey ? configuredEnabled && credentialConfigured : configuredEnabled;
    const disabledReasonText = enabled
      ? undefined
      : !configuredEnabled
        ? `${provider.displayName} is disabled for this project`
        : provider.disabledReason ?? disabledReason(provider.displayName);

    return {
      ...provider,
      enabled,
      disabledReason: disabledReasonText,
      defaultModel,
      models: providerModels.map((model) => ({
        ...model,
        default: model.id === defaultModel,
      })),
      configuredEnabled,
      credentialConfigured,
      credentialSource,
      configuredDefaultModel,
      params,
      lastTest: lastTestSummary(row),
    } as unknown as TProvider & {
      configuredEnabled: boolean;
      credentialConfigured: boolean;
      credentialSource?: ProviderCredentialSource;
      configuredDefaultModel?: string;
      params?: ProviderConfigParams;
      lastTest?: ProviderConnectionTestSummary;
    };
  }

  private requireManagedKind(value: string): ManagedProviderKind {
    const kind = managedProviderKind(value);
    if (!kind) {
      throw new BadRequestException(`Unsupported provider kind: ${value}`);
    }
    return kind;
  }

  private requireManagedProviderId(kind: ManagedProviderKind, value: string): ManagedProviderId {
    const providerId = managedProviderId(kind, value);
    if (!providerId) {
      throw new BadRequestException(`Unknown ${kind} provider: ${value}`);
    }
    return providerId;
  }

  private requireProgrammableProviderId(value: string): ProgrammableProviderId {
    const providerId = programmableProviderId(value);
    if (!providerId) {
      throw new BadRequestException(`Unknown programmable provider: ${value}`);
    }
    return providerId;
  }

  private async requireMetadata(
    projectId: string,
    kind: ManagedProviderKind,
    providerId: ManagedProviderId,
  ): Promise<ProviderMetadata> {
    const providers = kind === "image"
      ? imageProviderCatalog(readAppConfig())
      : videoProviderCatalog(readAppConfig());
    const provider = providers.find((candidate) => candidate.id === providerId);
    if (!provider) {
      const programmable = await this.activeProgrammableProviderMetadata(projectId);
      const programmableProvider = kind === "image"
        ? programmable.image.find((candidate) => candidate.id === providerId)
        : programmable.video.find((candidate) => candidate.id === providerId);
      if (programmableProvider) {
        return programmableProvider;
      }
      throw new BadRequestException(`Unknown ${kind} provider: ${providerId}`);
    }
    return provider;
  }

  private nextSecretJson(
    current: ProviderConfigModel | null,
    input: UpdateProviderConfigInput,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
    if (!input.credential) {
      return current?.secretJson === undefined ? undefined : (current.secretJson as Prisma.InputJsonValue);
    }
    if (input.credential.action === "clear") {
      return Prisma.JsonNull;
    }
    if (input.credential.action === "set" && input.credential.value) {
      return sealSecret(input.credential.value, readAppConfig()) as Prisma.InputJsonValue;
    }
    return current?.secretJson === undefined ? undefined : (current.secretJson as Prisma.InputJsonValue);
  }
}

function configKey(kind: string, provider: string): string {
  return `${kind}:${provider}`;
}

function defaultConfiguredEnabled(provider: ProviderMetadata): boolean {
  return provider.requiresApiKey ? true : provider.enabled;
}

function activeManifest(row: ProgrammableProviderModel): ProgrammableProviderManifest | undefined {
  const activeVersion = (row.versions ?? []).find((version) => version.id === row.activeVersionId);
  return activeVersion && isProgrammableManifest(activeVersion.manifestJson)
    ? activeVersion.manifestJson
    : undefined;
}

function isProgrammableManifest(value: unknown): value is ProgrammableProviderManifest {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ProgrammableProviderManifest).id === "string" &&
    Boolean(programmableProviderId((value as ProgrammableProviderManifest).id)) &&
    managedProviderKind((value as ProgrammableProviderManifest).kind) !== undefined &&
    typeof (value as ProgrammableProviderManifest).displayName === "string" &&
    Array.isArray((value as ProgrammableProviderManifest).models)
  );
}

function imageMetadataFromProgrammableManifest(
  manifest: ProgrammableProviderManifest,
  providerVersionId?: string,
): ImageProviderCatalogItem {
  if (!manifest.image) {
    throw new BadRequestException("Programmable image provider manifest is invalid");
  }
  return {
    id: manifest.id,
    providerVersionId,
    displayName: manifest.displayName,
    enabled: true,
    requiresApiKey: manifest.credentials.some((credential) => credential.required),
    defaultModel: manifest.defaultModel,
    models: manifest.models,
    supportedModes: manifest.supportedModes as ImageProviderCatalogItem["supportedModes"],
    supportsReferenceImages: manifest.image.supportsReferenceImages,
    maxReferenceImages: manifest.image.maxReferenceImages,
    supportsMultipleOutputs: manifest.image.supportsMultipleOutputs,
    maxOutputs: manifest.image.maxOutputs,
    defaultAspectRatio: manifest.defaultAspectRatio,
    supportedAspectRatios: manifest.supportedAspectRatios,
    parameters: manifest.parameters,
  };
}

function videoMetadataFromProgrammableManifest(
  manifest: ProgrammableProviderManifest,
  providerVersionId?: string,
): VideoProviderCatalogItem {
  if (!manifest.video) {
    throw new BadRequestException("Programmable video provider manifest is invalid");
  }
  return {
    id: manifest.id,
    providerVersionId,
    displayName: manifest.displayName,
    enabled: true,
    requiresApiKey: manifest.credentials.some((credential) => credential.required),
    defaultModel: manifest.defaultModel,
    models: manifest.models,
    supportedModes: manifest.supportedModes as VideoProviderCatalogItem["supportedModes"],
    supportsFirstFrame: manifest.video.supportsFirstFrame,
    supportsLastFrame: manifest.video.supportsLastFrame,
    supportsReferenceImages: manifest.video.supportsReferenceImages,
    maxReferenceImages: manifest.video.maxReferenceImages,
    supportsCancel: manifest.video.supportsCancel,
    defaultDurationSeconds: manifest.video.defaultDurationSeconds,
    supportedDurationSeconds: manifest.video.supportedDurationSeconds,
    defaultResolution: manifest.video.defaultResolution,
    supportedResolutions: manifest.video.supportedResolutions,
    defaultAspectRatio: manifest.defaultAspectRatio,
    supportedAspectRatios: manifest.supportedAspectRatios,
    parameters: manifest.parameters,
  };
}

function diagnosticsArray(value: unknown): ProgrammableProviderValidationDiagnostic[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((item) => {
    if (
      typeof item === "object" &&
      item !== null &&
      typeof (item as ProgrammableProviderValidationDiagnostic).path === "string" &&
      typeof (item as ProgrammableProviderValidationDiagnostic).message === "string"
    ) {
      return [item as ProgrammableProviderValidationDiagnostic];
    }
    return [];
  });
}

function programmableDiagnosticsMessage(diagnostics: ProgrammableProviderValidationDiagnostic[]): string {
  if (!diagnostics.length) {
    return "Programmable provider manifest is invalid";
  }
  return `Programmable provider manifest is invalid: ${diagnostics
    .map((diagnostic) => `${diagnostic.path}: ${diagnostic.message}`)
    .join("; ")}`;
}

function programmableCredentials(
  manifest: ProgrammableProviderManifest,
  storedCredential: string | undefined,
): Record<string, string> {
  const credential = manifest.credentials[0];
  if (!credential || !storedCredential) {
    return {};
  }
  return { [credential.key]: storedCredential };
}

function stripImageManagementMetadata(provider: ImageProviderManagementItem): ImageProviderCatalogItem {
  const {
    kind: _kind,
    configuredEnabled: _configuredEnabled,
    credentialConfigured: _credentialConfigured,
    credentialSource: _credentialSource,
    configuredDefaultModel: _configuredDefaultModel,
    lastTest: _lastTest,
    ...catalog
  } = provider;
  return catalog;
}

function stripVideoManagementMetadata(provider: VideoProviderManagementItem): VideoProviderCatalogItem {
  const {
    kind: _kind,
    configuredEnabled: _configuredEnabled,
    credentialConfigured: _credentialConfigured,
    credentialSource: _credentialSource,
    configuredDefaultModel: _configuredDefaultModel,
    lastTest: _lastTest,
    ...catalog
  } = provider;
  return catalog;
}

function credentialSourceForProvider(
  kind: ManagedProviderKind,
  providerId: string,
  row: ProviderConfigModel | undefined,
  config: AppConfig,
): ProviderCredentialSource | undefined {
  if (row?.secretJson) {
    return "stored";
  }
  return hasEnvCredential(kind, providerId, config) ? "environment" : undefined;
}

function hasEnvCredential(kind: ManagedProviderKind, providerId: string, config: AppConfig): boolean {
  if (programmableProviderId(providerId)) {
    return false;
  }
  if (isGenericProvider(providerId)) {
    return false;
  }
  if (kind === "image") {
    if (providerId === "image2") {
      return config.imageProviderKeysConfigured.image2;
    }
    if (providerId === "banana") {
      return config.imageProviderKeysConfigured.banana;
    }
    return true;
  }
  if (providerId === "seedance") {
    return config.videoProviderKeysConfigured.seedance;
  }
  if (providerId === "happyhorse") {
    return config.videoProviderKeysConfigured.happyhorse;
  }
  return true;
}

function runtimeEnvForProvider(
  kind: ManagedProviderKind,
  providerId: ManagedProviderId,
  storedCredential: string | undefined,
): Record<string, string | undefined> {
  if (!storedCredential) {
    return {};
  }
  if (kind === "image" && providerId === "image2") {
    return { IMAGE2_API_KEY: storedCredential, OPENAI_API_KEY: storedCredential };
  }
  if (kind === "image" && providerId === "banana") {
    return { BANANA_API_KEY: storedCredential, GEMINI_API_KEY: storedCredential };
  }
  if (kind === "video" && providerId === "seedance") {
    return { SEEDANCE_API_KEY: storedCredential };
  }
  if (kind === "video" && providerId === "happyhorse") {
    return { HAPPYHORSE_API_KEY: storedCredential };
  }
  if (kind === "image" && providerId === "generic-image") {
    return { GENERIC_IMAGE_API_KEY: storedCredential, OPENAI_API_KEY: storedCredential };
  }
  if (kind === "video" && providerId === "generic-video") {
    return { GENERIC_VIDEO_API_KEY: storedCredential };
  }
  return {};
}

function isGenericProvider(providerId: string): boolean {
  return providerId === "generic-image" || providerId === "generic-video";
}

function providerConfigParams(value: unknown): ProviderConfigParams | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  const protocol = typeof raw.protocol === "string" ? raw.protocol : undefined;
  const baseUrl = typeof raw.baseUrl === "string" ? raw.baseUrl : undefined;
  const imageRequestMode = typeof raw.imageRequestMode === "string" ? raw.imageRequestMode : undefined;
  const videoRequestMode = typeof raw.videoRequestMode === "string" ? raw.videoRequestMode : undefined;
  const safeParams =
    typeof raw.safeParams === "object" && raw.safeParams !== null && !Array.isArray(raw.safeParams)
      ? raw.safeParams as ProviderConfigParams["safeParams"]
      : undefined;
  return {
    ...(protocol === "openai_compatible" || protocol === "gemini" || protocol === "ark" || protocol === "mock"
      ? { protocol }
      : {}),
    ...(baseUrl ? { baseUrl } : {}),
    ...(imageRequestMode === "openai" || imageRequestMode === "gemini" || imageRequestMode === "ark"
      ? { imageRequestMode }
      : {}),
    ...(videoRequestMode === "task" || videoRequestMode === "sync" || videoRequestMode === "mock"
      ? { videoRequestMode }
      : {}),
    ...(safeParams ? { safeParams } : {}),
  };
}

function parseHttpBaseUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new BadRequestException("Endpoint must start with http:// or https://");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BadRequestException("Endpoint must start with http:// or https://");
  }
  return value.replace(/\/+$/g, "");
}

function modelDiscoveryUrl(baseUrl: string, protocol: ProviderProtocol): string {
  if (protocol === "gemini") {
    return `${baseUrl}${baseUrl.endsWith("/models") ? "" : "/models"}`;
  }
  if (protocol === "ark") {
    return `${baseUrl}${baseUrl.endsWith("/models") ? "" : baseUrl.endsWith("/api/v3") ? "/models" : "/api/v3/models"}`;
  }
  return `${baseUrl}${baseUrl.endsWith("/models") ? "" : baseUrl.endsWith("/v1") ? "/models" : "/v1/models"}`;
}

function modelDiscoveryHeaders(credential: string, protocol: ProviderProtocol): Record<string, string> {
  if (protocol === "gemini") {
    return { "x-goog-api-key": credential, accept: "application/json" };
  }
  return { authorization: `Bearer ${credential}`, accept: "application/json" };
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function looksLikeHtml(text: string, contentType: string | null): boolean {
  return Boolean(contentType?.includes("text/html")) || /^\s*<!doctype html/i.test(text) || /^\s*<html[\s>]/i.test(text);
}

function parseJson(text: string): unknown {
  if (!text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function extractModelIds(value: unknown): string[] {
  const rawModels = Array.isArray((value as { data?: unknown[] }).data)
    ? (value as { data: unknown[] }).data
    : Array.isArray((value as { models?: unknown[] }).models)
      ? (value as { models: unknown[] }).models
      : [];
  return [...new Set(rawModels.flatMap((item) => {
    if (typeof item === "string") {
      return [normalizeModelId(item)];
    }
    if (typeof item === "object" && item !== null) {
      const raw = item as Record<string, unknown>;
      const id = typeof raw.id === "string"
        ? raw.id
        : typeof raw.name === "string"
          ? raw.name.replace(/^models\//, "")
          : undefined;
      return id ? [normalizeModelId(id)] : [];
    }
    return [];
  }).filter(Boolean))].sort();
}

function normalizeModelId(value: string): string {
  return value.trim().replace(/^models\//, "");
}

function groupModelIds(ids: string[]): { image: string[]; video: string[]; chat: string[] } {
  return ids.reduce(
    (groups, id) => {
      const normalized = id.toLowerCase();
      if (/image|img|dall|flux|sdxl|stable|banana|gpt-image|midjourney|kolors/.test(normalized)) {
        groups.image.push(id);
      } else if (/video|veo|seedance|wan|runway|kling|sora|ltx/.test(normalized)) {
        groups.video.push(id);
      } else {
        groups.chat.push(id);
      }
      return groups;
    },
    { image: [] as string[], video: [] as string[], chat: [] as string[] },
  );
}

function failedDiscovery(protocol: ProviderProtocol, status: number, message: string): ProviderModelDiscoveryResult {
  return {
    ok: false,
    detectedProtocol: protocol,
    message,
    modelGroups: { image: [], video: [], chat: [] },
    rawCount: 0,
  };
}

function mockDiscoveryResult(kind: ManagedProviderKind): ProviderModelDiscoveryResult {
  const modelGroups = kind === "image"
    ? { image: ["mock-image-v1"], video: [], chat: [] }
    : { image: [], video: ["mock-video-v1"], chat: [] };
  return {
    ok: true,
    detectedProtocol: "mock",
    message: "Mock provider models are available",
    modelGroups,
    rawCount: kind === "image" ? modelGroups.image.length : modelGroups.video.length,
  };
}

function assertWorkerRuntimeConfigAuthorized(config: AppConfig, workerToken: string | undefined): void {
  if (!config.workerApiToken) {
    throw new UnauthorizedException("WORKER_API_TOKEN is required to read stored provider credentials");
  }
  if (workerToken !== config.workerApiToken) {
    throw new UnauthorizedException("Worker runtime config token is invalid");
  }
}

function lastTestSummary(row: ProviderConfigModel | undefined): ProviderConnectionTestSummary | undefined {
  if (!row?.lastTestStatus) {
    return undefined;
  }
  return {
    status: row.lastTestStatus === "succeeded" ? "succeeded" : "failed",
    testedAt: row.lastTestedAt ? toIsoString(row.lastTestedAt) : undefined,
    model: row.lastTestModel ?? undefined,
    message: row.lastTestMessage ?? undefined,
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function encryptionKey(config: AppConfig): Buffer {
  const keyMaterial =
    config.providerConfigEncryptionKey ??
    config.databaseUrl ??
    "guga-flow-local-provider-config-key";
  return createHash("sha256").update(keyMaterial).digest();
}

function sealSecret(value: string, config: AppConfig): SecretEnvelope {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(config), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: data.toString("base64"),
  };
}

function unsealSecret(input: unknown, config: AppConfig): string | undefined {
  if (!isSecretEnvelope(input)) {
    return undefined;
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(config),
    Buffer.from(input.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(input.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(input.data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function isSecretEnvelope(value: unknown): value is SecretEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as SecretEnvelope).v === 1 &&
    (value as SecretEnvelope).alg === "aes-256-gcm" &&
    typeof (value as SecretEnvelope).iv === "string" &&
    typeof (value as SecretEnvelope).tag === "string" &&
    typeof (value as SecretEnvelope).data === "string"
  );
}
