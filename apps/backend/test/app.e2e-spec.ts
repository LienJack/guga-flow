import "reflect-metadata";

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
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
  let projectSequence = 1;
  let assetSequence = 1;
  let canvasSequence = 1;
  let nodeSequence = 1;

  function nextDate() {
    return new Date(`2026-06-12T00:${String(projectSequence).padStart(2, "0")}:00.000Z`);
  }

  return {
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
        return existing;
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
              node.canvasDocumentId === where.canvasDocumentId,
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
        return existing;
      }),
    },
    canvasEdge: {
      findMany: vi.fn(async () => []),
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

describe("project api e2e", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createPrismaE2eMock())
      .overrideProvider(LocalStorageService)
      .useValue(createStorageE2eMock())
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
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
