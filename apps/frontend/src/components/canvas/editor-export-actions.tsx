import type {
  CanvasNodeRecord,
  CreateEditorExportInput,
  EditorExportRecord,
  EditorExportSendResult,
  EditorExportSortMode,
  GenerationJobRecord,
  GenerationQueueSummary,
  VideoNodeData,
} from "@guga-flow/shared-types";
import { EDITOR_EXPORT_SORT_MODES } from "@guga-flow/shared-types";
import { Archive, Download, Send } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  createEditorExport,
  editorExportDownloadUrl,
  listEditorExports,
  sendEditorExportToLocalEditor,
} from "../../lib/api";

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
const SORT_LABELS: Record<EditorExportSortMode, string> = {
  shot_index: "Shot Index",
  canvas_x: "Canvas X",
  manual: "Manual",
};

export function EditorExportActions({
  generationJobs,
  initialExports = [],
  initialSendResult,
  onGenerationChanged,
  projectId,
  videoNodes,
}: EditorExportActionsProps) {
  const [sortMode, setSortMode] = useState<EditorExportSortMode>("shot_index");
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
    editorExportSortMode(editorExport) === sortMode,
  );
  const activeJob = generationJobs.find(
    (job) =>
      job.operation === "editor_export" &&
      ACTIVE_STATUSES.has(job.status) &&
      idsEqual(editorExportJobSelectedVideoIds(job), selectedVideoNodeIds) &&
      editorExportJobSortMode(job) === sortMode,
  );

  if (!videoNodes.length) {
    return null;
  }

  async function handleCreateExport() {
    setBusy(true);
    setError(null);
    setLastResult(null);
    setSendResult(undefined);

    try {
      const result = await createEditorExport(
        projectId,
        buildCreateEditorExportInput(videoNodes, sortMode),
      );
      setExports((current) => [result.export, ...current.filter((item) => item.id !== result.export.id)]);
      setLastResult("Export queued");
      onGenerationChanged?.(result.queueSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Editor export request failed");
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
      setError(caught instanceof Error ? caught.message : "Local editor send failed");
    } finally {
      setSendBusy(false);
    }
  }

  const status = activeJob?.status ?? matchingExport?.status ?? "ready";
  const succeededExport = matchingExport?.status === "succeeded" ? matchingExport : undefined;
  const canQueue = !busy && !activeJob;

  return (
    <section className="generation-panel editor-export-panel" aria-label="Editor export">
      <div className="section-heading-row">
        <h3>Editor Export</h3>
        <span className="status-chip">{status}</span>
      </div>
      <div className="generation-status">
        {videoNodes.length} video{videoNodes.length === 1 ? "" : "s"} selected
      </div>
      <div className="editor-export-sort-modes" role="group" aria-label="Sort mode">
        {EDITOR_EXPORT_SORT_MODES.map((mode) => (
          <button
            key={mode}
            className={mode === sortMode ? "active" : ""}
            type="button"
            disabled={busy || Boolean(activeJob)}
            onClick={() => setSortMode(mode)}
          >
            {SORT_LABELS[mode]}
          </button>
        ))}
      </div>
      <div className="generation-actions">
        <button
          className="primary-action compact"
          type="button"
          disabled={!canQueue}
          onClick={() => void handleCreateExport()}
        >
          <Archive size={15} aria-hidden="true" />
          Queue Export
        </button>
        {succeededExport ? (
          <a
            className="ghost-action compact"
            href={editorExportDownloadUrl(projectId, succeededExport.id)}
            download
          >
            <Download size={14} aria-hidden="true" />
            Download
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
            Send
          </button>
        ) : null}
      </div>
      {lastResult ? <p className="generation-status">{lastResult}</p> : null}
      {sendResult?.sent ? (
        <p className="generation-status">
          {sendResult.editorUrl ? (
            <a href={sendResult.editorUrl} target="_blank" rel="noreferrer">
              Open local editor
            </a>
          ) : (
            "Sent to local editor"
          )}
        </p>
      ) : null}
      {sendResult && !sendResult.sent ? <p className="form-error">{sendResult.errorMessage}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

export function isExportableVideoNode(
  node: CanvasNodeRecord | undefined,
): node is ExportableVideoNode {
  return node?.type === "video" && typeof objectData(node.dataJson).assetId === "string";
}

export function buildCreateEditorExportInput(
  videoNodes: readonly ExportableVideoNode[],
  sortMode: EditorExportSortMode,
): CreateEditorExportInput {
  return {
    videoNodeIds: videoNodes.map((node) => node.id),
    sortMode,
  };
}

function editorExportSelectedVideoIds(editorExport: EditorExportRecord): string[] {
  return stringArray(objectData(editorExport.timelineJson).selectedVideoNodeIds);
}

function editorExportSortMode(editorExport: EditorExportRecord): EditorExportSortMode | undefined {
  return normalizeSortMode(objectData(editorExport.timelineJson).sortMode);
}

function editorExportJobSelectedVideoIds(job: GenerationJobRecord): string[] {
  return stringArray(objectData(job.inputJson).videoNodeIds);
}

function editorExportJobSortMode(job: GenerationJobRecord): EditorExportSortMode | undefined {
  return normalizeSortMode(objectData(job.inputJson).sortMode);
}

function normalizeSortMode(value: unknown): EditorExportSortMode | undefined {
  return typeof value === "string" && EDITOR_EXPORT_SORT_MODES.includes(value as EditorExportSortMode)
    ? (value as EditorExportSortMode)
    : undefined;
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
