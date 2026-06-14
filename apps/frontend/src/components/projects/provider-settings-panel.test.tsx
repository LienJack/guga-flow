import type { ProviderManagementResult } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";

import { ProviderSettingsPanel } from "./provider-settings-panel";

const providerManagementFixture: ProviderManagementResult = {
  llm: [
    {
      id: "mock-llm",
      kind: "llm",
      displayName: "Mock LLM",
      enabled: true,
      requiresApiKey: false,
      defaultModel: "mock-storyboard",
      models: [
        {
          id: "mock-storyboard",
          displayName: "Mock Storyboard",
          default: true,
          kind: "llm",
          modes: ["chat", "json"],
          supportsJsonMode: true,
        },
      ],
      supportedModes: ["chat", "json"],
      supportsJsonMode: true,
      supportsToolCalls: false,
      supportsVision: false,
      parameters: [],
      configuredEnabled: true,
      credentialConfigured: true,
      configuredDefaultModel: "mock-storyboard",
    },
  ],
  image: [
    {
      id: "image2",
      kind: "image",
      displayName: "Image 2",
      enabled: true,
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
      parameters: [],
      configuredEnabled: true,
      credentialConfigured: true,
      credentialSource: "stored",
      configuredDefaultModel: "gpt-image-2",
      lastTest: {
        status: "succeeded",
        testedAt: "2026-06-13T10:00:00.000Z",
        model: "gpt-image-2",
        message: "Image 2 is configured for gpt-image-2",
      },
    },
  ],
  video: [
    {
      id: "seedance",
      kind: "video",
      displayName: "Seedance",
      enabled: false,
      disabledReason: "Seedance server-side key is not configured",
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
      parameters: [],
      configuredEnabled: true,
      credentialConfigured: false,
      configuredDefaultModel: "seedance-1-0-pro",
    },
  ],
};

const programmableProviderFixture = [
  {
    id: "programmable_provider_1",
    kind: "image" as const,
    provider: "custom:atlas-cloud" as const,
    displayName: "Atlas Cloud",
    activeVersionId: "programmable_version_1",
    versions: [
      {
        id: "programmable_version_1",
        version: 1,
        status: "valid" as const,
        diagnostics: [],
        createdAt: "2026-06-13T10:00:00.000Z",
        active: true,
      },
      {
        id: "programmable_version_2",
        version: 2,
        status: "invalid" as const,
        diagnostics: [{ path: "source", message: "Call expressions are not allowed" }],
        createdAt: "2026-06-13T11:00:00.000Z",
        active: false,
      },
    ],
    enabled: true,
    credentialConfigured: true,
  },
];

describe("ProviderSettingsPanel", () => {
  it("renders project provider controls without exposing credential values", () => {
    const html = renderToStaticMarkup(
      <ProviderSettingsPanel
        initialProviders={providerManagementFixture}
        initialProgrammableProviders={programmableProviderFixture}
        projectId="project_1"
      />,
    );

    expect(html).toContain("Image Providers");
    expect(html).toContain("LLM Providers");
    expect(html).toContain("Video Providers");
    expect(html).toContain("Mock LLM");
    expect(html).toContain("mock-storyboard");
    expect(html).toContain("Image 2");
    expect(html).toContain("Seedance");
    expect(html).toContain("Clear stored key");
    expect(html).toContain("Programmable Providers");
    expect(html).toContain("Atlas Cloud");
    expect(html).toContain("custom:atlas-cloud");
    expect(html).toContain("Call expressions are not allowed");
    expect(html).toContain("Ready");
    expect(html).not.toContain("sk-");
    expect(html).not.toContain("OPENAI_API_KEY");
  });
});
