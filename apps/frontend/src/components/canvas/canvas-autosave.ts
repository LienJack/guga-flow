import type { CanvasSaveStatus, CanvasSnapshotJson } from "@guga-flow/shared-types";

export const DEFAULT_CANVAS_AUTOSAVE_DEBOUNCE_MS = 750;

export interface CanvasAutosaveControllerOptions {
  projectId: string;
  debounceMs?: number;
  saveSnapshot: (projectId: string, snapshotJson: CanvasSnapshotJson) => Promise<unknown>;
  onStatusChange?: (status: CanvasSaveStatus) => void;
  onErrorChange?: (message: string | null) => void;
}

export interface CanvasAutosaveController {
  schedule(snapshotJson: CanvasSnapshotJson): void;
  retry(): Promise<void>;
  flush(): Promise<void>;
  reset(projectId: string): void;
  dispose(): void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to save canvas";
}

export function createCanvasAutosaveController(
  options: CanvasAutosaveControllerOptions,
): CanvasAutosaveController {
  const debounceMs = options.debounceMs ?? DEFAULT_CANVAS_AUTOSAVE_DEBOUNCE_MS;
  let projectId = options.projectId;
  let latestSnapshot: CanvasSnapshotJson | undefined;
  let failedSnapshot: CanvasSnapshotJson | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;
  let activeRunId = 0;
  let currentError: string | null = null;
  let inFlightSnapshot: CanvasSnapshotJson | undefined;

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function setStatus(status: CanvasSaveStatus) {
    options.onStatusChange?.(status);
  }

  function setError(message: string | null) {
    currentError = message;
    options.onErrorChange?.(message);
  }

  async function saveNow(snapshotJson: CanvasSnapshotJson): Promise<void> {
    clearTimer();
    const runId = activeRunId + 1;
    activeRunId = runId;
    inFlightSnapshot = snapshotJson;
    setStatus("saving");
    if (currentError !== null) {
      setError(null);
    }

    try {
      await options.saveSnapshot(projectId, snapshotJson);
      if (disposed || runId !== activeRunId || latestSnapshot !== snapshotJson) {
        return;
      }
      failedSnapshot = undefined;
      latestSnapshot = undefined;
      setStatus("saved");
    } catch (error) {
      if (disposed || runId !== activeRunId || latestSnapshot !== snapshotJson) {
        return;
      }
      failedSnapshot = snapshotJson;
      setError(errorMessage(error));
      setStatus("failed");
    } finally {
      if (inFlightSnapshot === snapshotJson) {
        inFlightSnapshot = undefined;
      }
    }
  }

  return {
    schedule(snapshotJson) {
      if (disposed) {
        return;
      }
      latestSnapshot = snapshotJson;
      clearTimer();
      timer = setTimeout(() => {
        void saveNow(snapshotJson);
      }, debounceMs);
    },

    retry() {
      if (disposed) {
        return Promise.resolve();
      }

      const snapshotJson = latestSnapshot ?? failedSnapshot;
      if (snapshotJson === undefined) {
        return Promise.resolve();
      }

      return saveNow(snapshotJson);
    },

    flush() {
      if (disposed || latestSnapshot === undefined) {
        return Promise.resolve();
      }

      return saveNow(latestSnapshot);
    },

    reset(nextProjectId) {
      projectId = nextProjectId;
      latestSnapshot = undefined;
      failedSnapshot = undefined;
      activeRunId += 1;
      clearTimer();
      if (currentError !== null) {
        setError(null);
      }
      setStatus("idle");
    },

    dispose() {
      const pendingSnapshot = latestSnapshot;
      disposed = true;
      activeRunId += 1;
      clearTimer();
      if (pendingSnapshot !== undefined && pendingSnapshot !== inFlightSnapshot) {
        void options.saveSnapshot(projectId, pendingSnapshot).catch(() => undefined);
      }
    },
  };
}
