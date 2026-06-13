import type {
  CanvasNodeRecord,
  CreateEditorExportInput,
  EditorExportPreset,
  EditorExportRecord,
  EditorExportSendResult,
  EditorExportSortMode,
  GenerationJobRecord,
  GenerationQueueSummary,
  VideoNodeData,
} from "@guga-flow/shared-types";
import { EDITOR_EXPORT_PRESETS, EDITOR_EXPORT_SORT_MODES } from "@guga-flow/shared-types";
import { Archive, Download, RotateCcw, Send } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  createEditorExport,
  editorExportDownloadUrl,
  listEditorExports,
  sendEditorExportToLocalEditor,
} from "../../lib/api";
import { useI18n } from "../../lib/i18n";

type ExportableVideoNode = CanvasNodeRecord<VideoNodeData>;

interface EditorExportActionsProps {
  generationJobs: GenerationJobRecord[];
  initialExports?: EditorExportRecord[];
  initialSendResult?: EditorExportSendResult;
  projectId: string;
  videoNodes: ExportableVideoNode[];
  onGenerationChanged?(queueSummary?: GenerationQueueSummary): void;
}

const ACTIVE_STATUSES = new Set(["queued", "running", "provider_waiting"]);
const SORT_LABEL_KEYS: Record<EditorExportSortMode, string> = {
  shot_index: "export.shotIndex",
  canvas_x: "export.canvasX",
  manual: "export.manual",
};
const PRESET_LABEL_KEYS: Record<EditorExportPreset, string> = {
  standard_zip: "export.standardZip",
  gif_preview: "export.gifPreview",
  image_sequence: "export.imageSequence",
  hd_1080p: "export.hd1080p",
};

export function EditorExportActions({
  generationJobs,
  initialExports = [],
  initialSendResult,
  onGenerationChanged,
  projectId,
  videoNodes,
}: EditorExportActionsProps) {
  const { t } = useI18n();
  const [sortMode, setSortMode] = useState<EditorExportSortMode>("shot_index");
  const [exportPreset, setExportPreset] = useState<EditorExportPreset>("standard_zip");
  const [exports, setExports] = useState<EditorExportRecord[]>(initialExports);
  const [busy, setBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<EditorExportSendResult | undefined>(initialSendResult);
  const selectedVideoNodeIds = useMemo(() => videoNodes.map((node) => node.id), [videoNodes]);
  const generationSignature = generationJobs
    .filter((job) => job.operation === "editor_export")
    .map((job) => `${job.id}:${job.status}:${job.updatedAt}`)
    .join("|");

  useEffect(() => {
    let cancelled = false;
    listEditorExports(projectId)
      .then((result) => {
        if (!cancelled) {
          setExports(result.exports);
        }
      })
      .catch(() => {
        // Explicit create/send actions surface their own errors.
      });

    return () => {
      cancelled = true;
    };
  }, [generationSignature, projectId]);

  const matchingExport = exports.find((editorExport) =>
    idsEqual(editorExportSelectedVideoIds(editorExport), selectedVideoNodeIds) &&
    editorExportSortMode(editorExport) === sortMode &&
    editorExportPreset(editorExport) === exportPreset,
  );
  const activeJob = generationJobs.find(
    (job) =>
      job.operation === "editor_export" &&
      ACTIVE_STATUSES.has(job.status) &&
      idsEqual(editorExportJobSelectedVideoIds(job), selectedVideoNodeIds) &&
      editorExportJobSortMode(job) === sortMode &&
      editorExportJobPreset(job) === exportPreset,
  );

  if (!videoNodes.length) {
    return null;
  }

  async function handleCreateExport(sourceEditorExportId?: string) {
    setBusy(true);
    setError(null);
    setLastResult(null);
    setSendResult(undefined);

    try {
      const result = await createEditorExport(
        projectId,
        buildCreateEditorExportInput(videoNodes, sortMode, exportPreset, sourceEditorExportId),
      );
      setExports((current) => [result.export, ...current.filter((item) => item.id !== result.export.id)]);
      setLastResult(sourceEditorExportId ? t("export.revisionQueued") : t("export.exportQueued"));
      onGenerationChanged?.(result.queueSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("export.requestFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSendExport() {
    if (!matchingExport) {
      return;
    }
    setSendBusy(true);
    setError(null);
    setSendResult(undefined);

    try {
      const result = await sendEditorExportToLocalEditor(projectId, matchingExport.id);
      setExports((current) => current.map((item) => (item.id === result.export.id ? result.export : item)));
      setSendResult(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("export.sendFailed"));
    } finally {
      setSendBusy(false);
    }
  }

  const status = activeJob?.status ?? matchingExport?.status ?? "ready";
  const succeededExport = matchingExport?.status === "succeeded" ? matchingExport : undefined;
  const canQueue = !busy && !activeJob;

  return (
    <section className="generation-panel editor-export-panel" aria-label={t("export.aria")}>
      <div className="section-heading-row">
        <h3>{t("export.title")}</h3>
        <span className="status-chip">{statusLabel(status, t)}</span>
      </div>
      <div className="generation-status">
        {t(videoNodes.length === 1 ? "export.videoSelected" : "export.videosSelected", {
          count: videoNodes.length,
        })}
      </div>
      <div className="editor-export-sort-modes" role="group" aria-label={t("export.sortMode")}>
        {EDITOR_EXPORT_SORT_MODES.map((mode) => (
          <button
            key={mode}
            className={mode === sortMode ? "active" : ""}
            type="button"
            disabled={busy || Boolean(activeJob)}
            onClick={() => setSortMode(mode)}
          >
            {t(SORT_LABEL_KEYS[mode])}
          </button>
        ))}
      </div>
      <div className="editor-export-sort-modes" role="group" aria-label={t("export.preset")}>
        {EDITOR_EXPORT_PRESETS.map((preset) => (
          <button
            key={preset}
            className={preset === exportPreset ? "active" : ""}
            type="button"
            disabled={busy || Boolean(activeJob)}
            onClick={() => setExportPreset(preset)}
          >
            {t(PRESET_LABEL_KEYS[preset])}
          </button>
        ))}
      </div>
      {succeededExport ? (
        <p className="generation-status">
          {t("export.historyMatch", {
            preset: t(PRESET_LABEL_KEYS[exportPreset]),
            sortMode: t(SORT_LABEL_KEYS[sortMode]),
            id: succeededExport.id,
          })}
        </p>
      ) : null}
      <div className="generation-actions">
        <button
          className="primary-action compact"
          type="button"
          disabled={!canQueue}
          onClick={() => void handleCreateExport()}
        >
          <Archive size={15} aria-hidden="true" />
          {t("export.queueExport")}
        </button>
        {succeededExport ? (
          <button
            className="ghost-action compact"
            type="button"
            disabled={!canQueue}
            onClick={() => void handleCreateExport(succeededExport.id)}
          >
            <RotateCcw size={14} aria-hidden="true" />
            {t("export.queueRevision")}
          </button>
        ) : null}
        {succeededExport ? (
          <a
            className="ghost-action compact"
            href={editorExportDownloadUrl(projectId, succeededExport.id)}
            download
          >
            <Download size={14} aria-hidden="true" />
            {t("export.download")}
          </a>
        ) : null}
        {succeededExport ? (
          <button
            className="ghost-action compact"
            type="button"
            disabled={sendBusy}
            onClick={() => void handleSendExport()}
          >
            <Send size={14} aria-hidden="true" />
            {t("export.send")}
          </button>
        ) : null}
      </div>
      {lastResult ? <p className="generation-status">{lastResult}</p> : null}
      {sendResult?.sent ? (
        <p className="generation-status">
          {sendResult.editorUrl ? (
            <a href={sendResult.editorUrl} target="_blank" rel="noreferrer">
              {t("export.openLocalEditor")}
            </a>
          ) : (
            t("export.sentToLocalEditor")
          )}
        </p>
      ) : null}
      {sendResult && !sendResult.sent ? <p className="form-error">{sendResult.errorMessage}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

function statusLabel(
  status: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  return t(`status.${status}`);
}

export function isExportableVideoNode(
  node: CanvasNodeRecord | undefined,
): node is ExportableVideoNode {
  return node?.type === "video" && typeof objectData(node.dataJson).assetId === "string";
}

export function buildCreateEditorExportInput(
  videoNodes: readonly ExportableVideoNode[],
  sortMode: EditorExportSortMode,
  exportPreset: EditorExportPreset = "standard_zip",
  sourceEditorExportId?: string,
): CreateEditorExportInput {
  const input: CreateEditorExportInput = {
    videoNodeIds: videoNodes.map((node) => node.id),
    sortMode,
    exportPreset,
  };
  if (sourceEditorExportId) {
    input.sourceEditorExportId = sourceEditorExportId;
  }
  return input;
}

function editorExportSelectedVideoIds(editorExport: EditorExportRecord): string[] {
  const timeline = objectData(editorExport.timelineJson);
  const topLevelIds = stringArray(timeline.selectedVideoNodeIds);
  if (topLevelIds.length) {
    return topLevelIds;
  }
  return stringArray(objectData(timeline.metadata).selectedVideoNodeIds);
}

function editorExportSortMode(editorExport: EditorExportRecord): EditorExportSortMode | undefined {
  return normalizeSortMode(objectData(editorExport.timelineJson).sortMode);
}

function editorExportPreset(editorExport: EditorExportRecord): EditorExportPreset {
  return normalizeExportPreset(objectData(editorExport.timelineJson).exportPreset);
}

function editorExportJobSelectedVideoIds(job: GenerationJobRecord): string[] {
  return stringArray(objectData(job.inputJson).videoNodeIds);
}

function editorExportJobSortMode(job: GenerationJobRecord): EditorExportSortMode | undefined {
  return normalizeSortMode(objectData(job.inputJson).sortMode);
}

function editorExportJobPreset(job: GenerationJobRecord): EditorExportPreset {
  return normalizeExportPreset(objectData(job.inputJson).exportPreset);
}

function normalizeSortMode(value: unknown): EditorExportSortMode | undefined {
  return typeof value === "string" && EDITOR_EXPORT_SORT_MODES.includes(value as EditorExportSortMode)
    ? (value as EditorExportSortMode)
    : undefined;
}

function normalizeExportPreset(value: unknown): EditorExportPreset {
  return typeof value === "string" && EDITOR_EXPORT_PRESETS.includes(value as EditorExportPreset)
    ? (value as EditorExportPreset)
    : "standard_zip";
}

function objectData(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) && value.every((item): item is string => typeof item === "string")
    ? value
    : [];
}

function idsEqual(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
