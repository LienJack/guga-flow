"use client";

import type {
  AssetListItem,
  AssetPurpose,
  CanvasNodeRecord,
  CanvasSnapshotJson,
  UpdateCanvasNodeInput,
} from "@guga-flow/shared-types";
import { Plus, Upload, Volume2, X } from "lucide-react";
import React, { FormEvent, useEffect, useState } from "react";

import { listAssets, updateCanvasNode, uploadAsset } from "../../lib/api";

type AudioBindingRole = "voice" | "narration" | "sound_effect" | "bgm" | "clip_audio";
type AudioIdField = "audioAssetIds" | "voiceAssetIds";
type AudioReferenceField = "audioReferences" | "voiceReferences";

interface NodeAudioAssetsProps {
  projectId: string;
  node: CanvasNodeRecord;
  initialAssets?: AssetListItem[];
  onNodeUpdated(node: CanvasNodeRecord): void;
}

interface AudioBindingConfig {
  heading: string;
  emptyTitle: string;
  emptyDescription: string;
  savedLabel: string;
  uploadPurpose: AssetPurpose;
  idField: AudioIdField;
  referenceField: AudioReferenceField;
  defaultRole: AudioBindingRole;
}

interface AudioReferenceInput {
  [key: string]: CanvasSnapshotJson | undefined;
  assetId: string;
  label?: string;
  role?: AudioBindingRole;
  sourceNodeId?: string;
  mimeType?: string;
  durationMs?: number;
}

export function NodeAudioAssets({
  initialAssets = [],
  node,
  onNodeUpdated,
  projectId,
}: NodeAudioAssetsProps) {
  const supported = supportsNodeAudioAssets(node);
  const config = audioBindingConfigForNode(node);
  const [assets, setAssets] = useState<AssetListItem[]>(initialAssets);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!supported) {
      return;
    }

    let ignore = false;
    listAssets(projectId)
      .then((result) => {
        if (!ignore) {
          setAssets(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load audio assets");
        }
      });

    return () => {
      ignore = true;
    };
  }, [projectId, supported]);

  if (!config) {
    return null;
  }

  const audioAssetIds = getNodeAudioAssetIds(node);
  const audioAssets = assets.filter(isAudioBindableAsset);
  const assetsById = new Map(audioAssets.map((asset) => [asset.id, asset]));
  const availableAssets = audioAssets.filter((asset) => !audioAssetIds.includes(asset.id));
  const uploadPurpose = config.uploadPurpose;

  async function saveAudioAssetIds(nextAudioAssetIds: string[]) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await updateCanvasNode(
        projectId,
        node.id,
        buildNodeAudioAssetUpdate(node, nextAudioAssetIds, assets),
      );
      onNodeUpdated(result.node);
      setSaved(true);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update audio bindings");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose audio to upload");
      return;
    }

    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const uploaded = await uploadAsset(projectId, { file, purpose: uploadPurpose });
      setAssets((current) => [uploaded, ...current]);
      if (!isAudioBindableAsset(uploaded)) {
        setError("Uploaded file is not a bindable audio asset");
        return;
      }
      const nextAssets = [uploaded, ...assets];
      const result = await updateCanvasNode(
        projectId,
        node.id,
        buildNodeAudioAssetUpdate(node, [...audioAssetIds, uploaded.id], nextAssets),
      );
      onNodeUpdated(result.node);
      form.reset();
      setSaved(true);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload audio");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="node-reference-assets node-audio-assets">
      <div className="panel-heading compact">
        <h2>{config.heading}</h2>
        <span>{audioAssetIds.length}</span>
      </div>

      <form className="reference-upload" onSubmit={handleUpload}>
        <input
          name="file"
          type="file"
          accept="audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg,audio/webm,.mp3,.m4a,.wav,.ogg,.webm"
        />
        <button className="primary-action compact" type="submit" disabled={busy}>
          <Upload size={15} aria-hidden="true" />
          Upload
        </button>
      </form>

      {audioAssetIds.length > 0 ? (
        <ul className="reference-asset-list">
          {audioAssetIds.map((assetId) => {
            const asset = assetsById.get(assetId);
            return (
              <li className="reference-asset-row" key={assetId}>
                <span className="reference-asset-fallback">
                  <Volume2 size={15} aria-hidden="true" />
                </span>
                <span>{asset?.originalFilename ?? assetId}</span>
                <button
                  className="icon-action danger"
                  type="button"
                  title="Remove audio"
                  onClick={() => void saveAudioAssetIds(audioAssetIds.filter((id) => id !== assetId))}
                  disabled={busy}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="empty-state small">
          <strong>{config.emptyTitle}</strong>
          <span>{config.emptyDescription}</span>
        </div>
      )}

      {availableAssets.length > 0 ? (
        <ul className="reference-candidate-list">
          {availableAssets.map((asset) => (
            <li className="reference-candidate-row" key={asset.id}>
              <span>{asset.originalFilename ?? asset.id}</span>
              <button
                className="ghost-action compact"
                type="button"
                onClick={() => void saveAudioAssetIds([...audioAssetIds, asset.id])}
                disabled={busy}
              >
                <Plus size={14} aria-hidden="true" />
                Bind
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}
      {saved ? <p className="form-success">{config.savedLabel}</p> : null}
    </div>
  );
}

export function supportsNodeAudioAssets(
  node: CanvasNodeRecord | undefined,
): node is CanvasNodeRecord<{ audioAssetIds?: string[]; voiceAssetIds?: string[] }> {
  return node?.type === "character_asset" || node?.type === "shot" || node?.type === "video";
}

export function audioBindingConfigForNode(node: CanvasNodeRecord | undefined): AudioBindingConfig | undefined {
  if (!supportsNodeAudioAssets(node)) {
    return undefined;
  }
  if (node.type === "character_asset") {
    return {
      heading: "Voice",
      emptyTitle: "No voice audio",
      emptyDescription: "Bind a voice reference audio asset to this character.",
      savedLabel: "Saved voice",
      uploadPurpose: "voice_reference",
      idField: "voiceAssetIds",
      referenceField: "voiceReferences",
      defaultRole: "voice",
    };
  }
  return {
    heading: "Audio",
    emptyTitle: "No audio",
    emptyDescription: "Bind audio assets to this shot or video.",
    savedLabel: "Saved audio",
    uploadPurpose: "shot_audio",
    idField: "audioAssetIds",
    referenceField: "audioReferences",
    defaultRole: "clip_audio",
  };
}

export function isAudioBindableAsset(asset: AssetListItem): boolean {
  return asset.type === "audio" || asset.previewKind === "audio" || asset.mimeType.startsWith("audio/");
}

export function getNodeAudioAssetIds(node: CanvasNodeRecord | undefined): string[] {
  const config = audioBindingConfigForNode(node);
  if (!node || !config) {
    return [];
  }

  return stringArray(objectData(node.dataJson)[config.idField]);
}

export function buildNodeAudioAssetUpdate(
  node: CanvasNodeRecord,
  audioAssetIds: readonly string[],
  assets: readonly AssetListItem[] = [],
): UpdateCanvasNodeInput {
  const config = audioBindingConfigForNode(node);
  if (!config) {
    return { dataJson: canvasJsonObject(node.dataJson) };
  }

  const dataJson = canvasJsonObject(node.dataJson);
  const nextAudioAssetIds = uniqueStrings(audioAssetIds);
  if (nextAudioAssetIds.length > 0) {
    const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
    const existingReferences = audioReferenceArray(objectData(node.dataJson)[config.referenceField]);
    dataJson[config.idField] = nextAudioAssetIds;
    dataJson[config.referenceField] = nextAudioAssetIds.map((assetId) => {
      const existing = existingReferences.find((reference) => reference.assetId === assetId);
      const asset = assetsById.get(assetId);
      return compactAudioReference({
        ...existing,
        assetId,
        sourceNodeId: node.id,
        role: existing?.role ?? config.defaultRole,
        label: existing?.label ?? asset?.originalFilename,
        mimeType: asset?.mimeType,
        durationMs: asset?.durationMs,
      });
    });
  } else {
    delete dataJson[config.idField];
    delete dataJson[config.referenceField];
  }

  return { dataJson };
}

function canvasJsonObject(value: unknown): { [key: string]: CanvasSnapshotJson } {
  const data = objectData(value);
  const result: { [key: string]: CanvasSnapshotJson } = {};
  for (const [key, fieldValue] of Object.entries(data)) {
    if (isCanvasSnapshotJson(fieldValue)) {
      result[key] = fieldValue;
    }
  }

  return result;
}

function isCanvasSnapshotJson(value: unknown): value is CanvasSnapshotJson {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(isCanvasSnapshotJson);
  }
  if (typeof value === "object") {
    return Object.values(objectData(value)).every(isCanvasSnapshotJson);
  }

  return false;
}

function audioReferenceArray(value: unknown): AudioReferenceInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const raw = objectData(item);
      const assetId = optionalString(raw.assetId);
      if (!assetId) {
        return undefined;
      }
      return compactAudioReference({
        assetId,
        label: optionalString(raw.label),
        role: audioRole(raw.role),
        sourceNodeId: optionalString(raw.sourceNodeId),
        mimeType: optionalString(raw.mimeType),
        durationMs: optionalNumber(raw.durationMs),
      });
    })
    .filter((item): item is AudioReferenceInput => Boolean(item));
}

function compactAudioReference(reference: AudioReferenceInput): AudioReferenceInput {
  return Object.fromEntries(
    Object.entries(reference).filter(([, value]) => value !== undefined),
  ) as AudioReferenceInput;
}

function audioRole(value: unknown): AudioBindingRole | undefined {
  return value === "voice" ||
    value === "narration" ||
    value === "sound_effect" ||
    value === "bgm" ||
    value === "clip_audio"
    ? value
    : undefined;
}

function objectData(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return uniqueStrings(value.filter((item): item is string => typeof item === "string"));
}

function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
}
