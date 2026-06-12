import type { StoryboardDraftRecord, StoryboardResult } from "@guga-flow/shared-types";
import { describe, expect, it } from "vitest";

import {
  buildStoryboardDraftUiState,
  formatStoryboardValidationIssues,
  hasExistingStoryboardImports,
  isStoryboardDraftReadyForImport,
  isStoryboardDraftImportable,
  mergeStoryboardImportGraph,
  summarizeStoryboardImport,
  summarizeStoryboard,
  summarizeStoryboardActionError,
  updateStoryboardCharacter,
  updateStoryboardLocation,
  updateStoryboardOverview,
  updateStoryboardScene,
  updateStoryboardShot,
} from "./storyboard-data";

function validStoryboard(): StoryboardResult {
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
        timeOfDay: "evening",
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
            mood: "focused",
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

function draft(overrides: Partial<StoryboardDraftRecord> = {}): StoryboardDraftRecord {
  return {
    id: "draft_1",
    projectId: "project_1",
    novelDocumentId: "novel_1",
    status: "valid",
    storyboard: validStoryboard(),
    validationIssues: [],
    provider: "mock-llm",
    model: "mock-storyboard",
    readyForImport: false,
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

describe("storyboard data helpers", () => {
  it("summarizes a valid mock storyboard and marks it saveable", () => {
    const storyboard = validStoryboard();
    const summary = summarizeStoryboard(storyboard);
    const uiState = buildStoryboardDraftUiState(draft({ storyboard }));

    expect(summary).toMatchObject({
      title: "Rooftop story",
      sceneCount: 1,
      shotCount: 1,
      characterCount: 1,
      locationCount: 1,
      durationSec: 4,
      firstSceneTitle: "Opening Beat",
    });
    expect(summary.firstShotPrompt).toContain("rooftop");
    expect(uiState).toMatchObject({
      label: "Valid draft",
      isValid: true,
      isReady: false,
      canSave: true,
      canMarkReady: true,
      issueSummary: "",
    });
  });

  it("preserves extension keys while updating known editor fields", () => {
    const storyboard = {
      ...validStoryboard(),
      vendorMeta: { requestId: "req_1" },
      characters: [
        {
          ...validStoryboard().characters[0]!,
          consistencySeed: "seed_hero",
        },
      ],
      locations: [
        {
          ...validStoryboard().locations[0]!,
          assetHint: "asset_loc",
        },
      ],
      scenes: [
        {
          ...validStoryboard().scenes[0]!,
          vendorSceneId: "scene_vendor_1",
          shots: [
            {
              ...validStoryboard().scenes[0]!.shots[0]!,
              vendorShotId: "shot_vendor_1",
            },
          ],
        },
      ],
    };

    const updated = updateStoryboardShot(
      updateStoryboardScene(
        updateStoryboardLocation(
          updateStoryboardCharacter(
            updateStoryboardOverview(storyboard, { logline: "Edited logline" }),
            "char_hero",
            { identityPrompt: "edited identity prompt" },
          ),
          "loc_rooftop",
          { lighting: "neon rain" },
        ),
        "scene_1",
        { characterTempIds: ["char_hero"], mood: "tense" },
      ),
      "scene_1",
      "shot_1",
      {
        durationSec: 6,
        imagePrompt: "edited image prompt",
        characterTempIds: ["char_hero"],
        locationTempId: undefined,
      },
    );

    expect(updated.logline).toBe("Edited logline");
    expect(updated.vendorMeta).toEqual({ requestId: "req_1" });
    expect(updated.characters[0]).toMatchObject({
      identityPrompt: "edited identity prompt",
      consistencySeed: "seed_hero",
    });
    expect(updated.locations[0]).toMatchObject({
      lighting: "neon rain",
      assetHint: "asset_loc",
    });
    expect(updated.scenes[0]).toMatchObject({
      mood: "tense",
      vendorSceneId: "scene_vendor_1",
    });
    expect(updated.scenes[0]!.shots[0]).toMatchObject({
      durationSec: 6,
      imagePrompt: "edited image prompt",
      locationTempId: undefined,
      vendorShotId: "shot_vendor_1",
    });
  });

  it("does not consider invalid or missing storyboard drafts ready", () => {
    const invalidDraft = draft({
      status: "invalid",
      storyboard: undefined,
      readyForImport: true,
      validationIssues: [{ path: ["scenes"], message: "Too small: expected array to have >=1 items" }],
    });
    const uiState = buildStoryboardDraftUiState(invalidDraft);

    expect(isStoryboardDraftReadyForImport(invalidDraft)).toBe(false);
    expect(isStoryboardDraftImportable(draft({ status: "ready", readyForImport: true }))).toBe(true);
    expect(isStoryboardDraftImportable(draft({ status: "ready", readyForImport: true }), true)).toBe(false);
    expect(uiState).toMatchObject({
      label: "Draft needs fixes",
      isValid: false,
      isReady: false,
      canSave: false,
      canMarkReady: false,
    });
    expect(uiState.issueSummary).toContain("scenes: Too small");
  });

  it("formats validation and provider errors for compact UI surfaces", () => {
    expect(
      formatStoryboardValidationIssues([
        { path: ["scenes", 0, "shots"], message: "Shot references missing character" },
      ]),
    ).toBe("scenes.0.shots: Shot references missing character");
    expect(summarizeStoryboardActionError({ message: ["Provider failed", "Retry later"] })).toBe(
      "Provider failed, Retry later",
    );
    expect(summarizeStoryboardActionError(new Error("mock-llm mock failure requested"))).toBe(
      "mock-llm mock failure requested",
    );
  });

  it("detects import provenance, summarizes imports, and merges graph updates", () => {
    const importedNode = {
      id: "node_imported",
      projectId: "project_1",
      canvasDocumentId: "canvas_1",
      tldrawShapeId: "shape:shot-1",
      type: "shot" as const,
      x: 0,
      y: 0,
      width: 320,
      height: 220,
      zIndex: 1,
      status: "draft" as const,
      dataJson: {
        storyboardImport: {
          batchId: "batch_1",
          draftId: "draft_1",
          novelDocumentId: "novel_1",
          entityKind: "shot",
          version: 1,
        },
      },
      createdAt: "2026-06-12T00:00:00.000Z",
      updatedAt: "2026-06-12T00:00:00.000Z",
    };
    const manualNode = {
      ...importedNode,
      id: "node_manual",
      tldrawShapeId: "shape:manual",
      dataJson: {},
    };
    const result = {
      importBatchId: "batch_1",
      summary: {
        importBatchId: "batch_1",
        duplicatePolicy: "new_version" as const,
        version: 1,
        createdNodeCount: 14,
        reusedNodeCount: 1,
        createdEdgeCount: 20,
        sceneCount: 2,
        shotCount: 6,
        characterCount: 2,
        locationCount: 1,
      },
      nodes: [importedNode],
      edges: [
        {
          id: "edge_1",
          projectId: "project_1",
          canvasDocumentId: "canvas_1",
          sourceNodeId: "node_character",
          targetNodeId: "node_imported",
          relation: "references_character" as const,
          createdAt: "2026-06-12T00:00:00.000Z",
        },
      ],
    };

    expect(hasExistingStoryboardImports([manualNode])).toBe(false);
    expect(hasExistingStoryboardImports([manualNode, importedNode])).toBe(true);
    expect(summarizeStoryboardImport(result.summary)).toBe(
      "Imported 2 scenes / 6 shots / 2 characters / 1 locations / 14 nodes, 1 reused / 20 edges",
    );
    expect(mergeStoryboardImportGraph({ nodes: [manualNode], edges: [] }, result)).toMatchObject({
      nodes: [manualNode, importedNode],
      edges: result.edges,
    });
  });
});
