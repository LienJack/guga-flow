import type { StoryboardDraftRecord, StoryboardResult } from "@guga-flow/shared-types";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { StoryboardEditor } from "./storyboard-editor";

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

function blueprintStoryboard(): StoryboardResult {
  const result = storyboard();
  result.storyBlueprint = {
    worldSummary: "A city where rooftop signals reveal hidden alliances.",
    timelineEvents: [
      {
        eventId: "event_opening",
        title: "Signal discovered",
        orderIndex: 1,
        summary: "The hero notices the hidden signal and chooses to act.",
        characters: ["char_hero"],
      },
    ],
    characterRelationships: [
      {
        relationshipId: "rel_hero_ally",
        characterTempIds: ["char_hero", "char_ally"],
        type: "allies",
        summary: "The hero and ally trust each other.",
      },
    ],
  };
  result.characters[0] = {
    ...result.characters[0]!,
    lifecycleStages: [
      {
        stageId: "stage_alert",
        label: "Alert",
        ageRange: "late 20s",
        costume: "dark utility coat",
        identityPrompt: "alert hero in dark coat",
      },
    ],
  };
  result.scenes[0] = {
    ...result.scenes[0]!,
    storyEventIds: ["event_opening"],
    shots: result.scenes[0]!.shots.map((shot) => ({
      ...shot,
      storyEventIds: ["event_opening"],
      characterStageRefs: [{ characterTempId: "char_hero", stageId: "stage_alert" }],
    })),
  };
  return result;
}

function draft(): StoryboardDraftRecord {
  return {
    id: "draft_1",
    projectId: "project_1",
    novelDocumentId: "novel_1",
    status: "ready",
    storyboard: storyboard(),
    validationIssues: [],
    provider: "mock-llm",
    model: "mock-storyboard",
    readyForImport: true,
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
  };
}

describe("StoryboardEditor", () => {
  it("renders a scannable storyboard editor with core fields", () => {
    const html = renderToStaticMarkup(
      <StoryboardEditor
        draft={draft()}
        storyboard={storyboard()}
        onMarkReady={vi.fn()}
        onSave={vi.fn()}
        onStoryboardChange={vi.fn()}
      />,
    );

    expect(html).toContain("Scenes");
    expect(html).toContain("Shots");
    expect(html).toContain("Characters");
    expect(html).toContain("Duration");
    expect(html).toContain("Hero watches");
    expect(html).toContain("Image prompt");
    expect(html).toContain("Video prompt");
    expect(html).toContain("Ready for import");
  });

  it("renders the empty draft state", () => {
    const html = renderToStaticMarkup(
      <StoryboardEditor onMarkReady={vi.fn()} onSave={vi.fn()} onStoryboardChange={vi.fn()} />,
    );

    expect(html).toContain("No storyboard draft");
    expect(html).toContain("Generate from a saved novel source.");
  });

  it("renders story blueprint and lifecycle stage fields when present", () => {
    const html = renderToStaticMarkup(
      <StoryboardEditor
        draft={draft()}
        storyboard={blueprintStoryboard()}
        onMarkReady={vi.fn()}
        onSave={vi.fn()}
        onStoryboardChange={vi.fn()}
      />,
    );

    expect(html).toContain("Story blueprint");
    expect(html).toContain("World summary");
    expect(html).toContain("Events");
    expect(html).toContain("Lifecycle stages");
    expect(html).toContain("Age range");
    expect(html).toContain("alert hero in dark coat");
  });
});
