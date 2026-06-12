import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

import { ConfigService } from "@nestjs/config";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { LocalStorageService } from "./local-storage.service";

describe("LocalStorageService", () => {
  let tempDir: string;
  let service: LocalStorageService;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "guga-flow-storage-"));
    service = new LocalStorageService({
      get: () => tempDir,
    } as unknown as ConfigService);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("stores, reads, and deletes project-scoped objects", async () => {
    const stored = await service.putObject({
      projectId: "project_1",
      originalFilename: "Hero Reference.png",
      mimeType: "image/png",
      buffer: Buffer.from("image-bytes"),
    });

    expect(stored.storageKey).toContain("project_1/");
    expect(stored.storageKey).toContain("Hero-Reference.png");
    await expect(service.readObject(stored.storageKey)).resolves.toEqual(Buffer.from("image-bytes"));

    await service.deleteObject(stored.storageKey);
    await expect(service.readObject(stored.storageKey)).rejects.toThrow();
  });

  it("prevents storage keys from escaping the upload root", () => {
    expect(() => service.resolveStorageKey("../outside.txt")).toThrow(
      "Storage key escapes upload storage root",
    );
  });
});
