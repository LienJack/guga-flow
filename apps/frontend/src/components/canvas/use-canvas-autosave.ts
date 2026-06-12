"use client";

import type { CanvasSaveStatus, CanvasSnapshotJson } from "@guga-flow/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  createCanvasAutosaveController,
  DEFAULT_CANVAS_AUTOSAVE_DEBOUNCE_MS,
  type CanvasAutosaveController,
} from "./canvas-autosave";

interface UseCanvasAutosaveOptions {
  projectId: string;
  debounceMs?: number;
  saveSnapshot: (projectId: string, snapshotJson: CanvasSnapshotJson) => Promise<unknown>;
}

export interface UseCanvasAutosaveResult {
  status: CanvasSaveStatus;
  error: string | null;
  scheduleSave: (snapshotJson: CanvasSnapshotJson) => void;
  retry: () => Promise<void>;
  flush: () => Promise<void>;
}

export function useCanvasAutosave({
  projectId,
  debounceMs = DEFAULT_CANVAS_AUTOSAVE_DEBOUNCE_MS,
  saveSnapshot,
}: UseCanvasAutosaveOptions): UseCanvasAutosaveResult {
  const [status, setStatus] = useState<CanvasSaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const saveSnapshotRef = useRef(saveSnapshot);
  const controllerRef = useRef<CanvasAutosaveController | null>(null);

  useEffect(() => {
    saveSnapshotRef.current = saveSnapshot;
  }, [saveSnapshot]);

  useEffect(() => {
    const controller = createCanvasAutosaveController({
      projectId,
      debounceMs,
      saveSnapshot: (currentProjectId, snapshotJson) =>
        saveSnapshotRef.current(currentProjectId, snapshotJson),
      onStatusChange: setStatus,
      onErrorChange: setError,
    });

    controllerRef.current = controller;
    setStatus("idle");
    setError(null);

    return () => {
      controller.dispose();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [debounceMs, projectId]);

  const scheduleSave = useCallback((snapshotJson: CanvasSnapshotJson) => {
    controllerRef.current?.schedule(snapshotJson);
  }, []);

  const retry = useCallback(() => controllerRef.current?.retry() ?? Promise.resolve(), []);

  const flush = useCallback(() => controllerRef.current?.flush() ?? Promise.resolve(), []);

  return {
    status,
    error,
    scheduleSave,
    retry,
    flush,
  };
}
