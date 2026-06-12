import type {
  CanvasSnapshotJson,
  CanvasNodeRecord,
  CreateGenerationJobInput,
  GenerationJobRecord,
  GenerationQueueSummary,
  ImageProviderCatalogItem,
  ImageProviderCatalogResult,
  ImageNodeData,
} from "@guga-flow/shared-types";
import { ImagePlus, RotateCcw, Video } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { createGenerationJob, getImageProviderCatalog, retryGenerationJob } from "../../lib/api";

interface GenerationActionsProps {
  generationJobs: GenerationJobRecord[];
  imageProviderCatalog?: ImageProviderCatalogResult;
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

export interface ImageGenerationFormSettings {
  aspectRatio: ImageProviderCatalogItem["defaultAspectRatio"];
  count: number;
  model: string;
  provider: ImageProviderCatalogItem["id"];
  providerParams: Record<string, CanvasSnapshotJson>;
}

export function GenerationActions({
  generationJobs,
  imageProviderCatalog,
  node,
  onGenerationChanged,
  projectId,
}: GenerationActionsProps) {
  const [catalog, setCatalog] = useState<ImageProviderCatalogResult | null>(imageProviderCatalog ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [imageSettings, setImageSettings] = useState<ImageGenerationFormSettings>(() =>
    settingsForProvider(FALLBACK_IMAGE_PROVIDER),
  );
  const action = generationActionForNode(node);
  const imageProviders = catalog?.providers.length ? catalog.providers : [FALLBACK_IMAGE_PROVIDER];
  const selectedProvider =
    imageProviders.find((provider) => provider.id === imageSettings.provider) ??
    imageProviders.find((provider) => provider.enabled) ??
    FALLBACK_IMAGE_PROVIDER;
  const normalizedImageSettings = normalizeImageSettings(imageSettings, selectedProvider);
  const nodeJobs = useMemo(
    () => generationJobs.filter((job) => job.sourceNodeId === node.id),
    [generationJobs, node.id],
  );
  const activeJob = nodeJobs.find((job) => ACTIVE_STATUSES.has(job.status));
  const failedJob = nodeJobs.find((job) => job.status === "failed");

  useEffect(() => {
    if (imageProviderCatalog) {
      setCatalog(imageProviderCatalog);
    }
  }, [imageProviderCatalog]);

  useEffect(() => {
    if (action?.operation !== "shot_to_image" || imageProviderCatalog) {
      return;
    }

    let cancelled = false;
    getImageProviderCatalog()
      .then((result) => {
        if (!cancelled) {
          setCatalog(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCatalog({ providers: [FALLBACK_IMAGE_PROVIDER] });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [action?.operation, imageProviderCatalog]);

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
        buildGenerationJobInputForOperation(action.operation, node.id, normalizedImageSettings),
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

  const Icon = action.icon;
  const generateDisabled =
    busy ||
    Boolean(activeJob) ||
    (action.operation === "shot_to_image" && !selectedProvider.enabled);

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

export function buildGenerationJobInputForOperation(
  operation: "shot_to_image" | "image_to_video",
  sourceNodeId: string,
  imageSettings: ImageGenerationFormSettings = settingsForProvider(FALLBACK_IMAGE_PROVIDER),
): CreateGenerationJobInput {
  if (operation === "image_to_video") {
    return {
      operation,
      sourceNodeId,
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

function defaultProviderParams(provider: ImageProviderCatalogItem): Record<string, CanvasSnapshotJson> {
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
