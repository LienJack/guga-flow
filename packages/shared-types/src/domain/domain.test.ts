import { describe, expect, it } from "vitest";

import {
  ASSET_PREVIEW_KINDS,
  CANVAS_EDGE_RELATIONS,
  CANVAS_NODE_TYPES,
  CANVAS_SAVE_STATUSES,
  GENERATION_JOB_STATUSES,
  GENERATION_OPERATIONS,
  IMAGE_PROVIDER_IDS,
  IMAGE_PROVIDER_MODES,
  NOVEL_LANGUAGES,
  NOVEL_SOURCE_TYPES,
  PHASE_8_GENERATION_OPERATIONS,
  PHASE_3_CANVAS_NODE_TYPES,
  PROJECT_ASPECT_RATIOS,
  STORYBOARD_IMPORT_DUPLICATE_POLICIES,
  STORYBOARD_DRAFT_STATUSES,
  UPLOADABLE_ASSET_MIME_TYPES,
  buildStoryboardImportPlan,
  composeShotPrompt,
  findStoryboardImportLayoutOverlaps,
  hasStoryboardImportProvenance,
  type AssetListItem,
  type CharacterAssetNodeData,
  type CanvasEdgeData,
  type CanvasEdgeRecord,
  type CanvasLoadResult,
  type CanvasNodeRecord,
  type CreateCanvasEdgeInput,
  type CreateCanvasEdgeResult,
  type CreateGenerationJobInput,
  type CreateCanvasNodeInput,
  type CreateNovelDocumentInput,
  type DeleteCanvasEdgeResult,
  type DeleteCanvasNodeResult,
  type DeleteNovelDocumentResult,
  type GeneratedMediaJobOutput,
  type ImageProviderCatalogItem,
  type ImageProviderCatalogResult,
  type GenerationJobListResult,
  type GenerationQueueSummary,
  type ImageNodeData,
  type ImageToVideoJobInput,
  type ImportStoryboardToCanvasInput,
  type ImportNovelSourceInput,
  type LocationAssetNodeData,
  type Phase3CanvasNodeRecord,
  type SaveCanvasSnapshotInput,
  type SceneNodeData,
  type ShotToImageJobInput,
  type ShotNodeData,
  type StoryboardDraftRecord,
  type StoryboardResult,
  type UpdateCanvasNodeGeometryInput,
  type UpdateCanvasNodeInput,
  type UpdateNovelDocumentInput,
  type UpdateStoryboardDraftInput,
  validateStoryboardResult,
} from "../index";

describe("shared domain constants", () => {
  it("includes MVP canvas node and edge concepts", () => {
    expect(CANVAS_NODE_TYPES).toContain("shot");
    expect(CANVAS_NODE_TYPES).toContain("editor_package");
    expect(CANVAS_EDGE_RELATIONS).toContain("generated_image");
    expect(CANVAS_EDGE_RELATIONS).toContain("generated_video");
    expect(CANVAS_EDGE_RELATIONS).toContain("sent_to_editor");
  });

  it("models worker-visible generation lifecycle states", () => {
    expect(GENERATION_JOB_STATUSES).toEqual(
      expect.arrayContaining(["queued", "running", "provider_waiting", "succeeded", "failed"]),
    );
    expect(GENERATION_OPERATIONS).toContain("novel_to_storyboard");
    expect(GENERATION_OPERATIONS).toContain("editor_export");
    expect(PHASE_8_GENERATION_OPERATIONS).toEqual(["shot_to_image", "image_to_video"]);
    expect(IMAGE_PROVIDER_IDS).toEqual(["mock-image", "image2", "banana"]);
    expect(IMAGE_PROVIDER_MODES).toEqual(["text_to_image", "image_to_image", "multi_reference"]);
  });

  it("includes Phase 1 project and upload asset contracts", () => {
    expect(PROJECT_ASPECT_RATIOS).toEqual(["9:16", "16:9", "1:1"]);
    expect(NOVEL_SOURCE_TYPES).toEqual(["paste", "txt", "md"]);
    expect(NOVEL_LANGUAGES).toEqual(["zh", "en", "ja", "other"]);
    expect(UPLOADABLE_ASSET_MIME_TYPES).toEqual(
      expect.arrayContaining(["image/png", "video/mp4", "text/markdown"]),
    );
    expect(ASSET_PREVIEW_KINDS).toEqual(["image", "video", "text", "metadata"]);
  });

  it("exports Phase 2 canvas persistence contracts", () => {
    expect(CANVAS_SAVE_STATUSES).toEqual(["idle", "saving", "saved", "failed"]);

    const snapshot: SaveCanvasSnapshotInput = {
      snapshotJson: {
        document: {
          records: [],
        },
        session: null,
      },
    };

    const loadResult: CanvasLoadResult = {
      canvasDocument: {
        id: "canvas_1",
        projectId: "project_1",
        snapshotJson: snapshot.snapshotJson,
        createdAt: "2026-06-12T00:00:00.000Z",
        updatedAt: "2026-06-12T00:00:00.000Z",
      },
      nodes: [],
      edges: [],
      assets: [],
    };

    expect(loadResult.canvasDocument.snapshotJson).toEqual(snapshot.snapshotJson);
  });

  it("exports Phase 3 business canvas node contracts", () => {
    expect(PHASE_3_CANVAS_NODE_TYPES).toEqual([
      "novel",
      "scene_frame",
      "scene",
      "shot",
      "character_asset",
      "location_asset",
      "image",
      "video",
      "editor_package",
    ]);
    expect(CANVAS_NODE_TYPES).toEqual(expect.arrayContaining([...PHASE_3_CANVAS_NODE_TYPES]));

    const shotData: ShotNodeData = {
      visualDescription: "Wide shot of the launch platform at sunrise.",
      action: "The protagonist checks the final cable.",
      cameraMovement: "Slow push-in",
      durationSeconds: 4,
      promptNotes: "cinematic, practical lights",
      negativePromptNotes: "no logos",
      characterAssetIds: ["node_character_1"],
      locationAssetId: "node_location_1",
    };
    const characterData: CharacterAssetNodeData = {
      name: "Ari",
      role: "Pilot",
      appearance: "Silver flight suit",
      consistencyPrompt: "same face and suit in every shot",
    };
    const locationData: LocationAssetNodeData = {
      name: "Orbital elevator base",
      environment: "coastal spaceport",
      visualStyle: "clean hard sci-fi",
      consistencyPrompt: "same tower silhouette",
    };

    const createInput: CreateCanvasNodeInput<ShotNodeData> = {
      tldrawShapeId: "shape:shot-1",
      type: "shot",
      title: "Shot 001",
      width: 360,
      height: 220,
      dataJson: shotData,
    };
    const updateInput: UpdateCanvasNodeInput<ShotNodeData> = {
      title: "Shot 001A",
      status: "draft",
      dataJson: shotData,
    };
    const geometryInput: UpdateCanvasNodeGeometryInput = {
      x: 20,
      y: 40,
      width: 360,
      height: 220,
    };
    const node: Phase3CanvasNodeRecord<"shot"> = {
      id: "node_1",
      projectId: "project_1",
      canvasDocumentId: "canvas_1",
      tldrawShapeId: createInput.tldrawShapeId,
      type: "shot",
      title: createInput.title,
      x: geometryInput.x,
      y: geometryInput.y,
      width: geometryInput.width,
      height: geometryInput.height,
      zIndex: 0,
      status: "draft",
      dataJson: shotData,
      createdAt: "2026-06-12T00:00:00.000Z",
      updatedAt: "2026-06-12T00:00:00.000Z",
    };
    const deleteResult: DeleteCanvasNodeResult = { deleted: true, nodeId: node.id };

    expect(node.dataJson.visualDescription).toContain("launch platform");
    expect(characterData.consistencyPrompt).toContain("same face");
    expect(locationData.visualStyle).toBe("clean hard sci-fi");
    expect(updateInput.status).toBe("draft");
    expect(deleteResult.nodeId).toBe("node_1");
  });

  it("exports Phase 4 semantic edge contracts", () => {
    const edgeData: CanvasEdgeData = {
      appliedShotNodeIds: ["node_shot_1", "node_shot_2"],
      childEdgeIds: ["edge_child_1"],
    };
    const createInput: CreateCanvasEdgeInput<CanvasEdgeData> = {
      sourceNodeId: "node_location_1",
      targetNodeId: "node_frame_1",
      relation: "references_location",
      sourceShapeId: "shape:location-1",
      targetShapeId: "shape:frame-1",
      visualArrowShapeId: "shape:edge-location-frame",
      dataJson: edgeData,
      affectedShotNodeIds: ["node_shot_1", "node_shot_2"],
    };
    const edge = {
      id: "edge_1",
      projectId: "project_1",
      canvasDocumentId: "canvas_1",
      sourceNodeId: createInput.sourceNodeId,
      targetNodeId: createInput.targetNodeId,
      sourceShapeId: createInput.sourceShapeId,
      targetShapeId: createInput.targetShapeId,
      visualArrowShapeId: createInput.visualArrowShapeId,
      relation: createInput.relation,
      dataJson: edgeData,
      createdAt: "2026-06-12T00:00:00.000Z",
    };
    const createResult: CreateCanvasEdgeResult = {
      edge,
      edges: [edge],
      updatedNodes: [],
      appliedShotCount: 2,
    };
    const deleteResult: DeleteCanvasEdgeResult = {
      deleted: true,
      edgeId: edge.id,
      deletedEdgeIds: [edge.id, "edge_child_1"],
      updatedNodes: [],
    };

    expect(createInput.relation).toBe("references_location");
    expect(createResult.edge.dataJson).toEqual(edgeData);
    expect(createResult.appliedShotCount).toBe(2);
    expect(deleteResult.deletedEdgeIds).toContain("edge_child_1");
  });

  it("exports Phase 5 novel source and storyboard draft contracts", () => {
    expect(STORYBOARD_DRAFT_STATUSES).toEqual(["draft", "valid", "invalid", "ready"]);

    const createNovelInput: CreateNovelDocumentInput = {
      title: "Rooftop Signal",
      content: "A hero watches the city lights before choosing the next shot.",
      sourceType: "paste",
      language: "en",
    };
    const importNovelInput: ImportNovelSourceInput = {
      title: "Imported Markdown",
      content: "# Opening\nA character enters.",
      sourceType: "md",
    };
    const updateNovelInput: UpdateNovelDocumentInput = {
      title: "Rooftop Signal Revised",
      content: "The hero raises a signal flare.",
    };
    const deleteNovelResult: DeleteNovelDocumentResult = {
      deleted: true,
      novelId: "novel_1",
    };
    const storyboard = validStoryboard();
    const validation = validateStoryboardResult(storyboard);

    expect(createNovelInput.language).toBe("en");
    expect(importNovelInput.sourceType).toBe("md");
    expect(updateNovelInput.title).toContain("Revised");
    expect(deleteNovelResult.deleted).toBe(true);
    expect(validation.success).toBe(true);

    if (!validation.success) {
      throw new Error("Expected storyboard validation to succeed");
    }

    const draft: StoryboardDraftRecord = {
      id: "draft_1",
      projectId: "project_1",
      novelDocumentId: "novel_1",
      status: "ready",
      storyboard: validation.data,
      validationIssues: [],
      provider: "mock-llm",
      model: "mock-storyboard",
      readyForImport: true,
      createdAt: "2026-06-12T00:00:00.000Z",
      updatedAt: "2026-06-12T00:00:00.000Z",
    };
    const updateDraftInput: UpdateStoryboardDraftInput = {
      storyboard: validation.data,
    };

    expect(draft.storyboard?.scenes[0]?.shots[0]?.imagePrompt).toContain("rooftop");
    expect(updateDraftInput.storyboard.characters[0]?.tempId).toBe("char_hero");
  });

  it("rejects malformed Phase 5 storyboard drafts", () => {
    const duplicateCharacter = validStoryboard();
    duplicateCharacter.characters[1] = {
      ...duplicateCharacter.characters[0],
      name: "Duplicate Hero",
    };
    const duplicateValidation = validateStoryboardResult(duplicateCharacter);
    expect(duplicateValidation.success).toBe(false);
    expect(duplicateValidation.issues.map((issue) => issue.message)).toContain(
      "Duplicate character temp id",
    );

    const missingReference = validStoryboard();
    missingReference.scenes[0]!.shots[0]!.characterTempIds = ["char_missing"];
    const missingReferenceValidation = validateStoryboardResult(missingReference);
    expect(missingReferenceValidation.success).toBe(false);
    expect(missingReferenceValidation.issues.map((issue) => issue.message)).toContain(
      "Unknown shot character temp id",
    );

    const emptyScenes = { ...validStoryboard(), scenes: [] };
    const emptyScenesValidation = validateStoryboardResult(emptyScenes);
    expect(emptyScenesValidation.success).toBe(false);
  });

  it("exports Phase 6 storyboard import layout contracts", () => {
    expect(STORYBOARD_IMPORT_DUPLICATE_POLICIES).toEqual(["new_version"]);

    const importInput: ImportStoryboardToCanvasInput = {
      novelDocumentId: "novel_1",
      storyboardDraftId: "draft_1",
      duplicatePolicy: "new_version",
    };
    const storyboard = twoSceneStoryboard();
    const plan = buildStoryboardImportPlan({
      storyboard,
      draftId: importInput.storyboardDraftId,
      novelDocumentId: importInput.novelDocumentId,
      importBatchId: "import_batch_1",
      importedAt: "2026-06-12T00:00:00.000Z",
      version: 2,
    });

    expect(plan.summary).toMatchObject({
      importBatchId: "import_batch_1",
      duplicatePolicy: "new_version",
      version: 2,
      sceneCount: 2,
      shotCount: 6,
      characterCount: 2,
      locationCount: 1,
      createdNodeCount: 14,
    });
    expect(plan.nodes.map((node) => node.type)).toEqual(
      expect.arrayContaining([
        "novel",
        "character_asset",
        "location_asset",
        "scene_frame",
        "scene",
        "shot",
      ]),
    );

    const firstShot = plan.nodes.find((node) => node.key === "shot:shot_1_1");
    expect(firstShot?.dataJson).toMatchObject({
      imagePrompt: "image prompt scene 1 shot 1",
      videoPrompt: "video prompt scene 1 shot 1",
      durationSeconds: 4,
      characterTempIds: ["char_hero", "char_friend"],
      locationTempId: "loc_city",
    });
    expect(hasStoryboardImportProvenance(firstShot?.dataJson)).toBe(true);
    expect(plan.edges.map((edge) => edge.relation)).toEqual(
      expect.arrayContaining(["belongs_to_scene", "references_character", "references_location"]),
    );
    expect(findStoryboardImportLayoutOverlaps(plan.nodes)).toEqual([]);
  });

  it("composes Phase 7 shot prompts from linked graph context and reference images", () => {
    const graph = promptComposerGraph();
    const result = composeShotPrompt({
      ...graph,
      shotNodeId: "shot_1",
      globalStylePrompt: "global cinematic watercolor style",
      modelPromptSuffix: "high detail, clean composition",
    });

    expect(result.sourceNodeIds).toMatchObject({
      shotNodeId: "shot_1",
      sceneNodeId: "scene_1",
      characterNodeIds: ["character_1", "character_2"],
      locationNodeId: "location_1",
    });
    expect(result.referenceAssetIds).toEqual([
      "asset_hero_ref",
      "asset_shared_ref",
      "asset_friend_ref",
      "asset_location_ref",
    ]);
    expect(result.image.prompt).toContain("Hero identity prompt");
    expect(result.image.prompt).toContain("Location prompt text");
    expect(result.image.prompt).toContain("Image prompt: hero and friend at the console");
    expect(result.video.prompt).toContain("Video prompt: slow dolly across the console");
    expect(result.negativePrompt).toBe("no text overlays");
    expect(result.debugParts.map((part) => part.kind)).toEqual(
      expect.arrayContaining(["global_style", "scene", "location", "character", "shot", "model_suffix"]),
    );
    expect(result.missingContext).toEqual([]);
  });

  it("returns shot-derived prompts and missing-context details when graph context is absent", () => {
    const shotOnly = canvasNode<ShotNodeData>("shot_lonely", "shot", "Lonely shot", {
      imagePrompt: "single figure in fog",
      visualDescription: "A lone figure pauses in a quiet street.",
    });

    const result = composeShotPrompt({
      shotNodeId: shotOnly.id,
      nodes: [shotOnly],
      edges: [],
      assets: [],
    });

    expect(result.image.prompt).toContain("single figure in fog");
    expect(result.image.prompt).toContain("A lone figure pauses");
    expect(result.missingContext.map((item) => item.kind)).toEqual(
      expect.arrayContaining(["scene", "character", "location"]),
    );
  });

  it("deduplicates reference image ids and recomposes from edited character and location data", () => {
    const graph = promptComposerGraph();
    const before = composeShotPrompt({ ...graph, shotNodeId: "shot_1" });
    const editedNodes = graph.nodes.map((node) => {
      if (node.id === "character_1") {
        const data = node.dataJson as CharacterAssetNodeData;
        return { ...node, dataJson: { ...data, identityPrompt: "edited hero identity prompt" } };
      }
      if (node.id === "location_1") {
        const data = node.dataJson as LocationAssetNodeData;
        return { ...node, dataJson: { ...data, locationPrompt: "edited location prompt" } };
      }
      return node;
    });

    const after = composeShotPrompt({
      ...graph,
      nodes: editedNodes,
      shotNodeId: "shot_1",
    });

    expect(before.referenceAssetIds.filter((assetId) => assetId === "asset_shared_ref")).toHaveLength(1);
    expect(after.referenceAssetIds.filter((assetId) => assetId === "asset_shared_ref")).toHaveLength(1);
    expect(after.image.prompt).toContain("edited hero identity prompt");
    expect(after.image.prompt).toContain("edited location prompt");
    expect(after.image.prompt).not.toContain("Hero identity prompt");
    expect(after.image.prompt).not.toContain("Location prompt text");
  });

  it("exports Phase 8 generation job inputs, outputs, and queue summary contracts", () => {
    const createInput: CreateGenerationJobInput = {
      operation: "shot_to_image",
      sourceNodeId: "shot_1",
      provider: "image2",
      model: "gpt-image-2",
      aspectRatio: "16:9",
      count: 3,
      providerParams: { quality: "medium" },
      forceFailure: true,
    };
    const catalogProvider: ImageProviderCatalogItem = {
      id: "banana",
      displayName: "Nano Banana",
      enabled: false,
      disabledReason: "Server-side Gemini image key is not configured",
      requiresApiKey: true,
      defaultModel: "gemini-2.5-flash-image",
      models: [
        {
          id: "gemini-2.5-flash-image",
          displayName: "Gemini 2.5 Flash Image",
          default: true,
        },
      ],
      supportedModes: ["text_to_image", "multi_reference"],
      supportsReferenceImages: true,
      maxReferenceImages: 3,
      supportsMultipleOutputs: false,
      maxOutputs: 1,
      defaultAspectRatio: "16:9",
      supportedAspectRatios: ["9:16", "16:9", "1:1"],
      parameters: [
        {
          id: "imageSize",
          label: "Image size",
          type: "select",
          defaultValue: "1K",
          options: [
            {
              value: "1K",
              label: "1K",
            },
          ],
        },
      ],
    };
    const catalog: ImageProviderCatalogResult = {
      providers: [catalogProvider],
    };
    const shotInput: ShotToImageJobInput = {
      operation: "shot_to_image",
      projectId: "project_1",
      sourceNodeId: "shot_1",
      shotNodeId: "shot_1",
      prompt: "cinematic image prompt",
      negativePrompt: "no text",
      referenceAssetIds: ["asset_ref_1"],
      sourceNodeIds: {
        shotNodeId: "shot_1",
        sceneNodeId: "scene_1",
        characterNodeIds: ["character_1"],
        locationNodeId: "location_1",
        referenceAssetIds: ["asset_ref_1"],
      },
      debugParts: [
        {
          id: "shot:shot_1:image",
          kind: "shot",
          label: "Shot",
          text: "cinematic image prompt",
          channels: ["image"],
          sourceNodeIds: ["shot_1"],
        },
      ],
      missingContext: [],
      provider: createInput.provider ?? "mock-image",
      model: createInput.model,
      aspectRatio: createInput.aspectRatio,
      count: createInput.count,
      providerParams: { seed: 7 },
      omittedReferenceAssetIds: ["asset_unsupported_ref"],
      referenceOmissionReason: "Selected provider supports fewer reference images",
      forceFailure: true,
    };
    const videoInput: ImageToVideoJobInput = {
      operation: "image_to_video",
      projectId: "project_1",
      sourceNodeId: "image_1",
      imageNodeId: "image_1",
      sourceImageAssetId: "asset_image_1",
      prompt: "slow dolly across the frame",
      durationSeconds: 5,
      parentShotNodeId: "shot_1",
      parentShotTitle: "Shot 01",
      referenceAssetIds: ["asset_ref_1"],
      sourceNodeIds: ["image_1", "shot_1"],
      provider: "mock-video",
      model: "mock-video-v1",
    };
    const output: GeneratedMediaJobOutput = {
      operation: "shot_to_image",
      sourceNodeId: "shot_1",
      targetNodeId: "image_1",
      assetId: "asset_image_1",
      edgeId: "edge_generated_image_1",
      provider: "mock-image",
      model: "mock-image-v1",
      prompt: shotInput.prompt,
      referenceAssetIds: shotInput.referenceAssetIds,
      providerOutput: {
        assetId: "provider_asset_image_1",
        storageKey: "mock/images/provider_asset_image_1.png",
        mimeType: "image/png",
        provider: "mock-image",
        model: "mock-image-v1",
        prompt: shotInput.prompt,
        referenceAssetIds: shotInput.referenceAssetIds,
        remoteUrl: "https://provider.example/generated/image-1.png",
        width: 1344,
        height: 768,
      },
      targets: [
        {
          targetNodeId: "image_1",
          assetId: "asset_image_1",
          edgeId: "edge_generated_image_1",
          providerOutput: {
            assetId: "provider_asset_image_1",
            storageKey: "mock/images/provider_asset_image_1.png",
            mimeType: "image/png",
            provider: "image2",
            model: "gpt-image-2",
            prompt: shotInput.prompt,
            referenceAssetIds: shotInput.referenceAssetIds,
            remoteUrl: "https://provider.example/generated/image-1.png",
          },
        },
        {
          targetNodeId: "image_2",
          assetId: "asset_image_2",
          edgeId: "edge_generated_image_2",
          providerOutput: {
            assetId: "provider_asset_image_2",
            storageKey: "mock/images/provider_asset_image_2.png",
            mimeType: "image/png",
            provider: "image2",
            model: "gpt-image-2",
            prompt: shotInput.prompt,
            referenceAssetIds: shotInput.referenceAssetIds,
            bytesBase64: "iVBORw0KGgo=",
          },
        },
      ],
      completedAt: "2026-06-12T00:00:00.000Z",
    };
    const counts: GenerationQueueSummary["counts"] = {
      queued: 1,
      running: 2,
      provider_waiting: 0,
      succeeded: 3,
      failed: 1,
      cancelled: 0,
    };
    const queueSummary: GenerationQueueSummary = {
      counts,
      queued: counts.queued,
      running: counts.running,
      failed: counts.failed,
    };
    const listResult: GenerationJobListResult<ShotToImageJobInput | ImageToVideoJobInput> = {
      jobs: [
        {
          id: "job_1",
          projectId: "project_1",
          operation: "shot_to_image",
          status: "succeeded",
          provider: "mock-image",
          model: "mock-image-v1",
          sourceNodeId: "shot_1",
          targetNodeId: "image_1",
          inputJson: shotInput,
          outputJson: output,
          createdAt: "2026-06-12T00:00:00.000Z",
          updatedAt: "2026-06-12T00:00:01.000Z",
        },
        {
          id: "job_2",
          projectId: "project_1",
          operation: "image_to_video",
          status: "queued",
          provider: "mock-video",
          model: "mock-video-v1",
          sourceNodeId: "image_1",
          inputJson: videoInput,
          createdAt: "2026-06-12T00:00:02.000Z",
          updatedAt: "2026-06-12T00:00:02.000Z",
        },
      ],
      queueSummary,
    };
    const imageNodeData: ImageNodeData = {
      assetId: output.assetId,
      prompt: output.prompt,
      provider: output.provider,
      model: output.model,
      generationJobId: "job_1",
      generationOperation: "shot_to_image",
      generatedFromNodeId: "shot_1",
      sourceNodeIds: ["shot_1"],
      referenceAssetIds: output.referenceAssetIds,
      inputJson: shotInput,
      outputJson: output,
    };

    expect(createInput.operation).toBe("shot_to_image");
    expect(catalog.providers[0]?.disabledReason).not.toContain("key=");
    expect(shotInput).toMatchObject({
      provider: "image2",
      model: "gpt-image-2",
      aspectRatio: "16:9",
      count: 3,
    });
    expect(listResult.jobs.map((job) => job.operation)).toEqual(["shot_to_image", "image_to_video"]);
    expect(listResult.queueSummary).toMatchObject({ queued: 1, running: 2, failed: 1 });
    expect(imageNodeData.generationJobId).toBe("job_1");
    expect(imageNodeData.inputJson).toMatchObject({ prompt: "cinematic image prompt" });
    expect(imageNodeData.outputJson).toMatchObject({
      targetNodeId: "image_1",
      targets: expect.arrayContaining([
        expect.objectContaining({ targetNodeId: "image_2", assetId: "asset_image_2" }),
      ]),
    });
  });
});

function promptComposerGraph(): {
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
  assets: AssetListItem[];
} {
  const nodes: CanvasNodeRecord[] = [
    canvasNode<SceneNodeData>("scene_1", "scene", "Scene 01", {
      sceneNumber: "01",
      synopsis: "The team prepares the console before sunrise.",
      mood: "focused",
      timeOfDay: "dawn",
    }),
    canvasNode<CharacterAssetNodeData>("character_1", "character_asset", "Hero", {
      name: "Hero",
      role: "lead",
      appearance: "Silver jacket and calm posture.",
      identityPrompt: "Hero identity prompt",
      consistencyPrompt: "Hero consistency prompt",
      referenceAssetIds: ["asset_hero_ref", "asset_shared_ref", "asset_shared_ref"],
    }),
    canvasNode<CharacterAssetNodeData>("character_2", "character_asset", "Friend", {
      name: "Friend",
      role: "support",
      appearance: "Dark coat and bright tablet.",
      identityPrompt: "Friend identity prompt",
      consistencyPrompt: "Friend consistency prompt",
      referenceAssetIds: ["asset_friend_ref", "asset_shared_ref"],
    }),
    canvasNode<LocationAssetNodeData>("location_1", "location_asset", "Control Room", {
      name: "Control Room",
      environment: "glass walls above the city",
      locationPrompt: "Location prompt text",
      consistencyPrompt: "same console bank and dawn skyline",
      referenceAssetIds: ["asset_location_ref"],
    }),
    canvasNode<ShotNodeData>("shot_1", "shot", "Shot 01", {
      shotNumber: "01",
      imagePrompt: "hero and friend at the console",
      videoPrompt: "slow dolly across the console",
      visualDescription: "Two characters lean into a glowing control panel.",
      action: "They start the launch sequence.",
      cameraMovement: "slow dolly",
      durationSeconds: 5,
      negativePromptNotes: "no text overlays",
      characterAssetIds: ["character_1", "character_2"],
      locationAssetId: "location_1",
    }),
  ];
  return {
    nodes,
    edges: [
      canvasEdge("edge_scene", "shot_1", "scene_1", "belongs_to_scene"),
      canvasEdge("edge_character_1", "character_1", "shot_1", "references_character"),
      canvasEdge("edge_character_2", "character_2", "shot_1", "references_character"),
      canvasEdge("edge_location", "location_1", "shot_1", "references_location"),
    ],
    assets: [
      assetListItem("asset_hero_ref", "image"),
      assetListItem("asset_shared_ref", "image"),
      assetListItem("asset_friend_ref", "image"),
      assetListItem("asset_location_ref", "image"),
    ],
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
    createdAt: "2026-06-12T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
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
    createdAt: "2026-06-12T00:00:00.000Z",
  };
}

function assetListItem(id: string, type: AssetListItem["type"]): AssetListItem {
  return {
    id,
    projectId: "project_1",
    type,
    purpose: "uploaded",
    storageKey: `${id}.png`,
    mimeType: "image/png",
    originalFilename: `${id}.png`,
    previewKind: "image",
    previewUrl: `/assets/${id}/preview`,
    createdAt: "2026-06-12T00:00:00.000Z",
  };
}

function validStoryboard(): StoryboardResult {
  return {
    title: "Local Mock Storyboard",
    logline: "A mock storyboard generated from a local excerpt.",
    characters: [
      {
        tempId: "char_hero",
        name: "Hero",
        role: "protagonist",
        appearance: "A consistent lead character for mock generation.",
        personality: "Determined and observant.",
        identityPrompt: "consistent protagonist, cinematic character reference",
      },
    ],
    locations: [
      {
        tempId: "loc_city",
        name: "City Rooftop",
        type: "exterior",
        description: "A simple rooftop location used by the mock storyboard.",
        lighting: "soft evening light",
        atmosphere: "quiet and expectant",
        locationPrompt: "cinematic rooftop, soft evening light",
      },
    ],
    scenes: [
      {
        tempId: "scene_1",
        title: "Opening Beat",
        sourceExcerpt: "A hero watches the city lights before choosing the next shot.",
        summary: "The story opens with a clear visual action.",
        mood: "anticipatory",
        timeOfDay: "evening",
        characterTempIds: ["char_hero"],
        locationTempId: "loc_city",
        shots: [
          {
            tempId: "shot_1",
            shotIndex: 1,
            title: "Hero establishes the scene",
            durationSec: 4,
            visualDescription: "The hero steps into frame and surveys the city.",
            action: "walks to the edge of the rooftop",
            cameraMovement: "slow push in",
            mood: "focused",
            characterTempIds: ["char_hero"],
            locationTempId: "loc_city",
            imagePrompt: "hero on a cinematic rooftop, evening, slow push in",
            videoPrompt: "slow push in on hero overlooking the city",
          },
        ],
      },
    ],
  };
}

function twoSceneStoryboard(): StoryboardResult {
  const storyboard = validStoryboard();
  storyboard.characters.push({
    tempId: "char_friend",
    name: "Friend",
    role: "support",
    appearance: "A second consistent character.",
    personality: "Calm and practical.",
    identityPrompt: "consistent support character, cinematic character reference",
  });
  storyboard.scenes = [buildImportScene(1), buildImportScene(2)];
  return storyboard;
}

function buildImportScene(sceneIndex: number): StoryboardResult["scenes"][number] {
  return {
    tempId: `scene_${sceneIndex}`,
    title: `Scene ${sceneIndex}`,
    sourceExcerpt: `Scene ${sceneIndex} source excerpt.`,
    summary: `Scene ${sceneIndex} summary.`,
    mood: "focused",
    timeOfDay: "evening",
    characterTempIds: ["char_hero", "char_friend"],
    locationTempId: "loc_city",
    shots: [1, 2, 3].map((shotIndex) => ({
      tempId: `shot_${sceneIndex}_${shotIndex}`,
      shotIndex,
      title: `Shot ${sceneIndex}.${shotIndex}`,
      durationSec: 3 + shotIndex,
      visualDescription: `Visual scene ${sceneIndex} shot ${shotIndex}.`,
      action: `Action scene ${sceneIndex} shot ${shotIndex}.`,
      cameraMovement: "slow push in",
      characterTempIds: ["char_hero", "char_friend"],
      locationTempId: "loc_city",
      imagePrompt: `image prompt scene ${sceneIndex} shot ${shotIndex}`,
      videoPrompt: `video prompt scene ${sceneIndex} shot ${shotIndex}`,
    })),
  };
}
