import { BadRequestException, NotFoundException } from "@nestjs/common";
import type {
  AssetListItem,
  CanvasEdgeRecord,
  CanvasLoadResult,
  CanvasNodeRecord,
  CharacterAssetNodeData,
  LocationAssetNodeData,
  SceneNodeData,
  ShotNodeData,
} from "@guga-flow/shared-types";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CanvasService } from "../canvas/canvas.service";
import { PrismaService } from "../prisma/prisma.service";
import { SkillTemplatesService } from "../skill-templates/skill-templates.service";
import { PromptService } from "./prompt.service";

const createdAt = "2026-06-12T00:00:00.000Z";
const updatedAt = "2026-06-12T00:05:00.000Z";

function createCanvasServiceMock() {
  return {
    getCanvas: vi.fn(async (): Promise<CanvasLoadResult> => promptCanvas()),
  };
}

function createPrismaMock() {
  return {
    project: {
      findUnique: vi.fn(async () => ({
        generationSettingsJson: {
          visualStyle: "project cinematic noir",
          aspectRatio: "9:16",
          visualManual: {
            artStyle: "project rainy noir",
            palette: "cyan shadows and amber signals",
            lighting: "practical console light",
          },
          directorManual: {
            pacing: "slow-burn opening",
            cameraLanguage: "project controlled push-ins",
            performance: "quiet urgency",
          },
          subtitle: { label: "Project captions" },
        },
      })),
    },
  };
}

function createSkillTemplatesServiceMock() {
  return {
    activePromptContexts: vi.fn(async () => [
      {
        id: "skill_art",
        kind: "art" as const,
        slug: "art-default",
        displayName: "Art Skill",
        sourceText: "Use controlled cyan contrast from the active art skill.",
        versionId: "skill_version_1",
        version: 1,
      },
    ]),
  };
}

describe("PromptService", () => {
  let canvasService: ReturnType<typeof createCanvasServiceMock>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let skillTemplatesService: ReturnType<typeof createSkillTemplatesServiceMock>;
  let service: PromptService;

  beforeEach(() => {
    canvasService = createCanvasServiceMock();
    prisma = createPrismaMock();
    skillTemplatesService = createSkillTemplatesServiceMock();
    service = new PromptService(
      canvasService as unknown as CanvasService,
      prisma as unknown as PrismaService,
      skillTemplatesService as unknown as SkillTemplatesService,
    );
  });

  it("composes a project-scoped Shot prompt from persisted graph and assets", async () => {
    const result = await service.composeShotPrompt("project_1", "shot_1", {
      globalStylePrompt: "cinematic ink and watercolor",
      modelPromptSuffix: "clean composition",
    });

    expect(canvasService.getCanvas).toHaveBeenCalledWith("project_1");
    expect(prisma.project.findUnique).toHaveBeenCalledWith({
      where: { id: "project_1" },
      select: { generationSettingsJson: true },
    });
    expect(skillTemplatesService.activePromptContexts).toHaveBeenCalledWith("project_1", [
      "story",
      "art",
      "production",
    ]);
    expect(result.sourceNodeIds).toMatchObject({
      shotNodeId: "shot_1",
      sceneNodeId: "scene_1",
      characterNodeIds: ["character_1"],
      locationNodeId: "location_1",
    });
    expect(result.image.prompt).toContain("Hero identity prompt");
    expect(result.image.prompt).toContain("Location prompt text");
    expect(result.image.prompt).toContain("Visual style: project cinematic noir");
    expect(result.image.prompt).toContain("Aspect ratio: 16:9");
    expect(result.image.prompt).toContain("Art style: project rainy noir (project)");
    expect(result.image.prompt).toContain("Palette: cyan shadows and amber signals (project)");
    expect(result.image.prompt).toContain("Lens: long-lens compression (shot)");
    expect(result.image.prompt).toContain("Pacing: slow-burn opening (project)");
    expect(result.image.prompt).toContain("Camera language: shot surveillance angle (shot)");
    expect(result.image.prompt).toContain("Use controlled cyan contrast from the active art skill.");
    expect(result.image.prompt).toContain("Subtitle: requested_unresolved");
    expect(result.video.prompt).toContain("Video prompt: slow push through the room");
    expect(result.resolvedGenerationSettings.sources).toMatchObject({
      visualStyle: "project",
      aspectRatio: "shot",
      visualManual: "shot",
      visualManualFields: {
        artStyle: "project",
        palette: "project",
        lighting: "project",
        lens: "shot",
      },
      directorManual: "shot",
      directorManualFields: {
        pacing: "project",
        cameraLanguage: "shot",
        performance: "project",
      },
      subtitle: "project",
    });
    expect(result.referenceAssetIds).toEqual(["asset_character_ref", "asset_location_ref"]);
    expect(result.debugParts.map((part) => part.kind)).toEqual(
      expect.arrayContaining([
        "global_style",
        "generation_settings",
        "visual_manual",
        "director_manual",
        "scene",
        "character",
        "location",
        "shot",
        "model_suffix",
      ]),
    );
  });

  it("returns a Shot-derived prompt with missing context when links are absent", async () => {
    const shotOnly = canvasNode<ShotNodeData>("shot_lonely", "shot", "Shot Lonely", {
      imagePrompt: "single lantern in rain",
      visualDescription: "A lantern hangs in an empty alley.",
    });
    canvasService.getCanvas.mockResolvedValue(canvasLoadResult({ nodes: [shotOnly], edges: [], assets: [] }));

    const result = await service.composeShotPrompt("project_1", "shot_lonely");

    expect(result.image.prompt).toContain("single lantern in rain");
    expect(result.missingContext.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["scene", "character", "location"]),
    );
  });

  it("rejects non-Shot node ids without mutating graph state", async () => {
    await expect(service.composeShotPrompt("project_1", "character_1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(canvasService.getCanvas).toHaveBeenCalledTimes(1);
  });

  it("rejects missing or cross-project node ids", async () => {
    await expect(service.composeShotPrompt("project_1", "missing")).rejects.toBeInstanceOf(NotFoundException);

    const crossProjectShot = canvasNode<ShotNodeData>("shot_cross", "shot", "Cross project shot", {
      imagePrompt: "wrong project",
    });
    canvasService.getCanvas.mockResolvedValue(
      canvasLoadResult({
        nodes: [{ ...crossProjectShot, projectId: "project_2" }],
      }),
    );

    await expect(service.composeShotPrompt("project_1", "shot_cross")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("recomposes from the latest Character and Location node data", async () => {
    const original = await service.composeShotPrompt("project_1", "shot_1");
    const updatedCanvas = promptCanvas();
    updatedCanvas.nodes = updatedCanvas.nodes.map((node) => {
      if (node.id === "character_1") {
        const data = node.dataJson as CharacterAssetNodeData;
        return { ...node, dataJson: { ...data, identityPrompt: "edited hero identity" } };
      }
      if (node.id === "location_1") {
        const data = node.dataJson as LocationAssetNodeData;
        return { ...node, dataJson: { ...data, locationPrompt: "edited location prompt" } };
      }
      return node;
    });
    canvasService.getCanvas.mockResolvedValue(updatedCanvas);

    const updated = await service.composeShotPrompt("project_1", "shot_1");

    expect(original.image.prompt).toContain("Hero identity prompt");
    expect(updated.image.prompt).toContain("edited hero identity");
    expect(updated.image.prompt).toContain("edited location prompt");
    expect(updated.image.prompt).not.toContain("Hero identity prompt");
    expect(updated.image.prompt).not.toContain("Location prompt text");
  });
});

function promptCanvas(): CanvasLoadResult {
  const nodes: CanvasNodeRecord[] = [
    canvasNode<SceneNodeData>("scene_1", "scene", "Scene 01", {
      sceneNumber: "01",
      synopsis: "The launch room turns quiet.",
      mood: "focused",
      timeOfDay: "dawn",
    }),
    canvasNode<CharacterAssetNodeData>("character_1", "character_asset", "Hero", {
      name: "Hero",
      role: "lead",
      identityPrompt: "Hero identity prompt",
      consistencyPrompt: "Hero consistency prompt",
      referenceAssetIds: ["asset_character_ref"],
    }),
    canvasNode<LocationAssetNodeData>("location_1", "location_asset", "Launch Room", {
      name: "Launch Room",
      locationPrompt: "Location prompt text",
      consistencyPrompt: "same console layout",
      referenceAssetIds: ["asset_location_ref"],
    }),
    canvasNode<ShotNodeData>("shot_1", "shot", "Shot 01", {
      imagePrompt: "hero at the launch console",
      videoPrompt: "slow push through the room",
      visualDescription: "Hero studies the glowing launch console.",
      action: "Hero starts the sequence.",
      cameraMovement: "slow push",
      durationSeconds: 5,
      characterAssetIds: ["character_1"],
      locationAssetId: "location_1",
      generationSettings: {
        aspectRatio: "16:9",
        narrationAccent: "warm narration",
        visualManual: {
          lens: "long-lens compression",
        },
        directorManual: {
          cameraLanguage: "shot surveillance angle",
        },
      },
    }),
  ];

  return canvasLoadResult({
    nodes,
    edges: [
      canvasEdge("edge_scene", "shot_1", "scene_1", "belongs_to_scene"),
      canvasEdge("edge_character", "character_1", "shot_1", "references_character"),
      canvasEdge("edge_location", "location_1", "shot_1", "references_location"),
    ],
    assets: [assetListItem("asset_character_ref"), assetListItem("asset_location_ref")],
  });
}

function canvasLoadResult(overrides: Partial<CanvasLoadResult> = {}): CanvasLoadResult {
  return {
    canvasDocument: {
      id: "canvas_1",
      projectId: "project_1",
      snapshotJson: {},
      createdAt,
      updatedAt,
    },
    nodes: [],
    edges: [],
    assets: [],
    ...overrides,
  };
}

function canvasNode<TData>(
  id: string,
  type: CanvasNodeRecord["type"],
  title: string,
  dataJson: TData,
): CanvasNodeRecord<TData> {
  return {
    id,
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    tldrawShapeId: `shape:${id}`,
    type,
    title,
    x: 0,
    y: 0,
    width: 320,
    height: 220,
    zIndex: 0,
    status: "draft",
    dataJson,
    createdAt,
    updatedAt,
  };
}

function canvasEdge(
  id: string,
  sourceNodeId: string,
  targetNodeId: string,
  relation: CanvasEdgeRecord["relation"],
): CanvasEdgeRecord {
  return {
    id,
    projectId: "project_1",
    canvasDocumentId: "canvas_1",
    sourceNodeId,
    targetNodeId,
    relation,
    createdAt,
  };
}

function assetListItem(id: string): AssetListItem {
  return {
    id,
    projectId: "project_1",
    type: "image",
    purpose: "uploaded",
    storageKey: `${id}.png`,
    mimeType: "image/png",
    originalFilename: `${id}.png`,
    previewKind: "image",
    previewUrl: `/api/v1/projects/project_1/assets/${id}/preview`,
    createdAt,
  };
}
