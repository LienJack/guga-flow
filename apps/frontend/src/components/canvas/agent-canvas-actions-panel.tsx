import type {
  AgentCanvasActionJobOutput,
  AgentMemoryRecord,
  CanvasNodeRecord,
  CreateAgentCanvasActionResult,
  UndoAgentCanvasActionResult,
} from "@guga-flow/shared-types";
import { Bot, CircleOff, Plus, Send, Trash2, Undo2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  clearAgentMemories,
  createAgentCanvasAction,
  createAgentMemory,
  disableAgentMemory,
  listAgentMemories,
  undoAgentCanvasAction,
} from "../../lib/api";
import type { CanvasSelectionState } from "./canvas-selection";

interface AgentCanvasActionsPanelProps {
  nodes: CanvasNodeRecord[];
  projectId: string;
  selection: CanvasSelectionState;
  onActionComplete(result: CreateAgentCanvasActionResult): Promise<void> | void;
  onUndoComplete(result: UndoAgentCanvasActionResult): Promise<void> | void;
}

type AgentStatus = "idle" | "submitting" | "undoing";

export function AgentCanvasActionsPanel({
  nodes,
  onActionComplete,
  onUndoComplete,
  projectId,
  selection,
}: AgentCanvasActionsPanelProps) {
  const selectedNode = useMemo(() => selectedCanvasNode(nodes, selection), [nodes, selection]);
  const multiNodeIds = selection.kind === "multi" ? selection.nodeIds : [];
  const suggestedSourceNodeId = multiNodeIds[0] ?? "";
  const suggestedTargetNodeId = selectedNode?.id ?? multiNodeIds[1] ?? "";
  const [message, setMessage] = useState("");
  const [sourceNodeId, setSourceNodeId] = useState(suggestedSourceNodeId);
  const [targetNodeId, setTargetNodeId] = useState(suggestedTargetNodeId);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CreateAgentCanvasActionResult | null>(null);
  const [memories, setMemories] = useState<AgentMemoryRecord[]>([]);
  const [memoryTitle, setMemoryTitle] = useState("");
  const [memoryContent, setMemoryContent] = useState("");
  const [memoryTags, setMemoryTags] = useState("");
  const [memoryError, setMemoryError] = useState<string | null>(null);

  const selectedNodeId = selectedNode?.id;
  const isBusy = status !== "idle";
  const latestOutput = lastResult?.job.outputJson as AgentCanvasActionJobOutput | undefined;
  const canUndo = Boolean(
    lastResult?.job.status === "succeeded" &&
      latestOutput &&
      !latestOutput.undo &&
      ((latestOutput.createdNodes?.length ?? 0) > 0 ||
        (latestOutput.createdEdges?.length ?? 0) > 0 ||
        (latestOutput.updatedNodes?.length ?? 0) > 0),
  );

  useEffect(() => {
    setSourceNodeId(suggestedSourceNodeId);
    setTargetNodeId(suggestedTargetNodeId);
  }, [suggestedSourceNodeId, suggestedTargetNodeId]);

  useEffect(() => {
    let cancelled = false;
    listAgentMemories(projectId)
      .then((result) => {
        if (!cancelled) {
          setMemories(result.memories);
          setMemoryError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setMemoryError(loadError instanceof Error ? loadError.message : "Unable to load memory");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function submitAction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedMessage = message.trim();
    if (!normalizedMessage) {
      setError("Message is required");
      return;
    }
    setStatus("submitting");
    setError(null);
    try {
      const result = await createAgentCanvasAction(projectId, {
        message: normalizedMessage,
        ...(selectedNodeId ? { selectedNodeId } : {}),
        ...(sourceNodeId.trim() ? { sourceNodeId: sourceNodeId.trim() } : {}),
        ...(targetNodeId.trim() ? { targetNodeId: targetNodeId.trim() } : {}),
      });
      setLastResult(result);
      setMessage("");
      await onActionComplete(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Agent action failed");
    } finally {
      setStatus("idle");
    }
  }

  async function undoLastAction() {
    if (!lastResult || !canUndo) {
      return;
    }
    setStatus("undoing");
    setError(null);
    try {
      const result = await undoAgentCanvasAction(projectId, lastResult.job.id);
      setLastResult((current) => (current ? { ...current, job: result.job } : current));
      await onUndoComplete(result);
    } catch (undoError) {
      setError(undoError instanceof Error ? undoError.message : "Undo failed");
    } finally {
      setStatus("idle");
    }
  }

  async function submitMemory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memoryTitle.trim() || !memoryContent.trim()) {
      setMemoryError("Title and content are required");
      return;
    }
    setMemoryError(null);
    try {
      const memory = await createAgentMemory(projectId, {
        title: memoryTitle,
        content: memoryContent,
        tags: parseTags(memoryTags),
      });
      setMemories((current) => [memory, ...current.filter((item) => item.id !== memory.id)]);
      setMemoryTitle("");
      setMemoryContent("");
      setMemoryTags("");
    } catch (createError) {
      setMemoryError(createError instanceof Error ? createError.message : "Unable to save memory");
    }
  }

  async function disableMemory(memoryId: string) {
    setMemoryError(null);
    try {
      const memory = await disableAgentMemory(projectId, memoryId);
      setMemories((current) => current.map((item) => (item.id === memory.id ? memory : item)));
    } catch (disableError) {
      setMemoryError(disableError instanceof Error ? disableError.message : "Unable to disable memory");
    }
  }

  async function clearMemory() {
    setMemoryError(null);
    try {
      await clearAgentMemories(projectId, { includeDisabled: true });
      setMemories([]);
    } catch (clearError) {
      setMemoryError(clearError instanceof Error ? clearError.message : "Unable to clear memory");
    }
  }

  return (
    <section className="agent-canvas-panel" aria-label="Agent canvas actions">
      <div className="section-heading-row">
        <h2 className="panel-title small">
          <Bot size={15} aria-hidden="true" />
          Agent
        </h2>
        {canUndo ? (
          <button
            className="icon-action"
            type="button"
            title="Undo agent action"
            disabled={isBusy}
            onClick={undoLastAction}
          >
            <Undo2 size={15} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <form className="agent-canvas-form" onSubmit={submitAction}>
        <label className="field-label">
          Message
          <textarea
            rows={3}
            value={message}
            placeholder="create shot: rain reveal"
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>
        <div className="agent-context-grid">
          <label className="field-label">
            Source
            <input
              type="text"
              value={sourceNodeId}
              placeholder="node id"
              onChange={(event) => setSourceNodeId(event.target.value)}
            />
          </label>
          <label className="field-label">
            Target
            <input
              type="text"
              value={targetNodeId}
              placeholder={selectedNodeId ?? "node id"}
              onChange={(event) => setTargetNodeId(event.target.value)}
            />
          </label>
        </div>
        <button className="primary-action compact" type="submit" disabled={isBusy}>
          <Send size={14} aria-hidden="true" />
          {status === "submitting" ? "Running" : "Run"}
        </button>
      </form>

      {selectedNode ? (
        <div className="agent-context-note">
          <span>{selectedNode.title ?? selectedNode.id}</span>
          <small>{selectedNode.type}</small>
        </div>
      ) : null}
      {lastResult?.job.outputJson ? (
        <div className="agent-result" role="status">
          <span>{lastResult.job.outputJson.summary}</span>
          <small>{artifactSummary(lastResult.job.outputJson)}</small>
        </div>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <details className="agent-memory-panel" aria-label="Agent memory">
        <summary className="section-heading-row">
          <span className="panel-title small">Memory</span>
          <span className="status-chip">{memories.length}</span>
        </summary>
        <div className="agent-memory-tools">
          <button
            className="icon-action danger"
            type="button"
            title="Clear memory"
            disabled={memories.length === 0}
            onClick={clearMemory}
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
        <form className="agent-memory-form" onSubmit={submitMemory}>
          <label className="field-label">
            Title
            <input
              type="text"
              value={memoryTitle}
              onChange={(event) => setMemoryTitle(event.target.value)}
            />
          </label>
          <label className="field-label">
            Content
            <textarea
              rows={3}
              value={memoryContent}
              onChange={(event) => setMemoryContent(event.target.value)}
            />
          </label>
          <label className="field-label">
            Tags
            <input
              type="text"
              value={memoryTags}
              placeholder="style, pacing"
              onChange={(event) => setMemoryTags(event.target.value)}
            />
          </label>
          <button className="ghost-action compact" type="submit">
            <Plus size={14} aria-hidden="true" />
            Add
          </button>
        </form>
        <div className="agent-memory-list">
          {memories.length ? (
            memories.map((memory) => (
              <article className={`agent-memory-row${memory.enabled ? "" : " disabled"}`} key={memory.id}>
                <div>
                  <strong>{memory.title}</strong>
                  <span>{memory.summary}</span>
                  {memory.tags.length ? <small>{memory.tags.map((tag) => `#${tag}`).join(" ")}</small> : null}
                </div>
                {memory.enabled ? (
                  <button
                    className="icon-action"
                    type="button"
                    title="Disable memory"
                    onClick={() => disableMemory(memory.id)}
                  >
                    <CircleOff size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </article>
            ))
          ) : (
            <p className="canvas-outline-empty">No memory</p>
          )}
        </div>
        {memoryError ? (
          <p className="form-error" role="alert">
            {memoryError}
          </p>
        ) : null}
      </details>
    </section>
  );
}

function selectedCanvasNode(
  nodes: readonly CanvasNodeRecord[],
  selection: CanvasSelectionState,
): CanvasNodeRecord | undefined {
  return selection.kind === "business-node"
    ? nodes.find((node) => node.id === selection.nodeId)
    : undefined;
}

function artifactSummary(output: AgentCanvasActionJobOutput): string {
  const createdNodeCount = output.createdNodes?.length ?? 0;
  const updatedNodeCount = output.updatedNodes?.length ?? 0;
  const createdEdgeCount = output.createdEdges?.length ?? 0;
  const parts = [
    createdNodeCount ? `${createdNodeCount} node` : "",
    updatedNodeCount ? `${updatedNodeCount} update` : "",
    createdEdgeCount ? `${createdEdgeCount} edge` : "",
    output.undo ? "undone" : "",
  ].filter(Boolean);
  return parts.join(" / ") || output.actionKind.replace(/_/g, " ");
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
