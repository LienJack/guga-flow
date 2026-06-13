import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import {
  CreativeAgentEntry,
  requiresCreativeCanvasImportConfirmation,
} from "./creative-agent-entry";

describe("CreativeAgentEntry", () => {
  it("renders the novice creative brief entry without advanced direction fields", () => {
    const html = renderToStaticMarkup(
      <CreativeAgentEntry
        projectId="project_1"
        onCreativeStoryboardCreated={vi.fn()}
      />,
    );

    expect(html).toContain("Creative brief");
    expect(html).toContain("Creative mode");
    expect(html).toContain("Idea");
    expect(html).toContain("Canvas draft");
    expect(html).toContain("Create draft");
    expect(html).not.toContain("Audience");
    expect(html).not.toContain("Seconds");
  });

  it("renders advanced direction fields when the entry starts in advanced mode", () => {
    const html = renderToStaticMarkup(
      <CreativeAgentEntry
        projectId="project_1"
        initialMode="advanced"
        onCreativeStoryboardCreated={vi.fn()}
      />,
    );

    expect(html).toContain("Audience");
    expect(html).toContain("Style");
    expect(html).toContain("Seconds");
    expect(html).toContain("aria-pressed=\"true\"");
  });

  it("requires confirmation only when sending a new canvas draft over a prior import", () => {
    expect(requiresCreativeCanvasImportConfirmation(true, true)).toBe(true);
    expect(requiresCreativeCanvasImportConfirmation(true, false)).toBe(false);
    expect(requiresCreativeCanvasImportConfirmation(false, true)).toBe(false);
  });
});
