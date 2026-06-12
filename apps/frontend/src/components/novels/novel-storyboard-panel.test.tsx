import type { NovelDocumentRecord, StoryboardDraftRecord, StoryboardResult } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";

import { getNovelImportSourceType, NovelStoryboardPanel } from "./novel-storyboard-panel";

function novel(): NovelDocumentRecord {
  return {
    id: "novel_1",
    projectId: "project_1",
    title: "Rooftop story",
    content: "Hero watches the city.",
    sourceType: "paste",
    wordCount: 4,
    language: "en",
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
  };
}

function storyboard(): StoryboardResult {
  return {
    title: "Rooftop story",
    logline: "A compact storyboard generated from a local excerpt.",
    characters: [
      {
        tempId: "char_hero",
        name: "Hero",
        role: "protagonist",
        appearance: "A consistent lead character.",
        personality: "Focused and observant.",
        identityPrompt: "consistent cinematic hero",
      },
    ],
    locations: [
      {
        tempId: "loc_rooftop",
        name: "City Rooftop",
        type: "exterior",
        description: "A city rooftop at dusk.",
        lighting: "soft evening light",
        atmosphere: "quiet",
        locationPrompt: "cinematic city rooftop",
      },
    ],
    scenes: [
      {
        tempId: "scene_1",
        title: "Opening Beat",
        sourceExcerpt: "Hero watches the city.",
        summary: "The hero enters the frame.",
        mood: "anticipatory",
        characterTempIds: ["char_hero"],
        locationTempId: "loc_rooftop",
        shots: [
          {
            tempId: "shot_1",
            shotIndex: 1,
            title: "Hero watches",
            durationSec: 4,
            visualDescription: "The hero surveys the skyline.",
            action: "walks to the edge",
            cameraMovement: "slow push in",
            characterTempIds: ["char_hero"],
            locationTempId: "loc_rooftop",
            imagePrompt: "hero on a cinematic rooftop",
            videoPrompt: "slow push in on hero overlooking the city",
          },
        ],
      },
    ],
  };
}

function draft(): StoryboardDraftRecord {
  return {
    id: "draft_1",
    projectId: "project_1",
    novelDocumentId: "novel_1",
    status: "valid",
    storyboard: storyboard(),
    validationIssues: [],
    provider: "mock-llm",
    model: "mock-storyboard",
    readyForImport: false,
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
  };
}

describe("NovelStoryboardPanel", () => {
  it("renders novel source controls and a storyboard draft preview", () => {
    const html = renderToStaticMarkup(
      <NovelStoryboardPanel
        projectId="project_1"
        initialNovels={[novel()]}
        initialDraft={draft()}
      />,
    );

    expect(html).toContain("Save novel");
    expect(html).toContain("Import file");
    expect(html).toContain("Rooftop story");
    expect(html).toContain("Generate");
    expect(html).toContain("Save draft");
    expect(html).toContain("Mark ready");
    expect(html).toContain("Import");
    expect(html).toContain("Opening Beat");
  });

  it("detects supported text import source types", () => {
    expect(getNovelImportSourceType({ name: "chapter.txt", type: "text/plain" })).toBe("txt");
    expect(getNovelImportSourceType({ name: "chapter.md", type: "" })).toBe("md");
    expect(getNovelImportSourceType({ name: "chapter.pdf", type: "application/pdf" })).toBeNull();
  });
});
