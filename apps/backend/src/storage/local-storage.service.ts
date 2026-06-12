import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type { PutObjectInput, StoredObject } from "./storage.types";

function sanitizeFilename(filename: string): string {
  const basename = path.basename(filename).trim() || "upload";
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return sanitized || "upload";
}

@Injectable()
export class LocalStorageService {
  private readonly uploadStorageDir: string;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.uploadStorageDir = configService.get<string>("uploadStorageDir") ?? "data/uploads";
  }

  async putObject(input: PutObjectInput): Promise<StoredObject> {
    const filename = `${randomUUID()}-${sanitizeFilename(input.originalFilename)}`;
    const storageKey = path.posix.join(input.projectId, filename);
    const absolutePath = this.resolveStorageKey(storageKey);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, input.buffer);

    return {
      storageKey,
      absolutePath,
      sizeBytes: input.buffer.byteLength,
    };
  }

  async readObject(storageKey: string): Promise<Buffer> {
    return fs.readFile(this.resolveStorageKey(storageKey));
  }

  async deleteObject(storageKey: string): Promise<void> {
    try {
      await fs.unlink(this.resolveStorageKey(storageKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }
  }

  resolveStorageKey(storageKey: string): string {
    const root = path.resolve(this.uploadStorageDir);
    const resolved = path.resolve(root, storageKey);

    if (!resolved.startsWith(`${root}${path.sep}`) && resolved !== root) {
      throw new Error("Storage key escapes upload storage root");
    }

    return resolved;
  }
}
