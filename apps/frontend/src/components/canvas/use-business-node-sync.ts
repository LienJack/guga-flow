import type {
  CanvasNodeRecord,
  UpdateCanvasNodeGeometryInput,
  UpdateCanvasNodeGeometryResult,
} from "@guga-flow/shared-types";

interface BusinessNodeGeometrySchedulerOptions {
  projectId: string;
  delayMs?: number;
  patchGeometry: (
    projectId: string,
    nodeId: string,
    input: UpdateCanvasNodeGeometryInput,
  ) => Promise<UpdateCanvasNodeGeometryResult>;
  onGeometrySaved?: (node: CanvasNodeRecord) => void;
  onError?: (message: string) => void;
}

export function createBusinessNodeGeometryScheduler({
  delayMs = 500,
  onError,
  onGeometrySaved,
  patchGeometry,
  projectId,
}: BusinessNodeGeometrySchedulerOptions) {
  const pending = new Map<string, UpdateCanvasNodeGeometryInput>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  async function flush() {
    if (disposed || pending.size === 0) {
      return;
    }

    const batch = Array.from(pending.entries());
    pending.clear();

    const results = await Promise.allSettled(
      batch.map(([nodeId, geometry]) => patchGeometry(projectId, nodeId, geometry)),
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        onGeometrySaved?.(result.value.node);
      }
    }
    const failed = results.find((result) => result.status === "rejected");
    if (failed) {
      const reason = failed.reason;
      onError?.(reason instanceof Error ? reason.message : "Unable to save node geometry");
    }
  }

  function clearTimer() {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function schedule(nodeId: string, geometry: UpdateCanvasNodeGeometryInput) {
    if (disposed) {
      return;
    }

    pending.set(nodeId, geometry);
    clearTimer();
    timer = setTimeout(() => {
      timer = undefined;
      void flush();
    }, delayMs);
  }

  function dispose() {
    disposed = true;
    pending.clear();
    clearTimer();
  }

  return {
    dispose,
    flush,
    schedule,
  };
}
