"use client";

import type { AssetDetail, AssetListItem, AssetPurpose } from "@guga-flow/shared-types";
import { FileText, Image as ImageIcon, Trash2, Upload, Video } from "lucide-react";
import React, { FormEvent, useEffect, useState } from "react";

import { assetPreviewUrl, deleteAsset, getAsset, listAssets, uploadAsset } from "../../lib/api";

interface AssetLibraryProps {
  projectId: string;
  initialAssets?: AssetListItem[];
}

function formatBytes(value?: number): string {
  if (!value) {
    return "0 B";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${Math.round(value / 102.4) / 10} KB`;
  }
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}

function AssetTypeIcon({ previewKind }: { previewKind: AssetListItem["previewKind"] }) {
  if (previewKind === "image") {
    return <ImageIcon size={15} aria-hidden="true" />;
  }
  if (previewKind === "video") {
    return <Video size={15} aria-hidden="true" />;
  }
  return <FileText size={15} aria-hidden="true" />;
}

export function AssetLibrary({ projectId, initialAssets = [] }: AssetLibraryProps) {
  const [assets, setAssets] = useState<AssetListItem[]>(initialAssets);
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [purpose, setPurpose] = useState<AssetPurpose>("uploaded");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;

    listAssets(projectId)
      .then((result) => {
        if (!ignore) {
          setAssets(result);
          setSelectedAsset((current) => {
            if (!current) {
              return null;
            }

            const refreshed = result.find((asset) => asset.id === current.id);
            return refreshed ? { ...current, ...refreshed } : null;
          });
        }
      })
      .catch((loadError: unknown) => {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load assets");
        }
      });

    return () => {
      ignore = true;
    };
  }, [projectId]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadAsset(projectId, { file, purpose });
      setAssets((current) => [uploaded, ...current]);
      setSelectedAsset(uploaded);
      form.reset();

      if (uploaded.previewKind === "text") {
        try {
          setSelectedAsset(await getAsset(projectId, uploaded.id));
        } catch {
          setError("Uploaded asset saved, but text preview could not be loaded");
        }
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload asset");
    } finally {
      setBusy(false);
    }
  }

  async function handleSelect(asset: AssetListItem) {
    setError(null);
    try {
      const detail = await getAsset(projectId, asset.id);
      setSelectedAsset(detail);
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Unable to load asset");
    }
  }

  async function handleDelete(assetId: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteAsset(projectId, assetId);
      setAssets((current) => current.filter((asset) => asset.id !== assetId));
      if (selectedAsset?.id === assetId) {
        setSelectedAsset(null);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete asset");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="asset-library" aria-label="Asset library">
      <div className="panel-heading compact">
        <h2>Assets</h2>
        <span>{assets.length}</span>
      </div>
      <form className="asset-upload" onSubmit={handleUpload}>
        <input
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,text/plain,text/markdown,.md"
        />
        <select
          name="purpose"
          value={purpose}
          onChange={(event) => setPurpose(event.target.value as AssetPurpose)}
        >
          <option value="uploaded">Uploaded</option>
          <option value="character_reference">Character ref</option>
          <option value="location_reference">Location ref</option>
          <option value="style_reference">Style ref</option>
        </select>
        <button className="primary-action compact" type="submit" disabled={busy}>
          <Upload size={15} aria-hidden="true" />
          Upload
        </button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}

      {assets.length === 0 ? (
        <div className="empty-state small">
          <strong>No assets</strong>
          <span>Upload references or source media.</span>
        </div>
      ) : (
        <ul className="asset-list">
          {assets.map((asset) => (
            <li className="asset-row" key={asset.id}>
              <button
                className={`asset-select ${selectedAsset?.id === asset.id ? "active" : ""}`}
                type="button"
                onClick={() => void handleSelect(asset)}
              >
                <AssetTypeIcon previewKind={asset.previewKind} />
                <span>{asset.originalFilename ?? asset.id}</span>
                <small>{formatBytes(asset.sizeBytes)}</small>
              </button>
              <button
                className="icon-action danger"
                type="button"
                title="Delete asset"
                onClick={() => void handleDelete(asset.id)}
                disabled={busy}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedAsset ? (
        <div className="asset-preview">
          <strong>{selectedAsset.originalFilename ?? selectedAsset.id}</strong>
          {selectedAsset.previewKind === "image" ? (
            <img src={assetPreviewUrl(projectId, selectedAsset.id)} alt="" />
          ) : null}
          {selectedAsset.previewKind === "video" ? (
            <video src={assetPreviewUrl(projectId, selectedAsset.id)} controls />
          ) : null}
          {selectedAsset.previewKind === "text" ? (
            <pre>{selectedAsset.textPreview ?? "Text preview unavailable"}</pre>
          ) : null}
          {selectedAsset.previewKind === "metadata" ? (
            <p>{selectedAsset.mimeType}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
