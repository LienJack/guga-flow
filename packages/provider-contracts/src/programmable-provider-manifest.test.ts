import { describe, expect, it } from "vitest";

import { parseProgrammableProviderManifestSource } from "./programmable-provider-manifest";

const VALID_IMAGE_SOURCE = `
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
        timeoutMs: 5000,
        maxResponseBytes: 1000000,
      },
      output: { source: "url", path: "data.url", mimeType: "image/png" },
    },
  },
};
`;

const VALID_VIDEO_SOURCE = `
export default {
  id: "custom:motion-cloud",
  kind: "video",
  displayName: "Motion Cloud",
  credentials: [{ key: "apiKey", label: "API Key", type: "password", required: true }],
  models: [{ id: "motion-video-v1", displayName: "Motion Video v1" }],
  defaultModel: "motion-video-v1",
  supportedModes: ["image_to_video"],
  defaultAspectRatio: "16:9",
  supportedAspectRatios: ["16:9"],
  parameters: [],
  video: {
    supportsFirstFrame: true,
    supportsLastFrame: false,
    supportsReferenceImages: true,
    maxReferenceImages: 2,
    supportsCancel: true,
    defaultDurationSeconds: 5,
    supportedDurationSeconds: [5, 8],
    defaultResolution: "720p",
    supportedResolutions: ["720p", "1080p"],
    action: {
      request: {
        method: "POST",
        url: "https://api.example.test/videos",
        headers: { Authorization: "Bearer {{credential.apiKey}}" },
        bodyJson: { prompt: "{{input.prompt}}", image: "{{input.sourceImageAssetId}}" },
      },
      task: {
        idPath: "data.taskId",
        statusPath: "data.status",
        succeededValues: ["succeeded"],
        failedValues: ["failed"],
        output: { source: "url", path: "data.videoUrl", mimeType: "video/mp4" },
        errorPath: "data.error",
        pollRequest: {
          method: "GET",
          url: "https://api.example.test/videos/{{task.providerTaskId}}",
        },
      },
    },
  },
};
`;

describe("programmable provider manifest parser", () => {
  it("parses a data-only image provider manifest", () => {
    const result = parseProgrammableProviderManifestSource(VALID_IMAGE_SOURCE);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("expected manifest to parse");
    }
    expect(result.manifest).toMatchObject({
      id: "custom:atlas-cloud",
      kind: "image",
      displayName: "Atlas Cloud",
      defaultModel: "atlas-image-v1",
      image: {
        action: {
          output: { source: "url", path: "data.url" },
        },
      },
    });
  });

  it("parses a data-only async video provider manifest", () => {
    const result = parseProgrammableProviderManifestSource(VALID_VIDEO_SOURCE);

    expect(result.success).toBe(true);
    if (!result.success) {
      throw new Error("expected manifest to parse");
    }
    expect(result.manifest.video?.action.task).toMatchObject({
      idPath: "data.taskId",
      statusPath: "data.status",
      succeededValues: ["succeeded"],
      failedValues: ["failed"],
    });
  });

  it("rejects executable source constructs before runtime", () => {
    const result = parseProgrammableProviderManifestSource(`
      import fs from "node:fs";
      const key = process.env.OPENAI_API_KEY;
      export default {
        id: "custom:bad",
        kind: "image",
        displayName: "Bad",
        credentials: [],
        models: [{ id: "bad", displayName: "Bad" }],
        defaultModel: "bad",
        supportedModes: ["text_to_image"],
        defaultAspectRatio: "16:9",
        supportedAspectRatios: ["16:9"],
        parameters: [],
        image: {
          supportsReferenceImages: false,
          maxReferenceImages: 0,
          supportsMultipleOutputs: false,
          maxOutputs: 1,
          action: {
            request: { method: "POST", url: fetch("https://api.example.test") },
            output: { source: "url", path: "data.url" },
          },
        },
      };
    `);

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("expected manifest to fail");
    }
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toMatch(/Imports are not allowed/);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toMatch(/Call expressions are not allowed/);
    expect(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n")).toMatch(/Runtime property access is not allowed/);
  });

  it("rejects ids that collide with built-in providers", () => {
    const result = parseProgrammableProviderManifestSource(
      VALID_IMAGE_SOURCE.replace("custom:atlas-cloud", "custom:image2"),
    );

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("expected manifest to fail");
    }
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "id",
          message: expect.stringContaining("not collide with built-ins"),
        }),
      ]),
    );
  });
});
