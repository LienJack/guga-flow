import type {
  CanvasNodeRecord,
  GenerationJobRecord,
  GenerationQueueSummary,
  ImageNodeData,
} from "@guga-flow/shared-types";
import { ImagePlus, RotateCcw, Video } from "lucide-react";
import React, { useMemo, useState } from "react";

import { createGenerationJob, retryGenerationJob } from "../../lib/api";

interface GenerationActionsProps {
  generationJobs: GenerationJobRecord[];
  node: CanvasNodeRecord;
  projectId: string;
  onGenerationChanged?(queueSummary?: GenerationQueueSummary): void;
}

const ACTIVE_STATUSES = new Set(["queued", "running", "provider_waiting"]);

export function GenerationActions({
  generationJobs,
  node,
  onGenerationChanged,
  projectId,
}: GenerationActionsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const action = generationActionForNode(node);
  const nodeJobs = useMemo(
    () => generationJobs.filter((job) => job.sourceNodeId === node.id),
    [generationJobs, node.id],
  );
  const activeJob = nodeJobs.find((job) => ACTIVE_STATUSES.has(job.status));
  const failedJob = nodeJobs.find((job) => job.status === "failed");

  if (!action) {
    return null;
  }

  async function handleGenerate() {
    if (!action) {
      return;
    }
    setBusy(true);
    setError(null);
    setLastResult(null);

    try {
      const result = await createGenerationJob(projectId, {
        operation: action.operation,
        sourceNodeId: node.id,
      });
      setLastResult("Queued");
      onGenerationChanged?.(result.queueSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation request failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRetry(jobId: string) {
    setBusy(true);
    setError(null);
    setLastResult(null);

    try {
      const result = await retryGenerationJob(projectId, jobId);
      setLastResult("Retry queued");
      onGenerationChanged?.(result.queueSummary);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Generation retry failed");
    } finally {
      setBusy(false);
    }
  }

  const Icon = action.icon;

  return (
    <section className="generation-panel" aria-label="Generation">
      <div className="section-heading-row">
        <h3>Generation</h3>
        {activeJob ? <span className="status-chip">{activeJob.status}</span> : null}
      </div>
      <div className="generation-actions">
        <button
          className="primary-action compact"
          type="button"
          disabled={busy || Boolean(activeJob)}
          onClick={() => void handleGenerate()}
        >
          <Icon size={15} aria-hidden="true" />
          {action.label}
        </button>
        {failedJob ? (
          <button
            className="ghost-action compact"
            type="button"
            disabled={busy}
            onClick={() => void handleRetry(failedJob.id)}
          >
            <RotateCcw size={14} aria-hidden="true" />
            Retry
          </button>
        ) : null}
      </div>
      {lastResult ? <p className="generation-status">{lastResult}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

function generationActionForNode(node: CanvasNodeRecord):
  | {
      icon: typeof ImagePlus;
      label: string;
      operation: "shot_to_image" | "image_to_video";
    }
  | undefined {
  if (node.type === "shot") {
    return {
      icon: ImagePlus,
      label: "Generate Image",
      operation: "shot_to_image",
    };
  }

  if (node.type === "image" && typeof (node.dataJson as ImageNodeData | undefined)?.assetId === "string") {
    return {
      icon: Video,
      label: "Generate Video",
      operation: "image_to_video",
    };
  }

  return undefined;
}
