import type {
  AiAudioNodeData,
  AiTextNodeData,
  CanvasSnapshotJson,
  CanvasNodeRecord,
  CreateGenerationJobInput,
  GenerationJobRecord,
  GenerationQueueSummary,
  ImageProviderCatalogItem,
  ImageProviderCatalogResult,
  ImageProviderMode,
  ImageNodeData,
  ShotNodeData,
  SkillTemplatePresetCategory,
  SkillTemplateSummary,
  VideoProviderCatalogItem,
  VideoProviderCatalogResult,
} from "@guga-flow/shared-types";
import { filterSkillTemplateSummaries } from "@guga-flow/shared-types";
import { Ban, FileAudio, FileText, ImagePlus, RotateCcw, Video } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  cancelGenerationJob,
  createBatchImagesToVideosJobs,
  createBatchShotsToImagesJobs,
  createGenerationJob,
  getProjectImageProviderCatalog,
  getProjectVideoProviderCatalog,
  listSkillTemplates,
  retryGenerationJob,
} from "../../lib/api";
import { useI18n } from "../../lib/i18n";

interface GenerationActionsProps {
  generationJobs: GenerationJobRecord[];
  imageProviderCatalog?: ImageProviderCatalogResult;
  videoProviderCatalog?: VideoProviderCatalogResult;
  node: CanvasNodeRecord;
  projectId: string;
  onGenerationChanged?(queueSummary?: GenerationQueueSummary): void;
}

const ACTIVE_STATUSES = new Set(["queued", "running", "provider_waiting"]);
const FALLBACK_IMAGE_PROVIDER: ImageProviderCatalogItem = {
  id: "mock-image",
  displayName: "Mock Image",
  enabled: true,
  requiresApiKey: false,
  defaultModel: "mock-image-v1",
  models: [{ id: "mock-image-v1", displayName: "Mock Image v1", default: true }],
  supportedModes: ["text_to_image", "image_to_image", "multi_reference"],
  supportsReferenceImages: true,
  maxReferenceImages: 99,
  supportsMultipleOutputs: false,
  maxOutputs: 1,
  defaultAspectRatio: "16:9",
  supportedAspectRatios: ["9:16", "16:9", "1:1"],
  parameters: [],
};
const FALLBACK_VIDEO_PROVIDER: VideoProviderCatalogItem = {
  id: "mock-video",
  displayName: "Mock Video",
  enabled: true,
  requiresApiKey: false,
  defaultModel: "mock-video-v1",
  models: [{ id: "mock-video-v1", displayName: "Mock Video v1", default: true }],
  supportedModes: ["image_to_video"],
  supportsFirstFrame: true,
  supportsLastFrame: false,
  supportsReferenceImages: true,
  maxReferenceImages: 99,
  supportsCancel: true,
  defaultDurationSeconds: 4,
  supportedDurationSeconds: [4, 5, 6, 8, 10],
  defaultResolution: "720p",
  supportedResolutions: ["720p"],
  defaultAspectRatio: "16:9",
  supportedAspectRatios: ["9:16", "16:9", "1:1"],
  parameters: [],
};

export interface ImageGenerationFormSettings {
  aspectRatio: ImageProviderCatalogItem["defaultAspectRatio"];
  count: number;
  model: string;
  provider: ImageProviderCatalogItem["id"];
  providerParams: Record<string, CanvasSnapshotJson>;
}

export interface VideoGenerationFormSettings {
  durationSeconds: number;
  resolution: VideoProviderCatalogItem["defaultResolution"];
  videoAspectRatio: VideoProviderCatalogItem["defaultAspectRatio"];
  videoModel: string;
  videoProvider: VideoProviderCatalogItem["id"];
  videoProviderParams: Record<string, CanvasSnapshotJson>;
}

type DirectGenerationOperation =
  | "shot_to_image"
  | "character_to_image"
  | "location_to_image"
  | "ai_audio_generation"
  | "ai_text_generation"
  | "image_refinement"
  | "image_to_video";

interface GenerationAction {
  icon: typeof ImagePlus;
  labelKey: string;
  operation: DirectGenerationOperation;
}

type Translator = (key: string, params?: Record<string, string | number>) => string;

export function GenerationActions({
  generationJobs,
  imageProviderCatalog,
  videoProviderCatalog,
  node,
  onGenerationChanged,
  projectId,
}: GenerationActionsProps) {
  const { t } = useI18n();
  const [imageCatalog, setImageCatalog] = useState<ImageProviderCatalogResult | null>(imageProviderCatalog ?? null);
  const [videoCatalog, setVideoCatalog] = useState<VideoProviderCatalogResult | null>(videoProviderCatalog ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [imageSettings, setImageSettings] = useState<ImageGenerationFormSettings>(() =>
    settingsForProvider(FALLBACK_IMAGE_PROVIDER),
  );
  const [videoSettings, setVideoSettings] = useState<VideoGenerationFormSettings>(() =>
    videoSettingsForProvider(FALLBACK_VIDEO_PROVIDER),
  );
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [textPrompt, setTextPrompt] = useState(() => aiTextPromptFromNode(node));
  const [audioPrompt, setAudioPrompt] = useState(() => aiAudioPromptFromNode(node));
  const [skillTemplates, setSkillTemplates] = useState<SkillTemplateSummary[]>([]);
  const [selectedSkillTemplateId, setSelectedSkillTemplateId] = useState("");
  const actions = generationActionsForNode(node);
  const hasImageProviderAction = actions.some((action) => isImageProviderOperation(action.operation));
  const hasVideoProviderAction = actions.some((action) => action.operation === "image_to_video");
  const hasRefinementAction = actions.some((action) => action.operation === "image_refinement");
  const hasTextAction = actions.some((action) => action.operation === "ai_text_generation");
  const hasAudioAction = actions.some((action) => action.operation === "ai_audio_generation");
  const trimmedRefinementPrompt = refinementPrompt.trim();
  const trimmedTextPrompt = textPrompt.trim();
  const trimmedAudioPrompt = audioPrompt.trim();
  const requiredImageProviderMode: ImageProviderMode = hasRefinementAction
    ? "image_to_image"
    : "text_to_image";
  const imageProviders = imageCatalog?.providers.length ? imageCatalog.providers : [FALLBACK_IMAGE_PROVIDER];
  const selectedProvider =
    imageProviders.find(
      (provider) =>
        provider.id === imageSettings.provider &&
        imageProviderSupportsMode(provider, requiredImageProviderMode),
    ) ??
    imageProviders.find((provider) => imageProviderSupportsMode(provider, requiredImageProviderMode)) ??
    FALLBACK_IMAGE_PROVIDER;
  const normalizedImageSettings = normalizeImageSettings(imageSettings, selectedProvider);
  const videoProviders = videoCatalog?.providers.length ? videoCatalog.providers : [FALLBACK_VIDEO_PROVIDER];
  const selectedVideoProvider =
    videoProviders.find((provider) => provider.id === videoSettings.videoProvider) ??
    videoProviders.find((provider) => provider.enabled) ??
    FALLBACK_VIDEO_PROVIDER;
  const normalizedVideoSettings = normalizeVideoSettings(videoSettings, selectedVideoProvider);
  const nodeJobs = useMemo(
    () => generationJobs.filter((job) => job.sourceNodeId === node.id),
    [generationJobs, node.id],
  );
  const activeJob = nodeJobs.find((job) => ACTIVE_STATUSES.has(job.status));
  const failedJob = nodeJobs.find((job) => job.status === "failed");
  const presetCategory = presetCategoryForActions(actions);
  const compatibleSkillTemplates = useMemo(
    () =>
      presetCategory
        ? filterSkillTemplateSummaries(skillTemplates, { category: presetCategory })
        : [],
    [presetCategory, skillTemplates],
  );
  const selectedSkillTemplate =
    compatibleSkillTemplates.find((template) => template.id === selectedSkillTemplateId);

  useEffect(() => {
    if (imageProviderCatalog) {
      setImageCatalog(imageProviderCatalog);
    }
  }, [imageProviderCatalog]);

  useEffect(() => {
    if (videoProviderCatalog) {
      setVideoCatalog(videoProviderCatalog);
    }
  }, [videoProviderCatalog]);

  useEffect(() => {
    if (!hasImageProviderAction || imageProviderCatalog) {
      return;
    }

    let cancelled = false;
    getProjectImageProviderCatalog(projectId)
      .then((result) => {
        if (!cancelled) {
          setImageCatalog(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setImageCatalog({ providers: [FALLBACK_IMAGE_PROVIDER] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasImageProviderAction, imageProviderCatalog, projectId]);

  useEffect(() => {
    if (!hasVideoProviderAction || videoProviderCatalog) {
      return;
    }

    let cancelled = false;
    getProjectVideoProviderCatalog(projectId)
      .then((result) => {
        if (!cancelled) {
          setVideoCatalog(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVideoCatalog({ providers: [FALLBACK_VIDEO_PROVIDER] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasVideoProviderAction, projectId, videoProviderCatalog]);

  useEffect(() => {
    if (!actions.length) {
      return;
    }

    let cancelled = false;
    listSkillTemplates(projectId)
      .then((result) => {
        if (!cancelled) {
          setSkillTemplates(result.templates);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSkillTemplates([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [actions.length, projectId]);

  useEffect(() => {
    if (
      selectedSkillTemplateId &&
      !compatibleSkillTemplates.some((template) => template.id === selectedSkillTemplateId)
    ) {
      setSelectedSkillTemplateId("");
    }
  }, [compatibleSkillTemplates, selectedSkillTemplateId]);

  useEffect(() => {
    if (node.type === "ai_text") {
      setTextPrompt(aiTextPromptFromNode(node));
    }
  }, [node.id, node.type]);

  useEffect(() => {
    if (node.type === "ai_audio") {
      setAudioPrompt(aiAudioPromptFromNode(node));
    }
  }, [node.id, node.type]);

  if (!actions.length) {
    return null;
  }

  async function handleGenerate(operation: DirectGenerationOperation) {
    setBusy(true);
    setError(null);
    setLastResult(null);

    try {
      const result = await createGenerationJob(
        projectId,
        buildGenerationJobInputForOperation(
          operation,
          node.id,
          normalizedImageSettings,
          normalizedVideoSettings,
          trimmedRefinementPrompt,
          selectedSkillTemplate ? [selectedSkillTemplate.id] : [],
          trimmedTextPrompt,
          trimmedAudioPrompt,
        ),
      );
      setLastResult(t("generation.queued"));
      onGenerationChanged?.(result.queueSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("generation.requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRetry(jobId: string) {
    setBusy(true);
    setError(null);
    setLastResult(null);

    try {
      const result = await retryGenerationJob(projectId, jobId);
      setLastResult(t("generation.retryQueued"));
      onGenerationChanged?.(result.queueSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("generation.retryFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCancel(jobId: string) {
    setBusy(true);
    setError(null);
    setLastResult(null);

    try {
      await cancelGenerationJob(projectId, jobId);
      setLastResult(t("generation.cancelled"));
      onGenerationChanged?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("generation.cancelFailed"));
    } finally {
      setBusy(false);
    }
  }

  const generateDisabledForOperation = (operation: DirectGenerationOperation) =>
    busy ||
    Boolean(activeJob) ||
    (isImageProviderOperation(operation) && !selectedProvider.enabled) ||
    (operation === "image_refinement" &&
      !imageProviderSupportsMode(selectedProvider, "image_to_image")) ||
    (operation === "image_to_video" && !selectedVideoProvider.enabled) ||
    (operation === "image_refinement" && !trimmedRefinementPrompt) ||
    (operation === "ai_text_generation" && !trimmedTextPrompt) ||
    (operation === "ai_audio_generation" && !trimmedAudioPrompt);

  function handleInsertPreset() {
    const sourceText = activeSkillTemplateSource(selectedSkillTemplate);
    if (!sourceText) {
      return;
    }
    setRefinementPrompt((current) => [current.trim(), sourceText].filter(Boolean).join("\n\n"));
  }

  return (
    <section className="generation-panel" aria-label={t("generation.title")}>
      <div className="section-heading-row">
        <h3>{t("generation.title")}</h3>
        {activeJob ? <span className="status-chip">{statusLabel(activeJob.status, t)}</span> : null}
      </div>
      {compatibleSkillTemplates.length ? (
        <div className="generation-field">
          <label htmlFor={`generation-skill-preset-${node.id}`}>Preset</label>
          <select
            id={`generation-skill-preset-${node.id}`}
            value={selectedSkillTemplateId}
            disabled={busy || Boolean(activeJob)}
            onChange={(event) => setSelectedSkillTemplateId(event.target.value)}
          >
            <option value="">No preset</option>
            {compatibleSkillTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.displayName}
              </option>
            ))}
          </select>
          {hasRefinementAction ? (
            <button
              className="ghost-action compact"
              type="button"
              disabled={busy || Boolean(activeJob) || !activeSkillTemplateSource(selectedSkillTemplate)}
              onClick={handleInsertPreset}
            >
              Insert Preset
            </button>
          ) : null}
        </div>
      ) : null}
      {hasImageProviderAction ? (
        <ImageGenerationSettings
          busy={busy || Boolean(activeJob)}
          providers={imageProviders}
          requiredMode={requiredImageProviderMode}
          selectedProvider={selectedProvider}
          settings={normalizedImageSettings}
          onSettingsChange={setImageSettings}
        />
      ) : null}
      {hasRefinementAction ? (
        <div className="generation-field wide">
          <label htmlFor="generation-refinement-prompt">{t("generation.refinementPrompt")}</label>
          <textarea
            id="generation-refinement-prompt"
            value={refinementPrompt}
            maxLength={1000}
            rows={3}
            disabled={busy || Boolean(activeJob)}
            onChange={(event) => setRefinementPrompt(event.target.value)}
          />
        </div>
      ) : null}
      {hasTextAction ? (
        <div className="generation-field wide">
          <label htmlFor={`generation-text-prompt-${node.id}`}>{t("generation.textPrompt")}</label>
          <textarea
            id={`generation-text-prompt-${node.id}`}
            value={textPrompt}
            maxLength={4000}
            rows={4}
            disabled={busy || Boolean(activeJob)}
            onChange={(event) => setTextPrompt(event.target.value)}
          />
        </div>
      ) : null}
      {hasAudioAction ? (
        <div className="generation-field wide">
          <label htmlFor={`generation-audio-prompt-${node.id}`}>{t("generation.audioPrompt")}</label>
          <textarea
            id={`generation-audio-prompt-${node.id}`}
            value={audioPrompt}
            maxLength={4000}
            rows={4}
            disabled={busy || Boolean(activeJob)}
            onChange={(event) => setAudioPrompt(event.target.value)}
          />
        </div>
      ) : null}
      {hasVideoProviderAction ? (
        <VideoGenerationSettings
          busy={busy || Boolean(activeJob)}
          providers={videoProviders}
          selectedProvider={selectedVideoProvider}
          settings={normalizedVideoSettings}
          onSettingsChange={setVideoSettings}
        />
      ) : null}
      <div className="generation-actions">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.operation}
              className="primary-action compact"
              type="button"
              disabled={generateDisabledForOperation(action.operation)}
              onClick={() => void handleGenerate(action.operation)}
            >
              <Icon size={15} aria-hidden="true" />
              {t(action.labelKey)}
            </button>
          );
        })}
        {activeJob ? (
          <button
            className="ghost-action compact"
            type="button"
            disabled={busy}
            onClick={() => void handleCancel(activeJob.id)}
          >
            <Ban size={14} aria-hidden="true" />
            {t("generation.cancel")}
          </button>
        ) : null}
        {failedJob ? (
          <button
            className="ghost-action compact"
            type="button"
            disabled={busy}
            onClick={() => void handleRetry(failedJob.id)}
          >
            <RotateCcw size={14} aria-hidden="true" />
            {t("generation.retry")}
          </button>
        ) : null}
      </div>
      {lastResult ? <p className="generation-status">{lastResult}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

export function GenerationBatchActions({
  generationJobs,
  imageNodes = [],
  onGenerationChanged,
  projectId,
  shotNodes = [],
}: {
  generationJobs: GenerationJobRecord[];
  imageNodes?: Array<CanvasNodeRecord<ImageNodeData>>;
  projectId: string;
  shotNodes?: Array<CanvasNodeRecord<ShotNodeData>>;
  onGenerationChanged?(queueSummary?: GenerationQueueSummary): void;
}) {
  const { t } = useI18n();
  const [imageCatalog, setImageCatalog] = useState<ImageProviderCatalogResult | null>(null);
  const [videoCatalog, setVideoCatalog] = useState<VideoProviderCatalogResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [imageSettings, setImageSettings] = useState<ImageGenerationFormSettings>(() =>
    settingsForProvider(FALLBACK_IMAGE_PROVIDER),
  );
  const [videoSettings, setVideoSettings] = useState<VideoGenerationFormSettings>(() =>
    videoSettingsForProvider(FALLBACK_VIDEO_PROVIDER),
  );
  const imageProviders = imageCatalog?.providers.length ? imageCatalog.providers : [FALLBACK_IMAGE_PROVIDER];
  const selectedImageProvider =
    imageProviders.find((provider) => provider.id === imageSettings.provider) ??
    imageProviders.find((provider) => provider.enabled) ??
    FALLBACK_IMAGE_PROVIDER;
  const normalizedImageSettings = normalizeImageSettings(imageSettings, selectedImageProvider);
  const videoProviders = videoCatalog?.providers.length ? videoCatalog.providers : [FALLBACK_VIDEO_PROVIDER];
  const selectedVideoProvider =
    videoProviders.find((provider) => provider.id === videoSettings.videoProvider) ??
    videoProviders.find((provider) => provider.enabled) ??
    FALLBACK_VIDEO_PROVIDER;
  const normalizedVideoSettings = normalizeVideoSettings(videoSettings, selectedVideoProvider);
  const activeSourceNodeIds = new Set(
    generationJobs
      .filter((job) => job.sourceNodeId && ACTIVE_STATUSES.has(job.status))
      .map((job) => job.sourceNodeId as string),
  );
  const availableShotNodes = shotNodes.filter((node) => !activeSourceNodeIds.has(node.id));
  const availableImageNodes = imageNodes.filter((node) => !activeSourceNodeIds.has(node.id));

  useEffect(() => {
    let cancelled = false;
    getProjectImageProviderCatalog(projectId)
      .then((result) => {
        if (!cancelled) {
          setImageCatalog(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setImageCatalog({ providers: [FALLBACK_IMAGE_PROVIDER] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    getProjectVideoProviderCatalog(projectId)
      .then((result) => {
        if (!cancelled) {
          setVideoCatalog(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVideoCatalog({ providers: [FALLBACK_VIDEO_PROVIDER] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (!shotNodes.length && !imageNodes.length) {
    return null;
  }

  async function handleBatchGenerateImages() {
    setBusy(true);
    setError(null);
    setLastResult(null);

    try {
      const result = await createBatchShotsToImagesJobs(
        projectId,
        buildBatchShotsToImagesJobInput(
          availableShotNodes.map((node) => node.id),
          normalizedImageSettings,
        ),
      );
      setLastResult(
        queuedResultLabel(t, "generation.imagesQueued", result.jobs.length, result.skipped.length),
      );
      onGenerationChanged?.(result.queueSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("generation.batchImageRequestFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleBatchGenerateVideos() {
    setBusy(true);
    setError(null);
    setLastResult(null);

    try {
      const result = await createBatchImagesToVideosJobs(projectId, {
        operation: "batch_images_to_videos",
        sourceNodeIds: availableImageNodes.map((node) => node.id),
        videoProvider: normalizedVideoSettings.videoProvider,
        videoModel: normalizedVideoSettings.videoModel,
        videoAspectRatio: normalizedVideoSettings.videoAspectRatio,
        durationSeconds: normalizedVideoSettings.durationSeconds,
        resolution: normalizedVideoSettings.resolution,
        videoProviderParams: normalizedVideoSettings.videoProviderParams,
      });
      setLastResult(queuedResultLabel(t, "generation.jobsQueued", result.jobs.length, result.skipped.length));
      onGenerationChanged?.(result.queueSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("generation.batchVideoRequestFailed"));
    } finally {
      setBusy(false);
    }
  }

  const imageDisabled = busy || !selectedImageProvider.enabled || availableShotNodes.length === 0;
  const videoDisabled = busy || !selectedVideoProvider.enabled || availableImageNodes.length === 0;

  return (
    <>
      {shotNodes.length ? (
        <section className="generation-panel" aria-label={t("generation.batchImageTitle")}>
          <div className="section-heading-row">
            <h3>{t("generation.batchImageTitle")}</h3>
            <span className="status-chip">{availableShotNodes.length}/{shotNodes.length}</span>
          </div>
          <ImageGenerationSettings
            busy={busy}
            providers={imageProviders}
            requiredMode="text_to_image"
            selectedProvider={selectedImageProvider}
            settings={normalizedImageSettings}
            onSettingsChange={setImageSettings}
          />
          <div className="generation-actions">
            <button
              className="primary-action compact"
              type="button"
              disabled={imageDisabled}
              onClick={() => void handleBatchGenerateImages()}
            >
              <ImagePlus size={15} aria-hidden="true" />
              {t("generation.batchImage")}
            </button>
          </div>
        </section>
      ) : null}
      {imageNodes.length ? (
        <section className="generation-panel" aria-label={t("generation.batchVideoTitle")}>
          <div className="section-heading-row">
            <h3>{t("generation.batchVideoTitle")}</h3>
            <span className="status-chip">{availableImageNodes.length}/{imageNodes.length}</span>
          </div>
          <VideoGenerationSettings
            busy={busy}
            providers={videoProviders}
            selectedProvider={selectedVideoProvider}
            settings={normalizedVideoSettings}
            onSettingsChange={setVideoSettings}
          />
          <div className="generation-actions">
            <button
              className="primary-action compact"
              type="button"
              disabled={videoDisabled}
              onClick={() => void handleBatchGenerateVideos()}
            >
              <Video size={15} aria-hidden="true" />
              {t("generation.batchVideo")}
            </button>
          </div>
        </section>
      ) : null}
      {lastResult ? <p className="generation-status">{lastResult}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </>
  );
}

function ImageGenerationSettings({
  busy,
  onSettingsChange,
  providers,
  requiredMode,
  selectedProvider,
  settings,
}: {
  busy: boolean;
  onSettingsChange(next: ImageGenerationFormSettings): void;
  providers: ImageProviderCatalogItem[];
  requiredMode: ImageProviderMode;
  selectedProvider: ImageProviderCatalogItem;
  settings: ImageGenerationFormSettings;
}) {
  const { t } = useI18n();
  const disabledProviderReasons = providers.filter(
    (provider) => provider.id !== selectedProvider.id && !provider.enabled && provider.disabledReason,
  );

  return (
    <div className="generation-settings">
      <div className="generation-field">
        <label htmlFor="generation-provider">{t("generation.provider")}</label>
        <select
          id="generation-provider"
          value={selectedProvider.id}
          disabled={busy}
          onChange={(event) => {
            const nextProvider =
              providers.find((provider) => provider.id === event.target.value) ?? FALLBACK_IMAGE_PROVIDER;
            onSettingsChange(settingsForProvider(nextProvider));
          }}
        >
          {providers.map((provider) => (
            <option
              key={provider.id}
              value={provider.id}
              disabled={!imageProviderSupportsMode(provider, requiredMode)}
            >
              {provider.displayName}
              {provider.enabled
                ? provider.supportedModes.includes(requiredMode)
                  ? ""
                  : ` ${t("generation.providerUnsupported")}`
                : ` ${t("generation.providerUnavailable")}`}
            </option>
          ))}
        </select>
      </div>
      <div className="generation-field-grid">
        <div className="generation-field">
          <label htmlFor="generation-model">{t("generation.model")}</label>
          <select
            id="generation-model"
            value={settings.model}
            disabled={busy || !selectedProvider.enabled}
            onChange={(event) => onSettingsChange({ ...settings, model: event.target.value })}
          >
            {selectedProvider.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="generation-field">
          <label htmlFor="generation-aspect-ratio">{t("generation.aspect")}</label>
          <select
            id="generation-aspect-ratio"
            value={settings.aspectRatio}
            disabled={busy || !selectedProvider.enabled}
            onChange={(event) =>
              onSettingsChange({
                ...settings,
                aspectRatio: event.target.value as ImageGenerationFormSettings["aspectRatio"],
              })
            }
          >
            {selectedProvider.supportedAspectRatios.map((aspectRatio) => (
              <option key={aspectRatio} value={aspectRatio}>
                {aspectRatio}
              </option>
            ))}
          </select>
        </div>
        <div className="generation-field">
          <label htmlFor="generation-count">{t("generation.count")}</label>
          <input
            id="generation-count"
            type="number"
            min={1}
            max={selectedProvider.maxOutputs}
            value={settings.count}
            disabled={busy || !selectedProvider.enabled || selectedProvider.maxOutputs === 1}
            onChange={(event) =>
              onSettingsChange({
                ...settings,
                count: clampCount(Number(event.target.value), selectedProvider.maxOutputs),
              })
            }
          />
        </div>
      </div>
      {selectedProvider.parameters.length ? (
        <div className="generation-field-grid">
          {selectedProvider.parameters.map((parameter) => (
            <div className="generation-field" key={parameter.id}>
              <label htmlFor={`generation-param-${parameter.id}`}>{parameter.label}</label>
              {parameter.type === "select" ? (
                <select
                  id={`generation-param-${parameter.id}`}
                  value={String(settings.providerParams[parameter.id] ?? parameter.defaultValue ?? "")}
                  disabled={busy || !selectedProvider.enabled}
                  onChange={(event) =>
                    onSettingsChange({
                      ...settings,
                      providerParams: {
                        ...settings.providerParams,
                        [parameter.id]: event.target.value,
                      },
                    })
                  }
                >
                  {(parameter.options ?? []).map((option) => (
                    <option key={String(option.value)} value={String(option.value)}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {!selectedProvider.enabled && selectedProvider.disabledReason ? (
        <p className="generation-disabled-note">{selectedProvider.disabledReason}</p>
      ) : null}
      {disabledProviderReasons.length ? (
        <div className="generation-disabled-list">
          {disabledProviderReasons.map((provider) => (
            <p key={provider.id} className="generation-disabled-note">
              {provider.displayName}: {provider.disabledReason}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function VideoGenerationSettings({
  busy,
  onSettingsChange,
  providers,
  selectedProvider,
  settings,
}: {
  busy: boolean;
  onSettingsChange(next: VideoGenerationFormSettings): void;
  providers: VideoProviderCatalogItem[];
  selectedProvider: VideoProviderCatalogItem;
  settings: VideoGenerationFormSettings;
}) {
  const { t } = useI18n();
  const disabledProviderReasons = providers.filter(
    (provider) => provider.id !== selectedProvider.id && !provider.enabled && provider.disabledReason,
  );

  return (
    <div className="generation-settings">
      <div className="generation-field">
        <label htmlFor="generation-video-provider">{t("generation.provider")}</label>
        <select
          id="generation-video-provider"
          value={selectedProvider.id}
          disabled={busy}
          onChange={(event) => {
            const nextProvider =
              providers.find((provider) => provider.id === event.target.value) ?? FALLBACK_VIDEO_PROVIDER;
            onSettingsChange(videoSettingsForProvider(nextProvider));
          }}
        >
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id} disabled={!provider.enabled}>
              {provider.displayName}
              {provider.enabled ? "" : ` ${t("generation.providerUnavailable")}`}
            </option>
          ))}
        </select>
      </div>
      <div className="generation-field-grid video">
        <div className="generation-field">
          <label htmlFor="generation-video-model">{t("generation.model")}</label>
          <select
            id="generation-video-model"
            value={settings.videoModel}
            disabled={busy || !selectedProvider.enabled}
            onChange={(event) => onSettingsChange({ ...settings, videoModel: event.target.value })}
          >
            {selectedProvider.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.displayName}
              </option>
            ))}
          </select>
        </div>
        <div className="generation-field">
          <label htmlFor="generation-video-aspect-ratio">{t("generation.aspect")}</label>
          <select
            id="generation-video-aspect-ratio"
            value={settings.videoAspectRatio}
            disabled={busy || !selectedProvider.enabled}
            onChange={(event) =>
              onSettingsChange({
                ...settings,
                videoAspectRatio: event.target.value as VideoGenerationFormSettings["videoAspectRatio"],
              })
            }
          >
            {selectedProvider.supportedAspectRatios.map((aspectRatio) => (
              <option key={aspectRatio} value={aspectRatio}>
                {aspectRatio}
              </option>
            ))}
          </select>
        </div>
        <div className="generation-field">
          <label htmlFor="generation-video-duration">{t("generation.duration")}</label>
          <select
            id="generation-video-duration"
            value={settings.durationSeconds}
            disabled={busy || !selectedProvider.enabled}
            onChange={(event) =>
              onSettingsChange({ ...settings, durationSeconds: Number(event.target.value) })
            }
          >
            {selectedProvider.supportedDurationSeconds.map((durationSeconds) => (
              <option key={durationSeconds} value={durationSeconds}>
                {durationSeconds}s
              </option>
            ))}
          </select>
        </div>
        <div className="generation-field">
          <label htmlFor="generation-video-resolution">{t("generation.resolution")}</label>
          <select
            id="generation-video-resolution"
            value={settings.resolution}
            disabled={busy || !selectedProvider.enabled}
            onChange={(event) =>
              onSettingsChange({
                ...settings,
                resolution: event.target.value as VideoGenerationFormSettings["resolution"],
              })
            }
          >
            {selectedProvider.supportedResolutions.map((resolution) => (
              <option key={resolution} value={resolution}>
                {resolution}
              </option>
            ))}
          </select>
        </div>
      </div>
      {selectedProvider.parameters.length ? (
        <div className="generation-field-grid">
          {selectedProvider.parameters.map((parameter) => (
            <div className="generation-field" key={parameter.id}>
              {parameter.type === "boolean" ? (
                <label className="generation-checkbox" htmlFor={`generation-video-param-${parameter.id}`}>
                  <input
                    id={`generation-video-param-${parameter.id}`}
                    type="checkbox"
                    checked={Boolean(settings.videoProviderParams[parameter.id] ?? parameter.defaultValue)}
                    disabled={busy || !selectedProvider.enabled}
                    onChange={(event) =>
                      onSettingsChange({
                        ...settings,
                        videoProviderParams: {
                          ...settings.videoProviderParams,
                          [parameter.id]: event.target.checked,
                        },
                      })
                    }
                  />
                  <span>{parameter.label}</span>
                </label>
              ) : (
                <>
                  <label htmlFor={`generation-video-param-${parameter.id}`}>{parameter.label}</label>
                  <select
                    id={`generation-video-param-${parameter.id}`}
                    value={String(settings.videoProviderParams[parameter.id] ?? parameter.defaultValue ?? "")}
                    disabled={busy || !selectedProvider.enabled}
                    onChange={(event) =>
                      onSettingsChange({
                        ...settings,
                        videoProviderParams: {
                          ...settings.videoProviderParams,
                          [parameter.id]: event.target.value,
                        },
                      })
                    }
                  >
                    {(parameter.options ?? []).map((option) => (
                      <option key={String(option.value)} value={String(option.value)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
          ))}
        </div>
      ) : null}
      {!selectedProvider.enabled && selectedProvider.disabledReason ? (
        <p className="generation-disabled-note">{selectedProvider.disabledReason}</p>
      ) : null}
      {disabledProviderReasons.length ? (
        <div className="generation-disabled-list">
          {disabledProviderReasons.map((provider) => (
            <p key={provider.id} className="generation-disabled-note">
              {provider.displayName}: {provider.disabledReason}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function buildGenerationJobInputForOperation(
  operation: DirectGenerationOperation,
  sourceNodeId: string,
  imageSettings: ImageGenerationFormSettings = settingsForProvider(FALLBACK_IMAGE_PROVIDER),
  videoSettings: VideoGenerationFormSettings = videoSettingsForProvider(FALLBACK_VIDEO_PROVIDER),
  refinementPrompt = "",
  skillTemplateIds: string[] = [],
  textPrompt = "",
  audioPrompt = "",
): CreateGenerationJobInput {
  const selectedSkillTemplateIds = skillTemplateIds.length ? { skillTemplateIds } : {};
  if (operation === "ai_text_generation") {
    return {
      operation,
      sourceNodeId,
      textPrompt,
      ...selectedSkillTemplateIds,
    };
  }

  if (operation === "ai_audio_generation") {
    return {
      operation,
      sourceNodeId,
      audioPrompt,
      audioProvider: "mock-audio",
      audioModel: "mock-tts-v1",
      ...selectedSkillTemplateIds,
    };
  }

  if (operation === "image_to_video") {
    return {
      operation,
      sourceNodeId,
      videoProvider: videoSettings.videoProvider,
      videoModel: videoSettings.videoModel,
      videoAspectRatio: videoSettings.videoAspectRatio,
      durationSeconds: videoSettings.durationSeconds,
      resolution: videoSettings.resolution,
      videoProviderParams: videoSettings.videoProviderParams,
      ...selectedSkillTemplateIds,
    };
  }

  if (operation === "image_refinement") {
    return {
      operation,
      sourceNodeId,
      refinementPrompt,
      provider: imageSettings.provider,
      model: imageSettings.model,
      aspectRatio: imageSettings.aspectRatio,
      providerParams: imageSettings.providerParams,
      ...selectedSkillTemplateIds,
    };
  }

  if (operation === "character_to_image" || operation === "location_to_image") {
    return {
      operation,
      sourceNodeId,
      provider: imageSettings.provider,
      model: imageSettings.model,
      aspectRatio: imageSettings.aspectRatio,
      providerParams: imageSettings.providerParams,
      ...selectedSkillTemplateIds,
    };
  }

  return {
    operation,
    sourceNodeId,
    provider: imageSettings.provider,
    model: imageSettings.model,
    aspectRatio: imageSettings.aspectRatio,
    count: imageSettings.count,
    providerParams: imageSettings.providerParams,
    ...selectedSkillTemplateIds,
  };
}

function presetCategoryForActions(actions: readonly GenerationAction[]): SkillTemplatePresetCategory | undefined {
  if (actions.some((action) => action.operation === "ai_text_generation")) {
    return "ai-text";
  }
  if (actions.some((action) => action.operation === "ai_audio_generation")) {
    return "ai-audio";
  }
  if (actions.some((action) => action.operation === "image_to_video")) {
    return "ai-video";
  }
  if (actions.some((action) => isImageProviderOperation(action.operation))) {
    return "ai-image";
  }
  return undefined;
}

function activeSkillTemplateSource(template: SkillTemplateSummary | undefined): string {
  return template?.versions.find((version) => version.active)?.sourceText ?? "";
}

export function buildBatchShotsToImagesJobInput(
  sourceNodeIds: string[],
  imageSettings: ImageGenerationFormSettings = settingsForProvider(FALLBACK_IMAGE_PROVIDER),
) {
  return {
    operation: "batch_shots_to_images" as const,
    sourceNodeIds,
    provider: imageSettings.provider,
    model: imageSettings.model,
    aspectRatio: imageSettings.aspectRatio,
    count: imageSettings.count,
    providerParams: imageSettings.providerParams,
  };
}

function videoSettingsForProvider(provider: VideoProviderCatalogItem): VideoGenerationFormSettings {
  return {
    videoProvider: provider.id,
    videoModel: provider.defaultModel,
    videoAspectRatio: provider.defaultAspectRatio,
    durationSeconds: provider.defaultDurationSeconds,
    resolution: provider.defaultResolution,
    videoProviderParams: defaultVideoProviderParams(provider),
  };
}

function settingsForProvider(provider: ImageProviderCatalogItem): ImageGenerationFormSettings {
  return {
    provider: provider.id,
    model: provider.defaultModel,
    aspectRatio: provider.defaultAspectRatio,
    count: 1,
    providerParams: defaultProviderParams(provider),
  };
}

function normalizeImageSettings(
  settings: ImageGenerationFormSettings,
  provider: ImageProviderCatalogItem,
): ImageGenerationFormSettings {
  const model = provider.models.some((candidate) => candidate.id === settings.model)
    ? settings.model
    : provider.defaultModel;
  const aspectRatio = provider.supportedAspectRatios.includes(settings.aspectRatio)
    ? settings.aspectRatio
    : provider.defaultAspectRatio;

  return {
    provider: provider.id,
    model,
    aspectRatio,
    count: clampCount(settings.count, provider.maxOutputs),
    providerParams: {
      ...defaultProviderParams(provider),
      ...settings.providerParams,
    },
  };
}

function normalizeVideoSettings(
  settings: VideoGenerationFormSettings,
  provider: VideoProviderCatalogItem,
): VideoGenerationFormSettings {
  const videoModel = provider.models.some((candidate) => candidate.id === settings.videoModel)
    ? settings.videoModel
    : provider.defaultModel;
  const videoAspectRatio = provider.supportedAspectRatios.includes(settings.videoAspectRatio)
    ? settings.videoAspectRatio
    : provider.defaultAspectRatio;
  const durationSeconds = provider.supportedDurationSeconds.includes(settings.durationSeconds)
    ? settings.durationSeconds
    : provider.defaultDurationSeconds;
  const resolution = provider.supportedResolutions.includes(settings.resolution)
    ? settings.resolution
    : provider.defaultResolution;

  return {
    videoProvider: provider.id,
    videoModel,
    videoAspectRatio,
    durationSeconds,
    resolution,
    videoProviderParams: {
      ...defaultVideoProviderParams(provider),
      ...settings.videoProviderParams,
    },
  };
}

function defaultProviderParams(provider: ImageProviderCatalogItem): Record<string, CanvasSnapshotJson> {
  return Object.fromEntries(
    provider.parameters
      .filter((parameter) => parameter.defaultValue !== undefined)
      .map((parameter) => [parameter.id, parameter.defaultValue as CanvasSnapshotJson]),
  );
}

function defaultVideoProviderParams(provider: VideoProviderCatalogItem): Record<string, CanvasSnapshotJson> {
  return Object.fromEntries(
    provider.parameters
      .filter((parameter) => parameter.defaultValue !== undefined)
      .map((parameter) => [parameter.id, parameter.defaultValue as CanvasSnapshotJson]),
  );
}

function clampCount(value: number, maxOutputs: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(Math.trunc(value), 1), maxOutputs);
}

function isImageProviderOperation(operation: DirectGenerationOperation): boolean {
  return (
    operation === "shot_to_image" ||
    operation === "character_to_image" ||
    operation === "location_to_image" ||
    operation === "image_refinement"
  );
}

function aiTextPromptFromNode(node: CanvasNodeRecord): string {
  if (node.type !== "ai_text") {
    return "";
  }
  const data = node.dataJson as AiTextNodeData | undefined;
  return typeof data?.prompt === "string" ? data.prompt : "";
}

function aiAudioPromptFromNode(node: CanvasNodeRecord): string {
  if (node.type !== "ai_audio") {
    return "";
  }
  const data = node.dataJson as AiAudioNodeData | undefined;
  if (typeof data?.scriptText === "string" && data.scriptText.trim()) {
    return data.scriptText;
  }
  return typeof data?.prompt === "string" ? data.prompt : "";
}

function imageProviderSupportsMode(
  provider: ImageProviderCatalogItem,
  requiredMode: ImageProviderMode,
): boolean {
  return provider.enabled && provider.supportedModes.includes(requiredMode);
}

function statusLabel(status: string, t: Translator): string {
  return t(`status.${status}`);
}

function queuedResultLabel(
  t: Translator,
  queuedKey: string,
  queuedCount: number,
  skippedCount: number,
): string {
  return `${t(queuedKey, { count: queuedCount })}${
    skippedCount ? t("generation.skippedSuffix", { count: skippedCount }) : ""
  }`;
}

function generationActionsForNode(node: CanvasNodeRecord): GenerationAction[] {
  if (node.type === "shot") {
    return [
      {
        icon: ImagePlus,
        labelKey: "generation.generateImage",
        operation: "shot_to_image",
      },
    ];
  }

  if (node.type === "character_asset") {
    return [
      {
        icon: ImagePlus,
        labelKey: "generation.generateReference",
        operation: "character_to_image",
      },
    ];
  }

  if (node.type === "location_asset") {
    return [
      {
        icon: ImagePlus,
        labelKey: "generation.generateReference",
        operation: "location_to_image",
      },
    ];
  }

  if (node.type === "image" && typeof (node.dataJson as ImageNodeData | undefined)?.assetId === "string") {
    return [
      {
        icon: Video,
        labelKey: "generation.generateVideo",
        operation: "image_to_video",
      },
      {
        icon: ImagePlus,
        labelKey: "generation.refineImage",
        operation: "image_refinement",
      },
    ];
  }

  if (node.type === "ai_text") {
    return [
      {
        icon: FileText,
        labelKey: "generation.generateText",
        operation: "ai_text_generation",
      },
    ];
  }

  if (node.type === "ai_audio") {
    return [
      {
        icon: FileAudio,
        labelKey: "generation.generateAudio",
        operation: "ai_audio_generation",
      },
    ];
  }

  return [];
}
