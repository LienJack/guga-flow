import { NotFoundException } from "@nestjs/common";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../prisma/prisma.service";
import { ProjectSettingsService } from "./project-settings.service";

function createPrismaMock() {
  return {
    project: {
      findUnique: vi.fn(async () => ({
        id: "project_1",
        title: "Rain Night",
        defaultAspectRatio: "16:9",
        generationSettingsJson: { visualStyle: "noir", aspectRatio: "16:9" },
      })),
    },
    canvasNode: { count: vi.fn(async () => 4) },
    canvasEdge: { count: vi.fn(async () => 3) },
    asset: {
      count: vi.fn(async () => 3),
      findMany: vi.fn(async () => [
        { type: "image", sizeBytes: 1000 },
        { type: "audio", sizeBytes: 2000 },
        { type: "document", sizeBytes: null },
      ]),
    },
    novelDocument: { count: vi.fn(async () => 1) },
    storyboardDraft: { count: vi.fn(async () => 2) },
    scriptDraft: { count: vi.fn(async () => 1) },
    editorExport: { count: vi.fn(async () => 1) },
    providerConfig: {
      findMany: vi.fn(async () => [
        {
          kind: "image",
          provider: "image2",
          enabled: true,
          defaultModel: "gpt-image-2",
          secretJson: { encrypted: "secret-ciphertext" },
          lastTestStatus: "succeeded",
        },
      ]),
    },
    programmableProvider: { count: vi.fn(async () => 1) },
    agentDeployment: { count: vi.fn(async () => 1) },
    skillTemplate: {
      findMany: vi.fn(async () => [
        {
          kind: "art",
          slug: "art-default",
          displayName: "Art Skill",
          enabled: true,
          activeVersionId: "skill_version_2",
          versions: [
            { id: "skill_version_2", version: 2 },
            { id: "skill_version_1", version: 1 },
          ],
        },
      ]),
    },
  };
}

function createService(prisma = createPrismaMock()) {
  return {
    prisma,
    service: new ProjectSettingsService(prisma as unknown as PrismaService),
  };
}

describe("ProjectSettingsService", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a settings center summary with counts, file totals, and version metadata", async () => {
    vi.stubEnv("APP_VERSION", "0.2.0");
    vi.stubEnv("BUILD_COMMIT", "abc123");
    vi.stubEnv("BUILD_TIME", "2026-06-14T00:00:00.000Z");
    vi.stubEnv("AI_DEBUG_ENABLED", "true");
    const { service } = createService();

    const summary = await service.getSummary("project_1");

    expect(summary.project).toMatchObject({
      id: "project_1",
      title: "Rain Night",
      defaultAspectRatio: "16:9",
      generationSettingsCount: 2,
    });
    expect(summary.resourceCounts).toMatchObject({
      canvasNodes: 4,
      canvasEdges: 3,
      assets: 3,
      skillTemplates: 1,
      providerConfigs: 1,
      programmableProviders: 1,
      agentDeploymentConfigs: 1,
    });
    expect(summary.fileSummary).toMatchObject({
      totalAssets: 3,
      totalSizeBytes: 3000,
      uploadStorageConfigured: true,
    });
    expect(summary.fileSummary.byType).toEqual(
      expect.arrayContaining([
        { type: "image", count: 1, sizeBytes: 1000 },
        { type: "audio", count: 1, sizeBytes: 2000 },
      ]),
    );
    expect(summary.modules.map((module) => module.module)).toEqual([
      "providers",
      "agents",
      "prompts",
      "project_defaults",
      "data",
      "files",
      "version",
    ]);
    expect(summary.version).toMatchObject({
      service: "guga-flow",
      appVersion: "0.2.0",
      apiVersion: "v1",
      buildCommit: "abc123",
      buildTime: "2026-06-14T00:00:00.000Z",
      runtime: { environment: expect.any(String), nodeVersion: expect.any(String) },
    });
    expect(summary.debug).toMatchObject({
      aiDebugAvailable: true,
      aiDebugEnabled: true,
      safeTraceFields: expect.arrayContaining(["traceId", "sanitizedError"]),
      credentialValuesExposed: false,
    });
  });

  it("exports safe project settings metadata without credential values", async () => {
    const { service } = createService();

    const result = await service.exportSettings("project_1");

    expect(result.export.project.id).toBe("project_1");
    expect(result.export.generationSettings).toEqual({ visualStyle: "noir", aspectRatio: "16:9" });
    expect(result.export.providers).toEqual([
      {
        kind: "image",
        provider: "image2",
        enabled: true,
        defaultModel: "gpt-image-2",
        credentialConfigured: true,
        credentialSource: "stored",
        lastTestStatus: "succeeded",
      },
    ]);
    expect(result.export.skillTemplates).toEqual([
      {
        kind: "art",
        slug: "art-default",
        displayName: "Art Skill",
        enabled: true,
        activeVersion: 2,
        versionCount: 2,
      },
    ]);
    expect(JSON.stringify(result.export)).not.toContain("secret-ciphertext");
  });

  it("validates import payloads without mutating project data", async () => {
    const { prisma, service } = createService();
    const valid = await service.validateImport("project_1", {
      payload: {
        version: "1.0",
        project: { id: "project_1" },
        providers: [],
        skillTemplates: [],
        generationSettings: { visualStyle: "noir" },
      },
    });
    const invalid = await service.validateImport("project_1", {
      payload: { version: "0.9", project: {}, providers: "bad" },
    });

    expect(valid).toEqual({
      valid: true,
      detectedVersion: "1.0",
      issues: [],
      summary: { providers: 0, skillTemplates: 0, hasGenerationSettings: true },
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.issues.map((issue) => issue.path)).toEqual([
      "version",
      "project.id",
      "providers",
      "skillTemplates",
    ]);
    expect(prisma.project.findUnique).toHaveBeenCalledTimes(2);
  });

  it("rejects missing projects", async () => {
    const prisma = createPrismaMock();
    prisma.project.findUnique.mockResolvedValueOnce(null as never);
    const { service } = createService(prisma);

    await expect(service.getSummary("missing_project")).rejects.toBeInstanceOf(NotFoundException);
  });
});
