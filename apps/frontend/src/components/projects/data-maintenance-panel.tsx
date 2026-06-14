"use client";

import {
  ASSET_PURPOSES,
  UPLOADABLE_ASSET_MIME_TYPES,
  type AssetMaintenanceResult,
  type AssetPurpose,
  type UploadableAssetMimeType,
} from "@guga-flow/shared-types";
import { FolderInput, Link, RefreshCw, Trash2 } from "lucide-react";
import React, { useState } from "react";

import { cleanupAssets, importLocalAsset, importRemoteAsset } from "../../lib/api";
import { useI18n } from "../../lib/i18n";

const CLEANUP_CONFIRMATION = "DELETE_UNREFERENCED_ASSETS";

type PanelState = {
  busy?: "remote" | "local" | "dry-run" | "cleanup";
  error?: string;
  status?: string;
};

interface DataMaintenancePanelProps {
  projectId: string;
}

export function DataMaintenancePanel({ projectId }: DataMaintenancePanelProps) {
  const { t } = useI18n();
  const [remoteUrl, setRemoteUrl] = useState("");
  const [remotePurpose, setRemotePurpose] = useState<AssetPurpose>("uploaded");
  const [localStorageKey, setLocalStorageKey] = useState("");
  const [localMimeType, setLocalMimeType] = useState<UploadableAssetMimeType>("image/png");
  const [localFilename, setLocalFilename] = useState("");
  const [localPurpose, setLocalPurpose] = useState<AssetPurpose>("uploaded");
  const [cleanupConfirmation, setCleanupConfirmation] = useState("");
  const [cleanupResult, setCleanupResult] = useState<AssetMaintenanceResult | null>(null);
  const [state, setState] = useState<PanelState>({});

  async function handleRemoteImport() {
    setState({ busy: "remote" });
    try {
      const result = await importRemoteAsset(projectId, {
        url: remoteUrl.trim(),
        purpose: remotePurpose,
      });
      setState({
        status: t(result.deduplicated ? "maintenance.dedupedAsset" : "maintenance.importedAsset", {
          assetId: result.asset.id,
        }),
      });
      setRemoteUrl("");
    } catch (caught) {
      setState({ error: errorMessage(caught, t("maintenance.importFailed")) });
    }
  }

  async function handleLocalImport() {
    setState({ busy: "local" });
    try {
      const result = await importLocalAsset(projectId, {
        storageKey: localStorageKey.trim(),
        mimeType: localMimeType,
        originalFilename: localFilename.trim() || undefined,
        purpose: localPurpose,
      });
      setState({
        status: t(result.deduplicated ? "maintenance.dedupedAsset" : "maintenance.importedAsset", {
          assetId: result.asset.id,
        }),
      });
      setLocalStorageKey("");
      setLocalFilename("");
    } catch (caught) {
      setState({ error: errorMessage(caught, t("maintenance.importFailed")) });
    }
  }

  async function handleCleanupDryRun() {
    setState({ busy: "dry-run" });
    try {
      const result = await cleanupAssets(projectId, { dryRun: true });
      setCleanupResult(result);
      setState({ status: t("maintenance.dryRunComplete") });
    } catch (caught) {
      setState({ error: errorMessage(caught, t("maintenance.cleanupFailed")) });
    }
  }

  async function handleCleanup() {
    setState({ busy: "cleanup" });
    try {
      const result = await cleanupAssets(projectId, {
        dryRun: false,
        confirm: cleanupConfirmation,
      });
      setCleanupResult(result);
      setCleanupConfirmation("");
      setState({ status: t("maintenance.cleanupComplete") });
    } catch (caught) {
      setState({ error: errorMessage(caught, t("maintenance.cleanupFailed")) });
    }
  }

  const busy = state.busy !== undefined;
  const summary = cleanupResult?.summary;

  return (
    <section className="generation-panel" aria-label={t("maintenance.title")}>
      <div className="section-heading-row">
        <h2 className="panel-title small">
          <RefreshCw size={15} aria-hidden="true" />
          {t("maintenance.title")}
        </h2>
      </div>

      <div className="generation-field-grid">
        <label className="generation-field">
          <span>{t("maintenance.remoteUrl")}</span>
          <input
            type="url"
            value={remoteUrl}
            onChange={(event) => setRemoteUrl(event.target.value)}
          />
        </label>
        <label className="generation-field">
          <span>{t("maintenance.purpose")}</span>
          <select
            value={remotePurpose}
            onChange={(event) => setRemotePurpose(event.target.value as AssetPurpose)}
          >
            {ASSET_PURPOSES.map((purpose) => (
              <option key={purpose} value={purpose}>
                {purpose}
              </option>
            ))}
          </select>
        </label>
        <button
          className="tool-button"
          type="button"
          disabled={busy || !remoteUrl.trim()}
          onClick={() => void handleRemoteImport()}
        >
          <Link size={14} aria-hidden="true" />
          {t("maintenance.importUrl")}
        </button>
      </div>

      <div className="generation-field-grid">
        <label className="generation-field">
          <span>{t("maintenance.localStorageKey")}</span>
          <input
            value={localStorageKey}
            onChange={(event) => setLocalStorageKey(event.target.value)}
          />
        </label>
        <label className="generation-field">
          <span>{t("maintenance.mimeType")}</span>
          <select
            value={localMimeType}
            onChange={(event) => setLocalMimeType(event.target.value as UploadableAssetMimeType)}
          >
            {UPLOADABLE_ASSET_MIME_TYPES.map((mimeType) => (
              <option key={mimeType} value={mimeType}>
                {mimeType}
              </option>
            ))}
          </select>
        </label>
        <label className="generation-field">
          <span>{t("maintenance.originalFilename")}</span>
          <input
            value={localFilename}
            onChange={(event) => setLocalFilename(event.target.value)}
          />
        </label>
        <label className="generation-field">
          <span>{t("maintenance.purpose")}</span>
          <select
            value={localPurpose}
            onChange={(event) => setLocalPurpose(event.target.value as AssetPurpose)}
          >
            {ASSET_PURPOSES.map((purpose) => (
              <option key={purpose} value={purpose}>
                {purpose}
              </option>
            ))}
          </select>
        </label>
        <button
          className="tool-button"
          type="button"
          disabled={busy || !localStorageKey.trim()}
          onClick={() => void handleLocalImport()}
        >
          <FolderInput size={14} aria-hidden="true" />
          {t("maintenance.importLocal")}
        </button>
      </div>

      <div className="settings-actions-row">
        <button
          className="ghost-action compact"
          type="button"
          disabled={busy}
          onClick={() => void handleCleanupDryRun()}
        >
          <RefreshCw size={14} aria-hidden="true" />
          {t("maintenance.dryRun")}
        </button>
        <label className="generation-field">
          <span>{t("maintenance.confirmCleanup")}</span>
          <input
            value={cleanupConfirmation}
            onChange={(event) => setCleanupConfirmation(event.target.value)}
          />
        </label>
        <button
          className="ghost-action compact"
          type="button"
          disabled={busy || cleanupConfirmation !== CLEANUP_CONFIRMATION}
          onClick={() => void handleCleanup()}
        >
          <Trash2 size={14} aria-hidden="true" />
          {t("maintenance.deleteUnreferenced")}
        </button>
      </div>

      {summary ? (
        <>
          <dl className="settings-fact-grid">
            <div>
              <dt>{t("maintenance.totalAssets")}</dt>
              <dd>{summary.totalAssets}</dd>
            </div>
            <div>
              <dt>{t("maintenance.referencedAssets")}</dt>
              <dd>{summary.referencedAssets}</dd>
            </div>
            <div>
              <dt>{t("maintenance.unreferencedAssets")}</dt>
              <dd>{summary.unreferencedAssets}</dd>
            </div>
          </dl>
          <ul className="settings-breakdown-list">
            {(summary.deletedAssetIds ?? summary.candidateAssetIds).slice(0, 12).map((assetId) => (
              <li key={assetId}>
                <span>{assetId}</span>
                <strong>{summary.deletedAssetIds ? t("maintenance.deleted") : t("maintenance.candidate")}</strong>
              </li>
            ))}
          </ul>
        </>
      ) : null}
      {state.status ? <div className="agent-result" role="status"><span>{state.status}</span></div> : null}
      {state.error ? <p className="form-error" role="alert">{state.error}</p> : null}
    </section>
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
