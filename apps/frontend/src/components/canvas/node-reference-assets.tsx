"use client";

import type {
  AssetListItem,
  AssetPurpose,
  CanvasNodeRecord,
  CanvasSnapshotJson,
  UpdateCanvasNodeInput,
} from "@guga-flow/shared-types";
import { Image as ImageIcon, Plus, Upload, X } from "lucide-react";
import React, { FormEvent, useEffect, useState } from "react";

import { assetPreviewUrl, listAssets, updateCanvasNode, uploadAsset } from "../../lib/api";

interface NodeReferenceAssetsProps {
  projectId: string;
  node: CanvasNodeRecord;
  initialAssets?: AssetListItem[];
  onNodeUpdated(node: CanvasNodeRecord): void;
}

export function NodeReferenceAssets({
  initialAssets = [],
  node,
  onNodeUpdated,
  projectId,
}: NodeReferenceAssetsProps) {
  const supported = supportsNodeReferenceAssets(node);
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
          setError(loadError instanceof Error ? loadError.message : "Unable to load reference assets");
        }
      });

    return () => {
      ignore = true;
    };
  }, [projectId, supported]);

  if (!supported) {
    return null;
  }

  const referenceIds = getNodeReferenceAssetIds(node);
  const imageAssets = assets.filter(isReferenceBindableAsset);
  const assetsById = new Map(imageAssets.map((asset) => [asset.id, asset]));
  const availableAssets = imageAssets.filter((asset) => !referenceIds.includes(asset.id));
  const purpose = referencePurposeForNode(node);

  async function saveReferenceIds(nextReferenceIds: string[]) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const result = await updateCanvasNode(projectId, node.id, buildNodeReferenceAssetUpdate(node, nextReferenceIds));
      onNodeUpdated(result.node);
      setSaved(true);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update reference images");
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose an image to upload");
      return;
    }

    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const uploaded = await uploadAsset(projectId, { file, purpose });
      setAssets((current) => [uploaded, ...current]);
      if (!isReferenceBindableAsset(uploaded)) {
        setError("Uploaded file is not a bindable image asset");
        return;
      }
      const result = await updateCanvasNode(
        projectId,
        node.id,
        buildNodeReferenceAssetUpdate(node, [...referenceIds, uploaded.id]),
      );
      onNodeUpdated(result.node);
      form.reset();
      setSaved(true);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload reference image");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="node-reference-assets">
      <div className="panel-heading compact">
        <h2>Reference images</h2>
        <span>{referenceIds.length}</span>
      </div>

      <form className="reference-upload" onSubmit={handleUpload}>
        <input name="file" type="file" accept="image/png,image/jpeg,image/webp" />
        <button className="primary-action compact" type="submit" disabled={busy}>
          <Upload size={15} aria-hidden="true" />
          Upload
        </button>
      </form>

      {referenceIds.length > 0 ? (
        <ul className="reference-asset-list">
          {referenceIds.map((assetId) => {
            const asset = assetsById.get(assetId);
            return (
              <li className="reference-asset-row" key={assetId}>
                {asset ? (
                  <img src={assetPreviewUrl(projectId, asset.id)} alt="" />
                ) : (
                  <span className="reference-asset-fallback">
                    <ImageIcon size={15} aria-hidden="true" />
                  </span>
                )}
                <span>{asset?.originalFilename ?? assetId}</span>
                <button
                  className="icon-action danger"
                  type="button"
                  title="Remove reference"
                  onClick={() => void saveReferenceIds(referenceIds.filter((id) => id !== assetId))}
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
          <strong>No reference images</strong>
          <span>Bind uploaded image assets to this node.</span>
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
                onClick={() => void saveReferenceIds([...referenceIds, asset.id])}
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
      {saved ? <p className="form-success">Saved references</p> : null}
    </div>
  );
}

export function supportsNodeReferenceAssets(
  node: CanvasNodeRecord | undefined,
): node is CanvasNodeRecord<{ referenceAssetIds?: string[] }> {
  return node?.type === "character_asset" || node?.type === "location_asset";
}

export function referencePurposeForNode(node: CanvasNodeRecord): AssetPurpose {
  return node.type === "location_asset" ? "location_reference" : "character_reference";
}

export function isReferenceBindableAsset(asset: AssetListItem): boolean {
  return asset.type === "image" && asset.previewKind === "image";
}

export function getNodeReferenceAssetIds(node: CanvasNodeRecord | undefined): string[] {
  if (!supportsNodeReferenceAssets(node)) {
    return [];
  }

  return stringArray(objectData(node.dataJson).referenceAssetIds);
}

export function buildNodeReferenceAssetUpdate(
  node: CanvasNodeRecord,
  referenceAssetIds: readonly string[],
): UpdateCanvasNodeInput {
  const dataJson = canvasJsonObject(node.dataJson);
  const nextReferenceIds = uniqueStrings(referenceAssetIds);
  if (nextReferenceIds.length > 0) {
    dataJson.referenceAssetIds = nextReferenceIds;
  } else {
    delete dataJson.referenceAssetIds;
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

function objectData(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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
