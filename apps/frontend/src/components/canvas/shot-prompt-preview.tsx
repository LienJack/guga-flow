"use client";

import type { CanvasEdgeRecord, CanvasNodeRecord, ShotPromptCompositionResult } from "@guga-flow/shared-types";
import { RefreshCw } from "lucide-react";
import React, { useEffect, useState } from "react";

import { composeShotPrompt } from "../../lib/api";
import { getPromptPreviewChannels } from "./prompt-preview-data";

interface ShotPromptPreviewProps {
  projectId: string;
  node: CanvasNodeRecord;
  refreshKey?: string;
  initialResult?: ShotPromptCompositionResult;
}

export function ShotPromptPreview({
  initialResult,
  node,
  projectId,
  refreshKey = "",
}: ShotPromptPreviewProps) {
  const [result, setResult] = useState<ShotPromptCompositionResult | undefined>(initialResult);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualRefresh, setManualRefresh] = useState(0);
  const isShot = node.type === "shot";

  useEffect(() => {
    if (!isShot) {
      setResult(undefined);
      return;
    }

    let ignore = false;
    setLoading(true);
    setError(null);
    composeShotPrompt(projectId, node.id)
      .then((nextResult) => {
        if (!ignore) {
          setResult(nextResult);
        }
      })
      .catch((composeError: unknown) => {
        if (!ignore) {
          setError(composeError instanceof Error ? composeError.message : "Unable to compose prompt");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [isShot, manualRefresh, node.id, projectId, refreshKey]);

  if (!isShot) {
    return null;
  }

  const channels = getPromptPreviewChannels(result);

  return (
    <section className="shot-prompt-preview" aria-label="Shot prompt preview">
      <div className="panel-heading compact">
        <h2>Prompt preview</h2>
        <button
          className="icon-action"
          type="button"
          title="Refresh prompt"
          onClick={() => setManualRefresh((current) => current + 1)}
          disabled={loading}
        >
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      </div>

      {loading ? (
        <div className="empty-state small">
          <strong>Composing prompt</strong>
          <span>{node.title ?? node.id}</span>
        </div>
      ) : null}
      {error ? <p className="form-error">{error}</p> : null}
      {!loading && !error && channels.length === 0 ? (
        <div className="empty-state small">
          <strong>No prompt preview</strong>
          <span>{node.title ?? node.id}</span>
        </div>
      ) : null}

      {channels.map((channel) => (
        <article className="prompt-channel" key={channel.channel}>
          <div className="prompt-channel-heading">
            <strong>{channel.title}</strong>
            <span>{channel.referenceAssetLabel}</span>
          </div>
          <pre className="prompt-preview-text">
            {channel.hasPrompt ? channel.prompt : "No prompt text"}
          </pre>
          {channel.negativePrompt ? (
            <div className="prompt-negative">
              <strong>Negative</strong>
              <pre>{channel.negativePrompt}</pre>
            </div>
          ) : null}
          <p className="prompt-context-status">{channel.missingContextLabel}</p>
          {channel.parts.length > 0 ? (
            <details className="prompt-debug-parts">
              <summary>Debug parts</summary>
              <ul>
                {channel.parts.map((part) => (
                  <li key={part.id}>
                    <div>
                      <strong>{part.kindLabel}</strong>
                      <span>{part.sourceNodeLabel}</span>
                    </div>
                    <pre>{part.text}</pre>
                    {part.referenceAssetLabel !== "No reference images" ? (
                      <small>{part.referenceAssetLabel}</small>
                    ) : null}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </article>
      ))}
    </section>
  );
}

export function buildPromptPreviewRefreshKey(
  nodes: readonly CanvasNodeRecord[],
  edges: readonly CanvasEdgeRecord[],
): string {
  const nodeKey = nodes
    .map((node) => `${node.id}:${node.updatedAt}:${referenceKey(node.dataJson)}`)
    .sort()
    .join("|");
  const edgeKey = edges
    .map((edge) => `${edge.id}:${edge.relation}:${edge.sourceNodeId}:${edge.targetNodeId}`)
    .sort()
    .join("|");

  return `${nodeKey}::${edgeKey}`;
}

function referenceKey(value: unknown): string {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "";
  }
  const referenceAssetIds = (value as { referenceAssetIds?: unknown }).referenceAssetIds;
  return Array.isArray(referenceAssetIds)
    ? referenceAssetIds.filter((item): item is string => typeof item === "string").join(",")
    : "";
}
