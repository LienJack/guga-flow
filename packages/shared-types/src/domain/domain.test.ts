import { describe, expect, it } from "vitest";

import {
  AUDIO_PROVIDER_IDS,
  AUDIO_PROVIDER_MODES,
  ASSET_PREVIEW_KINDS,
  ASSET_DERIVATIVE_KINDS,
  ASSET_DERIVATIVE_REBUILD_STRATEGIES,
  ASSET_DERIVATIVE_STATUSES,
  ASSET_PROMPT_OPERATIONS,
  ASSET_PURPOSES,
  ASSET_TYPES,
  AGENT_CANVAS_ACTION_KINDS,
  AGENT_DEPLOYMENT_MODES,
  AGENT_DEPLOYMENT_ROLES,
  AGENT_MEMORY_SCOPES,
  AGENT_MEMORY_SOURCES,
  CANVAS_INPUT_KINDS,
  CANVAS_INPUT_ROLES,
  CANVAS_NODE_CAPABILITIES,
  CANVAS_NODE_FAMILIES,
  CANVAS_NODE_INPUT_SLOTS,
  CANVAS_NODE_REGISTRY,
  CANVAS_NODE_REGISTRY_ITEMS,
  CANVAS_EDGE_RELATIONS,
  CANVAS_NODE_TYPES,
  CANVAS_SAVE_STATUSES,
  CREATIVE_AGENT_MODES,
  DIAGNOSTIC_EVENT_CATEGORIES,
  DIAGNOSTIC_EVENT_SEVERITIES,
  EDITOR_EXPORT_SORT_MODES,
  EDITOR_EXPORT_PRESETS,
  EDITOR_EXPORT_STATUSES,
  EDITOR_PACKAGE_MIME_TYPE,
  GENERATION_CONTINUITY_MODES,
  GENERATION_CREATIVE_SETTING_KEYS,
  GENERATION_JOB_STATUSES,
  GENERATION_OPERATIONS,
  MEDIA_METADATA_OPERATIONS,
  GENERATION_PACKAGING_REFERENCE_STATUSES,
  IMAGE_PROVIDER_IDS,
  IMAGE_PROVIDER_MODES,
  LLM_PROVIDER_IDS,
  LLM_PROVIDER_MODES,
  MANAGED_PROVIDER_KINDS,
  NOVEL_LANGUAGES,
  NOVEL_SOURCE_TYPES,
  PHASE_8_GENERATION_OPERATIONS,
  PHASE_3_CANVAS_NODE_TYPES,
  PRODUCTION_WORKSPACE_ITEM_TYPES,
  PRODUCTION_AGENT_ACTION_KINDS,
  AGENT_STREAM_EVENT_PHASES,
  PROVIDER_CREDENTIAL_UPDATE_ACTIONS,
  PROVIDER_ERROR_CATEGORIES,
  PROVIDER_KINDS,
  PROVIDER_PROTOCOLS,
  PROGRAMMABLE_PROVIDER_CREDENTIAL_INPUT_TYPES,
  PROGRAMMABLE_PROVIDER_HTTP_METHODS,
  PROGRAMMABLE_PROVIDER_OUTPUT_SOURCES,
  PROGRAMMABLE_PROVIDER_VERSION_STATUSES,
  PROVIDER_TEST_STATUSES,
  PROJECT_ASPECT_RATIOS,
  SCRIPT_ADAPTATION_STRATEGIES,
  SCRIPT_DRAFT_STATUSES,
  SCENE_FRAME_EXTRACTION_OPERATIONS,
  SCENE_FRAME_EXTRACTION_STRATEGIES,
  SETTINGS_CENTER_MODULES,
  SETTINGS_CENTER_MODULE_STATUSES,
  SKILL_TEMPLATE_INDEX_STATUSES,
  SKILL_TEMPLATE_KINDS,
  SKILL_TEMPLATE_PRESET_CATEGORIES,
  SKILL_TEMPLATE_TRIGGER_MODES,
  SKILL_TEMPLATE_VERSION_STATUSES,
  SOURCE_MEDIA_IMPORT_METHODS,
  STORYBOARD_IMPORT_DUPLICATE_POLICIES,
  STORYBOARD_DRAFT_STATUSES,
  STREAMING_AGENT_ROLES,
  TASK_CENTER_TASK_CLASSES,
  UPLOADABLE_ASSET_MIME_TYPES,
  VIDEO_PROVIDER_IDS,
  VIDEO_PROVIDER_MODES,
  VIDEO_PROMPT_CHECK_CODES,
  VIDEO_PROMPT_CHECK_SEVERITIES,
  VIDEO_PROMPT_MODES,
  VIDEO_PROVIDER_RESOLUTIONS,
  VIDEO_PROVIDER_TASK_STATUSES,
  buildStoryboardImportPlan,
  canvasNodeHasCapability,
  canvasNodeTypesByFamily,
  composeShotPrompt,
  findStoryboardImportLayoutOverlaps,
  filterSkillTemplateSummaries,
  hasStoryboardImportProvenance,
  managedProviderId,
  managedProviderKind,
  normalizeGenerationCreativeSettings,
  normalizeProviderConnectionTestInput,
  normalizeProviderErrorCategory,
  normalizeUpdateProviderConfigInput,
  programmableProviderId,
  resolveCanvasInputSlot,
  resolveGenerationSettings,
  skillTemplateMetadata,
  validateCanvasInputConnection,
  type AssetListItem,
  type AssetMediaMetadata,
  type AssetPromptMetadata,
  type AssetImageGenerationJobInput,
  type AssetPromptPolishJobInput,
  type AgentCanvasActionJobInput,
  type AgentCanvasActionJobOutput,
  type AgentMemoryListResult,
  type AgentMemoryRecord,
  type AgentStreamEventPayload,
  type BatchImagesToVideosJobInput,
  type BatchShotsToImagesJobInput,
  type CharacterToImageJobInput,
  type CharacterAssetNodeData,
  type CanvasEdgeData,
  type CanvasEdgeRecord,
  type CanvasLoadResult,
  type CanvasNodeRecord,
  type CanvasSnapshotJson,
  type CreateBatchImagesToVideosJobInput,
  type CreateBatchImagesToVideosJobResult,
  type CreateBatchShotsToImagesJobInput,
  type CreateBatchShotsToImagesJobResult,
  type CreateAgentCanvasActionInput,
  type CreateAgentCanvasActionResult,
  type CreateAgentSessionInput,
  type CreateAgentSessionResult,
  type CreateCanvasEdgeInput,
  type CreateCanvasEdgeResult,
  type CreateCreativeStoryboardInput,
  type CreateCreativeStoryboardResult,
  type CreateEditorExportInput,
  type CreateEditorExportResult,
  type CreateGenerationJobInput,
  type CreateProductionAgentActionInput,
  type CreateProductionAgentActionResult,
  type CreateCanvasNodeInput,
  type CreateNovelDocumentInput,
  type Director3DNodeData,
  type DeleteCanvasEdgeResult,
  type DeleteCanvasNodeResult,
  type DeleteNovelDocumentResult,
  type EditorExportJobInput,
  type EditorExportJobOutput,
  type EditorExportPackageOutput,
  type EditorExportRecord,
  type EditorExportSendResult,
  type EditorPackageNodeData,
  type GenerationCreativeSettings,
  type GeneratedMediaJobOutput,
  type ImageProviderCatalogItem,
  type ImageProviderCatalogResult,
  type ImageProviderManagementItem,
  type ProgrammableProviderDefinitionSummary,
  type ProgrammableProviderManifest,
  type GenerationJobListResult,
  type GenerationQueueSummary,
  type ImageRefinementJobInput,
  type ImageNodeData,
  type ImageToVideoJobInput,
  type ImportStoryboardToCanvasInput,
  type ImportNovelSourceInput,
  type LocationAssetNodeData,
  type LocationToImageJobInput,
  type MediaMetadataJobInput,
  type NovelToStoryboardJobInput,
  type NovelEventGraphRecord,
  type NovelToStoryboardJobOutput,
  type Phase3CanvasNodeRecord,
  type ProjectListItem,
  type ProjectRecord,
  type RecallAgentMemoriesResult,
  type ResolvedGenerationSettings,
  type SaveCanvasSnapshotInput,
  type SceneFrameExtractionJobInput,
  type SceneFrameNodeData,
  type SceneNodeData,
  type ProjectSettingsSummaryResult,
  type ProjectSettingsExportPayload,
  type ProjectSettingsImportValidationResult,
  type PanoramaNodeData,
  type ShotToImageJobInput,
  type ShotNodeData,
  type ScriptDraftRecord,
  type SourceMediaNodeData,
  type SkillTemplatePromptContext,
  type SkillTemplateSummary,
  type StoryboardDraftRecord,
  type StoryboardResult,
  type TaskCenterResult,
  type TimelineManifest,
  type UpdateCanvasNodeGeometryInput,
  type UpdateCanvasNodeInput,
  type UndoAgentCanvasActionResult,
  type UpdateNovelDocumentInput,
  type UpdateStoryboardDraftInput,
  type VideoProviderCatalogItem,
  type VideoProviderCatalogResult,
  type VideoProviderManagementItem,
  type VideoProviderTaskResult,
  type VideoNodeData,
  type WorkerGenerationJobCancelInput,
  type WorkerGenerationJobWaitInput,
  validateStoryboardResult,
  type AuthSessionRecord,
  type CurrentSessionResult,
  type LoginInput,
  type LogoutResult,
} from "../index";

describe("shared domain constants", () => {
  it("exports auth session contracts for browser login", () => {
    const loginInput: LoginInput = {
      email: "admin",
      password: "admin",
    };
    const session: AuthSessionRecord = {
      token: "session-token",
      user: { id: "default-user", email: loginInput.email, name: "Admin" },
      expiresAt: "2026-06-21T00:00:00.000Z",
    };
    const currentSession: CurrentSessionResult = {
      authenticated: true,
      user: session.user,
      expiresAt: session.expiresAt,
    };
    const logout: LogoutResult = { ok: true };

    expect(currentSession.user?.id).toBe("default-user");
    expect(logout.ok).toBe(true);
  });

  it("exports media derivative metadata contracts", () => {
    const metadata: AssetMediaMetadata = {
      previewKind: "video",
      original: {
        kind: "original",
        status: "ready",
        assetId: "asset_video_1",
        storageKey: "project_1/source.mp4",
        rebuildStrategy: "source_asset",
      },
      thumbnail: {
        kind: "thumbnail",
        status: "pending",
        sourceAssetId: "asset_video_1",
        rebuildStrategy: "mock_media_metadata",
      },
      mediaInfo: {
        durationMs: 4200,
        hasVideo: true,
        hasAudio: false,
      },
    };
    const jobInput: MediaMetadataJobInput = {
      operation: "media_metadata",
      projectId: "project_1",
      assetIds: ["asset_video_1"],
      provider: "mock-media",
      model: "metadata-v1",
      createThumbnail: true,
    };

    expect(ASSET_DERIVATIVE_KINDS).toContain(metadata.thumbnail?.kind);
    expect(ASSET_DERIVATIVE_STATUSES).toContain(metadata.thumbnail?.status);
    expect(ASSET_DERIVATIVE_REBUILD_STRATEGIES).toContain(metadata.original?.rebuildStrategy);
    expect(MEDIA_METADATA_OPERATIONS).toEqual(["media_metadata"]);
    expect(jobInput.operation).toBe("media_metadata");
  });

  it("exports asset prompt polish and generation contracts", () => {
    const metadata: AssetPromptMetadata = {
      assetPrompt: "A clean production reference of Ari.",
      polishedPrompt: "Production reference image of Ari with consistent wardrobe and neutral lighting.",
      generatedAssetIds: ["asset_generated_1"],
    };
    const polishInput: AssetPromptPolishJobInput = {
      operation: "asset_prompt_polish",
      projectId: "project_1",
      assetIds: ["asset_1"],
      items: [{ assetId: "asset_1", prompt: metadata.assetPrompt ?? "" }],
      provider: "mock-llm",
      model: "mock-polish-v1",
      overwrite: false,
    };
    const imageInput: AssetImageGenerationJobInput = {
      operation: "asset_image_generation",
      projectId: "project_1",
      assetIds: ["asset_1"],
      items: [{ assetId: "asset_1", prompt: metadata.polishedPrompt ?? metadata.assetPrompt ?? "" }],
      provider: "mock-image",
      model: "mock-image-v1",
      aspectRatio: "16:9",
      count: 1,
    };

    expect(ASSET_PROMPT_OPERATIONS).toEqual(["asset_prompt_polish", "asset_image_generation"]);
    expect(polishInput.operation).toBe("asset_prompt_polish");
    expect(imageInput.items[0]?.prompt).toContain("Production reference");
  });

  it("includes MVP canvas node and edge concepts", () => {
    expect(CANVAS_NODE_TYPES).toContain("shot");
    expect(CANVAS_NODE_TYPES).toContain("ai_text");
    expect(CANVAS_NODE_TYPES).toContain("ai_audio");
    expect(CANVAS_NODE_TYPES).toContain("editor_package");
    expect(CANVAS_NODE_FAMILIES).toEqual([
      "business",
      "source_media",
      "ai_generation",
      "media_operation",
      "layout_helper",
      "advanced_visual",
    ]);
    expect(CANVAS_NODE_CAPABILITIES).toEqual([
      "accepts_text",
      "accepts_image",
      "accepts_video",
      "accepts_audio",
      "produces_asset",
      "produces_text",
      "has_preview",
      "has_task",
    ]);
    expect(CANVAS_NODE_REGISTRY_ITEMS.map((item) => item.type)).toEqual(CANVAS_NODE_TYPES);
    for (const type of CANVAS_NODE_TYPES) {
      const item = CANVAS_NODE_REGISTRY[type];
      expect(item.type).toBe(type);
      expect(CANVAS_NODE_FAMILIES).toContain(item.family);
      expect(item.familyLabel).toBeTruthy();
      expect(item.label).toBeTruthy();
      expect(item.description).toBeTruthy();
      for (const capability of item.capabilities) {
        expect(CANVAS_NODE_CAPABILITIES).toContain(capability);
      }
    }
    expect(canvasNodeTypesByFamily("business")).toEqual(
      expect.arrayContaining(["novel", "shot", "character_asset"]),
    );
    expect(canvasNodeTypesByFamily("source_media")).toEqual([
      "source_text",
      "source_image",
      "source_video",
      "source_audio",
    ]);
    expect(canvasNodeTypesByFamily("ai_generation")).toEqual(["ai_text", "ai_audio", "image", "video"]);
    expect(canvasNodeHasCapability("source_image", "accepts_image")).toBe(true);
    expect(canvasNodeHasCapability("source_audio", "accepts_audio")).toBe(true);
    expect(canvasNodeHasCapability("video", "accepts_audio")).toBe(true);
    expect(canvasNodeHasCapability("note", "has_task")).toBe(false);
    expect(CANVAS_EDGE_RELATIONS).toContain("generated_image");
    expect(CANVAS_EDGE_RELATIONS).toContain("generated_video");
    expect(CANVAS_EDGE_RELATIONS).toContain("generated_audio");
    expect(CANVAS_EDGE_RELATIONS).toContain("story_seed");
    expect(CANVAS_EDGE_RELATIONS).toContain("sent_to_editor");
  });

  it("resolves and validates canvas input slot policies", () => {
    expect(CANVAS_INPUT_KINDS).toEqual(["text", "image", "video", "audio"]);
    expect(CANVAS_INPUT_ROLES).toContain("reference_image");
    expect(CANVAS_NODE_INPUT_SLOTS.image?.map((slot) => slot.id)).toEqual([
      "prompt_text",
      "reference_image",
    ]);
    expect(
      resolveCanvasInputSlot({
        sourceType: "source_image",
        targetType: "image",
      }),
    ).toMatchObject({ id: "reference_image", inputKind: "image" });
    expect(
      resolveCanvasInputSlot({
        sourceType: "source_video",
        targetType: "shot",
      }),
    ).toMatchObject({ id: "reference_video", inputKind: "video" });

    const sourceImage = canvasNode("source_image_1", "source_image", "Reference", {});
    const imageNode = canvasNode("image_1", "image", "Image", {});
    const sourceAudio = canvasNode("source_audio_1", "source_audio", "Voice", {});
    const valid = validateCanvasInputConnection({
      sourceNode: sourceImage,
      targetNode: imageNode,
      existingEdges: [],
    });
    const mismatch = validateCanvasInputConnection({
      sourceNode: sourceAudio,
      targetNode: imageNode,
      existingEdges: [],
    });
    const overflow = validateCanvasInputConnection({
      sourceNode: sourceImage,
      targetNode: imageNode,
      existingEdges: Array.from({ length: 4 }, (_, index) => ({
        ...canvasEdge(`edge_${index}`, `source_${index}`, imageNode.id, "derived_from"),
        dataJson: { slotId: "reference_image", inputKind: "image", inputRole: "reference_image", order: index },
      })),
    });

    expect(valid).toMatchObject({
      ok: true,
      edgeData: {
        slotId: "reference_image",
        inputKind: "image",
        inputRole: "reference_image",
        order: 0,
      },
    });
    expect(mismatch).toMatchObject({
      ok: false,
      error: { code: "type_mismatch" },
    });
    expect(overflow).toMatchObject({
      ok: false,
      error: { code: "count_exceeded" },
    });
  });

  it("models worker-visible generation lifecycle states", () => {
    expect(GENERATION_JOB_STATUSES).toEqual(
      expect.arrayContaining(["queued", "running", "provider_waiting", "succeeded", "failed"]),
    );
    expect(GENERATION_OPERATIONS).toContain("novel_to_storyboard");
    expect(GENERATION_OPERATIONS).toContain("editor_export");
    expect(GENERATION_OPERATIONS).toContain("agent_canvas_action");
    expect(AGENT_CANVAS_ACTION_KINDS).toEqual([
      "create_node",
      "update_node",
      "create_edge",
      "create_storyboard_board",
    ]);
    expect(STREAMING_AGENT_ROLES).toEqual(["script", "production"]);
    expect(AGENT_STREAM_EVENT_PHASES).toEqual([
      "queued",
      "thinking",
      "tool_result",
      "completed",
      "failed",
      "stopped",
    ]);
    expect(TASK_CENTER_TASK_CLASSES).toContain("agent");
    expect(DIAGNOSTIC_EVENT_CATEGORIES).toContain("provider");
    expect(DIAGNOSTIC_EVENT_SEVERITIES).toEqual(["info", "warning", "error"]);
    expect(AGENT_DEPLOYMENT_MODES).toEqual(["simple", "advanced"]);
    expect(AGENT_DEPLOYMENT_ROLES).toEqual([
      "script",
      "production",
      "universal",
      "supervision",
      "skeleton",
      "adaptation",
      "storyboard",
      "asset",
      "video_prompt",
    ]);
    expect(AGENT_MEMORY_SCOPES).toEqual(["project", "agent"]);
    expect(AGENT_MEMORY_SOURCES).toEqual(["manual", "agent_action", "system_summary"]);
    expect(PHASE_8_GENERATION_OPERATIONS).toEqual([
      "shot_to_image",
      "character_to_image",
      "location_to_image",
      "image_refinement",
      "image_to_video",
      "ai_text_generation",
      "ai_audio_generation",
    ]);
    expect(IMAGE_PROVIDER_IDS).toEqual(["mock-image", "image2", "banana", "generic-image"]);
    expect(IMAGE_PROVIDER_MODES).toEqual(["text_to_image", "image_to_image", "multi_reference"]);
    expect(LLM_PROVIDER_IDS).toEqual(["mock-llm", "generic-llm", "gemini-llm", "anthropic", "ark-llm"]);
    expect(LLM_PROVIDER_MODES).toEqual(["chat", "text", "json"]);
    expect(AUDIO_PROVIDER_IDS).toEqual(["mock-audio"]);
    expect(AUDIO_PROVIDER_MODES).toEqual([
      "text_to_speech",
      "voice_reference",
      "background_music",
      "narration",
    ]);
    expect(VIDEO_PROVIDER_IDS).toEqual(["mock-video", "seedance", "happyhorse", "generic-video"]);
    expect(VIDEO_PROVIDER_MODES).toEqual([
      "text_to_video",
      "image_to_video",
      "reference_to_video",
      "video_edit",
    ]);
    expect(VIDEO_PROMPT_MODES).toEqual([
      "generic_multi_reference",
      "first_frame",
      "first_last_frame",
      "provider_specific",
    ]);
    expect(VIDEO_PROMPT_CHECK_SEVERITIES).toEqual(["info", "warning", "error"]);
    expect(VIDEO_PROMPT_CHECK_CODES).toEqual([
      "missing_first_frame",
      "missing_dialogue",
      "missing_video_prompt",
      "unsupported_mode",
      "unsupported_reference_media",
      "invalid_duration",
    ]);
    expect(VIDEO_PROVIDER_RESOLUTIONS).toEqual(["720p", "1080p"]);
    expect(VIDEO_PROVIDER_TASK_STATUSES).toEqual([
      "provider_waiting",
      "succeeded",
      "failed",
      "cancelled",
    ]);
    expect(PROVIDER_KINDS).toEqual(["llm", "image", "video", "editor"]);
    expect(MANAGED_PROVIDER_KINDS).toEqual(["llm", "image", "video"]);
    expect(PROVIDER_PROTOCOLS).toEqual(["openai_compatible", "gemini", "anthropic", "ark", "mock"]);
    expect(PROVIDER_CREDENTIAL_UPDATE_ACTIONS).toEqual(["unchanged", "set", "clear"]);
    expect(PROVIDER_ERROR_CATEGORIES).toEqual([
      "auth",
      "quota",
      "rate_limit",
      "bad_input",
      "unsupported_model",
      "timeout",
      "safety_block",
      "unknown",
    ]);
    expect(PROVIDER_TEST_STATUSES).toEqual(["untested", "succeeded", "failed"]);
    expect(PROGRAMMABLE_PROVIDER_VERSION_STATUSES).toEqual(["valid", "invalid"]);
    expect(PROGRAMMABLE_PROVIDER_CREDENTIAL_INPUT_TYPES).toEqual(["password", "text", "url"]);
    expect(PROGRAMMABLE_PROVIDER_HTTP_METHODS).toEqual(["GET", "POST"]);
    expect(PROGRAMMABLE_PROVIDER_OUTPUT_SOURCES).toEqual(["url", "base64"]);
    expect(SKILL_TEMPLATE_KINDS).toEqual([
      "story",
      "art",
      "production",
      "agent",
      "ai-image",
      "ai-text",
      "ai-video",
      "ai-audio",
    ]);
    expect(SKILL_TEMPLATE_VERSION_STATUSES).toEqual(["valid", "invalid"]);
    expect(SKILL_TEMPLATE_PRESET_CATEGORIES).toEqual([
      "ai-image",
      "ai-text",
      "ai-video",
      "ai-audio",
      "story",
      "production",
      "agent",
    ]);
    expect(SKILL_TEMPLATE_TRIGGER_MODES).toEqual(["insert_prompt", "direct_generate"]);
    expect(SKILL_TEMPLATE_INDEX_STATUSES).toEqual([
      "ready",
      "disabled",
      "missing_description",
      "invalid_source",
    ]);
    expect(SCRIPT_ADAPTATION_STRATEGIES).toEqual(["faithful", "short_drama", "visual_first"]);
    expect(SCRIPT_DRAFT_STATUSES).toEqual(["draft", "selected", "exported"]);
    expect(SETTINGS_CENTER_MODULES).toEqual([
      "providers",
      "agents",
      "prompts",
      "project_defaults",
      "data",
      "files",
      "version",
    ]);
    expect(SETTINGS_CENTER_MODULE_STATUSES).toEqual(["ready", "partial", "planned"]);
    expect(EDITOR_EXPORT_SORT_MODES).toEqual(["shot_index", "canvas_x", "manual"]);
    expect(EDITOR_EXPORT_PRESETS).toEqual(["standard_zip", "gif_preview", "image_sequence", "hd_1080p"]);
    expect(EDITOR_EXPORT_STATUSES).toEqual(["queued", "running", "succeeded", "failed"]);
    expect(GENERATION_CREATIVE_SETTING_KEYS).toEqual(
      expect.arrayContaining([
        "visualStyle",
        "aspectRatio",
        "visualManual",
        "directorManual",
        "subtitle",
        "bgm",
        "transition",
        "stylePack",
        "viralReference",
        "continuity",
        "talkingPhoto",
        "marketing",
      ]),
    );
    expect(GENERATION_CONTINUITY_MODES).toEqual(["standard", "match_cut", "one_take", "multi_image"]);
    expect(GENERATION_PACKAGING_REFERENCE_STATUSES).toEqual([
      "absent",
      "requested_unresolved",
      "available",
    ]);
  });

  it("includes Phase 1 project and upload asset contracts", () => {
    expect(PROJECT_ASPECT_RATIOS).toEqual(["9:16", "16:9", "1:1"]);
    expect(NOVEL_SOURCE_TYPES).toEqual(["paste", "txt", "md"]);
    expect(NOVEL_LANGUAGES).toEqual(["zh", "en", "ja", "other"]);
    expect(ASSET_TYPES).toEqual(["image", "video", "audio", "document", "package"]);
    expect(ASSET_PURPOSES).toEqual(
      expect.arrayContaining(["shot_audio", "voice_reference", "background_music"]),
    );
    expect(UPLOADABLE_ASSET_MIME_TYPES).toEqual(
      expect.arrayContaining(["image/png", "video/mp4", "audio/mpeg", "text/markdown"]),
    );
    expect(ASSET_PREVIEW_KINDS).toEqual(["image", "video", "audio", "text", "metadata"]);
    expect(EDITOR_PACKAGE_MIME_TYPE).toBe("application/zip");

    const generationSettings: GenerationCreativeSettings = {
      visualStyle: "cinematic noir",
      aspectRatio: "9:16",
      narrationLanguage: "zh-CN",
      narrationAccent: "neutral",
      visualManual: {
        artStyle: "rainy noir short drama",
        palette: "cyan shadows and amber signals",
        negativeStyle: "no flat sitcom lighting",
      },
      directorManual: {
        pacing: "slow-burn tension",
        cameraLanguage: "controlled push-ins and restrained handheld",
        performance: "quiet suspicion",
      },
      subtitle: { status: "requested_unresolved", label: "Burned-in captions" },
      bgm: { status: "available", assetId: "asset_bgm_1", label: "Tense strings" },
      transition: { status: "requested_unresolved", label: "Soft crossfade" },
      stylePack: { status: "available", assetId: "asset_pack_1", label: "Drama cold open" },
      viralReference: {
        sourceSummary: "User-pasted platform-safe summary",
        hook: "Open on an impossible choice",
        pacing: "3-second hook, fast midpoint reversal",
      },
      continuity: {
        mode: "one_take",
        adjacentShotPrompt: "Keep the yellow coat in the same screen direction",
      },
      talkingPhoto: {
        enabled: true,
        consentConfirmed: true,
        sourceAssetId: "asset_portrait_1",
        scriptPrompt: "Short founder-style spoken CTA",
      },
      marketing: {
        cover: { status: "requested_unresolved", label: "Vertical short-drama cover" },
        callToAction: "Follow for the next episode",
      },
    };
    const project: ProjectRecord = {
      id: "project_1",
      ownerUserId: "default-user",
      title: "Rooftop Signal",
      defaultAspectRatio: "9:16",
      generationSettings,
      createdAt: "2026-06-12T00:00:00.000Z",
      updatedAt: "2026-06-12T00:00:00.000Z",
    };
    const createInput = {
      title: project.title,
      defaultAspectRatio: project.defaultAspectRatio,
      generationSettings,
    };
    const listItem: ProjectListItem = {
      ...project,
      assetCount: 2,
    };

    expect(createInput.generationSettings.bgm?.assetId).toBe("asset_bgm_1");
    expect(listItem.generationSettings?.stylePack?.label).toBe("Drama cold open");
  });

  it("models TF-17 settings center summary, export, and validation payloads", () => {
    const summary: ProjectSettingsSummaryResult = {
      project: {
        id: "project_1",
        title: "Rain Night",
        defaultAspectRatio: "16:9",
        generationSettingsCount: 3,
      },
      modules: [
        {
          module: "providers",
          label: "Providers and Models",
          status: "ready",
          summary: "2 provider configs",
          itemCount: 2,
        },
      ],
      resourceCounts: {
        canvasNodes: 4,
        canvasEdges: 3,
        assets: 5,
        novelDocuments: 1,
        storyboardDrafts: 1,
        scriptDrafts: 1,
        editorExports: 1,
        skillTemplates: 4,
        providerConfigs: 2,
        programmableProviders: 1,
        agentDeploymentConfigs: 1,
      },
      fileSummary: {
        totalAssets: 5,
        totalSizeBytes: 4096,
        uploadStorageConfigured: true,
        byType: [
          { type: "image", count: 2, sizeBytes: 2048 },
          { type: "audio", count: 1, sizeBytes: 2048 },
        ],
      },
      version: {
        service: "guga-flow",
        appVersion: "0.1.0",
        apiVersion: "v1",
        buildCommit: "abc123",
        buildTime: "2026-06-14T00:00:00.000Z",
        runtime: {
          environment: "development",
          nodeVersion: "v26.3.0",
        },
        generatedAt: "2026-06-13T00:00:00.000Z",
      },
      debug: {
        aiDebugAvailable: true,
        aiDebugEnabled: false,
        environment: "development",
        safeTraceFields: ["traceId", "provider", "model", "latencyMs", "sanitizedError"],
        credentialValuesExposed: false,
      },
    };
    const settingsExport: ProjectSettingsExportPayload = {
      version: "1.0",
      exportedAt: "2026-06-13T00:00:00.000Z",
      project: summary.project,
      resourceCounts: summary.resourceCounts,
      fileSummary: summary.fileSummary,
      generationSettings: { visualStyle: "noir" },
      providers: [
        {
          kind: "image",
          provider: "image2",
          enabled: true,
          defaultModel: "gpt-image-2",
          credentialConfigured: true,
          credentialSource: "stored",
          lastTestStatus: "succeeded",
        },
      ],
      skillTemplates: [
        {
          kind: "art",
          slug: "art-default",
          displayName: "Art Skill",
          enabled: true,
          activeVersion: 2,
          versionCount: 3,
        },
      ],
    };
    const validation: ProjectSettingsImportValidationResult = {
      valid: true,
      detectedVersion: "1.0",
      issues: [],
      summary: {
        providers: 1,
        skillTemplates: 1,
        hasGenerationSettings: true,
      },
    };

    expect(summary.modules[0]?.module).toBe("providers");
    expect(summary.version.buildCommit).toBe("abc123");
    expect(summary.debug.credentialValuesExposed).toBe(false);
    expect(settingsExport.providers[0]?.credentialConfigured).toBe(true);
    expect(JSON.stringify(settingsExport)).not.toContain("sk-");
    expect(validation.valid).toBe(true);
  });

  it("models TF-14 novel chapter event graph records", () => {
    const graph: NovelEventGraphRecord = {
      id: "event_graph_1",
      projectId: "project_1",
      novelDocumentId: "novel_1",
      chapters: [
        {
          chapterIndex: 1,
          title: "Chapter 1",
          startOffset: 0,
          endOffset: 120,
          wordCount: 24,
          summary: "The courier finds the signal.",
          eventState: "succeeded",
          eventCount: 1,
          eventIds: ["chapter_1_event_1"],
          extractedAt: "2026-06-13T00:00:00.000Z",
        },
      ],
      events: [
        {
          eventId: "chapter_1_event_1",
          title: "Chapter 1 event 1",
          orderIndex: 1,
          chapterIndex: 1,
          sourceExcerpt: "The courier finds the signal under the overpass.",
          summary: "The courier finds the signal under the overpass.",
        },
      ],
      createdAt: "2026-06-13T00:00:00.000Z",
      updatedAt: "2026-06-13T00:00:00.000Z",
    };

    expect(graph.events[0]?.chapterIndex).toBe(1);
    expect(graph.events[0]?.sourceExcerpt).toContain("signal");
    expect(graph.chapters[0]?.eventState).toBe("succeeded");
    expect(graph.chapters[0]?.eventIds).toContain("chapter_1_event_1");
  });

  it("models TF-15 script draft records", () => {
    const scriptDraft: ScriptDraftRecord = {
      id: "script_1",
      projectId: "project_1",
      novelDocumentId: "novel_1",
      version: 1,
      title: "Rooftop Signal v1",
      strategy: "short_drama",
      status: "draft",
      workspace: {
        storySkeleton: {
          title: "Rooftop Signal v1",
          logline: "A compact script draft.",
          sourceChapterIndexes: [1],
          sourceEventIds: ["event_1"],
          beats: [
            {
              beatId: "beat_1",
              orderIndex: 1,
              title: "Signal",
              summary: "Hero sees the signal.",
              chapterIndex: 1,
              eventIds: ["event_1"],
            },
          ],
        },
        adaptationStrategy: {
          strategy: "short_drama",
          summary: "Keep the signal as the first hook.",
          targetFormat: "Short-drama",
          supervisionNotes: "Review event coverage before storyboard generation.",
        },
        script: {
          title: "Rooftop Signal v1",
          logline: "A compact script draft.",
          strategy: "short_drama",
          scenes: [
            {
              sceneId: "script_scene_1",
              orderIndex: 1,
              title: "Opening",
              summary: "Hero sees the signal.",
              beats: [
                {
                  beatId: "beat_1",
                  orderIndex: 1,
                  title: "Signal",
                  summary: "Hero sees the signal.",
                  chapterIndex: 1,
                  eventIds: ["event_1"],
                },
              ],
            },
          ],
        },
      },
      script: {
        title: "Rooftop Signal v1",
        logline: "A compact script draft.",
        strategy: "short_drama",
        scenes: [
          {
            sceneId: "script_scene_1",
            orderIndex: 1,
            title: "Opening",
            summary: "Hero sees the signal.",
            beats: [
              {
                beatId: "beat_1",
                orderIndex: 1,
                title: "Signal",
                summary: "Hero sees the signal.",
                chapterIndex: 1,
                eventIds: ["event_1"],
              },
            ],
          },
        ],
      },
      createdAt: "2026-06-13T00:00:00.000Z",
      updatedAt: "2026-06-13T00:00:00.000Z",
    };

    expect(scriptDraft.script.scenes[0]?.beats[0]?.eventIds).toEqual(["event_1"]);
    expect(scriptDraft.workspace.storySkeleton.sourceChapterIndexes).toEqual([1]);
  });

  it("models TF-16 audio bindings across nodes and editor export clips", () => {
    const character: CharacterAssetNodeData = {
      name: "Hero",
      voiceAssetIds: ["asset_voice_1"],
      voiceReferences: [
        {
          assetId: "asset_voice_1",
          label: "Hero voice",
          role: "voice",
          sourceNodeId: "character_1",
        },
      ],
    };
    const shot: ShotNodeData = {
      shotNumber: "001",
      audioAssetIds: ["asset_sfx_1"],
      audioReferences: [
        {
          assetId: "asset_sfx_1",
          label: "Signal tone",
          role: "sound_effect",
          sourceNodeId: "shot_1",
        },
      ],
    };
    const video: VideoNodeData = {
      assetId: "asset_video_1",
      audioAssetIds: ["asset_mix_1"],
      audioReferences: [
        {
          assetId: "asset_mix_1",
          label: "Clip mix",
          role: "clip_audio",
          sourceNodeId: "video_1",
        },
      ],
    };
    const jobInput: EditorExportJobInput = {
      operation: "editor_export",
      projectId: "project_1",
      editorExportId: "export_audio",
      videoNodeIds: ["video_1"],
      sortMode: "manual",
      exportPreset: "standard_zip",
      includeStoryboardCsv: true,
      includeSubtitles: false,
      fps: 24,
      aspectRatio: "16:9",
      clips: [
        {
          videoNodeId: "video_1",
          videoAssetId: "asset_video_1",
          filename: "clips/shot_001.mp4",
          audioReferences: [
            {
              assetId: "asset_sfx_1",
              sourceNodeId: "shot_1",
              sourceNodeType: "shot",
              role: "sound_effect",
              mimeType: "audio/mpeg",
              durationMs: 1200,
            },
          ],
        },
      ],
    };
    const manifest: TimelineManifest = {
      version: "1.0",
      projectId: "project_1",
      editorExportId: "export_audio",
      title: "Audio Export",
      aspectRatio: "16:9",
      fps: 24,
      sortMode: "manual",
      exportPreset: "standard_zip",
      assets: [
        { id: "asset_video_1", type: "video", url: "clips/shot_001.mp4" },
        { id: "asset_sfx_1", type: "audio", url: "asset://asset_sfx_1", mimeType: "audio/mpeg" },
      ],
      tracks: [
        {
          id: "track_video_1",
          type: "video",
          items: [
            {
              id: "item_video_1",
              assetId: "asset_video_1",
              sourceNodeId: "video_1",
              startMs: 0,
              durationMs: 4000,
            },
          ],
        },
        {
          id: "track_audio_1",
          type: "audio",
          items: [
            {
              id: "item_audio_1",
              assetId: "asset_sfx_1",
              sourceNodeId: "shot_1",
              startMs: 0,
              durationMs: 1200,
            },
          ],
        },
      ],
    };

    expect(character.voiceAssetIds).toEqual(["asset_voice_1"]);
    expect(shot.audioReferences?.[0]?.role).toBe("sound_effect");
    expect(video.audioAssetIds).toEqual(["asset_mix_1"]);
    expect(jobInput.clips[0]?.audioReferences?.[0]?.assetId).toBe("asset_sfx_1");
    expect(manifest.assets[1]?.type).toBe("audio");
    expect(manifest.tracks[1]?.type).toBe("audio");
  });

  it("resolves project generation defaults with Shot overrides", () => {
    const resolved: ResolvedGenerationSettings = resolveGenerationSettings({
      projectSettings: {
        visualStyle: "cinematic noir",
        aspectRatio: "9:16",
        narrationLanguage: "zh-CN",
        visualManual: {
          artStyle: "rainy noir short drama",
          palette: "cyan shadows and amber signals",
          lighting: "motivated practicals",
        },
        directorManual: {
          pacing: "slow-burn tension",
          cameraLanguage: "controlled push-ins",
          performance: "quiet suspicion",
        },
        subtitle: { status: "requested_unresolved", label: "Default subtitles" },
        bgm: { assetId: "asset_bgm_1", label: "Default BGM" },
        viralReference: {
          hook: "Project hook",
          complianceNote: "Manual summary only; no crawler import.",
        },
        continuity: {
          mode: "match_cut",
          transitionPrompt: "Match the door slam into thunder",
        },
        talkingPhoto: {
          sourceAssetId: "asset_portrait_1",
          consentConfirmed: true,
        },
        marketing: {
          poster: { label: "Rainy station poster" },
          callToAction: "Watch the full short",
        },
      },
      shotSettings: {
        aspectRatio: "16:9",
        narrationAccent: "warm northern accent",
        subtitle: { status: "absent", label: "No subtitles for this flashback" },
        continuity: {
          mode: "one_take",
          adjacentShotPrompt: "Preserve screen direction into the next Shot",
        },
        visualManual: {
          lens: "long lens compression",
        },
        directorManual: {
          cameraLanguage: "locked-off surveillance angle",
        },
      },
    });

    expect(resolved.effective).toMatchObject({
      visualStyle: "cinematic noir",
      aspectRatio: "16:9",
      narrationLanguage: "zh-CN",
      narrationAccent: "warm northern accent",
      visualManual: {
        artStyle: "rainy noir short drama",
        palette: "cyan shadows and amber signals",
        lighting: "motivated practicals",
        lens: "long lens compression",
      },
      directorManual: {
        pacing: "slow-burn tension",
        cameraLanguage: "locked-off surveillance angle",
        performance: "quiet suspicion",
      },
      subtitle: { status: "absent" },
      bgm: { status: "available", assetId: "asset_bgm_1" },
      viralReference: { hook: "Project hook" },
      continuity: { mode: "one_take", adjacentShotPrompt: "Preserve screen direction into the next Shot" },
      talkingPhoto: { enabled: true, consentConfirmed: true, sourceAssetId: "asset_portrait_1" },
      marketing: { poster: { status: "requested_unresolved", label: "Rainy station poster" } },
    });
    expect(resolved.sources).toMatchObject({
      visualStyle: "project",
      aspectRatio: "shot",
      narrationAccent: "shot",
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
      bgm: "project",
      subtitle: "shot",
      viralReference: "project",
      continuity: "shot",
      talkingPhoto: "project",
      marketing: "project",
    });
    expect(
      normalizeGenerationCreativeSettings({
        aspectRatio: "4:3",
        visualManual: {
          artStyle: "  painterly noir  ",
          palette: "",
          lighting: " ",
          composition: "wide negative space",
        },
        directorManual: {
          pacing: "",
          cameraLanguage: "  slow push-ins  ",
          performance: " ",
        },
        bgm: { label: "Need music" },
        continuity: { mode: "unsupported", transitionPrompt: "  Smooth bridge  " },
        talkingPhoto: { enabled: false, consentConfirmed: false, voicePrompt: "  calm presenter  " },
        marketing: { cover: { label: "  Episode cover  " }, promo: {} },
      }),
    ).toEqual({
      visualManual: { artStyle: "painterly noir", composition: "wide negative space" },
      directorManual: { cameraLanguage: "slow push-ins" },
      bgm: { status: "requested_unresolved", label: "Need music" },
      continuity: { transitionPrompt: "Smooth bridge" },
      talkingPhoto: { enabled: true, voicePrompt: "calm presenter" },
      marketing: { cover: { status: "requested_unresolved", label: "Episode cover" } },
    });
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
      "source_text",
      "source_image",
      "source_video",
      "source_audio",
      "scene_frame",
      "scene",
      "shot",
      "character_asset",
      "location_asset",
      "prop_asset",
      "panorama",
      "director_3d",
      "ai_text",
      "ai_audio",
      "image",
      "video",
      "editor_package",
    ]);
    expect(CANVAS_NODE_TYPES).toEqual(expect.arrayContaining([...PHASE_3_CANVAS_NODE_TYPES]));
    expect(SOURCE_MEDIA_IMPORT_METHODS).toEqual(["drag_drop", "asset_library", "manual"]);
    expect(PRODUCTION_WORKSPACE_ITEM_TYPES).toEqual(["storyboard_item"]);

    const sourceImageData: SourceMediaNodeData = {
      assetId: "asset_image_1",
      mimeType: "image/png",
      originalFilename: "reference.png",
      sizeBytes: 2048,
      width: 1080,
      height: 1920,
      source: "asset",
      importMethod: "drag_drop",
      previewKind: "image",
      previewUrl: "/api/v1/projects/project_1/assets/asset_image_1/preview",
    };
    expect(sourceImageData.importMethod).toBe("drag_drop");

    const panoramaData: PanoramaNodeData = {
      assetId: "asset_pano_1",
      label: "Launch bay 360",
      yaw: 15,
      pitch: -5,
      fov: 82,
      promptContext: "Use as spatial reference for the launch bay.",
      annotations: [{ annotationId: "anno_1", label: "Control wall", yaw: 28, pitch: 0 }],
    };
    const directorData: Director3DNodeData = {
      promptContext: "Keep the subject between the console and backlight.",
      snapshotAssetId: "asset_snapshot_1",
      scene: {
        version: 1,
        objects: [
          {
            objectId: "subject",
            kind: "box",
            position: { x: 0, y: 1, z: 0 },
          },
        ],
      },
    };
    const sceneFrameInput: SceneFrameExtractionJobInput = {
      operation: "scene_frame_extraction",
      projectId: "project_1",
      sourceAssetId: "asset_video_1",
      sourceNodeId: "source_video_1",
      provider: "mock-scene-detector",
      model: "scene-frame-v1",
      strategy: "scene_segments",
      frameCount: 4,
    };

    expect(CANVAS_NODE_REGISTRY.panorama.family).toBe("advanced_visual");
    expect(CANVAS_NODE_REGISTRY.director_3d.family).toBe("advanced_visual");
    expect(CANVAS_NODE_INPUT_SLOTS.director_3d?.[0]?.inputRole).toBe("prompt_context");
    expect(panoramaData.annotations?.[0]?.label).toBe("Control wall");
    expect(directorData.scene?.objects[0]?.kind).toBe("box");
    expect(SCENE_FRAME_EXTRACTION_OPERATIONS).toEqual(["scene_frame_extraction"]);
    expect(SCENE_FRAME_EXTRACTION_STRATEGIES).toEqual([
      "scene_segments",
      "sampled_interval",
      "exact_timestamps",
    ]);
    expect(sceneFrameInput.operation).toBe("scene_frame_extraction");

    const shotData: ShotNodeData = {
      visualDescription: "Wide shot of the launch platform at sunrise.",
      action: "The protagonist checks the final cable.",
      cameraMovement: "Slow push-in",
      durationSeconds: 4,
      promptNotes: "cinematic, practical lights",
      negativePromptNotes: "no logos",
      storyEventIds: ["event_launch"],
      storyEvents: [
        {
          eventId: "event_launch",
          orderIndex: 1,
          summary: "Ari commits to the launch.",
        },
      ],
      characterStageRefs: [{ characterTempId: "char_ari", stageId: "stage_pilot" }],
      characterAssetIds: ["node_character_1"],
      locationAssetId: "node_location_1",
      selectedImageNodeId: "image_1",
      selectedVideoNodeId: "video_1",
    };
    const sceneFrameData: SceneFrameNodeData = {
      collapsed: true,
      shotNodeIds: ["shot_1"],
    };
    const characterData: CharacterAssetNodeData = {
      name: "Ari",
      role: "Pilot",
      appearance: "Silver flight suit",
      consistencyPrompt: "same face and suit in every shot",
      lifecycleStages: [
        {
          stageId: "stage_pilot",
          label: "Pilot",
          ageRange: "late 20s",
          costume: "Silver flight suit",
          identityPrompt: "Ari in a silver flight suit",
        },
      ],
      locked: true,
      lockedFields: ["appearance", "identityPrompt"],
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
    expect(shotData.selectedImageNodeId).toBe("image_1");
    expect(shotData.storyEvents?.[0]?.summary).toContain("commits");
    expect(sceneFrameData.collapsed).toBe(true);
    expect(characterData.consistencyPrompt).toContain("same face");
    expect(characterData.lifecycleStages?.[0]?.stageId).toBe("stage_pilot");
    expect(characterData.lockedFields).toContain("appearance");
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
    expect(CREATIVE_AGENT_MODES).toEqual(["novice", "advanced", "professional"]);

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
    const creativeInput: CreateCreativeStoryboardInput = {
      idea: "A courier finds a glowing signal under a rainy overpass.",
      mode: "advanced",
      audience: "short drama viewers",
      stylePrompt: "rainy neon thriller",
      targetDurationSeconds: 45,
      referenceAssetIds: ["asset_seed_1"],
      referenceImageNodeIds: ["image_seed_1"],
      referencePrompt: "preserve the reference subject silhouette",
    };
    const jobInput: NovelToStoryboardJobInput = {
      operation: "novel_to_storyboard",
      projectId: "project_1",
      idea: creativeInput.idea,
      mode: "advanced",
      audience: creativeInput.audience,
      stylePrompt: creativeInput.stylePrompt,
      targetDurationSeconds: creativeInput.targetDurationSeconds,
      referenceAssetIds: creativeInput.referenceAssetIds,
      referenceImageNodeIds: creativeInput.referenceImageNodeIds,
      referencePrompt: creativeInput.referencePrompt,
      provider: "mock-llm",
      model: "mock-storyboard",
    };
    const jobOutput: NovelToStoryboardJobOutput = {
      operation: "novel_to_storyboard",
      novelDocumentId: "novel_1",
      storyboardDraftId: "draft_1",
      referenceAssetIds: ["asset_seed_1"],
      referenceImageNodeIds: ["image_seed_1"],
      provider: "mock-llm",
      model: "mock-storyboard",
      completedAt: "2026-06-12T00:01:00.000Z",
    };
    const creativeResult: CreateCreativeStoryboardResult = {
      novel: {
        id: "novel_1",
        projectId: "project_1",
        title: createNovelInput.title,
        content: createNovelInput.content,
        sourceType: createNovelInput.sourceType ?? "paste",
        wordCount: 11,
        language: createNovelInput.language ?? "other",
        createdAt: "2026-06-12T00:00:00.000Z",
        updatedAt: "2026-06-12T00:00:00.000Z",
      },
      draft,
      validation,
      job: {
        id: "job_1",
        projectId: "project_1",
        operation: "novel_to_storyboard",
        status: "succeeded",
        provider: "mock-llm",
        model: "mock-storyboard",
        inputJson: jobInput,
        outputJson: jobOutput,
        createdAt: "2026-06-12T00:00:00.000Z",
        updatedAt: "2026-06-12T00:01:00.000Z",
      },
    };

    expect(draft.storyboard?.scenes[0]?.shots[0]?.imagePrompt).toContain("rooftop");
    expect(updateDraftInput.storyboard.characters[0]?.tempId).toBe("char_hero");
    expect(creativeResult.job.inputJson.mode).toBe("advanced");
    expect(creativeResult.job.outputJson?.storyboardDraftId).toBe("draft_1");
  });

  it("exports TF-11 agent canvas action audit contracts", () => {
    const createInput: CreateAgentCanvasActionInput = {
      message: "create shot: heroine sees a glowing subway entrance",
      selectedNodeId: "shot_previous",
      canvasX: 480,
      canvasY: 240,
    };
    const jobInput: AgentCanvasActionJobInput = {
      operation: "agent_canvas_action",
      projectId: "project_1",
      role: "universal",
      provider: "mock-llm",
      model: "mock-storyboard",
      ...createInput,
    };
    const previous = canvasNode<Record<string, CanvasSnapshotJson>>("shot_previous", "shot", "Old title", {
      shotNumber: "1",
      visualDescription: "Old description",
    });
    const createdNode = canvasNode<Record<string, CanvasSnapshotJson>>(
      "shot_agent_1",
      "shot",
      "Glowing subway entrance",
      {
        visualDescription: "heroine sees a glowing subway entrance",
        agentAction: { jobId: "job_1", message: createInput.message },
      },
    );
    const jobOutput: AgentCanvasActionJobOutput = {
      operation: "agent_canvas_action",
      actionKind: "create_node",
      message: createInput.message,
      summary: "Created Shot node Glowing subway entrance",
      createdNodes: [{ nodeId: createdNode.id, type: "shot", title: createdNode.title }],
      updatedNodes: [
        {
          nodeId: previous.id,
          title: "Old title",
          previous: {
            nodeId: previous.id,
            tldrawShapeId: previous.tldrawShapeId,
            type: previous.type,
            title: previous.title,
            x: previous.x,
            y: previous.y,
            width: previous.width,
            height: previous.height,
            zIndex: previous.zIndex,
            status: previous.status,
            dataJson: previous.dataJson,
          },
        },
      ],
      completedAt: "2026-06-13T00:00:00.000Z",
      undo: {
        undoneAt: "2026-06-13T00:01:00.000Z",
        deletedNodeIds: [createdNode.id],
        deletedEdgeIds: [],
        restoredNodeIds: [previous.id],
      },
    };
    const result: CreateAgentCanvasActionResult = {
      job: {
        id: "job_1",
        projectId: "project_1",
        operation: "agent_canvas_action",
        status: "succeeded",
        provider: "mock-llm",
        model: "mock-storyboard",
        inputJson: jobInput,
        outputJson: jobOutput,
        createdAt: "2026-06-13T00:00:00.000Z",
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
      nodes: [createdNode],
      edges: [],
      focusNodeId: createdNode.id,
    };
    const undoResult: UndoAgentCanvasActionResult = {
      job: result.job,
      restoredNodes: [previous],
      deletedNodeIds: [createdNode.id],
      deletedEdgeIds: [],
    };
    const productionInput: CreateProductionAgentActionInput = {
      action: "create_storyboard_board",
      title: "Agent Storyboard Board",
      itemIds: ["shot_agent_1"],
      columns: 3,
    };
    const productionOutput: AgentCanvasActionJobOutput = {
      ...jobOutput,
      actionKind: "create_storyboard_board",
      summary: "Created storyboard board Agent Storyboard Board",
      createdNodes: [{ nodeId: "board_1", type: "scene_frame", title: productionInput.title }],
    };
    const productionResult: CreateProductionAgentActionResult = {
      ...result,
      job: {
        ...result.job,
        inputJson: {
          ...jobInput,
          role: "production",
          message: "create storyboard board",
          productionAction: productionInput.action,
          title: productionInput.title,
          itemIds: productionInput.itemIds,
          columns: productionInput.columns,
        },
        outputJson: productionOutput,
      },
      workspace: {} as CreateProductionAgentActionResult["workspace"],
    };
    const sessionInput: CreateAgentSessionInput = {
      role: "script",
      message: "outline the next beat",
      selectedNodeId: createdNode.id,
    };
    const streamEvent: AgentStreamEventPayload = {
      kind: "agent_session",
      role: sessionInput.role,
      message: sessionInput.message,
      phase: "thinking",
      status: "running",
      summary: "script agent session started",
      fallback: "polling",
    };
    const sessionResult: CreateAgentSessionResult = {
      job: {
        ...result.job,
        status: "running",
        inputJson: {
          ...jobInput,
          role: sessionInput.role,
          message: sessionInput.message,
          selectedNodeId: sessionInput.selectedNodeId,
          sessionMode: "stream",
        },
        outputJson: undefined,
      },
      events: [streamEvent],
    };

    expect(result.job.inputJson.role).toBe("universal");
    expect(result.job.inputJson.provider).toBe("mock-llm");
    expect(result.job.outputJson?.createdNodes?.[0]?.nodeId).toBe("shot_agent_1");
    expect(undoResult.job.outputJson?.undo?.restoredNodeIds).toEqual(["shot_previous"]);
    expect(PRODUCTION_AGENT_ACTION_KINDS).toEqual(["create_storyboard_board"]);
    expect(productionResult.job.inputJson.role).toBe("production");
    expect(productionResult.job.inputJson.productionAction).toBe("create_storyboard_board");
    expect(productionResult.job.inputJson.itemIds).toEqual(["shot_agent_1"]);
    expect(productionResult.job.outputJson?.actionKind).toBe("create_storyboard_board");
    expect(sessionResult.job.inputJson.sessionMode).toBe("stream");
    expect(sessionResult.events[0]?.phase).toBe("thinking");
  });

  it("exports CEX-22 task center and diagnostics contracts", () => {
    const taskCenter: TaskCenterResult = {
      items: [
        {
          taskId: "job_1",
          taskClass: "video",
          operation: "image_to_video",
          title: "Image To Video",
          status: "failed",
          provider: "mock-video",
          traceId: "trace_project_1_job_1",
          reason: "Provider failed with [secret]",
          related: { nodeId: "video_1" },
          actions: { canRetry: true, canCancel: false, canClear: true },
          createdAt: "2026-06-14T00:00:00.000Z",
          updatedAt: "2026-06-14T00:05:00.000Z",
        },
      ],
      diagnostics: [
        {
          traceId: "trace_project_1_job_1",
          projectId: "project_1",
          taskId: "job_1",
          surface: "video",
          category: "provider",
          severity: "error",
          safeMessage: "Provider failed with [secret]",
          timestamp: "2026-06-14T00:05:00.000Z",
        },
      ],
      queueSummary: {
        counts: {
          queued: 0,
          running: 0,
          provider_waiting: 0,
          succeeded: 0,
          failed: 1,
          cancelled: 0,
        },
        queued: 0,
        running: 0,
        providerWaiting: 0,
        succeeded: 0,
        failed: 1,
        cancelled: 0,
      },
    };

    expect(taskCenter.items[0]?.actions.canRetry).toBe(true);
    expect(taskCenter.diagnostics[0]?.safeMessage).not.toContain("sk-");
  });

  it("exports TF-12 visible agent memory contracts", () => {
    const memory: AgentMemoryRecord = {
      id: "memory_1",
      projectId: "project_1",
      scope: "project",
      type: "manual_preference",
      title: "Rainy neon palette",
      content: "Use rainy neon lighting for night chase sequences.",
      summary: "Rainy neon lighting for night chase sequences.",
      tags: ["style", "rain"],
      agentRole: "production",
      contextNodeId: "shot_1",
      tokenEstimate: 12,
      safetyFiltered: false,
      source: "manual",
      enabled: true,
      createdAt: "2026-06-13T00:00:00.000Z",
      updatedAt: "2026-06-13T00:00:00.000Z",
    };
    const list: AgentMemoryListResult = { memories: [memory] };
    const recall: RecallAgentMemoriesResult = {
      memories: [memory],
      memoryIds: [memory.id],
      summary: `${memory.title}: ${memory.summary}`,
    };
    const jobInput: AgentCanvasActionJobInput = {
      operation: "agent_canvas_action",
      projectId: "project_1",
      role: "universal",
      provider: "mock-llm",
      model: "mock-storyboard",
      message: "create shot: rainy neon alley reveal",
      memoryIds: recall.memoryIds,
      memorySummary: recall.summary,
    };

    expect(list.memories[0]?.enabled).toBe(true);
    expect(jobInput.memoryIds).toEqual(["memory_1"]);
    expect(jobInput.memorySummary).toContain("Rainy neon");
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

  it("validates Phase 14 story blueprint and character lifecycle references", () => {
    const storyboard = blueprintStoryboard();
    const validation = validateStoryboardResult(storyboard);
    expect(validation.success).toBe(true);

    if (!validation.success) {
      throw new Error("Expected blueprint storyboard validation to succeed");
    }

    expect(validation.data.storyBlueprint?.timelineEvents?.[0]?.eventId).toBe("event_opening");
    expect(validation.data.characters[0]?.lifecycleStages?.[0]?.stageId).toBe("stage_younger");
    expect(validation.data.scenes[0]?.shots[0]?.characterStageRefs?.[0]).toEqual({
      characterTempId: "char_hero",
      stageId: "stage_younger",
    });

    const missingEvent = blueprintStoryboard();
    missingEvent.scenes[0]!.shots[0]!.storyEventIds = ["event_missing"];
    const missingEventValidation = validateStoryboardResult(missingEvent);
    expect(missingEventValidation.success).toBe(false);
    expect(missingEventValidation.issues.map((issue) => issue.message)).toContain(
      "Unknown shot story event id",
    );

    const missingRelationshipParticipant = blueprintStoryboard();
    missingRelationshipParticipant.storyBlueprint!.characterRelationships![0]!.characterTempIds = [
      "char_hero",
      "char_missing",
    ];
    const missingRelationshipValidation = validateStoryboardResult(missingRelationshipParticipant);
    expect(missingRelationshipValidation.success).toBe(false);
    expect(missingRelationshipValidation.issues.map((issue) => issue.message)).toContain(
      "Unknown character relationship participant temp id",
    );

    const missingStage = blueprintStoryboard();
    missingStage.scenes[0]!.shots[0]!.characterStageRefs = [
      { characterTempId: "char_hero", stageId: "stage_missing" },
    ];
    const missingStageValidation = validateStoryboardResult(missingStage);
    expect(missingStageValidation.success).toBe(false);
    expect(missingStageValidation.issues.map((issue) => issue.message)).toContain(
      "Unknown shot character lifecycle stage id",
    );
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

  it("projects reference-image story seeds into storyboard import nodes", () => {
    const storyboard = validStoryboard();
    storyboard.storySeedReferences = [
      {
        assetId: "asset_seed_1",
        imageNodeId: "image_seed_1",
        label: "hero seed",
        prompt: "keep the same raincoat silhouette",
      },
    ];
    storyboard.characters[0]!.referenceAssetIds = ["asset_seed_1"];
    storyboard.locations[0]!.referenceAssetIds = ["asset_seed_1"];
    storyboard.scenes[0]!.shots[0]!.referenceAssetIds = ["asset_seed_1"];

    const validation = validateStoryboardResult(storyboard);
    expect(validation.success).toBe(true);
    if (!validation.success) {
      throw new Error("Expected reference seeded storyboard to validate");
    }

    const plan = buildStoryboardImportPlan({
      storyboard: validation.data,
      draftId: "draft_seed",
      novelDocumentId: "novel_1",
      importBatchId: "import_seed_1",
      importedAt: "2026-06-13T00:00:00.000Z",
      version: 1,
    });

    expect(plan.nodes.find((node) => node.key === "novel")?.dataJson).toMatchObject({
      storySeedReferences: [
        {
          assetId: "asset_seed_1",
          imageNodeId: "image_seed_1",
        },
      ],
    });
    expect(plan.nodes.find((node) => node.key === "character_asset:char_hero")?.dataJson).toMatchObject({
      referenceAssetIds: ["asset_seed_1"],
    });
    expect(plan.nodes.find((node) => node.key === "location_asset:loc_city")?.dataJson).toMatchObject({
      referenceAssetIds: ["asset_seed_1"],
    });
    expect(plan.nodes.find((node) => node.key === "shot:shot_1")?.dataJson).toMatchObject({
      referenceAssetIds: ["asset_seed_1"],
    });
  });

  it("projects Phase 14 story blueprint and lifecycle trace into storyboard import nodes", () => {
    const storyboard = blueprintStoryboard();
    const plan = buildStoryboardImportPlan({
      storyboard,
      draftId: "draft_blueprint",
      novelDocumentId: "novel_1",
      importBatchId: "import_blueprint_1",
      importedAt: "2026-06-13T00:00:00.000Z",
      version: 1,
    });

    const novelNode = plan.nodes.find((node) => node.key === "novel");
    const characterNode = plan.nodes.find((node) => node.key === "character_asset:char_hero");
    const sceneNode = plan.nodes.find((node) => node.key === "scene:scene_1");
    const shotNode = plan.nodes.find((node) => node.key === "shot:shot_1");

    expect(novelNode?.dataJson.storyBlueprint).toMatchObject({
      worldSummary: "A near-future city where rooftop signals mark resistance safehouses.",
      timelineEvents: [expect.objectContaining({ eventId: "event_opening" })],
    });
    expect(characterNode?.dataJson).toMatchObject({
      lifecycleStages: [
        expect.objectContaining({
          stageId: "stage_younger",
          identityPrompt: "younger hero before the mission, anxious expression",
        }),
      ],
      lockedFields: ["appearance", "identityPrompt"],
    });
    expect(sceneNode?.dataJson).toMatchObject({
      storyEventIds: ["event_opening"],
      storyEvents: [expect.objectContaining({ summary: "The hero sees the hidden signal and chooses to act." })],
    });
    expect(shotNode?.dataJson).toMatchObject({
      storyEventIds: ["event_opening"],
      characterStageRefs: [{ characterTempId: "char_hero", stageId: "stage_younger" }],
    });
    expect(plan.summary.createdNodeCount).toBe(7);
    expect(plan.edges.map((edge) => edge.relation)).toEqual(
      expect.arrayContaining(["belongs_to_scene", "references_character", "references_location"]),
    );
  });

  it("filters skill templates by preset index metadata", () => {
    expect(skillTemplateMetadata("ai-image")).toMatchObject({
      presetCategories: ["ai-image"],
      triggerModes: ["insert_prompt", "direct_generate"],
      agentRoles: ["asset", "video_prompt"],
    });

    const templates = [
      skillTemplateSummary({
        id: "skill_ai_image",
        kind: "ai-image",
        displayName: "AI Image Preset",
        activeSummary: "Reference-image style prompt",
      }),
      skillTemplateSummary({
        id: "skill_agent",
        kind: "agent",
        displayName: "Agent Skill",
        activeSummary: "Canvas operation summary",
      }),
      skillTemplateSummary({
        id: "skill_video",
        kind: "ai-video",
        displayName: "Video Motion Preset",
        activeSummary: "Motion and camera prompt",
      }),
    ];

    expect(filterSkillTemplateSummaries(templates, { category: "ai-image" }).map((template) => template.id)).toEqual([
      "skill_ai_image",
    ]);
    expect(filterSkillTemplateSummaries(templates, { agentRole: "production" }).map((template) => template.id)).toEqual([
      "skill_video",
    ]);
    expect(filterSkillTemplateSummaries(templates, { query: "canvas" }).map((template) => template.id)).toEqual([
      "skill_agent",
    ]);
    expect(
      filterSkillTemplateSummaries(templates, {
        templateIds: ["skill_video"],
        triggerMode: "direct_generate",
      }).map((template) => template.id),
    ).toEqual(["skill_video"]);
  });

  it("composes Phase 7 shot prompts from linked graph context and reference images", () => {
    const graph = promptComposerGraph();
    const skillTemplates: SkillTemplatePromptContext[] = [
      {
        id: "skill_art",
        kind: "art",
        slug: "art-default",
        displayName: "Art Skill",
        summary: "Visual style summary",
        presetCategories: ["ai-image"],
        agentRoles: ["asset", "video_prompt"],
        sourceText: "Use cyan highlights and keep character silhouettes consistent.",
        versionId: "skill_version_1",
        version: 1,
      },
    ];
    const result = composeShotPrompt({
      ...graph,
      shotNodeId: "shot_1",
      globalStylePrompt: "global cinematic watercolor style",
      projectGenerationSettings: {
        visualStyle: "project neo-noir",
        aspectRatio: "9:16",
        narrationLanguage: "zh-CN",
        visualManual: {
          artStyle: "rainy neo-noir storyboard",
          palette: "cyan shadows and amber signals",
          lighting: "motivated practical light",
        },
        directorManual: {
          pacing: "slow-burn opening rhythm",
          cameraLanguage: "precise dolly moves",
          performance: "contained urgency",
        },
        subtitle: { status: "requested_unresolved", label: "Project subtitles" },
        viralReference: {
          sourceSummary: "User-pasted reference summary",
          hook: "Open on a hidden signal",
          complianceNote: "Manual import only",
        },
        continuity: {
          mode: "match_cut",
          transitionPrompt: "Match console flash to skyline flare",
        },
        talkingPhoto: {
          sourceAssetId: "asset_presenter_ref",
          consentConfirmed: true,
          scriptPrompt: "Founder-style teaser read",
        },
        marketing: {
          cover: { label: "Rainy signal cover" },
          callToAction: "Watch the next episode",
        },
      },
      skillTemplates,
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
      "asset_hero_alert_variant",
      "asset_friend_ref",
      "asset_location_ref",
    ]);
    expect(result.image.prompt).toContain("Hero identity prompt");
    expect(result.image.prompt).toContain("The hero notices the hidden signal and chooses to act.");
    expect(result.image.prompt).toContain("alert hero stage identity prompt");
    expect(result.image.prompt).toContain("Visual style: project neo-noir");
    expect(result.image.prompt).toContain("Aspect ratio: 16:9 (shot)");
    expect(result.image.prompt).toContain("Art style: rainy neo-noir storyboard (project)");
    expect(result.image.prompt).toContain("Palette: cyan shadows and amber signals (project)");
    expect(result.image.prompt).toContain("Lens: long-lens compression (shot)");
    expect(result.image.prompt).toContain("Pacing: slow-burn opening rhythm (project)");
    expect(result.image.prompt).toContain("Camera language: locked-off surveillance angle (shot)");
    expect(result.image.prompt).toContain("Subtitle: requested_unresolved");
    expect(result.image.prompt).toContain("Manual viral reference: summary User-pasted reference summary");
    expect(result.image.prompt).toContain("Continuity strategy: mode one_take");
    expect(result.image.prompt).toContain("Talking photo brief: enabled / consent confirmed");
    expect(result.image.prompt).toContain("Marketing materials: cover requested_unresolved / Rainy signal cover");
    expect(result.image.prompt).toContain("Location prompt text");
    expect(result.image.prompt).toContain("Use cyan highlights and keep character silhouettes consistent.");
    expect(result.image.prompt).toContain("Image prompt: hero and friend at the console");
    expect(result.video.prompt).toContain("Video prompt: slow dolly across the console");
    expect(result.negativePrompt).toBe("no text overlays");
    expect(result.debugParts.map((part) => part.kind)).toEqual(
      expect.arrayContaining([
        "global_style",
        "generation_settings",
        "visual_manual",
        "director_manual",
        "skill_template",
        "story_event",
        "scene",
        "location",
        "character",
        "character_lifecycle",
        "shot",
        "model_suffix",
      ]),
    );
    expect(result.missingContext).toEqual([]);
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
      viralReference: "project",
      continuity: "shot",
      talkingPhoto: "project",
      marketing: "project",
    });
  });

  it("reports missing character lifecycle context for broken stage references", () => {
    const graph = promptComposerGraph();
    const nodes = graph.nodes.map((node) => {
      if (node.id !== "shot_1") {
        return node;
      }
      const data = node.dataJson as ShotNodeData;
      return {
        ...node,
        dataJson: {
          ...data,
          characterStageRefs: [{ characterTempId: "character_missing", stageId: "stage_alert" }],
        },
      };
    });

    const result = composeShotPrompt({
      ...graph,
      nodes,
      shotNodeId: "shot_1",
    });

    expect(result.missingContext.map((item) => item.kind)).toContain("character_lifecycle");
    expect(result.missingContext.map((item) => item.label)).toContain("Character lifecycle");
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
    expect(before.referenceAssetIds).toContain("asset_hero_alert_variant");
    expect(before.referenceAssetIds).not.toContain("asset_hero_default_variant");
    expect(after.referenceAssetIds.filter((assetId) => assetId === "asset_shared_ref")).toHaveLength(1);
    expect(after.referenceAssetIds).toContain("asset_hero_alert_variant");
    expect(after.image.prompt).toContain("edited hero identity prompt");
    expect(after.image.prompt).toContain("edited location prompt");
    expect(after.image.prompt).not.toContain("Hero identity prompt");
    expect(after.image.prompt).not.toContain("Location prompt text");
  });

  it("composes advanced visual references from panorama nodes into Shot prompt context", () => {
    const graph = promptComposerGraph();
    const result = composeShotPrompt({
      ...graph,
      shotNodeId: "shot_1",
      nodes: [
        ...graph.nodes,
        canvasNode<PanoramaNodeData>("panorama_1", "panorama", "Launch Bay 360", {
          assetId: "asset_panorama_main",
          promptContext: "Use the panorama to keep the control wall behind the hero.",
          referenceAssetIds: ["asset_panorama_detail"],
          annotations: [
            {
              annotationId: "anno_control_wall",
              label: "Control wall",
              yaw: 24,
              pitch: -2,
              prompt: "glowing control wall behind subject",
            },
          ],
        }),
      ],
      edges: [...graph.edges, canvasEdge("edge_panorama", "panorama_1", "shot_1", "derived_from")],
      assets: [
        ...graph.assets,
        assetListItem("asset_panorama_main", "image"),
        assetListItem("asset_panorama_detail", "image"),
      ],
    });

    expect(result.sourceNodeIds.advancedNodeIds).toEqual(["panorama_1"]);
    expect(result.referenceAssetIds).toEqual(
      expect.arrayContaining(["asset_panorama_main", "asset_panorama_detail"]),
    );
    expect(result.debugParts.map((part) => part.kind)).toContain("advanced_visual");
    expect(result.image.prompt).toContain("Use the panorama to keep the control wall behind the hero.");
    expect(result.image.prompt).toContain("glowing control wall behind subject");
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
      supportedModes: ["text_to_image", "image_to_image", "multi_reference"],
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
    const videoCreateInput: CreateGenerationJobInput = {
      operation: "image_to_video",
      sourceNodeId: "image_1",
      videoProvider: "seedance",
      videoModel: "seedance-1-0-pro",
      videoAspectRatio: "16:9",
      durationSeconds: 5,
      resolution: "1080p",
      videoProviderParams: {
        cameraFixed: false,
      },
    };
    const characterCreateInput: CreateGenerationJobInput = {
      operation: "character_to_image",
      sourceNodeId: "character_1",
      provider: "mock-image",
      aspectRatio: "1:1",
    };
    const locationCreateInput: CreateGenerationJobInput = {
      operation: "location_to_image",
      sourceNodeId: "location_1",
      provider: "mock-image",
      aspectRatio: "16:9",
    };
    const refinementCreateInput: CreateGenerationJobInput = {
      operation: "image_refinement",
      sourceNodeId: "image_1",
      refinementPrompt: "make the lighting warmer",
      provider: "mock-image",
      aspectRatio: "16:9",
    };
    const videoCatalogProvider: VideoProviderCatalogItem = {
      id: "happyhorse",
      displayName: "Happy Horse",
      enabled: false,
      disabledReason: "Server-side FAL key is not configured",
      requiresApiKey: true,
      defaultModel: "alibaba/happy-horse/image-to-video",
      models: [
        {
          id: "alibaba/happy-horse/image-to-video",
          displayName: "Happy Horse Image to Video",
          default: true,
        },
      ],
      supportedModes: ["image_to_video"],
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
      parameters: [
        {
          id: "motionStrength",
          label: "Motion strength",
          type: "select",
          defaultValue: "medium",
          options: [
            {
              value: "medium",
              label: "Medium",
            },
          ],
        },
      ],
    };
    const videoCatalog: VideoProviderCatalogResult = {
      providers: [videoCatalogProvider],
    };
    const imageManagementProvider: ImageProviderManagementItem = {
      ...catalogProvider,
      kind: "image",
      enabled: true,
      configuredEnabled: true,
      credentialConfigured: true,
      credentialSource: "stored",
      defaultModel: "gemini-2.5-flash-image",
      configuredDefaultModel: "gemini-2.5-flash-image",
      lastTest: {
        status: "succeeded",
        testedAt: "2026-06-13T00:00:00.000Z",
        model: "gemini-2.5-flash-image",
        message: "Provider test succeeded",
      },
    };
    const videoManagementProvider: VideoProviderManagementItem = {
      ...videoCatalogProvider,
      kind: "video",
      configuredEnabled: false,
      credentialConfigured: false,
      lastTest: {
        status: "failed",
        testedAt: "2026-06-13T00:01:00.000Z",
        model: "alibaba/happy-horse/image-to-video",
        message: "Missing provider credential",
      },
    };
    const updateProviderConfigInput = normalizeUpdateProviderConfigInput({
      enabled: true,
      defaultModel: "gemini-2.5-flash-image",
      credential: { action: "set", value: "sk-secret-provider-key" },
    });
    const modelConfigInput = normalizeUpdateProviderConfigInput({
      defaultModel: "claude-sonnet-4-5",
      params: {
        protocol: "anthropic",
        models: [
          {
            id: "claude-sonnet-4-5",
            displayName: "Claude Sonnet 4.5",
            kind: "llm",
            modes: ["chat", "json", "not-real"],
            contextWindowTokens: 200000,
            supportsJsonMode: true,
            apiKey: "should-be-dropped",
          },
          { id: "claude-sonnet-4-5", displayName: "Duplicate ignored" },
          { id: "custom-vision-model", displayName: "Vision", kind: "multimodal", supportsVision: true },
        ],
        safeParams: {
          temperature: 0.2,
          authorization: "Bearer should-be-dropped",
        },
      },
    });
    const clearProviderConfigInput = normalizeUpdateProviderConfigInput({
      credential: { action: "clear", value: "ignored" },
    });
    const testProviderInput = normalizeProviderConnectionTestInput({
      model: "gemini-2.5-flash-image",
      ignored: "not returned",
    });
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
      referenceMedia: [{ assetId: "asset_image_1", role: "first_frame", sourceNodeId: "image_1" }],
      videoProviderMode: "image_to_video",
      videoPromptMode: "first_frame",
      videoPromptDebugSummary: {
        mode: "first_frame",
        providerMode: "image_to_video",
        provider: videoCreateInput.videoProvider ?? "mock-video",
        model: videoCreateInput.videoModel,
        supportedModes: ["image_to_video"],
        modelSupportedModes: ["image_to_video"],
        referenceMediaRoles: ["first_frame"],
        debugPartKinds: ["shot"],
        missingContextKinds: [],
        checks: [],
      },
      sourceNodeIds: ["image_1", "shot_1"],
      provider: videoCreateInput.videoProvider ?? "mock-video",
      model: videoCreateInput.videoModel,
      aspectRatio: videoCreateInput.videoAspectRatio,
      resolution: videoCreateInput.resolution,
      providerParams: videoCreateInput.videoProviderParams,
    };
    const refinementInput: ImageRefinementJobInput = {
      operation: "image_refinement",
      projectId: "project_1",
      sourceNodeId: "image_1",
      imageNodeId: "image_1",
      sourceImageAssetId: "asset_image_1",
      prompt: refinementCreateInput.refinementPrompt ?? "refine",
      referenceAssetIds: ["asset_ref_1"],
      sourceNodeIds: ["image_1", "shot_1"],
      parentShotNodeId: "shot_1",
      provider: refinementCreateInput.provider ?? "mock-image",
      model: refinementCreateInput.model,
      aspectRatio: refinementCreateInput.aspectRatio,
      providerParams: refinementCreateInput.providerParams,
    };
    const characterInput: CharacterToImageJobInput = {
      operation: "character_to_image",
      projectId: "project_1",
      sourceNodeId: "character_1",
      characterNodeId: "character_1",
      prompt: "character reference sheet prompt",
      referenceAssetIds: ["asset_character_ref"],
      sourceNodeIds: ["character_1"],
      provider: characterCreateInput.provider ?? "mock-image",
      model: characterCreateInput.model,
      aspectRatio: characterCreateInput.aspectRatio,
      providerParams: characterCreateInput.providerParams,
      assetPurpose: "character_reference",
    };
    const locationInput: LocationToImageJobInput = {
      operation: "location_to_image",
      projectId: "project_1",
      sourceNodeId: "location_1",
      locationNodeId: "location_1",
      prompt: "location reference sheet prompt",
      referenceAssetIds: ["asset_location_ref"],
      sourceNodeIds: ["location_1"],
      provider: locationCreateInput.provider ?? "mock-image",
      model: locationCreateInput.model,
      aspectRatio: locationCreateInput.aspectRatio,
      providerParams: locationCreateInput.providerParams,
      assetPurpose: "location_reference",
    };
    const waitInput: WorkerGenerationJobWaitInput = {
      providerTaskId: "seedance_task_1",
      provider: videoInput.provider,
      model: videoInput.model,
      rawJson: {
        statusUrl: "https://provider.example/tasks/seedance_task_1",
      },
    };
    const cancelInput: WorkerGenerationJobCancelInput = {
      reason: "User cancelled from queue panel",
      rawJson: {
        requestedBy: "user",
      },
    };
    const videoTaskResult: VideoProviderTaskResult = {
      status: "provider_waiting",
      provider: videoInput.provider,
      providerTaskId: waitInput.providerTaskId,
      rawJson: {
        submitted: true,
      },
    };
    const batchCreateInput: CreateBatchImagesToVideosJobInput = {
      operation: "batch_images_to_videos",
      sourceNodeIds: ["image_1", "image_missing"],
      videoProvider: "happyhorse",
      videoModel: "alibaba/happy-horse/image-to-video",
      durationSeconds: 10,
      resolution: "720p",
      videoAspectRatio: "16:9",
      videoProviderParams: {
        motionStrength: "medium",
      },
    };
    const batchShotsCreateInput: CreateBatchShotsToImagesJobInput = {
      operation: "batch_shots_to_images",
      sourceNodeIds: ["shot_1", "shot_missing"],
      provider: "image2",
      model: "gpt-image-2",
      aspectRatio: "16:9",
      count: 2,
      providerParams: {
        quality: "medium",
      },
    };
    const batchParentInput: BatchImagesToVideosJobInput = {
      operation: "batch_images_to_videos",
      projectId: "project_1",
      sourceNodeIds: batchCreateInput.sourceNodeIds,
      childJobIds: ["job_2"],
      provider: batchCreateInput.videoProvider ?? "mock-video",
      model: batchCreateInput.videoModel,
      durationSeconds: batchCreateInput.durationSeconds,
      aspectRatio: batchCreateInput.videoAspectRatio,
      resolution: batchCreateInput.resolution,
      providerParams: batchCreateInput.videoProviderParams,
    };
    const batchShotsParentInput: BatchShotsToImagesJobInput = {
      operation: "batch_shots_to_images",
      projectId: "project_1",
      sourceNodeIds: batchShotsCreateInput.sourceNodeIds,
      childJobIds: ["job_4"],
      provider: batchShotsCreateInput.provider ?? "mock-image",
      model: batchShotsCreateInput.model,
      aspectRatio: batchShotsCreateInput.aspectRatio,
      count: batchShotsCreateInput.count,
      providerParams: batchShotsCreateInput.providerParams,
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
      providerWaiting: counts.provider_waiting,
      succeeded: counts.succeeded,
      failed: counts.failed,
      cancelled: counts.cancelled,
    };
    const listResult: GenerationJobListResult<
      ShotToImageJobInput | ImageToVideoJobInput | BatchImagesToVideosJobInput
    > = {
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
        {
          id: "job_3",
          projectId: "project_1",
          operation: "batch_images_to_videos",
          status: "provider_waiting",
          provider: batchParentInput.provider,
          model: batchParentInput.model,
          inputJson: batchParentInput,
          createdAt: "2026-06-12T00:00:03.000Z",
          updatedAt: "2026-06-12T00:00:03.000Z",
        },
      ],
      queueSummary,
    };
    const batchResult: CreateBatchImagesToVideosJobResult = {
      jobs: [
        {
          id: "job_2",
          projectId: "project_1",
          operation: "image_to_video",
          status: "queued",
          provider: videoInput.provider,
          model: videoInput.model,
          sourceNodeId: "image_1",
          inputJson: videoInput,
          createdAt: "2026-06-12T00:00:02.000Z",
          updatedAt: "2026-06-12T00:00:02.000Z",
        },
      ],
      skipped: [
        {
          nodeId: "image_missing",
          reason: "No source image asset",
        },
      ],
      queueSummary,
    };
    const batchShotsResult: CreateBatchShotsToImagesJobResult = {
      jobs: [
        {
          id: "job_4",
          projectId: "project_1",
          operation: "shot_to_image",
          status: "queued",
          provider: shotInput.provider,
          model: shotInput.model,
          sourceNodeId: "shot_1",
          inputJson: shotInput,
          createdAt: "2026-06-12T00:00:04.000Z",
          updatedAt: "2026-06-12T00:00:04.000Z",
        },
      ],
      skipped: [
        {
          nodeId: "shot_missing",
          reason: "Shot node not found",
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
    expect(videoCatalog.providers[0]).toMatchObject({
      id: "happyhorse",
      supportsCancel: true,
      supportedResolutions: ["720p", "1080p"],
    });
    expect(imageManagementProvider).toMatchObject({
      kind: "image",
      configuredEnabled: true,
      credentialConfigured: true,
      credentialSource: "stored",
    });
    expect(videoManagementProvider).toMatchObject({
      kind: "video",
      credentialConfigured: false,
      lastTest: expect.objectContaining({ status: "failed" }),
    });
    expect(updateProviderConfigInput).toEqual({
      enabled: true,
      defaultModel: "gemini-2.5-flash-image",
      credential: { action: "set", value: "sk-secret-provider-key" },
    });
    expect(modelConfigInput).toEqual({
      defaultModel: "claude-sonnet-4-5",
      params: {
        protocol: "anthropic",
        models: [
          {
            id: "claude-sonnet-4-5",
            displayName: "Claude Sonnet 4.5",
            kind: "llm",
            modes: ["chat", "json"],
            contextWindowTokens: 200000,
            supportsJsonMode: true,
          },
          {
            id: "custom-vision-model",
            displayName: "Vision",
            kind: "multimodal",
            supportsVision: true,
          },
        ],
        safeParams: {
          temperature: 0.2,
        },
      },
    });
    expect(clearProviderConfigInput).toEqual({ credential: { action: "clear" } });
    expect(normalizeUpdateProviderConfigInput({ credential: { action: "set", value: " " } })).toEqual(
      {},
    );
    expect(testProviderInput).toEqual({ model: "gemini-2.5-flash-image" });
    expect(managedProviderKind("image")).toBe("image");
    expect(managedProviderKind("llm")).toBe("llm");
    expect(managedProviderId("llm", "mock-llm")).toBe("mock-llm");
    expect(managedProviderId("image", "banana")).toBe("banana");
    expect(managedProviderId("video", "banana")).toBeUndefined();
    expect(programmableProviderId("CUSTOM:atlas-cloud")).toBe("custom:atlas-cloud");
    expect(programmableProviderId("custom:image2")).toBeUndefined();
    expect(programmableProviderId("custom:mock-llm")).toBeUndefined();
    expect(programmableProviderId("custom:bad/path")).toBeUndefined();
    expect(managedProviderId("image", "custom:atlas-cloud")).toBe("custom:atlas-cloud");
    expect(managedProviderId("llm", "custom:atlas-cloud")).toBeUndefined();
    expect(normalizeProviderErrorCategory({ status: 429, message: "Too many requests" })).toBe("rate_limit");
    expect(normalizeProviderErrorCategory({ code: "model_not_found", message: "Unknown model" })).toBe(
      "unsupported_model",
    );
    expect(JSON.stringify([imageManagementProvider, videoManagementProvider])).not.toContain(
      "sk-secret-provider-key",
    );
    expect(shotInput).toMatchObject({
      provider: "image2",
      model: "gpt-image-2",
      aspectRatio: "16:9",
      count: 3,
    });
    expect(videoInput).toMatchObject({
      provider: "seedance",
      model: "seedance-1-0-pro",
      durationSeconds: 5,
      resolution: "1080p",
    });
    expect(refinementInput).toMatchObject({
      operation: "image_refinement",
      sourceImageAssetId: "asset_image_1",
      prompt: "make the lighting warmer",
    });
    expect(characterInput).toMatchObject({
      operation: "character_to_image",
      sourceNodeId: "character_1",
      assetPurpose: "character_reference",
    });
    expect(locationInput).toMatchObject({
      operation: "location_to_image",
      sourceNodeId: "location_1",
      assetPurpose: "location_reference",
    });

    const programmableManifest: ProgrammableProviderManifest = {
      id: "custom:atlas-cloud",
      kind: "image",
      displayName: "Atlas Cloud",
      credentials: [{ key: "apiKey", label: "API Key", type: "password", required: true }],
      models: [{ id: "atlas-image-v1", displayName: "Atlas Image v1", default: true }],
      defaultModel: "atlas-image-v1",
      supportedModes: ["text_to_image"],
      defaultAspectRatio: "16:9",
      supportedAspectRatios: ["16:9"],
      parameters: [],
      image: {
        supportsReferenceImages: false,
        maxReferenceImages: 0,
        supportsMultipleOutputs: false,
        maxOutputs: 1,
        action: {
          request: {
            method: "POST",
            url: "https://api.example.test/images",
            headers: { Authorization: "Bearer {{credential.apiKey}}" },
            bodyJson: { prompt: "{{input.prompt}}" },
          },
          output: { source: "url", path: "data.url", mimeType: "image/png" },
        },
      },
    };
    const programmableProviderSummary: ProgrammableProviderDefinitionSummary = {
      id: "programmable_provider_1",
      kind: "image",
      provider: programmableManifest.id,
      displayName: programmableManifest.displayName,
      activeVersionId: "programmable_version_1",
      versions: [
        {
          id: "programmable_version_1",
          version: 1,
          status: "valid",
          diagnostics: [],
          createdAt: "2026-06-13T00:00:00.000Z",
          active: true,
        },
      ],
      enabled: true,
      credentialConfigured: true,
    };
    expect(JSON.stringify([programmableManifest, programmableProviderSummary])).not.toContain(
      "sk-secret-provider-key",
    );
    expect(videoTaskResult.status).toBe("provider_waiting");
    expect(cancelInput.reason).toContain("cancelled");
    expect(batchParentInput.childJobIds).toEqual(["job_2"]);
    expect(batchShotsParentInput.childJobIds).toEqual(["job_4"]);
    expect(batchResult.skipped[0]?.reason).toContain("source image");
    expect(batchShotsResult.skipped[0]?.reason).toContain("Shot node");
    expect(listResult.jobs.map((job) => job.operation)).toEqual([
      "shot_to_image",
      "image_to_video",
      "batch_images_to_videos",
    ]);
    expect(listResult.queueSummary).toMatchObject({
      queued: 1,
      running: 2,
      providerWaiting: 0,
      succeeded: 3,
      failed: 1,
      cancelled: 0,
    });
    expect(imageNodeData.generationJobId).toBe("job_1");
    expect(imageNodeData.inputJson).toMatchObject({ prompt: "cinematic image prompt" });
    expect(imageNodeData.outputJson).toMatchObject({
      targetNodeId: "image_1",
      targets: expect.arrayContaining([
        expect.objectContaining({ targetNodeId: "image_2", assetId: "asset_image_2" }),
      ]),
    });
  });

  it("exports Phase 11 editor export inputs, package outputs, and canvas package data", () => {
    const exportPreset = "hd_1080p";
    const sourceEditorExportId = "export_previous";
    const createInput: CreateEditorExportInput = {
      videoNodeIds: ["video_1", "video_2", "video_3"],
      sortMode: "manual",
      exportPreset,
      includeStoryboardCsv: true,
      includeSubtitles: false,
      sourceEditorExportId,
    };
    const manifest: TimelineManifest = {
      version: "1.0",
      projectId: "project_1",
      editorExportId: "export_1",
      title: "Rain Night Chase",
      aspectRatio: "16:9",
      fps: 24,
      sortMode: createInput.sortMode,
      exportPreset,
      assets: [
        {
          id: "asset_video_1",
          type: "video",
          url: "clips/shot_001.mp4",
          mimeType: "video/mp4",
          durationMs: 4000,
        },
      ],
      tracks: [
        {
          id: "track_video_1",
          type: "video",
          items: [
            {
              id: "item_video_1",
              assetId: "asset_video_1",
              sourceNodeId: "video_1",
              startMs: 0,
              durationMs: 4000,
              metadata: {
                shotNumber: "001",
              },
            },
          ],
        },
      ],
      metadata: {
        selectedVideoNodeIds: createInput.videoNodeIds,
        sourceEditorExportId,
      },
    };
    const jobInput: EditorExportJobInput = {
      operation: "editor_export",
      projectId: "project_1",
      editorExportId: "export_1",
      videoNodeIds: createInput.videoNodeIds,
      sortMode: createInput.sortMode,
      exportPreset,
      includeStoryboardCsv: true,
      includeSubtitles: false,
      fps: 24,
      aspectRatio: "16:9",
      clips: [
        {
          videoNodeId: "video_1",
          videoNodeTitle: "Shot 001 video",
          videoAssetId: "asset_video_1",
          filename: "clips/shot_001.mp4",
          durationMs: 4000,
          shotNodeId: "shot_1",
          shotNumber: "001",
          manualIndex: 0,
        },
      ],
      sourceEditorExportId,
    };
    const packageOutput: EditorExportPackageOutput = {
      storageKey: "project_1/editor-exports/export_1.zip",
      mimeType: "application/zip",
      bytesBase64: "UEsDBAoAAAA=",
      sizeBytes: 128,
      timeline: manifest,
      storyboardCsv: "index,filename,videoNodeId,assetId\n1,clips/shot_001.mp4,video_1,asset_video_1\n",
      clips: [
        {
          index: 1,
          filename: "clips/shot_001.mp4",
          videoNodeId: "video_1",
          videoAssetId: "asset_video_1",
          durationMs: 4000,
        },
      ],
    };
    const exportRecord: EditorExportRecord = {
      id: "export_1",
      projectId: "project_1",
      packageAssetId: "asset_package_1",
      status: "succeeded",
      timelineJson: manifest,
      storyboardCsv: packageOutput.storyboardCsv,
      createdAt: "2026-06-13T00:00:00.000Z",
      updatedAt: "2026-06-13T00:00:01.000Z",
    };
    const createResult: CreateEditorExportResult = {
      export: exportRecord,
      job: {
        id: "job_export_1",
        projectId: "project_1",
        operation: "editor_export",
        status: "queued",
        provider: "mock-editor",
        model: "zip-v1",
        inputJson: jobInput,
        createdAt: "2026-06-13T00:00:00.000Z",
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
      queueSummary: {
        counts: {
          queued: 1,
          running: 0,
          provider_waiting: 0,
          succeeded: 0,
          failed: 0,
          cancelled: 0,
        },
        queued: 1,
        running: 0,
        failed: 0,
      },
    };
    const jobOutput: EditorExportJobOutput = {
      operation: "editor_export",
      editorExportId: "export_1",
      packageAssetId: "asset_package_1",
      packageNodeId: "node_package_1",
      edgeIds: ["edge_sent_1"],
      selectedVideoNodeIds: createInput.videoNodeIds,
      sortMode: createInput.sortMode,
      exportPreset,
      sourceEditorExportId,
      timeline: manifest,
      storyboardCsv: packageOutput.storyboardCsv,
      clips: packageOutput.clips,
      completedAt: "2026-06-13T00:00:02.000Z",
      localEditor: {
        attemptedAt: "2026-06-13T00:00:03.000Z",
        sent: true,
        editorUrl: "http://localhost:4300/open/export_1",
      },
    };
    const sendResult: EditorExportSendResult = {
      export: exportRecord,
      sent: false,
      errorMessage: "LOCAL_EDITOR_URL is not configured",
    };
    const packageNodeData: EditorPackageNodeData = {
      packageName: "Rain Night Chase export",
      format: "zip",
      assetId: exportRecord.packageAssetId,
      editorExportId: exportRecord.id,
      packageAssetId: exportRecord.packageAssetId,
      selectedVideoNodeIds: createInput.videoNodeIds,
      sortMode: createInput.sortMode,
      exportPreset,
      sourceEditorExportId,
      clipCount: 3,
      localEditorError: sendResult.errorMessage,
      exportedAt: jobOutput.completedAt,
    };

    expect(createInput.sortMode).toBe("manual");
    expect(createInput.exportPreset).toBe("hd_1080p");
    expect(jobInput.operation).toBe("editor_export");
    expect(jobInput.sourceEditorExportId).toBe("export_previous");
    expect(manifest.tracks[0]?.items[0]).toMatchObject({
      sourceNodeId: "video_1",
      durationMs: 4000,
    });
    expect(packageOutput.mimeType).toBe(EDITOR_PACKAGE_MIME_TYPE);
    expect(createResult.job.inputJson.videoNodeIds).toEqual(["video_1", "video_2", "video_3"]);
    expect(jobOutput.edgeIds).toEqual(["edge_sent_1"]);
    expect(sendResult.errorMessage).toContain("LOCAL_EDITOR_URL");
    expect(packageNodeData).toMatchObject({
      editorExportId: "export_1",
      packageAssetId: "asset_package_1",
      sortMode: "manual",
      exportPreset: "hd_1080p",
      sourceEditorExportId: "export_previous",
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
      lifecycleStages: [
        {
          stageId: "stage_alert",
          label: "Alert",
          ageRange: "late 20s",
          appearance: "Focused eyes and tightened posture.",
          costume: "dark utility coat",
          emotionalState: "guarded determination",
          identityPrompt: "alert hero stage identity prompt",
        },
      ],
      referenceAssetIds: ["asset_hero_ref", "asset_shared_ref", "asset_shared_ref"],
      selectedVariantId: "variant_alert",
      assetVariants: [
        {
          variantId: "variant_default",
          label: "Default",
          status: "succeeded",
          assetId: "asset_hero_default_variant",
          prompt: "default hero reference",
        },
        {
          variantId: "variant_alert",
          label: "Alert",
          status: "selected",
          assetId: "asset_hero_alert_variant",
          prompt: "alert hero reference",
        },
      ],
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
      storyEventIds: ["event_opening"],
      storyEvents: [
        {
          eventId: "event_opening",
          orderIndex: 1,
          summary: "The hero notices the hidden signal and chooses to act.",
          characters: ["character_1", "character_2"],
          emotion: "urgent focus",
          conflict: "The console signal could expose the team.",
          result: "The hero starts the launch sequence.",
        },
      ],
      characterStageRefs: [{ characterTempId: "character_1", stageId: "stage_alert" }],
      generationSettings: {
        aspectRatio: "16:9",
        narrationAccent: "warm northern accent",
        visualManual: {
          lens: "long-lens compression",
        },
        directorManual: {
          cameraLanguage: "locked-off surveillance angle",
        },
        continuity: {
          mode: "one_take",
          adjacentShotPrompt: "Keep both characters moving left to right",
        },
      },
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
      assetListItem("asset_hero_alert_variant", "image"),
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

function skillTemplateSummary(
  overrides: Partial<SkillTemplateSummary> & Pick<SkillTemplateSummary, "id" | "kind" | "displayName">,
): SkillTemplateSummary {
  const metadata = skillTemplateMetadata(overrides.kind);
  return {
    projectId: "project_1",
    slug: `${overrides.kind}-default`,
    description: "Default prompt preset",
    enabled: true,
    activeVersionId: `${overrides.id}_version_1`,
    indexStatus: "ready",
    activeSummary: "Default prompt summary",
    versions: [
      {
        id: `${overrides.id}_version_1`,
        version: 1,
        sourceText: "Default prompt source",
        status: "valid",
        diagnostics: [],
        createdAt: "2026-06-14T00:00:00.000Z",
        active: true,
      },
    ],
    createdAt: "2026-06-14T00:00:00.000Z",
    updatedAt: "2026-06-14T00:00:00.000Z",
    ...metadata,
    ...overrides,
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

function blueprintStoryboard(): StoryboardResult {
  const storyboard = validStoryboard();
  storyboard.storyBlueprint = {
    worldSummary: "A near-future city where rooftop signals mark resistance safehouses.",
    timelineEvents: [
      {
        eventId: "event_opening",
        title: "Rooftop signal",
        orderIndex: 1,
        chapterIndex: 1,
        sourceExcerpt: "A hero watches the city lights before choosing the next shot.",
        summary: "The hero sees the hidden signal and chooses to act.",
        characters: ["char_hero"],
        locationName: "City Rooftop",
        emotion: "anticipation",
        conflict: "The hero must decide whether to expose the signal.",
        result: "The hero commits to the mission.",
        estimatedDurationSec: 12,
      },
    ],
    characterRelationships: [
      {
        relationshipId: "rel_hero_ally",
        characterTempIds: ["char_hero", "char_ally"],
        type: "allies",
        summary: "The hero and ally trust each other under pressure.",
        status: "tested",
      },
    ],
    themes: ["trust", "resistance"],
    adaptationNotes: "Keep the hidden signal visible in early shots.",
  };
  storyboard.characters.push({
    tempId: "char_ally",
    name: "Ally",
    role: "support",
    appearance: "A calm companion with a dark utility jacket.",
    personality: "Practical and observant.",
    identityPrompt: "consistent support character, cinematic character reference",
  });
  storyboard.characters[0] = {
    ...storyboard.characters[0]!,
    lifecycleStages: [
      {
        stageId: "stage_younger",
        label: "Before the mission",
        ageRange: "early 20s",
        appearance: "A tense young lead with rain-damp hair.",
        costume: "plain dark hoodie",
        emotionalState: "uncertain",
        identityPrompt: "younger hero before the mission, anxious expression",
      },
    ],
    lockedFields: ["appearance", "identityPrompt"],
  };
  storyboard.scenes[0] = {
    ...storyboard.scenes[0]!,
    storyEventIds: ["event_opening"],
    characterTempIds: ["char_hero", "char_ally"],
    shots: storyboard.scenes[0]!.shots.map((shot) => ({
      ...shot,
      storyEventIds: ["event_opening"],
      characterTempIds: ["char_hero"],
      characterStageRefs: [{ characterTempId: "char_hero", stageId: "stage_younger" }],
    })),
  };
  return storyboard;
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
