"use client";

import type {
  AssetListItem,
  CanvasNodeRecord,
  CreateCreativeStoryboardResult,
  CreativeAgentMode,
  ImportStoryboardToCanvasResult,
} from "@guga-flow/shared-types";
import { Clapperboard, Image as ImageIcon, Plus, SlidersHorizontal, Sparkles, Upload, X } from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useState } from "react";

import {
  assetPreviewUrl,
  createCreativeStoryboard,
  importStoryboardToCanvas,
  listAssets,
  uploadAsset,
} from "../../lib/api";
import { summarizeStoryboardActionError, summarizeStoryboardImport } from "./storyboard-data";

interface CreativeAgentEntryProps {
  projectId: string;
  canvasNodes?: CanvasNodeRecord[];
  selectedNodeId?: string;
  initialAssets?: AssetListItem[];
  hasPriorStoryboardImport?: boolean;
  initialMode?: CreativeAgentMode;
  initialSendToCanvas?: boolean;
  onCreativeStoryboardCreated(result: CreateCreativeStoryboardResult): void;
  onStoryboardImported?: (result: ImportStoryboardToCanvasResult) => void;
}

const MODE_OPTIONS: Array<{ value: CreativeAgentMode; label: string }> = [
  { value: "novice", label: "Novice" },
  { value: "advanced", label: "Advanced" },
  { value: "professional", label: "Pro" },
];

export function CreativeAgentEntry({
  projectId,
  canvasNodes = [],
  selectedNodeId,
  initialAssets = [],
  hasPriorStoryboardImport = false,
  initialMode = "novice",
  initialSendToCanvas = true,
  onCreativeStoryboardCreated,
  onStoryboardImported,
}: CreativeAgentEntryProps) {
  const [idea, setIdea] = useState("");
  const [assets, setAssets] = useState<AssetListItem[]>(initialAssets);
  const [selectedReferenceAssetIds, setSelectedReferenceAssetIds] = useState<string[]>([]);
  const [useSelectedImageNode, setUseSelectedImageNode] = useState(false);
  const [referencePrompt, setReferencePrompt] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referenceFileInputKey, setReferenceFileInputKey] = useState(0);
  const [mode, setMode] = useState<CreativeAgentMode>(initialMode);
  const [audience, setAudience] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [targetDurationSeconds, setTargetDurationSeconds] = useState("45");
  const [sendToCanvas, setSendToCanvas] = useState(initialSendToCanvas);
  const [confirmNewVersion, setConfirmNewVersion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showDirectionFields = mode !== "novice";
  const selectedImageSeed = useMemo(
    () => getImageNodeStorySeedCandidate(canvasNodes, selectedNodeId),
    [canvasNodes, selectedNodeId],
  );
  const imageAssets = assets.filter(isStorySeedAsset);
  const selectedReferenceAssets = selectedReferenceAssetIds
    .map((assetId) => imageAssets.find((asset) => asset.id === assetId))
    .filter((asset): asset is AssetListItem => Boolean(asset));
  const availableReferenceAssets = imageAssets.filter(
    (asset) => !selectedReferenceAssetIds.includes(asset.id),
  );

  useEffect(() => {
    let ignore = false;
    listAssets(projectId)
      .then((result) => {
        if (!ignore) {
          setAssets(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load reference images");
        }
      });

    return () => {
      ignore = true;
    };
  }, [projectId]);

  useEffect(() => {
    setUseSelectedImageNode(Boolean(selectedImageSeed));
  }, [selectedImageSeed?.nodeId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requiresCreativeCanvasImportConfirmation(hasPriorStoryboardImport, sendToCanvas) && !confirmNewVersion) {
      setConfirmNewVersion(true);
      setError(null);
      setNotice("Confirm new canvas version");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await createCreativeStoryboard(projectId, {
        idea,
        mode,
        audience: showDirectionFields ? audience : undefined,
        stylePrompt: showDirectionFields ? stylePrompt : undefined,
        targetDurationSeconds:
          showDirectionFields && targetDurationSeconds.trim()
            ? Number(targetDurationSeconds)
            : undefined,
        referenceAssetIds: selectedReferenceAssetIds,
        referenceImageNodeIds:
          useSelectedImageNode && selectedImageSeed ? [selectedImageSeed.nodeId] : undefined,
        referencePrompt: referencePrompt.trim() || undefined,
      });
      onCreativeStoryboardCreated(result);
      setConfirmNewVersion(false);

      if (sendToCanvas) {
        const importResult = await importStoryboardToCanvas(projectId, {
          novelDocumentId: result.novel.id,
          storyboardDraftId: result.draft.id,
          duplicatePolicy: "new_version",
        });
        onStoryboardImported?.(importResult);
        setNotice(summarizeStoryboardImport(importResult.summary));
      } else {
        setNotice("Storyboard draft created");
      }
    } catch (actionError) {
      setError(summarizeStoryboardActionError(actionError));
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadReference() {
    if (!referenceFile || referenceFile.size === 0) {
      setError("Choose an image to upload");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const uploaded = await uploadAsset(projectId, { file: referenceFile, purpose: "uploaded" });
      setAssets((current) => [uploaded, ...current.filter((asset) => asset.id !== uploaded.id)]);
      if (!isStorySeedAsset(uploaded)) {
        setError("Uploaded file is not an image asset");
        return;
      }
      setSelectedReferenceAssetIds((current) => uniqueStrings([uploaded.id, ...current]));
      setReferenceFile(null);
      setReferenceFileInputKey((current) => current + 1);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload reference image");
    } finally {
      setBusy(false);
    }
  }

  function addReferenceAsset(assetId: string) {
    setSelectedReferenceAssetIds((current) => uniqueStrings([...current, assetId]));
    setConfirmNewVersion(false);
  }

  function removeReferenceAsset(assetId: string) {
    setSelectedReferenceAssetIds((current) => current.filter((id) => id !== assetId));
    setConfirmNewVersion(false);
  }

  return (
    <section className="creative-agent-entry" aria-label="Creative agent entry">
      <div className="section-heading-row">
        <h2 className="panel-title small">Creative brief</h2>
        <Sparkles size={15} aria-hidden="true" />
      </div>

      <form className="creative-agent-form" onSubmit={handleSubmit}>
        <div className="creative-mode-control" aria-label="Creative mode">
          {MODE_OPTIONS.map((option) => (
            <button
              className={`creative-mode-button${mode === option.value ? " active" : ""}`}
              key={option.value}
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => {
                setMode(option.value);
                setConfirmNewVersion(false);
              }}
            >
              {option.value === "novice" ? (
                <Sparkles size={13} aria-hidden="true" />
              ) : option.value === "advanced" ? (
                <SlidersHorizontal size={13} aria-hidden="true" />
              ) : (
                <Clapperboard size={13} aria-hidden="true" />
              )}
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        <label className="field-label">
          <span>Idea</span>
          <textarea
            name="creative-idea"
            required
            rows={3}
            value={idea}
            placeholder="A rainy neon chase begins at the last subway train"
            onChange={(event) => {
              setIdea(event.target.value);
              setConfirmNewVersion(false);
            }}
          />
        </label>

        {showDirectionFields ? (
          <div className="creative-direction-grid">
            <label className="field-label">
              <span>Audience</span>
              <input
                name="creative-audience"
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
              />
            </label>
            <label className="field-label">
              <span>Style</span>
              <input
                name="creative-style"
                value={stylePrompt}
                onChange={(event) => setStylePrompt(event.target.value)}
              />
            </label>
            <label className="field-label">
              <span>Seconds</span>
              <input
                name="creative-duration"
                inputMode="numeric"
                type="number"
                min={15}
                max={180}
                value={targetDurationSeconds}
                onChange={(event) => setTargetDurationSeconds(event.target.value)}
              />
            </label>
          </div>
        ) : null}

        <div className="creative-reference-panel">
          <div className="panel-heading compact">
            <h2>Reference image</h2>
            <span>{selectedReferenceAssetIds.length + (useSelectedImageNode && selectedImageSeed ? 1 : 0)}</span>
          </div>

          {selectedImageSeed ? (
            <label className="generation-checkbox">
              <input
                name="creative-use-selected-image-node"
                type="checkbox"
                checked={useSelectedImageNode}
                onChange={(event) => {
                  setUseSelectedImageNode(event.target.checked);
                  setConfirmNewVersion(false);
                }}
              />
              <span>{selectedImageSeed.title}</span>
            </label>
          ) : null}

          <div className="creative-reference-upload">
            <input
              key={referenceFileInputKey}
              name="reference-file"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)}
            />
            <button
              className="ghost-action compact"
              type="button"
              onClick={() => void handleUploadReference()}
              disabled={busy}
            >
              <Upload size={15} aria-hidden="true" />
              Upload
            </button>
          </div>

          {selectedReferenceAssets.length > 0 ? (
            <ul className="reference-asset-list">
              {selectedReferenceAssets.map((asset) => (
                <li className="reference-asset-row" key={asset.id}>
                  <img src={assetPreviewUrl(projectId, asset.id)} alt="" />
                  <span>{asset.originalFilename ?? asset.id}</span>
                  <button
                    className="icon-action danger"
                    type="button"
                    title="Remove reference"
                    onClick={() => removeReferenceAsset(asset.id)}
                    disabled={busy}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {availableReferenceAssets.length > 0 ? (
            <ul className="reference-candidate-list">
              {availableReferenceAssets.slice(0, 4).map((asset) => (
                <li className="reference-candidate-row" key={asset.id}>
                  <span>{asset.originalFilename ?? asset.id}</span>
                  <button
                    className="ghost-action compact"
                    type="button"
                    onClick={() => addReferenceAsset(asset.id)}
                    disabled={busy}
                  >
                    <Plus size={14} aria-hidden="true" />
                    Add
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <label className="field-label">
            <span>Seed note</span>
            <input
              name="creative-reference-prompt"
              value={referencePrompt}
              onChange={(event) => {
                setReferencePrompt(event.target.value);
                setConfirmNewVersion(false);
              }}
            />
          </label>
        </div>

        <label className="generation-checkbox">
          <input
            name="creative-send-to-canvas"
            type="checkbox"
            checked={sendToCanvas}
            onChange={(event) => {
              setSendToCanvas(event.target.checked);
              setConfirmNewVersion(false);
            }}
          />
          <span>Canvas draft</span>
        </label>

        <button className="primary-action compact" type="submit" disabled={busy}>
          <Sparkles size={15} aria-hidden="true" />
          {confirmNewVersion ? "Confirm version" : "Create draft"}
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}
    </section>
  );
}

export function requiresCreativeCanvasImportConfirmation(
  hasPriorStoryboardImport: boolean,
  sendToCanvas: boolean,
): boolean {
  return hasPriorStoryboardImport && sendToCanvas;
}

export interface ImageNodeStorySeedCandidate {
  nodeId: string;
  assetId: string;
  title: string;
}

export function getImageNodeStorySeedCandidate(
  nodes: readonly CanvasNodeRecord[],
  selectedNodeId: string | undefined,
): ImageNodeStorySeedCandidate | undefined {
  const node = nodes.find((candidate) => candidate.id === selectedNodeId);
  if (!node || node.type !== "image") {
    return undefined;
  }
  const assetId = dataString(node.dataJson, "assetId");
  if (!assetId) {
    return undefined;
  }
  return {
    nodeId: node.id,
    assetId,
    title: node.title?.trim() || assetId,
  };
}

export function isStorySeedAsset(asset: AssetListItem): boolean {
  return asset.type === "image" && asset.previewKind === "image";
}

function uniqueStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function dataString(value: unknown, key: string): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : undefined;
}
