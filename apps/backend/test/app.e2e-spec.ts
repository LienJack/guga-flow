import "reflect-metadata";

import type { CanvasEdgeRecord, CanvasNodeRecord, StoryboardResult } from "@guga-flow/shared-types";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import { ProvidersService } from "../src/providers/providers.service";
import { LocalStorageService } from "../src/storage/local-storage.service";

describe("backend health e2e", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        onModuleInit: async () => undefined,
        onModuleDestroy: async () => undefined,
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it("serves health status through the versioned API prefix", async () => {
    const response = await request(app.getHttpServer()).get("/api/v1/health").expect(200);

    expect(response.body.status).toBe("ok");
    expect(response.body.providerMode.image.selected).toBe("mock-image");
    expect(JSON.stringify(response.body)).not.toContain("secret");
  });
});

type StoredProject = {
  id: string;
  ownerUserId: string;
  title: string;
  description: string | null;
  defaultAspectRatio: string;
  createdAt: Date;
  updatedAt: Date;
  _count: { assets: number };
};

function createPrismaE2eMock() {
  const projects = new Map<string, StoredProject>();
  const assets = new Map<string, Record<string, unknown>>();
  const canvasDocuments = new Map<string, Record<string, unknown>>();
  const canvasNodes = new Map<string, Record<string, unknown>>();
  const canvasEdges = new Map<string, Record<string, unknown>>();
  const novelDocuments = new Map<string, Record<string, unknown>>();
  const storyboardDrafts = new Map<string, Record<string, unknown>>();
  const generationJobs = new Map<string, Record<string, unknown>>();
  let projectSequence = 1;
  let assetSequence = 1;
  let canvasSequence = 1;
  let nodeSequence = 1;
  let edgeSequence = 1;
  let novelSequence = 1;
  let storyboardDraftSequence = 1;
  let generationJobSequence = 1;

  function nextDate() {
    return new Date(`2026-06-12T00:${String(projectSequence).padStart(2, "0")}:00.000Z`);
  }

  const prisma = {
    onModuleInit: async () => undefined,
    onModuleDestroy: async () => undefined,
    user: {
      upsert: vi.fn(async ({ create }) => create),
    },
    project: {
      findMany: vi.fn(async () =>
        Array.from(projects.values()).sort(
          (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
        ),
      ),
      create: vi.fn(async ({ data }) => {
        const id = `project_${projectSequence}`;
        const now = nextDate();
        projectSequence += 1;
        const stored: StoredProject = {
          id,
          ownerUserId: data.ownerUserId,
          title: data.title,
          description: data.description ?? null,
          defaultAspectRatio: data.defaultAspectRatio ?? "9:16",
          createdAt: now,
          updatedAt: now,
          _count: { assets: 0 },
        };
        projects.set(id, stored);
        return stored;
      }),
      findUnique: vi.fn(async ({ where }) => projects.get(where.id) ?? null),
      update: vi.fn(async ({ where, data }) => {
        const existing = projects.get(where.id);
        if (!existing) {
          throw new Error("Project not found");
        }

        const updated = { ...existing, updatedAt: nextDate() };
        for (const [key, value] of Object.entries(data)) {
          if (value !== undefined) {
            (updated as Record<string, unknown>)[key] = value;
          }
        }
        projects.set(where.id, updated);
        return updated;
      }),
      delete: vi.fn(async ({ where }) => {
        const existing = projects.get(where.id);
        if (!existing) {
          throw new Error("Project not found");
        }
        projects.delete(where.id);
        canvasDocuments.delete(where.id);
        for (const [nodeId, node] of canvasNodes.entries()) {
          if (node.projectId === where.id) {
            canvasNodes.delete(nodeId);
          }
        }
        for (const [edgeId, edge] of canvasEdges.entries()) {
          if (edge.projectId === where.id) {
            canvasEdges.delete(edgeId);
          }
        }
        for (const [novelId, novel] of novelDocuments.entries()) {
          if (novel.projectId === where.id) {
            novelDocuments.delete(novelId);
          }
        }
        for (const [draftId, draft] of storyboardDrafts.entries()) {
          if (draft.projectId === where.id) {
            storyboardDrafts.delete(draftId);
          }
        }
        return existing;
      }),
    },
    novelDocument: {
      findMany: vi.fn(async ({ where }) =>
        Array.from(novelDocuments.values())
          .filter((novel) => novel.projectId === where.projectId)
          .sort(
            (left, right) =>
              (right.updatedAt as Date).getTime() - (left.updatedAt as Date).getTime(),
          ),
      ),
      create: vi.fn(async ({ data }) => {
        const id = `novel_${novelSequence}`;
        novelSequence += 1;
        const now = new Date("2026-06-12T00:35:00.000Z");
        const novel = {
          id,
          projectId: data.projectId,
          title: data.title,
          content: data.content,
          sourceType: data.sourceType,
          wordCount: data.wordCount,
          language: data.language,
          createdAt: now,
          updatedAt: now,
        };
        novelDocuments.set(id, novel);
        return novel;
      }),
      findFirst: vi.fn(async ({ where }) => {
        const novel = novelDocuments.get(where.id);
        if (!novel || novel.projectId !== where.projectId) {
          return null;
        }
        return novel;
      }),
      update: vi.fn(async ({ where, data }) => {
        const existing = novelDocuments.get(where.id);
        if (!existing) {
          throw new Error("Novel not found");
        }
        const updated = {
          ...existing,
          ...Object.fromEntries(
            Object.entries(data).filter(([, value]) => value !== undefined),
          ),
          updatedAt: new Date("2026-06-12T00:36:00.000Z"),
        };
        novelDocuments.set(where.id, updated);
        return updated;
      }),
      delete: vi.fn(async ({ where }) => {
        const existing = novelDocuments.get(where.id);
        if (!existing) {
          throw new Error("Novel not found");
        }
        novelDocuments.delete(where.id);
        for (const [draftId, draft] of storyboardDrafts.entries()) {
          if (draft.novelDocumentId === where.id) {
            storyboardDrafts.delete(draftId);
          }
        }
        return existing;
      }),
    },
    storyboardDraft: {
      create: vi.fn(async ({ data }) => {
        const id = `storyboard_draft_${storyboardDraftSequence}`;
        storyboardDraftSequence += 1;
        const now = new Date("2026-06-12T00:37:00.000Z");
        const draft = {
          id,
          projectId: data.projectId,
          novelDocumentId: data.novelDocumentId,
          status: data.status ?? "draft",
          storyboardJson: data.storyboardJson ?? null,
          validationIssuesJson: data.validationIssuesJson ?? [],
          provider: data.provider,
          model: data.model ?? null,
          errorMessage: data.errorMessage ?? null,
          readyForImport: data.readyForImport ?? false,
          createdAt: now,
          updatedAt: now,
        };
        storyboardDrafts.set(id, draft);
        return draft;
      }),
      findFirst: vi.fn(async ({ where }) =>
        Array.from(storyboardDrafts.values())
          .filter(
            (draft) =>
              draft.projectId === where.projectId &&
              (!where.id || draft.id === where.id) &&
              (!where.novelDocumentId || draft.novelDocumentId === where.novelDocumentId),
          )
          .sort(
            (left, right) =>
              (right.updatedAt as Date).getTime() - (left.updatedAt as Date).getTime(),
          )[0] ?? null,
      ),
      update: vi.fn(async ({ where, data }) => {
        const existing = storyboardDrafts.get(where.id);
        if (!existing) {
          throw new Error("Storyboard draft not found");
        }
        const updated = {
          ...existing,
          ...Object.fromEntries(
            Object.entries(data).filter(([, value]) => value !== undefined),
          ),
          updatedAt: new Date("2026-06-12T00:38:00.000Z"),
        };
        storyboardDrafts.set(where.id, updated);
        return updated;
      }),
    },
    generationJob: {
      create: vi.fn(async ({ data }) => {
        const id = `generation_job_${generationJobSequence}`;
        generationJobSequence += 1;
        const job = {
          id,
          projectId: data.projectId,
          operation: data.operation,
          status: data.status,
          provider: data.provider,
          model: data.model ?? null,
          sourceNodeId: data.sourceNodeId ?? null,
          targetNodeId: data.targetNodeId ?? null,
          providerTaskId: data.providerTaskId ?? null,
          inputJson: data.inputJson,
          outputJson: data.outputJson ?? null,
          errorMessage: data.errorMessage ?? null,
          createdAt: new Date("2026-06-12T01:05:00.000Z"),
          updatedAt: new Date("2026-06-12T01:05:00.000Z"),
        };
        generationJobs.set(id, job);
        return job;
      }),
      findMany: vi.fn(async ({ where, select }) => {
        const filtered = Array.from(generationJobs.values())
          .filter((job) => job.projectId === where.projectId)
          .sort(
            (left, right) =>
              (right.createdAt as Date).getTime() - (left.createdAt as Date).getTime(),
          );
        if (select?.status) {
          return filtered.map((job) => ({ status: job.status }));
        }
        return filtered;
      }),
      findFirst: vi.fn(async ({ where }) => {
        const jobs = Array.from(generationJobs.values());
        if (where.id) {
          return jobs.find((job) => job.id === where.id && job.projectId === where.projectId) ?? null;
        }
        return (
          jobs
            .filter(
              (job) =>
                (!where.projectId || job.projectId === where.projectId) &&
                (!where.status || job.status === where.status) &&
                (!where.operation?.in || where.operation.in.includes(job.operation)),
            )
            .sort(
              (left, right) =>
                (left.createdAt as Date).getTime() - (right.createdAt as Date).getTime(),
            )[0] ?? null
        );
      }),
      findUnique: vi.fn(async ({ where }) => generationJobs.get(where.id) ?? null),
      updateMany: vi.fn(async ({ where, data }) => {
        const existing = generationJobs.get(where.id);
        if (!existing || existing.status !== where.status) {
          return { count: 0 };
        }
        generationJobs.set(where.id, {
          ...existing,
          ...data,
          updatedAt: new Date("2026-06-12T01:06:00.000Z"),
        });
        return { count: 1 };
      }),
      update: vi.fn(async ({ where, data }) => {
        const existing = generationJobs.get(where.id);
        if (!existing) {
          throw new Error("Generation job not found");
        }
        const updated = {
          ...existing,
          ...data,
          updatedAt: new Date("2026-06-12T01:07:00.000Z"),
        };
        generationJobs.set(where.id, updated);
        return updated;
      }),
    },
    canvasDocument: {
      upsert: vi.fn(async ({ where, update, create }) => {
        const existing = canvasDocuments.get(where.projectId);
        if (existing) {
          const updated = {
            ...existing,
            ...update,
            updatedAt: new Date("2026-06-12T00:45:00.000Z"),
          };
          canvasDocuments.set(where.projectId, updated);
          return updated;
        }

        const canvasDocument = {
          id: `canvas_${canvasSequence}`,
          projectId: create.projectId,
          snapshotJson: create.snapshotJson ?? {},
          createdAt: new Date("2026-06-12T00:40:00.000Z"),
          updatedAt: new Date("2026-06-12T00:40:00.000Z"),
        };
        canvasSequence += 1;
        canvasDocuments.set(create.projectId, canvasDocument);
        return canvasDocument;
      }),
    },
    canvasNode: {
      findMany: vi.fn(async ({ where }) =>
        Array.from(canvasNodes.values())
          .filter(
            (node) =>
              node.projectId === where.projectId &&
              (!where.canvasDocumentId || node.canvasDocumentId === where.canvasDocumentId) &&
              (!where.type || node.type === where.type) &&
              (!where.id?.in || where.id.in.includes(node.id)),
          )
          .sort(
            (left, right) =>
              ((left.zIndex as number | undefined) ?? 0) -
                ((right.zIndex as number | undefined) ?? 0) ||
              (left.createdAt as Date).getTime() - (right.createdAt as Date).getTime(),
          ),
      ),
      findFirst: vi.fn(async ({ where }) => {
        const node = canvasNodes.get(where.id);
        if (!node || node.projectId !== where.projectId) {
          return null;
        }
        return node;
      }),
      create: vi.fn(async ({ data }) => {
        const id = `node_${nodeSequence}`;
        nodeSequence += 1;
        const node = {
          id,
          projectId: data.projectId,
          canvasDocumentId: data.canvasDocumentId,
          tldrawShapeId: data.tldrawShapeId,
          type: data.type,
          title: data.title ?? null,
          x: data.x ?? 0,
          y: data.y ?? 0,
          width: data.width ?? 320,
          height: data.height ?? 220,
          zIndex: data.zIndex ?? 0,
          status: data.status ?? "draft",
          dataJson: data.dataJson ?? {},
          createdAt: new Date("2026-06-12T00:50:00.000Z"),
          updatedAt: new Date("2026-06-12T00:50:00.000Z"),
        };
        canvasNodes.set(id, node);
        return node;
      }),
      update: vi.fn(async ({ where, data }) => {
        const existing = canvasNodes.get(where.id);
        if (!existing) {
          throw new Error("Canvas node not found");
        }
        const updated = {
          ...existing,
          ...data,
          updatedAt: new Date("2026-06-12T00:55:00.000Z"),
        };
        canvasNodes.set(where.id, updated);
        return updated;
      }),
      delete: vi.fn(async ({ where }) => {
        const existing = canvasNodes.get(where.id);
        if (!existing) {
          throw new Error("Canvas node not found");
        }
        canvasNodes.delete(where.id);
        for (const [edgeId, edge] of canvasEdges.entries()) {
          if (edge.sourceNodeId === where.id || edge.targetNodeId === where.id) {
            canvasEdges.delete(edgeId);
          }
        }
        return existing;
      }),
    },
    canvasEdge: {
      findMany: vi.fn(async ({ where }) =>
        Array.from(canvasEdges.values())
          .filter(
            (edge) =>
              edge.projectId === where.projectId &&
              (!where.canvasDocumentId || edge.canvasDocumentId === where.canvasDocumentId),
          )
          .sort(
            (left, right) =>
              (left.createdAt as Date).getTime() - (right.createdAt as Date).getTime(),
          ),
      ),
      findFirst: vi.fn(async ({ where }) => {
        if (where.id) {
          const edge = canvasEdges.get(where.id);
          return edge && edge.projectId === where.projectId ? edge : null;
        }

        return (
          Array.from(canvasEdges.values()).find(
            (edge) =>
              edge.projectId === where.projectId &&
              edge.canvasDocumentId === where.canvasDocumentId &&
              edge.sourceNodeId === where.sourceNodeId &&
              edge.targetNodeId === where.targetNodeId &&
              edge.relation === where.relation,
          ) ?? null
        );
      }),
      create: vi.fn(async ({ data }) => {
        const id = `edge_${edgeSequence}`;
        edgeSequence += 1;
        const edge = {
          id,
          projectId: data.projectId,
          canvasDocumentId: data.canvasDocumentId,
          sourceNodeId: data.sourceNodeId,
          targetNodeId: data.targetNodeId,
          sourceShapeId: data.sourceShapeId ?? null,
          targetShapeId: data.targetShapeId ?? null,
          visualArrowShapeId: data.visualArrowShapeId ?? null,
          relation: data.relation,
          dataJson: data.dataJson ?? null,
          createdAt: new Date("2026-06-12T01:00:00.000Z"),
        };
        canvasEdges.set(id, edge);
        return edge;
      }),
      update: vi.fn(async ({ where, data }) => {
        const existing = canvasEdges.get(where.id);
        if (!existing) {
          throw new Error("Canvas edge not found");
        }
        const updated = {
          ...existing,
          ...data,
        };
        canvasEdges.set(where.id, updated);
        return updated;
      }),
      delete: vi.fn(async ({ where }) => {
        const existing = canvasEdges.get(where.id);
        if (!existing) {
          throw new Error("Canvas edge not found");
        }
        canvasEdges.delete(where.id);
        return existing;
      }),
      deleteMany: vi.fn(async ({ where }) => {
        const edgeIds = new Set(where.id?.in ?? []);
        let count = 0;
        for (const [edgeId, edge] of canvasEdges.entries()) {
          if (edgeIds.has(edgeId) && edge.projectId === where.projectId) {
            canvasEdges.delete(edgeId);
            count += 1;
          }
        }
        return { count };
      }),
    },
    asset: {
      findMany: vi.fn(async ({ where }) =>
        Array.from(assets.values())
          .filter((asset) => asset.projectId === where.projectId)
          .sort(
            (left, right) =>
              (right.createdAt as Date).getTime() - (left.createdAt as Date).getTime(),
          ),
      ),
      create: vi.fn(async ({ data }) => {
        const id = `asset_${assetSequence}`;
        assetSequence += 1;
        const asset = {
          id,
          projectId: data.projectId,
          type: data.type,
          purpose: data.purpose,
          storageKey: data.storageKey,
          mimeType: data.mimeType,
          originalFilename: data.originalFilename ?? null,
          sizeBytes: data.sizeBytes ?? null,
          width: null,
          height: null,
          durationMs: null,
          metadataJson: data.metadataJson ?? null,
          createdAt: new Date("2026-06-12T00:30:00.000Z"),
        };
        assets.set(id, asset);
        return asset;
      }),
      findFirst: vi.fn(async ({ where }) => {
        const asset = assets.get(where.id);
        if (!asset || asset.projectId !== where.projectId) {
          return null;
        }
        return asset;
      }),
      delete: vi.fn(async ({ where }) => {
        const asset = assets.get(where.id);
        assets.delete(where.id);
        return asset;
      }),
    },
  };

  return {
    ...prisma,
    $transaction: vi.fn(async <T>(callback: (tx: typeof prisma) => Promise<T>) =>
      callback(prisma),
    ),
  };
}

function createStorageE2eMock() {
  const objects = new Map<string, Buffer>();

  return {
    putObject: vi.fn(async ({ projectId, originalFilename, buffer }) => {
      const storageKey = `${projectId}/${originalFilename}`;
      objects.set(storageKey, Buffer.from(buffer));
      return {
        storageKey,
        absolutePath: `/memory/${storageKey}`,
        sizeBytes: buffer.byteLength,
      };
    }),
    writeObject: vi.fn(async ({ storageKey, buffer }) => {
      objects.set(storageKey, Buffer.from(buffer));
      return {
        storageKey,
        absolutePath: `/memory/${storageKey}`,
        sizeBytes: buffer.byteLength,
      };
    }),
    readObject: vi.fn(async (storageKey: string) => {
      const object = objects.get(storageKey);
      if (!object) {
        throw new Error("Object not found");
      }
      return object;
    }),
    deleteObject: vi.fn(async (storageKey: string) => {
      objects.delete(storageKey);
    }),
  };
}

function createProvidersE2eMock() {
  return {
    getImageProviders: vi.fn(() => ({
      providers: [
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
          enabled: true,
          requiresApiKey: true,
          defaultModel: "gpt-image-2",
          models: [{ id: "gpt-image-2", displayName: "GPT Image 2", default: true }],
          supportedModes: ["text_to_image", "multi_reference"],
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
      ],
    })),
    getVideoProviders: vi.fn(() => ({
      providers: [
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
          enabled: true,
          requiresApiKey: true,
          defaultModel: "seedance-1-0-pro",
          models: [{ id: "seedance-1-0-pro", displayName: "Seedance 1.0 Pro", default: true }],
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
      ],
    })),
  };
}

describe("project api e2e", () => {
  let app: INestApplication;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    fetchMock = vi.fn(async () =>
      new Response(new Uint8Array(Buffer.from("remote-image-two")), {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createPrismaE2eMock())
      .overrideProvider(LocalStorageService)
      .useValue(createStorageE2eMock())
      .overrideProvider(ProvidersService)
      .useValue(createProvidersE2eMock())
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    vi.unstubAllGlobals();
  });

  it("lists image and video provider catalogs without provider secrets", async () => {
    const imageResponse = await request(app.getHttpServer()).get("/api/v1/providers/image").expect(200);
    const videoResponse = await request(app.getHttpServer()).get("/api/v1/providers/video").expect(200);

    expect(imageResponse.body.providers.map((provider: { id: string }) => provider.id)).toContain(
      "mock-image",
    );
    expect(videoResponse.body.providers.map((provider: { id: string }) => provider.id)).toEqual([
      "mock-video",
      "seedance",
    ]);
    expect(videoResponse.body.providers.find((provider: { id: string }) => provider.id === "seedance")).toMatchObject({
      enabled: true,
      supportsCancel: true,
      supportedResolutions: ["720p", "1080p"],
    });
    expect(JSON.stringify(videoResponse.body)).not.toContain("secret");
    expect(JSON.stringify(videoResponse.body)).not.toContain("API_KEY");
  });

  it("creates, lists, updates, duplicates, and deletes projects", async () => {
    const created = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({
        title: "Pilot Project",
        description: "Phase 1 demo",
        defaultAspectRatio: "16:9",
      })
      .expect(201);

    expect(created.body).toMatchObject({
      title: "Pilot Project",
      ownerUserId: "default-user",
      defaultAspectRatio: "16:9",
      assetCount: 0,
    });

    const projectId = created.body.id;
    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}`)
      .send({ title: "Updated Project" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.title).toBe("Updated Project");
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/duplicate`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.id).not.toBe(projectId);
        expect(body.title).toBe("Updated Project Copy");
      });

    await request(app.getHttpServer())
      .get("/api/v1/projects")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(2);
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}`)
      .expect(200)
      .expect({ deleted: true });
  });

  it("rejects invalid project input and reports missing projects", async () => {
    await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "", defaultAspectRatio: "21:9" })
      .expect(400);

    await request(app.getHttpServer()).get("/api/v1/projects/missing").expect(404);
  });

  it("uploads, previews, lists, and deletes project assets", async () => {
    const createdProject = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "Asset Project" })
      .expect(201);
    const projectId = createdProject.body.id;

    const markdownUpload = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/assets/upload`)
      .field("purpose", "uploaded")
      .attach("file", Buffer.from("# Notes"), {
        filename: "notes.md",
        contentType: "text/markdown",
      })
      .expect(201);

    expect(markdownUpload.body).toMatchObject({
      projectId,
      type: "document",
      originalFilename: "notes.md",
      previewKind: "text",
    });

    const assetId = markdownUpload.body.id;

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/assets`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0].id).toBe(assetId);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/assets/${assetId}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.textPreview).toBe("# Notes");
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/assets/${assetId}/preview`)
      .expect(200)
      .expect("Content-Type", /text\/markdown/)
      .expect("# Notes");

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/assets/${assetId}`)
      .expect(200)
      .expect({ deleted: true });
  });

  it("completes multi-output image generation into local assets, image nodes, and generated edges", async () => {
    const createdProject = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "Generation Project" })
      .expect(201);
    const projectId = createdProject.body.id;

    const createdNovel = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels`)
      .send({
        title: "Generation Source",
        content:
          "A hero watches the city lights before choosing the next shot. An ally joins with a warning.",
      })
      .expect(201);

    const generated = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels/${createdNovel.body.novel.id}/generate-storyboard`)
      .expect(201);
    await request(app.getHttpServer())
      .post(
        `/api/v1/projects/${projectId}/novels/${createdNovel.body.novel.id}/storyboard-draft/${generated.body.draft.id}/ready`,
      )
      .expect(201);
    const imported = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/import-storyboard`)
      .send({
        novelDocumentId: createdNovel.body.novel.id,
        storyboardDraftId: generated.body.draft.id,
        duplicatePolicy: "new_version",
      })
      .expect(201);
    const shotNode = (imported.body.nodes as CanvasNodeRecord[]).find((node) => node.type === "shot");
    expect(shotNode).toBeDefined();

    const createdJob = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/generation/jobs`)
      .send({
        operation: "shot_to_image",
        sourceNodeId: shotNode?.id,
        provider: "image2",
        model: "gpt-image-2",
        aspectRatio: "16:9",
        count: 2,
        providerParams: { quality: "high" },
      })
      .expect(201);
    expect(createdJob.body.job.inputJson).toMatchObject({
      provider: "image2",
      model: "gpt-image-2",
      count: 2,
      providerParams: { quality: "high" },
    });

    const claimed = await request(app.getHttpServer())
      .post("/api/v1/worker/generation/jobs/claim")
      .expect(201);
    expect(claimed.body.job.id).toBe(createdJob.body.job.id);
    expect(claimed.body.job.status).toBe("running");

    const providerOutputs = [
      {
        storageKey: "providers/image2/project_1/generated-one.png",
        mimeType: "image/png",
        provider: "image2",
        model: "gpt-image-2",
        prompt: "generated one",
        referenceAssetIds: [],
        bytesBase64: Buffer.from("inline-image-one").toString("base64"),
      },
      {
        storageKey: "providers/image2/project_1/generated-two.png",
        mimeType: "image/png",
        provider: "image2",
        model: "gpt-image-2",
        prompt: "generated two",
        referenceAssetIds: [],
        remoteUrl: "https://cdn.example.test/generated-two.png",
      },
    ];

    const completed = await request(app.getHttpServer())
      .post(`/api/v1/worker/generation/jobs/${createdJob.body.job.id}/succeed`)
      .send({
        providerOutput: providerOutputs[0],
        providerOutputs,
      })
      .expect(201);
    expect(completed.body.status).toBe("succeeded");
    expect(completed.body.outputJson.targets).toHaveLength(2);

    const targetAssetId = completed.body.outputJson.targets[1].assetId;
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/assets/${targetAssetId}/preview`)
      .expect(200)
      .expect("Content-Type", /image\/png/)
      .expect((response) => {
        expect(Buffer.from(response.body).toString("utf8")).toBe("remote-image-two");
      });
    expect(fetchMock).toHaveBeenCalledWith(new URL("https://cdn.example.test/generated-two.png"));

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/canvas`)
      .expect(200)
      .expect(({ body }) => {
        const imageNodes = (body.nodes as CanvasNodeRecord[]).filter(
          (node) =>
            node.type === "image" &&
            (node.dataJson as { generationJobId?: string }).generationJobId ===
              createdJob.body.job.id,
        );
        const generatedEdges = (body.edges as CanvasEdgeRecord[]).filter(
          (edge) =>
            edge.relation === "generated_image" &&
            (edge.dataJson as { generationJobId?: string }).generationJobId ===
              createdJob.body.job.id,
        );
        expect(imageNodes).toHaveLength(2);
        expect(generatedEdges).toHaveLength(2);
      });
  });

  it("rejects unsupported upload file types", async () => {
    const createdProject = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "Invalid Asset Project" })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${createdProject.body.id}/assets/upload`)
      .attach("file", Buffer.from("bad"), {
        filename: "bad.exe",
        contentType: "application/octet-stream",
      })
      .expect(400);
  });

  it("creates, imports, lists, updates, and deletes project novels", async () => {
    const createdProject = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "Novel Project" })
      .expect(201);
    const projectId = createdProject.body.id;

    const createdNovel = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels`)
      .send({
        title: "Rooftop Signal",
        content: "A hero watches the city lights.",
      })
      .expect(201);

    expect(createdNovel.body.novel).toMatchObject({
      projectId,
      title: "Rooftop Signal",
      sourceType: "paste",
      wordCount: 6,
      language: "en",
    });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels/import`)
      .send({
        title: "Imported Markdown",
        content: "# Opening\nA character enters.",
        sourceType: "md",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.novel.sourceType).toBe("md");
        expect(body.novel.wordCount).toBe(4);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/novels`)
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(2);
      });

    const novelId = createdNovel.body.novel.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/novels/${novelId}`)
      .send({ content: "新的城市镜头" })
      .expect(200)
      .expect(({ body }) => {
        expect(body.novel.language).toBe("zh");
        expect(body.novel.wordCount).toBe(6);
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/novels/${novelId}`)
      .expect(200)
      .expect({ deleted: true, novelId });
  });

  it("rejects invalid novel input and project-scoped novel access", async () => {
    const createdProject = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "Novel Validation Project" })
      .expect(201);
    const projectId = createdProject.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels`)
      .send({ title: "Blank", content: "" })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels/import`)
      .send({ title: "Bad", content: "Story", sourceType: "paste" })
      .expect(400);

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/novels/missing`)
      .expect(404);
  });

  it("generates, edits, and marks storyboard drafts ready without canvas import", async () => {
    const createdProject = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "Storyboard Project" })
      .expect(201);
    const projectId = createdProject.body.id;

    const createdNovel = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels`)
      .send({
        title: "Storyboard Source",
        content: "A hero watches the city lights before choosing the next shot.",
      })
      .expect(201);
    const novelId = createdNovel.body.novel.id;

    const generated = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels/${novelId}/generate-storyboard`)
      .expect(201);

    expect(generated.body.validation.success).toBe(true);
    expect(generated.body.draft).toMatchObject({
      projectId,
      novelDocumentId: novelId,
      status: "valid",
      provider: "mock-llm",
      readyForImport: false,
    });
    expect(generated.body.draft.storyboard.scenes[0].shots[0].imagePrompt).toContain("rooftop");

    const draftId = generated.body.draft.id;
    const editedStoryboard = {
      ...generated.body.draft.storyboard,
      logline: "Edited logline",
      scenes: [
        {
          ...generated.body.draft.storyboard.scenes[0],
          shots: [
            {
              ...generated.body.draft.storyboard.scenes[0].shots[0],
              durationSec: 6,
              imagePrompt: "edited rooftop prompt",
            },
          ],
        },
      ],
    };

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/novels/${novelId}/storyboard-draft`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.id).toBe(draftId);
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/novels/${novelId}/storyboard-draft/${draftId}`)
      .send({ storyboard: editedStoryboard })
      .expect(200)
      .expect(({ body }) => {
        expect(body.draft.storyboard.logline).toBe("Edited logline");
        expect(body.draft.storyboard.scenes[0].shots[0].durationSec).toBe(6);
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels/${novelId}/storyboard-draft/${draftId}/ready`)
      .expect(201)
      .expect(({ body }) => {
        expect(body.draft.status).toBe("ready");
        expect(body.draft.readyForImport).toBe(true);
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/novels/${novelId}/storyboard-draft/${draftId}`)
      .send({ storyboard: { ...editedStoryboard, scenes: [] } })
      .expect(400);

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/canvas`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.nodes).toHaveLength(0);
        expect(body.edges).toHaveLength(0);
      });
  });

  it("imports ready storyboard drafts into persistent canvas graph state", async () => {
    const createdProject = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "Storyboard Import Project" })
      .expect(201);
    const projectId = createdProject.body.id;

    const createdNovel = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels`)
      .send({
        title: "Storyboard Import Source",
        content:
          "A hero watches the city lights before choosing the next shot. An ally joins with a warning and points to the next signal.",
      })
      .expect(201);
    const novelId = createdNovel.body.novel.id;

    const generated = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels/${novelId}/generate-storyboard`)
      .expect(201);
    const draftId = generated.body.draft.id;
    const generatedStoryboard = generated.body.draft.storyboard as StoryboardResult;

    expect(generatedStoryboard.scenes).toHaveLength(2);
    expect(generatedStoryboard.scenes.flatMap((scene) => scene.shots)).toHaveLength(6);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels/${novelId}/storyboard-draft/${draftId}/ready`)
      .expect(201);

    const imported = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/import-storyboard`)
      .send({
        novelDocumentId: novelId,
        storyboardDraftId: draftId,
        duplicatePolicy: "new_version",
      })
      .expect(201);
    const importedNodes = imported.body.nodes as CanvasNodeRecord[];
    const importedEdges = imported.body.edges as CanvasEdgeRecord[];

    expect(imported.body.summary).toMatchObject({
      sceneCount: 2,
      shotCount: 6,
      characterCount: 2,
      locationCount: 1,
      createdNodeCount: 14,
      reusedNodeCount: 0,
      version: 1,
    });
    expect(importedNodes.map((node) => node.type)).toEqual(
      expect.arrayContaining([
        "novel",
        "scene_frame",
        "scene",
        "shot",
        "character_asset",
        "location_asset",
      ]),
    );
    expect(importedEdges.map((edge) => edge.relation)).toEqual(
      expect.arrayContaining(["belongs_to_scene", "references_character", "references_location"]),
    );

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/canvas`)
      .expect(200)
      .expect(({ body }) => {
        const nodes = body.nodes as CanvasNodeRecord[];
        const edges = body.edges as CanvasEdgeRecord[];
        expect(nodes).toHaveLength(importedNodes.length);
        expect(edges).toHaveLength(importedEdges.length);
        expect(
          nodes.some((node) => {
            const dataJson = node.dataJson as {
              characterAssetIds?: unknown;
              imagePrompt?: unknown;
              locationAssetId?: unknown;
            };
            return (
              node.type === "shot" &&
              typeof dataJson.imagePrompt === "string" &&
              Array.isArray(dataJson.characterAssetIds) &&
              typeof dataJson.locationAssetId === "string"
            );
          }),
        ).toBe(true);
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/import-storyboard`)
      .send({
        novelDocumentId: novelId,
        storyboardDraftId: draftId,
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.summary.version).toBe(2);
        expect(body.summary.createdNodeCount).toBeGreaterThan(0);
      });
  });

  it("composes Shot prompts from imported graph, edited assets, and latest node data", async () => {
    const createdProject = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "Prompt Composer Project" })
      .expect(201);
    const projectId = createdProject.body.id;

    const createdNovel = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels`)
      .send({
        title: "Prompt Composer Source",
        content:
          "A hero watches the city lights before choosing the next shot. An ally joins with a warning and points to the next signal.",
      })
      .expect(201);
    const novelId = createdNovel.body.novel.id;

    const generated = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels/${novelId}/generate-storyboard`)
      .expect(201);
    const draftId = generated.body.draft.id;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/novels/${novelId}/storyboard-draft/${draftId}/ready`)
      .expect(201);

    const imported = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/import-storyboard`)
      .send({
        novelDocumentId: novelId,
        storyboardDraftId: draftId,
      })
      .expect(201);

    const importedNodes = imported.body.nodes as CanvasNodeRecord[];
    const shotNode = importedNodes.find((node) => node.type === "shot");
    const characterNode = importedNodes.find((node) => node.type === "character_asset");
    const locationNode = importedNodes.find((node) => node.type === "location_asset");
    expect(shotNode).toBeTruthy();
    expect(characterNode).toBeTruthy();
    expect(locationNode).toBeTruthy();

    const uploadedReference = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/assets/upload`)
      .field("purpose", "character_reference")
      .attach("file", Buffer.from("fake image"), {
        filename: "hero.png",
        contentType: "image/png",
      })
      .expect(201);
    const referenceAssetId = uploadedReference.body.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/canvas/nodes/${characterNode!.id}`)
      .send({
        dataJson: {
          ...(characterNode!.dataJson as Record<string, unknown>),
          identityPrompt: "edited e2e character identity",
          referenceAssetIds: [referenceAssetId],
        },
      })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/canvas/nodes/${locationNode!.id}`)
      .send({
        dataJson: {
          ...(locationNode!.dataJson as Record<string, unknown>),
          locationPrompt: "edited e2e location prompt",
        },
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/prompts/shot/${shotNode!.id}/compose`)
      .send({
        globalStylePrompt: "storybook ink wash",
        modelPromptSuffix: "clean frame",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.sourceNodeIds.shotNodeId).toBe(shotNode!.id);
        expect(body.sourceNodeIds.characterNodeIds).toContain(characterNode!.id);
        expect(body.sourceNodeIds.locationNodeId).toBe(locationNode!.id);
        expect(body.image.prompt).toContain("edited e2e character identity");
        expect(body.image.prompt).toContain("edited e2e location prompt");
        expect(body.image.prompt).toContain("storybook ink wash");
        expect(body.video.prompt).toContain("Video prompt");
        expect(body.referenceAssetIds).toContain(referenceAssetId);
        expect(body.debugParts.map((part: { kind: string }) => part.kind)).toEqual(
          expect.arrayContaining(["scene", "character", "location", "shot"]),
        );
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/prompts/shot/${characterNode!.id}/compose`)
      .expect(400);

    const otherProject = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "Other Prompt Project" })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${otherProject.body.id}/prompts/shot/${shotNode!.id}/compose`)
      .expect(404);
  });

  it("creates, saves, and reloads project canvas snapshots", async () => {
    const createdProject = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "Canvas Project" })
      .expect(201);
    const projectId = createdProject.body.id;

    const firstLoad = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/canvas`)
      .expect(200);

    expect(firstLoad.body).toMatchObject({
      canvasDocument: {
        projectId,
        snapshotJson: {},
      },
      nodes: [],
      edges: [],
      assets: [],
    });

    const snapshotJson = {
      document: {
        records: [{ id: "shape:box", typeName: "shape", type: "geo" }],
      },
      session: {
        camera: { x: 12, y: 24, z: 1 },
      },
    };

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/canvas/snapshot`)
      .send({ snapshotJson })
      .expect(200)
      .expect(({ body }) => {
        expect(body.canvasDocument.projectId).toBe(projectId);
        expect(body.canvasDocument.snapshotJson).toEqual(snapshotJson);
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/canvas`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.canvasDocument.snapshotJson).toEqual(snapshotJson);
      });
  });

  it("creates, updates, moves, lists, and deletes business canvas nodes", async () => {
    const createdProject = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "Business Canvas Project" })
      .expect(201);
    const projectId = createdProject.body.id;

    const createdNode = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/nodes`)
      .send({
        tldrawShapeId: "shape:shot-1",
        type: "shot",
        title: "Shot 001",
        x: 10,
        y: 20,
        width: 360,
        height: 220,
        dataJson: {
          visualDescription: "Wide shot of the launch platform.",
          cameraMovement: "Slow push-in",
        },
      })
      .expect(201);

    expect(createdNode.body.node).toMatchObject({
      projectId,
      tldrawShapeId: "shape:shot-1",
      type: "shot",
      title: "Shot 001",
      status: "draft",
    });

    const nodeId = createdNode.body.node.id;
    const updatedDescription = "Closer shot with brighter practical lights.";

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/canvas/nodes/${nodeId}`)
      .send({
        title: "Shot 001A",
        status: "succeeded",
        dataJson: {
          visualDescription: updatedDescription,
          action: "Ari tightens the cable.",
        },
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body.node.title).toBe("Shot 001A");
        expect(body.node.dataJson.visualDescription).toBe(updatedDescription);
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/canvas/nodes/${nodeId}/geometry`)
      .send({ x: 120, y: 140, width: 420, height: 260, zIndex: 5 })
      .expect(200)
      .expect(({ body }) => {
        expect(body.node).toMatchObject({ x: 120, y: 140, width: 420, height: 260, zIndex: 5 });
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/assets/upload`)
      .attach("file", Buffer.from("# Asset Notes"), {
        filename: "asset-notes.md",
        contentType: "text/markdown",
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/canvas`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.nodes).toHaveLength(1);
        expect(body.nodes[0]).toMatchObject({
          id: nodeId,
          title: "Shot 001A",
          x: 120,
          dataJson: { visualDescription: updatedDescription },
        });
        expect(body.assets).toHaveLength(1);
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/canvas/nodes/${nodeId}`)
      .expect(200)
      .expect({ deleted: true, nodeId });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/canvas`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.nodes).toEqual([]);
        expect(body.assets).toHaveLength(1);
      });
  });

  it("creates, reloads, and deletes semantic canvas edges", async () => {
    const createdProject = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "Semantic Edge Project" })
      .expect(201);
    const projectId = createdProject.body.id;

    const characterNode = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/nodes`)
      .send({
        tldrawShapeId: "shape:character-1",
        type: "character_asset",
        title: "Ari",
        dataJson: { name: "Ari" },
      })
      .expect(201);
    const shotNode = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/nodes`)
      .send({
        tldrawShapeId: "shape:shot-1",
        type: "shot",
        title: "Shot 001",
        dataJson: { visualDescription: "Wide shot" },
      })
      .expect(201);

    const characterEdge = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/edges`)
      .send({
        sourceNodeId: characterNode.body.node.id,
        targetNodeId: shotNode.body.node.id,
        relation: "references_character",
        sourceShapeId: "shape:character-1",
        targetShapeId: "shape:shot-1",
        visualArrowShapeId: "shape:arrow-character-shot",
      })
      .expect(201);

    expect(characterEdge.body.edge).toMatchObject({
      relation: "references_character",
      sourceNodeId: characterNode.body.node.id,
      targetNodeId: shotNode.body.node.id,
    });
    expect(characterEdge.body.updatedNodes[0].dataJson).toMatchObject({
      characterAssetIds: [characterNode.body.node.id],
    });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/edges`)
      .send({
        sourceNodeId: characterNode.body.node.id,
        targetNodeId: shotNode.body.node.id,
        relation: "references_character",
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body.edge.id).toBe(characterEdge.body.edge.id);
      });

    const locationNode = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/nodes`)
      .send({
        tldrawShapeId: "shape:location-1",
        type: "location_asset",
        title: "Launch Site",
        dataJson: { name: "Launch Site" },
      })
      .expect(201);
    const sceneFrameNode = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/nodes`)
      .send({
        tldrawShapeId: "shape:frame-1",
        type: "scene_frame",
        title: "Frame 1",
        dataJson: { label: "Scene 1" },
      })
      .expect(201);
    const secondShotNode = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/nodes`)
      .send({
        tldrawShapeId: "shape:shot-2",
        type: "shot",
        title: "Shot 002",
      })
      .expect(201);

    const locationEdge = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/edges`)
      .send({
        sourceNodeId: locationNode.body.node.id,
        targetNodeId: sceneFrameNode.body.node.id,
        relation: "references_location",
        sourceShapeId: "shape:location-1",
        targetShapeId: "shape:frame-1",
        visualArrowShapeId: "shape:arrow-location-frame",
        affectedShotNodeIds: [shotNode.body.node.id, secondShotNode.body.node.id],
      })
      .expect(201);

    expect(locationEdge.body.appliedShotCount).toBe(2);
    expect(locationEdge.body.edges).toHaveLength(3);
    expect(locationEdge.body.edge.dataJson).toMatchObject({
      appliedShotNodeIds: [shotNode.body.node.id, secondShotNode.body.node.id],
    });
    expect(locationEdge.body.updatedNodes).toEqual([
      expect.objectContaining({
        id: shotNode.body.node.id,
        dataJson: expect.objectContaining({ locationAssetId: locationNode.body.node.id }),
      }),
      expect.objectContaining({
        id: secondShotNode.body.node.id,
        dataJson: expect.objectContaining({ locationAssetId: locationNode.body.node.id }),
      }),
    ]);

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/canvas`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.edges).toHaveLength(4);
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/canvas/edges/${locationEdge.body.edge.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.deletedEdgeIds).toHaveLength(3);
        expect(body.updatedNodes).toEqual([
          expect.objectContaining({
            id: shotNode.body.node.id,
            dataJson: expect.not.objectContaining({ locationAssetId: locationNode.body.node.id }),
          }),
          expect.objectContaining({
            id: secondShotNode.body.node.id,
            dataJson: expect.not.objectContaining({ locationAssetId: locationNode.body.node.id }),
          }),
        ]);
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectId}/canvas/edges/${characterEdge.body.edge.id}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.updatedNodes[0].dataJson).not.toHaveProperty("characterAssetIds");
      });

    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectId}/canvas`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.edges).toEqual([]);
      });

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/edges`)
      .send({
        sourceNodeId: characterNode.body.node.id,
        targetNodeId: locationNode.body.node.id,
        relation: "references_character",
      })
      .expect(400);
  });

  it("rejects invalid business canvas node input", async () => {
    const createdProject = await request(app.getHttpServer())
      .post("/api/v1/projects")
      .send({ title: "Invalid Business Canvas Project" })
      .expect(201);
    const projectId = createdProject.body.id;

    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/nodes`)
      .send({
        tldrawShapeId: "shape:style-1",
        type: "style_asset",
      })
      .expect(400);

    const createdNode = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/canvas/nodes`)
      .send({
        tldrawShapeId: "shape:shot-1",
        type: "shot",
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectId}/canvas/nodes/${createdNode.body.node.id}/geometry`)
      .send({ x: 0, y: 0, width: 0, height: 220 })
      .expect(400);
  });
});
