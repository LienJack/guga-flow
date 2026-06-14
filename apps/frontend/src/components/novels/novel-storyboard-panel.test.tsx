import type {
  NovelDocumentRecord,
  NovelEventGraphRecord,
  ScriptDraftRecord,
  StoryboardDraftRecord,
  StoryboardResult,
} from "@guga-flow/shared-types";
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

function eventGraph(): NovelEventGraphRecord {
  return {
    id: "event_graph_1",
    projectId: "project_1",
    novelDocumentId: "novel_1",
    chapters: [
      {
        chapterIndex: 1,
        title: "Chapter 1 Signal",
        startOffset: 0,
        endOffset: 24,
        wordCount: 4,
        summary: "Hero watches the city.",
        eventState: "succeeded",
        eventCount: 1,
        eventIds: ["chapter_1_event_1"],
      },
      {
        chapterIndex: 2,
        title: "Chapter 2 Failure",
        startOffset: 25,
        endOffset: 48,
        wordCount: 4,
        summary: "Hero misses the train.",
        eventState: "failed",
        eventCount: 0,
        eventIds: [],
        errorReason: "Provider timed out",
      },
    ],
    events: [
      {
        eventId: "chapter_1_event_1",
        title: "Signal found",
        orderIndex: 1,
        chapterIndex: 1,
        sourceExcerpt: "Hero watches the city.",
        summary: "The hero sees the signal.",
      },
    ],
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
  };
}

function scriptDraft(): ScriptDraftRecord {
  return {
    id: "script_1",
    projectId: "project_1",
    novelDocumentId: "novel_1",
    version: 1,
    title: "Rooftop Script v1",
    strategy: "short_drama",
    status: "draft",
    workspace: {
      storySkeleton: {
        title: "Rooftop Script v1",
        logline: "The hero follows a rooftop signal.",
        sourceChapterIndexes: [1],
        sourceEventIds: ["chapter_1_event_1"],
        beats: [
          {
            beatId: "beat_1",
            orderIndex: 1,
            title: "Signal",
            summary: "The hero sees the signal.",
            chapterIndex: 1,
            eventIds: ["chapter_1_event_1"],
          },
        ],
      },
      adaptationStrategy: {
        strategy: "short_drama",
        summary: "Open with the strongest visual hook.",
        targetFormat: "Short-drama",
        supervisionNotes: "Check event coverage.",
      },
      script: {
        title: "Rooftop Script v1",
        logline: "The hero follows a rooftop signal.",
        strategy: "short_drama",
        scenes: [
          {
            sceneId: "script_scene_1",
            orderIndex: 1,
            title: "Opening",
            summary: "The hero sees the signal.",
            beats: [
              {
                beatId: "beat_1",
                orderIndex: 1,
                title: "Signal",
                summary: "The hero sees the signal.",
                chapterIndex: 1,
                eventIds: ["chapter_1_event_1"],
              },
            ],
          },
        ],
      },
    },
    script: {
      title: "Rooftop Script v1",
      logline: "The hero follows a rooftop signal.",
      strategy: "short_drama",
      scenes: [
        {
          sceneId: "script_scene_1",
          orderIndex: 1,
          title: "Opening",
          summary: "The hero sees the signal.",
          beats: [],
        },
      ],
    },
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
        initialEventGraph={eventGraph()}
        initialScriptDrafts={[scriptDraft()]}
      />,
    );

    expect(html).toContain("Creative brief");
    expect(html).toContain("Create draft");
    expect(html).toContain("Save novel");
    expect(html).toContain("Import file");
    expect(html).toContain("Rooftop story");
    expect(html).toContain("Generate");
    expect(html).toContain("Extract events");
    expect(html).toContain("Chapters");
    expect(html).toContain("Chapter 1 Signal");
    expect(html).toContain("Succeeded");
    expect(html).toContain("Failed");
    expect(html).toContain("Script");
    expect(html).toContain("Create script");
    expect(html).toContain("Faithful");
    expect(html).toContain("Workspace");
    expect(html).toContain("Skeleton beats");
    expect(html).toContain("Adaptation strategy");
    expect(html).toContain("Script scenes");
    expect(html).toContain("Save workspace");
    expect(html).toContain("Assets");
    expect(html).toContain("Extract assets");
    expect(html).toContain("No asset candidates");
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
