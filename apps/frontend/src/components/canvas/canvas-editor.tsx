"use client";

import type { CanvasSaveStatus, CanvasSnapshotJson } from "@guga-flow/shared-types";
import { Maximize2, RotateCcw } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, type Editor } from "tldraw";

import { getProjectCanvas, saveCanvasSnapshot } from "../../lib/api";
import { businessNodeShapeUtils } from "./business-node-shape-utils";
import { useCanvasAutosave } from "./use-canvas-autosave";

type TldrawSnapshot = Parameters<Editor["loadSnapshot"]>[0];

interface CanvasEditorProps {
  projectId: string;
  onSaveStatusChange?: (status: CanvasSaveStatus, error: string | null) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load canvas";
}

function hasPersistedSnapshot(snapshotJson: CanvasSnapshotJson): boolean {
  return (
    typeof snapshotJson === "object" &&
    snapshotJson !== null &&
    !Array.isArray(snapshotJson) &&
    Object.keys(snapshotJson).length > 0
  );
}

function editorSnapshotToJson(editor: Editor): CanvasSnapshotJson {
  return editor.getSnapshot() as unknown as CanvasSnapshotJson;
}

export function CanvasEditor({ projectId, onSaveStatusChange }: CanvasEditorProps) {
  const [snapshotJson, setSnapshotJson] = useState<CanvasSnapshotJson | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const editorRef = useRef<Editor | null>(null);
  const loadRequestIdRef = useRef(0);

  const autosave = useCanvasAutosave({
    projectId,
    saveSnapshot: async (currentProjectId, nextSnapshotJson) => {
      await saveCanvasSnapshot(currentProjectId, { snapshotJson: nextSnapshotJson });
    },
  });
  const {
    error: autosaveError,
    retry: retryAutosave,
    scheduleSave,
    status: autosaveStatus,
  } = autosave;

  const loadCanvas = useCallback(() => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    setLoadError(null);
    setSnapshotJson(null);

    getProjectCanvas(projectId)
      .then((result) => {
        if (loadRequestIdRef.current !== requestId) {
          return;
        }
        setSnapshotJson(result.canvasDocument.snapshotJson);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (loadRequestIdRef.current !== requestId) {
          return;
        }
        setLoadError(errorMessage(error));
        setLoading(false);
      });
  }, [projectId]);

  useEffect(() => {
    loadCanvas();

    return () => {
      loadRequestIdRef.current += 1;
    };
  }, [loadCanvas]);

  useEffect(() => {
    if (loadError) {
      onSaveStatusChange?.("failed", loadError);
      return;
    }
    onSaveStatusChange?.(autosaveStatus, autosaveError);
  }, [autosaveError, autosaveStatus, loadError, onSaveStatusChange]);

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      if (snapshotJson && hasPersistedSnapshot(snapshotJson)) {
        editor.loadSnapshot(snapshotJson as unknown as TldrawSnapshot);
      }

      const removeListener = editor.store.listen(
        () => {
          scheduleSave(editorSnapshotToJson(editor));
        },
        { source: "user", scope: "document" },
      );

      return () => {
        removeListener();
        if (editorRef.current === editor) {
          editorRef.current = null;
        }
      };
    },
    [scheduleSave, snapshotJson],
  );

  const handleFitToContent = useCallback(() => {
    editorRef.current?.zoomToFit();
  }, []);

  if (loading) {
    return (
      <div className="canvas-editor-state" role="status">
        Loading canvas
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="canvas-editor-state error" role="alert">
        <strong>Canvas unavailable</strong>
        <span>{loadError}</span>
        <button className="ghost-action" type="button" onClick={loadCanvas}>
          <RotateCcw size={15} aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="canvas-editor-shell">
      <Tldraw onMount={handleMount} shapeUtils={businessNodeShapeUtils} autoFocus />
      <div className="canvas-editor-controls" aria-label="Canvas controls">
        <button
          className="canvas-control-button"
          type="button"
          title="Fit to content"
          onClick={handleFitToContent}
        >
          <Maximize2 size={16} aria-hidden="true" />
        </button>
      </div>
      {autosaveStatus === "failed" ? (
        <div className="canvas-save-error" role="alert">
          <span>{autosaveError ?? "Canvas save failed"}</span>
          <button className="ghost-action" type="button" onClick={() => void retryAutosave()}>
            <RotateCcw size={15} aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : null}
    </div>
  );
}
