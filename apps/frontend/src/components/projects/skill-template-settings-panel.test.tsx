import type { SkillTemplateSummary } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";

import { SkillTemplateSettingsPanel } from "./skill-template-settings-panel";

const skillTemplates: SkillTemplateSummary[] = [
  {
    id: "skill_art",
    projectId: "project_1",
    kind: "art",
    slug: "art-default",
    displayName: "Art Skill",
    description: "Visual style rules",
    enabled: true,
    presetCategories: ["ai-image"],
    triggerModes: ["insert_prompt", "direct_generate"],
    agentRoles: ["asset", "video_prompt"],
    indexStatus: "ready",
    activeSummary: "Use crisp cyan highlights.",
    activeVersionId: "skill_version_2",
    versions: [
      {
        id: "skill_version_2",
        version: 2,
        sourceText: "Use crisp cyan highlights.",
        status: "valid",
        diagnostics: [],
        createdAt: "2026-06-13T01:00:00.000Z",
        active: true,
      },
      {
        id: "skill_version_1",
        version: 1,
        sourceText: "Use concrete visual direction.",
        status: "valid",
        diagnostics: [],
        createdAt: "2026-06-13T00:00:00.000Z",
        active: false,
      },
      {
        id: "skill_version_3",
        version: 3,
        sourceText: "export default {}",
        status: "invalid",
        diagnostics: [{ path: "sourceText", message: "ES module exports are not allowed" }],
        createdAt: "2026-06-13T02:00:00.000Z",
        active: false,
      },
    ],
    createdAt: "2026-06-13T00:00:00.000Z",
    updatedAt: "2026-06-13T01:00:00.000Z",
  },
];

describe("SkillTemplateSettingsPanel", () => {
  it("renders skill source editing and version rollback controls", () => {
    const html = renderToStaticMarkup(
      <SkillTemplateSettingsPanel initialSkillTemplates={skillTemplates} projectId="project_1" />,
    );

    expect(html).toContain("Skill Templates");
    expect(html).toContain("Prompt and Agent Skills");
    expect(html).toContain("All categories");
    expect(html).toContain("AI image");
    expect(html).toContain("All roles");
    expect(html).toContain("Insert prompt");
    expect(html).toContain("Art Skill");
    expect(html).toContain("Use crisp cyan highlights.");
    expect(html).toContain("asset");
    expect(html).toContain("video prompt");
    expect(html).toContain("v2");
    expect(html).toContain("v1");
    expect(html).toContain("invalid");
    expect(html).toContain("ES module exports are not allowed");
    expect(html).toContain("Activate");
  });
});
