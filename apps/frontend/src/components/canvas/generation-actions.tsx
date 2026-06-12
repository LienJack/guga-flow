import type {
  CanvasSnapshotJson,
  CanvasNodeRecord,
  CreateGenerationJobInput,
  GenerationJobRecord,
  GenerationQueueSummary,
  ImageProviderCatalogItem,
  ImageProviderCatalogResult,
  ImageNodeData,
  VideoProviderCatalogItem,
  VideoProviderCatalogResult,
} from "@guga-flow/shared-types";
import { Ban, ImagePlus, RotateCcw, Video } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  cancelGenerationJob,
  createBatchImagesToVideosJobs,
  createGenerationJob,
  getImageProviderCatalog,
  getVideoProviderCatalog,
  retryGenerationJob,
} from "../../lib/api";

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
  supportedModes: ["text_to_image", "multi_reference"],
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

export function GenerationActions({
  generationJobs,
  imageProviderCatalog,
  videoProviderCatalog,
  node,
  onGenerationChanged,
  projectId,
}: GenerationActionsProps) {
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
  const action = generationActionForNode(node);
  const imageProviders = imageCatalog?.providers.length ? imageCatalog.providers : [FALLBACK_IMAGE_PROVIDER];
  const selectedProvider =
    imageProviders.find((provider) => provider.id === imageSettings.provider) ??
    imageProviders.find((provider) => provider.enabled) ??
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
    if (action?.operation !== "shot_to_image" || imageProviderCatalog) {
      return;
    }

    let cancelled = false;
    getImageProviderCatalog()
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
  }, [action?.operation, imageProviderCatalog]);

  useEffect(() => {
    if (action?.operation !== "image_to_video" || videoProviderCatalog) {
      return;
    }

    let cancelled = false;
    getVideoProviderCatalog()
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
  }, [action?.operation, videoProviderCatalog]);

  if (!action) {
    return null;
  }

  async function handleGenerate() {
    if (!action) {
      return;
    }
    setBusy(true);
    setError(null);
    setLastResult(null);

    try {
      const result = await createGenerationJob(
        projectId,
        buildGenerationJobInputForOperation(
          action.operation,
          node.id,
          normalizedImageSettings,
          normalizedVideoSettings,
        ),
      );
      setLastResult("Queued");
      onGenerationChanged?.(result.queueSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation request failed");
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
      setLastResult("Retry queued");
      onGenerationChanged?.(result.queueSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation retry failed");
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
      setLastResult("Cancelled");
      onGenerationChanged?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation cancel failed");
    } finally {
      setBusy(false);
    }
  }

  const Icon = action.icon;
  const generateDisabled =
    busy ||
    Boolean(activeJob) ||
    (action.operation === "shot_to_image" && !selectedProvider.enabled) ||
    (action.operation === "image_to_video" && !selectedVideoProvider.enabled);

  return (
    <section className="generation-panel" aria-label="Generation">
      <div className="section-heading-row">
        <h3>Generation</h3>
        {activeJob ? <span className="status-chip">{activeJob.status}</span> : null}
      </div>
      {action.operation === "shot_to_image" ? (
        <ImageGenerationSettings
          busy={busy || Boolean(activeJob)}
          providers={imageProviders}
          selectedProvider={selectedProvider}
          settings={normalizedImageSettings}
          onSettingsChange={setImageSettings}
        />
      ) : null}
      {action.operation === "image_to_video" ? (
        <VideoGenerationSettings
          busy={busy || Boolean(activeJob)}
          providers={videoProviders}
          selectedProvider={selectedVideoProvider}
          settings={normalizedVideoSettings}
          onSettingsChange={setVideoSettings}
        />
      ) : null}
      <div className="generation-actions">
        <button
          className="primary-action compact"
          type="button"
          disabled={generateDisabled}
          onClick={() => void handleGenerate()}
        >
          <Icon size={15} aria-hidden="true" />
          {action.label}
        </button>
        {activeJob ? (
          <button
            className="ghost-action compact"
            type="button"
            disabled={busy}
            onClick={() => void handleCancel(activeJob.id)}
          >
            <Ban size={14} aria-hidden="true" />
            Cancel
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
            Retry
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
  imageNodes,
  onGenerationChanged,
  projectId,
}: {
  generationJobs: GenerationJobRecord[];
  imageNodes: Array<CanvasNodeRecord<ImageNodeData>>;
  projectId: string;
  onGenerationChanged?(queueSummary?: GenerationQueueSummary): void;
}) {
  const [videoCatalog, setVideoCatalog] = useState<VideoProviderCatalogResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [videoSettings, setVideoSettings] = useState<VideoGenerationFormSettings>(() =>
    videoSettingsForProvider(FALLBACK_VIDEO_PROVIDER),
  );
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
  const availableImageNodes = imageNodes.filter((node) => !activeSourceNodeIds.has(node.id));

  useEffect(() => {
    let cancelled = false;
    getVideoProviderCatalog()
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
  }, []);

  if (!imageNodes.length) {
    return null;
  }

  async function handleBatchGenerate() {
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
      setLastResult(
        `${result.jobs.length} queued${result.skipped.length ? `, ${result.skipped.length} skipped` : ""}`,
      );
      onGenerationChanged?.(result.queueSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Batch generation request failed");
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || !selectedVideoProvider.enabled || availableImageNodes.length === 0;

  return (
    <section className="generation-panel" aria-label="Batch generation">
      <div className="section-heading-row">
        <h3>Batch Video</h3>
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
          disabled={disabled}
          onClick={() => void handleBatchGenerate()}
        >
          <Video size={15} aria-hidden="true" />
          Batch Video
        </button>
      </div>
      {lastResult ? <p className="generation-status">{lastResult}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

function ImageGenerationSettings({
  busy,
  onSettingsChange,
  providers,
  selectedProvider,
  settings,
}: {
  busy: boolean;
  onSettingsChange(next: ImageGenerationFormSettings): void;
  providers: ImageProviderCatalogItem[];
  selectedProvider: ImageProviderCatalogItem;
  settings: ImageGenerationFormSettings;
}) {
  const disabledProviderReasons = providers.filter(
    (provider) => provider.id !== selectedProvider.id && !provider.enabled && provider.disabledReason,
  );

  return (
    <div className="generation-settings">
      <div className="generation-field">
        <label htmlFor="generation-provider">Provider</label>
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
            <option key={provider.id} value={provider.id} disabled={!provider.enabled}>
              {provider.displayName}
              {provider.enabled ? "" : " unavailable"}
            </option>
          ))}
        </select>
      </div>
      <div className="generation-field-grid">
        <div className="generation-field">
          <label htmlFor="generation-model">Model</label>
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
          <label htmlFor="generation-aspect-ratio">Aspect</label>
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
          <label htmlFor="generation-count">Count</label>
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
  const disabledProviderReasons = providers.filter(
    (provider) => provider.id !== selectedProvider.id && !provider.enabled && provider.disabledReason,
  );

  return (
    <div className="generation-settings">
      <div className="generation-field">
        <label htmlFor="generation-video-provider">Provider</label>
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
              {provider.enabled ? "" : " unavailable"}
            </option>
          ))}
        </select>
      </div>
      <div className="generation-field-grid video">
        <div className="generation-field">
          <label htmlFor="generation-video-model">Model</label>
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
          <label htmlFor="generation-video-aspect-ratio">Aspect</label>
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
          <label htmlFor="generation-video-duration">Duration</label>
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
          <label htmlFor="generation-video-resolution">Resolution</label>
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
  operation: "shot_to_image" | "image_to_video",
  sourceNodeId: string,
  imageSettings: ImageGenerationFormSettings = settingsForProvider(FALLBACK_IMAGE_PROVIDER),
  videoSettings: VideoGenerationFormSettings = videoSettingsForProvider(FALLBACK_VIDEO_PROVIDER),
): CreateGenerationJobInput {
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

function generationActionForNode(node: CanvasNodeRecord):
  | {
      icon: typeof ImagePlus;
      label: string;
      operation: "shot_to_image" | "image_to_video";
    }
  | undefined {
  if (node.type === "shot") {
    return {
      icon: ImagePlus,
      label: "Generate Image",
      operation: "shot_to_image",
    };
  }

  if (node.type === "image" && typeof (node.dataJson as ImageNodeData | undefined)?.assetId === "string") {
    return {
      icon: Video,
      label: "Generate Video",
      operation: "image_to_video",
    };
  }

  return undefined;
}
