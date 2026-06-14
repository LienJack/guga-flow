import type { CanvasEdgeRecord, CanvasNodeRecord } from "@guga-flow/shared-types";
import { describe, expect, it } from "vitest";

import {
  buildSemanticCanvasEdgeInput,
  findExistingCanvasEdge,
  findSceneFrameEligibleShotNodes,
  getCanvasEdgeEndpointLabel,
  getCanvasEdgeRelationLabel,
  getSemanticBindingRelation,
  getShotReferenceState,
  hasExistingCanvasEdge,
  mergeCanvasEdgeCreateResult,
  mergeCanvasEdgeDeleteResult,
} from "./canvas-edge-data";

const baseNode = {
  projectId: "project_1",
  canvasDocumentId: "canvas_1",
  tldrawShapeId: "shape:node",
  title: "Node",
  x: 0,
  y: 0,
  width: 200,
  height: 120,
  zIndex: 0,
  status: "draft",
  dataJson: {},
  createdAt: "2026-06-12T00:00:00.000Z",
  updatedAt: "2026-06-12T00:00:00.000Z",
} satisfies Omit<CanvasNodeRecord, "id" | "type">;

function node(overrides: Partial<CanvasNodeRecord> & Pick<CanvasNodeRecord, "id" | "type">) {
  return {
    ...baseNode,
    ...overrides,
  } satisfies CanvasNodeRecord;
}

function edge(overrides: Partial<CanvasEdgeRecord> = {}) {
  return {
    id: "edge_1",
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    sourceNodeId: "character_1",
    targetNodeId: "shot_1",
    relation: "references_character",
    createdAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  } satisfies CanvasEdgeRecord;
}

describe("canvas edge data helpers", () => {
  it("labels relations and endpoints with business-node fallbacks", () => {
    expect(getCanvasEdgeRelationLabel("references_character")).toBe("Character reference");
    expect(getCanvasEdgeRelationLabel("story_seed")).toBe("Story seed");
    expect(getCanvasEdgeEndpointLabel(undefined)).toBe("Missing node");
    expect(
      getCanvasEdgeEndpointLabel(
        node({
          id: "location_1",
          type: "location_asset",
          title: undefined,
          dataJson: { name: "Launch Site" },
        }),
      ),
    ).toBe("Launch Site");
  });

  it("accepts supported semantic binding combinations only", () => {
    const character = node({ id: "character_1", type: "character_asset" });
    const location = node({ id: "location_1", type: "location_asset" });
    const shot = node({ id: "shot_1", type: "shot" });
    const sceneFrame = node({ id: "frame_1", type: "scene_frame" });
    const sourceImage = node({ id: "source_image_1", type: "source_image" });
    const sourceAudio = node({ id: "source_audio_1", type: "source_audio" });
    const image = node({ id: "image_1", type: "image" });

    expect(getSemanticBindingRelation(character, shot)).toBe("references_character");
    expect(getSemanticBindingRelation(location, shot)).toBe("references_location");
    expect(getSemanticBindingRelation(location, sceneFrame)).toBe("references_location");
    expect(getSemanticBindingRelation(sourceImage, image)).toBe("derived_from");
    expect(getSemanticBindingRelation(sourceAudio, image)).toBeNull();
    expect(getSemanticBindingRelation(character, sceneFrame)).toBeNull();
    expect(getSemanticBindingRelation(shot, character)).toBeNull();
  });

  it("builds source media create inputs with input slot metadata", () => {
    const sourceImage = node({ id: "source_image_1", type: "source_image" });
    const image = node({ id: "image_1", type: "image" });

    expect(
      buildSemanticCanvasEdgeInput({
        sourceNode: sourceImage,
        targetNode: image,
      }),
    ).toMatchObject({
      sourceNodeId: "source_image_1",
      targetNodeId: "image_1",
      relation: "derived_from",
      dataJson: {
        slotId: "reference_image",
        inputKind: "image",
        inputRole: "reference_image",
        order: 0,
      },
    });
  });

  it("builds create inputs and detects idempotent duplicate edges", () => {
    const location = node({ id: "location_1", type: "location_asset" });
    const sceneFrame = node({ id: "frame_1", type: "scene_frame" });
    const input = buildSemanticCanvasEdgeInput({
      sourceNode: location,
      targetNode: sceneFrame,
      sourceShapeId: "shape:location-1",
      targetShapeId: "shape:frame-1",
      visualArrowShapeId: "shape:arrow-location-frame",
      affectedShotNodeIds: ["shot_1", "shot_1", "shot_2"],
    });
    const existingEdge = edge({
      id: "edge_location_frame",
      sourceNodeId: "location_1",
      targetNodeId: "frame_1",
      relation: "references_location",
    });

    expect(input).toEqual({
      sourceNodeId: "location_1",
      targetNodeId: "frame_1",
      relation: "references_location",
      sourceShapeId: "shape:location-1",
      targetShapeId: "shape:frame-1",
      visualArrowShapeId: "shape:arrow-location-frame",
      affectedShotNodeIds: ["shot_1", "shot_2"],
    });
    expect(findExistingCanvasEdge([existingEdge], input!)).toBe(existingEdge);
    expect(hasExistingCanvasEdge([existingEdge], input!)).toBe(true);
  });

  it("finds SceneFrame eligible shots by center point", () => {
    const sceneFrame = node({
      id: "frame_1",
      type: "scene_frame",
      x: 100,
      y: 100,
      width: 500,
      height: 300,
    });
    const insideShot = node({
      id: "shot_inside",
      type: "shot",
      x: 140,
      y: 120,
      width: 100,
      height: 80,
    });
    const outsideShot = node({
      id: "shot_outside",
      type: "shot",
      x: 610,
      y: 100,
      width: 120,
      height: 80,
    });
    const character = node({ id: "character_1", type: "character_asset", x: 160, y: 140 });

    expect(findSceneFrameEligibleShotNodes(sceneFrame, [insideShot, outsideShot, character])).toEqual([
      insideShot,
    ]);
  });

  it("reads shot references from partial older data safely", () => {
    expect(getShotReferenceState(undefined)).toEqual({ characterAssetIds: [] });
    expect(
      getShotReferenceState(
        node({
          id: "shot_1",
          type: "shot",
          dataJson: {
            characterAssetIds: ["character_1", "character_1", 42],
            locationAssetId: "location_1",
          },
        }),
      ),
    ).toEqual({
      characterAssetIds: ["character_1"],
      locationAssetId: "location_1",
    });
  });

  it("immutably merges create and delete edge results", () => {
    const shot = node({
      id: "shot_1",
      type: "shot",
      dataJson: { visualDescription: "Before" },
    });
    const updatedShot = node({
      id: "shot_1",
      type: "shot",
      dataJson: { visualDescription: "Before", characterAssetIds: ["character_1"] },
    });
    const unrelatedNode = node({ id: "note_1", type: "novel" });
    const characterEdge = edge();
    const childEdge = edge({
      id: "edge_child",
      sourceNodeId: "location_1",
      targetNodeId: "shot_1",
      relation: "references_location",
    });

    const created = mergeCanvasEdgeCreateResult(
      { nodes: [shot, unrelatedNode], edges: [childEdge] },
      {
        edge: characterEdge,
        edges: [characterEdge],
        updatedNodes: [updatedShot],
      },
    );

    expect(created.nodes).toEqual([updatedShot, unrelatedNode]);
    expect(created.edges).toEqual([childEdge, characterEdge]);

    const deleted = mergeCanvasEdgeDeleteResult(created, {
      deleted: true,
      edgeId: "edge_1",
      deletedEdgeIds: ["edge_1", "edge_child"],
      updatedNodes: [shot],
    });

    expect(deleted.nodes).toEqual([shot, unrelatedNode]);
    expect(deleted.edges).toEqual([]);
  });
});
