import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { CanvasEdgeRecord, CanvasNodeRecord } from "@guga-flow/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthService } from "../auth/auth.service";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { LocalStorageService } from "../storage/local-storage.service";
import { ProjectsService } from "./projects.service";

const createdAt = new Date("2026-06-12T00:00:00.000Z");
const updatedAt = new Date("2026-06-12T00:10:00.000Z");

function project(overrides: Record<string, unknown> = {}) {
  return {
    id: "project_1",
    ownerUserId: "default-user",
    title: "Demo Project",
    description: null,
    defaultAspectRatio: "9:16",
    generationSettingsJson: null,
    createdAt,
    updatedAt,
    _count: { assets: 0 },
    ...overrides,
  };
}

function canvasDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: "canvas_1",
    projectId: "project_1",
    snapshotJson: {},
    createdAt,
    updatedAt,
    ...overrides,
  };
}

function canvasNode(overrides: Record<string, unknown> = {}): CanvasNodeRecord {
  return {
    id: "node_1",
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    tldrawShapeId: "shape:node-1",
    type: "shot",
    title: "Shot 001",
    x: 10,
    y: 20,
    width: 320,
    height: 220,
    zIndex: 0,
    status: "draft",
    dataJson: { assetId: "asset_1" },
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    ...overrides,
  } as CanvasNodeRecord;
}

function canvasEdge(overrides: Record<string, unknown> = {}): CanvasEdgeRecord {
  return {
    id: "edge_1",
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    sourceNodeId: "node_1",
    targetNodeId: "node_2",
    sourceShapeId: "shape:node-1",
    targetShapeId: "shape:node-2",
    visualArrowShapeId: "shape:arrow-1",
    relation: "derived_from",
    dataJson: {},
    createdAt: createdAt.toISOString(),
    ...overrides,
  } as CanvasEdgeRecord;
}

function asset(overrides: Record<string, unknown> = {}) {
  return {
    id: "asset_1",
    projectId: "project_1",
    type: "image",
    purpose: "uploaded",
    mimeType: "image/png",
    originalFilename: "hero.png",
    sizeBytes: 1024,
    width: 1280,
    height: 720,
    durationMs: null,
    metadataJson: { sourcePath: "/Users/lienli/secret/hero.png" },
    ...overrides,
  };
}

function createPrismaMock() {
  const prisma = {
    project: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    asset: {
      findMany: vi.fn(),
      create: vi.fn(async ({ data }) => asset({ ...data, id: "asset_imported_1" })),
    },
    canvasDocument: {
      findMany: vi.fn(async () => [canvasDocument()]),
      create: vi.fn(async ({ data }) => canvasDocument({ ...data, id: "canvas_imported_1" })),
    },
    canvasNode: {
      findMany: vi.fn(async (): Promise<CanvasNodeRecord[]> => []),
      create: vi.fn(async ({ data }) => canvasNode({ ...data, id: "node_imported_1" })),
      update: vi.fn(async ({ data }) => canvasNode(data)),
    },
    canvasEdge: {
      findMany: vi.fn(async (): Promise<CanvasEdgeRecord[]> => []),
      create: vi.fn(async ({ data }) => canvasEdge({ ...data, id: "edge_imported_1" })),
    },
    skillTemplate: {
      findMany: vi.fn(async () => []),
    },
    workflowDefinition: {
      findMany: vi.fn(async () => []),
    },
  };

  return {
    ...prisma,
    $transaction: vi.fn(async <T>(callback: (tx: typeof prisma) => Promise<T>) =>
      callback(prisma),
    ),
  };
}

function createAuthMock() {
  return {
    ensureDefaultAdmin: vi.fn(async () => ({
      id: "default-user",
      email: "admin",
      name: "Admin",
      passwordHash: "hash",
    })),
  };
}

function createStorageMock() {
  return {
    deleteObject: vi.fn(async () => undefined),
  };
}

describe("ProjectsService", () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let storage: ReturnType<typeof createStorageMock>;
  let auth: ReturnType<typeof createAuthMock>;
  let service: ProjectsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    storage = createStorageMock();
    auth = createAuthMock();
    service = new ProjectsService(
      prisma as unknown as PrismaService,
      storage as unknown as LocalStorageService,
      auth as unknown as AuthService,
    );
  });

  it("creates projects for the default owner and normalizes output", async () => {
    prisma.project.create.mockResolvedValue(
      project({
        generationSettingsJson: {
          visualStyle: "cinematic noir",
          aspectRatio: "16:9",
          bgm: { assetId: "asset_bgm_1" },
        },
      }),
    );

    const result = await service.createProject({
      title: " Demo Project ",
      defaultAspectRatio: "9:16",
      generationSettings: {
        visualStyle: "cinematic noir",
        aspectRatio: "16:9",
        bgm: { assetId: "asset_bgm_1" },
      },
    });

    expect(auth.ensureDefaultAdmin).toHaveBeenCalled();
    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerUserId: "default-user",
          title: "Demo Project",
          generationSettingsJson: {
            visualStyle: "cinematic noir",
            aspectRatio: "16:9",
            bgm: { status: "available", assetId: "asset_bgm_1" },
          },
        }),
      }),
    );
    expect(result).toMatchObject({
      id: "project_1",
      title: "Demo Project",
      defaultAspectRatio: "9:16",
      generationSettings: {
        visualStyle: "cinematic noir",
        aspectRatio: "16:9",
        bgm: { status: "available", assetId: "asset_bgm_1" },
      },
      assetCount: 0,
      createdAt: createdAt.toISOString(),
    });
  });

  it("updates generation settings and clears empty settings", async () => {
    prisma.project.findUnique.mockResolvedValue(project());
    prisma.project.update.mockResolvedValue(
      project({
        generationSettingsJson: {
          visualStyle: "bright fantasy",
          subtitle: { status: "requested_unresolved", label: "Captions" },
        },
      }),
    );

    const result = await service.updateProject("project_1", {
      generationSettings: {
        visualStyle: "bright fantasy",
        subtitle: { label: "Captions" },
      },
    });

    expect(prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          generationSettingsJson: {
            visualStyle: "bright fantasy",
            subtitle: { status: "requested_unresolved", label: "Captions" },
          },
        }),
      }),
    );
    expect(result.generationSettings?.subtitle?.status).toBe("requested_unresolved");

    prisma.project.findUnique.mockResolvedValue(project());
    prisma.project.update.mockResolvedValue(project());
    await service.updateProject("project_1", { generationSettings: {} });
    expect(prisma.project.update).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ generationSettingsJson: Prisma.JsonNull }),
      }),
    );
  });

  it("rejects blank project titles", async () => {
    await expect(service.createProject({ title: "   " })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("duplicates basic project metadata without carrying asset counts", async () => {
    prisma.project.findUnique.mockResolvedValue(
      project({
        title: "Original",
        description: "A short description",
        defaultAspectRatio: "16:9",
        generationSettingsJson: {
          visualStyle: "documentary realism",
          narrationLanguage: "zh-CN",
        },
        _count: { assets: 2 },
      }),
    );
    prisma.project.create.mockResolvedValue(
      project({
        id: "project_2",
        title: "Original Copy",
        description: "A short description",
        defaultAspectRatio: "16:9",
        generationSettingsJson: {
          visualStyle: "documentary realism",
          narrationLanguage: "zh-CN",
        },
        _count: { assets: 0 },
      }),
    );

    const result = await service.duplicateProject("project_1");

    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Original Copy",
          description: "A short description",
          defaultAspectRatio: "16:9",
          generationSettingsJson: {
            visualStyle: "documentary realism",
            narrationLanguage: "zh-CN",
          },
        }),
      }),
    );
    expect(result.id).toBe("project_2");
    expect(result.assetCount).toBe(0);
  });

  it("exports safe project packages with pages and resource manifests", async () => {
    prisma.project.findUnique.mockResolvedValue(
      project({
        generationSettingsJson: {
          visualStyle: "cinematic",
        },
      }),
    );
    prisma.canvasDocument.findMany.mockResolvedValue([
      canvasDocument({
        snapshotJson: {
          gugaFlowCanvasPage: {
            title: "Main Canvas",
            sortOrder: 0,
            isDefault: true,
          },
          document: { records: [] },
        },
      }),
    ]);
    prisma.canvasNode.findMany.mockResolvedValue([
      canvasNode({
        id: "node_1",
        dataJson: { prompt: "Use sk-secret1234567890 and /Users/lienli/private.png" },
      }),
      canvasNode({ id: "node_2", tldrawShapeId: "shape:node-2" }),
    ]);
    prisma.canvasEdge.findMany.mockResolvedValue([canvasEdge()]);
    prisma.asset.findMany.mockResolvedValue([asset()]);

    const result = await service.exportPackage("project_1");

    expect(result.package).toMatchObject({
      format: "guga-flow-project-package",
      schemaVersion: 1,
      sourceProjectId: "project_1",
      canvasPages: [
        expect.objectContaining({
          title: "Main Canvas",
          nodes: expect.arrayContaining([expect.objectContaining({ id: "node_1" })]),
          edges: expect.arrayContaining([expect.objectContaining({ id: "edge_1" })]),
        }),
      ],
      assets: [expect.objectContaining({ id: "asset_1", mimeType: "image/png" })],
    });
    const serialized = JSON.stringify(result.package);
    expect(serialized).not.toContain("sk-secret");
    expect(serialized).not.toContain("/Users/lienli");
    expect(serialized).not.toContain("storageKey");
    expect(result.package.canvasPages[0]?.snapshotJson).toEqual({ document: { records: [] } });
  });

  it("imports project packages transactionally and remaps canvas resources", async () => {
    prisma.project.create.mockResolvedValue(
      project({
        id: "project_imported",
        title: "Demo Project Import",
        _count: { assets: 0 },
      }),
    );
    prisma.asset.create.mockResolvedValue(asset({ id: "asset_new_1", projectId: "project_imported" }));
    prisma.canvasDocument.create.mockResolvedValue(
      canvasDocument({ id: "canvas_new_1", projectId: "project_imported" }),
    );
    prisma.canvasNode.create
      .mockResolvedValueOnce(canvasNode({ id: "node_new_1", projectId: "project_imported" }))
      .mockResolvedValueOnce(canvasNode({ id: "node_new_2", projectId: "project_imported" }));
    prisma.canvasEdge.create.mockResolvedValue(
      canvasEdge({
        id: "edge_new_1",
        projectId: "project_imported",
        sourceNodeId: "node_new_1",
        targetNodeId: "node_new_2",
      }),
    );

    const result = await service.importPackage({
      package: {
        format: "guga-flow-project-package",
        schemaVersion: 1,
        source: "guga-flow",
        sourceProjectId: "project_1",
        exportedAt: "2026-06-14T00:00:00.000Z",
        project: {
          title: "Demo Project",
          defaultAspectRatio: "9:16",
        },
        settings: {
          skillTemplateReferences: [],
          workflowReferences: [],
        },
        assets: [
          {
            id: "asset_old_1",
            type: "image",
            purpose: "uploaded",
            mimeType: "image/png",
          },
        ],
        canvasPages: [
          {
            sourceCanvasDocumentId: "canvas_old_1",
            title: "Main Canvas",
            sortOrder: 0,
            isDefault: true,
            snapshotJson: {},
            nodes: [
              {
                ...canvasNode({
                  id: "node_old_1",
                  canvasDocumentId: "canvas_old_1",
                  dataJson: { assetId: "asset_old_1", selectedNodeId: "node_old_2" },
                }),
              },
              {
                ...canvasNode({
                  id: "node_old_2",
                  canvasDocumentId: "canvas_old_1",
                  tldrawShapeId: "shape:node-2",
                }),
              },
            ],
            edges: [
              {
                ...canvasEdge({
                  id: "edge_old_1",
                  canvasDocumentId: "canvas_old_1",
                  sourceNodeId: "node_old_1",
                  targetNodeId: "node_old_2",
                }),
              },
            ],
          },
        ],
      },
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result).toMatchObject({
      sourceProjectId: "project_1",
      canvasPageIdMap: { canvas_old_1: "canvas_new_1" },
      nodeIdMap: { node_old_1: "node_new_1", node_old_2: "node_new_2" },
      edgeIdMap: { edge_old_1: "edge_new_1" },
      assetIdMap: { asset_old_1: "asset_new_1" },
    });
    expect(prisma.canvasNode.update).toHaveBeenCalledWith({
      where: { id: "node_new_1" },
      data: { dataJson: { assetId: "asset_new_1", selectedNodeId: "node_new_2" } },
    });
  });

  it("rejects non guga-flow package imports before opening a transaction", async () => {
    const validation = service.validateImportPackage({
      package: {
        format: "ai-canvaspro-project",
        schemaVersion: 1,
      } as never,
    });

    expect(validation.valid).toBe(false);
    await expect(
      service.importPackage({
        package: {
          format: "ai-canvaspro-project",
          schemaVersion: 1,
        } as never,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("builds recovery snapshots from the latest saved canvas pages", async () => {
    prisma.project.findUnique.mockResolvedValue(project());
    prisma.canvasDocument.findMany.mockResolvedValue([
      canvasDocument({
        snapshotJson: {
          gugaFlowCanvasPage: {
            title: "Main Canvas",
            sortOrder: 0,
            isDefault: true,
          },
          document: { records: [] },
        },
      }),
    ]);
    prisma.canvasNode.findMany.mockResolvedValue([canvasNode(), canvasNode({ id: "node_2" })]);
    prisma.canvasEdge.findMany.mockResolvedValue([canvasEdge()]);

    const result = await service.getRecoverySnapshot("project_1");

    expect(result.snapshot).toMatchObject({
      format: "guga-flow-recovery-snapshot",
      projectId: "project_1",
      canvasPages: [
        expect.objectContaining({
          nodeCount: 2,
          edgeCount: 1,
          snapshotJson: { document: { records: [] } },
        }),
      ],
    });
  });

  it("throws not found for missing projects", async () => {
    prisma.project.findUnique.mockResolvedValue(null);

    await expect(service.getProject("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("cleans up asset objects before deleting a project", async () => {
    prisma.project.findUnique.mockResolvedValue(project());
    prisma.asset.findMany.mockResolvedValue([
      { storageKey: "project_1/hero.png" },
      { storageKey: "project_1/notes.md" },
    ]);
    prisma.project.delete.mockResolvedValue(project());

    await expect(service.deleteProject("project_1")).resolves.toEqual({ deleted: true });

    expect(prisma.asset.findMany).toHaveBeenCalledWith({
      where: { projectId: "project_1" },
      select: { storageKey: true },
    });
    expect(storage.deleteObject).toHaveBeenNthCalledWith(1, "project_1/hero.png");
    expect(storage.deleteObject).toHaveBeenNthCalledWith(2, "project_1/notes.md");
    expect(prisma.project.delete).toHaveBeenCalledWith({ where: { id: "project_1" } });
  });
});
