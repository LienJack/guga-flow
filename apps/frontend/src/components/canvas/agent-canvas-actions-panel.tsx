import type {
  AgentCanvasActionJobInput,
  AgentCanvasActionJobOutput,
  AgentDeploymentRole,
  AgentMemoryType,
  AgentStreamEventPayload,
  AgentMemoryRecord,
  CanvasNodeRecord,
  CreateAgentCanvasActionResult,
  GenerationEvent,
  GenerationJobRecord,
  StreamingAgentRole,
  UndoAgentCanvasActionResult,
} from "@guga-flow/shared-types";
import { Bot, CircleOff, Plus, Send, Trash2, Undo2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  cancelGenerationJob,
  clearAgentMemories,
  createAgentCanvasAction,
  createAgentSession,
  createAgentMemory,
  createProductionAgentAction,
  disableAgentMemory,
  generationEventsUrl,
  listAgentMemories,
  listGenerationJobs,
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

type AgentStatus = "idle" | "submitting" | "undoing" | "stopping";
type AgentStreamMode = "idle" | "sse" | "fallback";

const ACTIVE_AGENT_JOB_STATUSES = new Set<GenerationJobRecord["status"]>([
  "queued",
  "running",
  "provider_waiting",
]);

export function AgentCanvasActionsPanel({
  nodes,
  onActionComplete,
  onUndoComplete,
  projectId,
  selection,
}: AgentCanvasActionsPanelProps) {
  const selectedNode = useMemo(() => selectedCanvasNode(nodes, selection), [nodes, selection]);
  const storyboardItemIds = useMemo(() => selectedStoryboardItemIds(nodes, selection), [
    nodes,
    selection,
  ]);
  const multiNodeIds = selection.kind === "multi" ? selection.nodeIds : [];
  const suggestedSourceNodeId = multiNodeIds[0] ?? "";
  const suggestedTargetNodeId = selectedNode?.id ?? multiNodeIds[1] ?? "";
  const [message, setMessage] = useState("");
  const [sourceNodeId, setSourceNodeId] = useState(suggestedSourceNodeId);
  const [targetNodeId, setTargetNodeId] = useState(suggestedTargetNodeId);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [streamRole, setStreamRole] = useState<StreamingAgentRole>("script");
  const [activeSession, setActiveSession] = useState<GenerationJobRecord | null>(null);
  const [streamPayload, setStreamPayload] = useState<AgentStreamEventPayload | null>(null);
  const [streamMode, setStreamMode] = useState<AgentStreamMode>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CreateAgentCanvasActionResult | null>(null);
  const [memories, setMemories] = useState<AgentMemoryRecord[]>([]);
  const [memoryTitle, setMemoryTitle] = useState("");
  const [memoryContent, setMemoryContent] = useState("");
  const [memoryTags, setMemoryTags] = useState("");
  const [memoryType, setMemoryType] = useState<AgentMemoryType>("manual_preference");
  const [memoryAgentRole, setMemoryAgentRole] = useState<AgentDeploymentRole | "">("");
  const [memoryError, setMemoryError] = useState<string | null>(null);

  const selectedNodeId = selectedNode?.id;
  const activeSessionId = activeSession?.id;
  const isBusy = status !== "idle";
  const canStopSession = Boolean(
    activeSession && ACTIVE_AGENT_JOB_STATUSES.has(activeSession.status),
  );
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

  useEffect(() => {
    if (!activeSessionId || typeof window === "undefined") {
      return;
    }
    if (!("EventSource" in window)) {
      setStreamMode("fallback");
      return;
    }

    setStreamMode("sse");
    const source = new window.EventSource(generationEventsUrl(projectId));
    const handleJobUpdate = (event: MessageEvent) => {
      const generationEvent = parseGenerationEvent(event);
      if (!generationEvent || generationEvent.jobId !== activeSessionId) {
        return;
      }
      setActiveSession((current) =>
        current
          ? {
              ...current,
              ...(generationEvent.status ? { status: generationEvent.status } : {}),
              updatedAt: generationEvent.updatedAt,
            }
          : current,
      );
      if (isAgentStreamPayload(generationEvent.payload)) {
        setStreamPayload(generationEvent.payload);
      }
    };
    source.addEventListener("job.updated", handleJobUpdate);
    source.onerror = () => {
      setStreamMode("fallback");
      source.close();
    };

    return () => {
      source.removeEventListener("job.updated", handleJobUpdate);
      source.close();
    };
  }, [activeSessionId, projectId]);

  useEffect(() => {
    if (!activeSessionId || streamMode !== "fallback") {
      return;
    }
    let cancelled = false;

    async function pollAgentJob() {
      try {
        const result = await listGenerationJobs(projectId);
        const job = result.jobs.find((item) => item.id === activeSessionId);
        if (!cancelled && job) {
          setActiveSession(job);
          setStreamPayload(agentPayloadFromJob(job, "polling"));
        }
      } catch {
        if (!cancelled) {
          setStreamPayload((current) =>
            current ? { ...current, fallback: "polling" } : current,
          );
        }
      }
    }

    void pollAgentJob();
    const intervalId = window.setInterval(() => void pollAgentJob(), 2500);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [activeSessionId, projectId, streamMode]);

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

  async function startAgentSession() {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) {
      setError("Message is required");
      return;
    }
    setStatus("submitting");
    setError(null);
    try {
      const result = await createAgentSession(projectId, {
        role: streamRole,
        message: normalizedMessage,
        ...(selectedNodeId ? { selectedNodeId } : {}),
        ...(sourceNodeId.trim() ? { sourceNodeId: sourceNodeId.trim() } : {}),
        ...(targetNodeId.trim() ? { targetNodeId: targetNodeId.trim() } : {}),
      });
      setActiveSession(result.job);
      setStreamPayload(result.events[0] ?? agentPayloadFromJob(result.job));
      setStreamMode("sse");
    } catch (sessionError) {
      setError(sessionError instanceof Error ? sessionError.message : "Agent session failed");
    } finally {
      setStatus("idle");
    }
  }

  async function stopAgentSession() {
    if (!activeSession) {
      return;
    }
    setStatus("stopping");
    setError(null);
    try {
      const job = await cancelGenerationJob(projectId, activeSession.id);
      setActiveSession(job);
      setStreamPayload(agentPayloadFromJob(job, "polling"));
      setStreamMode("fallback");
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : "Agent stop failed");
    } finally {
      setStatus("idle");
    }
  }

  async function createStoryboardBoard() {
    setStatus("submitting");
    setError(null);
    try {
      const result = await createProductionAgentAction(projectId, {
        action: "create_storyboard_board",
        title: selectedNode?.title ? `${selectedNode.title} Board` : "Agent Storyboard Board",
        ...(storyboardItemIds.length > 0 ? { itemIds: storyboardItemIds } : {}),
        columns: 3,
      });
      setLastResult(result);
      await onActionComplete(result);
    } catch (boardError) {
      setError(boardError instanceof Error ? boardError.message : "Production agent action failed");
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
        type: memoryType,
        title: memoryTitle,
        content: memoryContent,
        tags: parseTags(memoryTags),
        ...(memoryAgentRole ? { agentRole: memoryAgentRole } : {}),
        ...(selectedNodeId ? { contextNodeId: selectedNodeId } : {}),
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
        <div className="agent-context-grid">
          <button className="primary-action compact" type="submit" disabled={isBusy}>
            <Send size={14} aria-hidden="true" />
            {status === "submitting" ? "Running" : "Run"}
          </button>
          <button
            className="ghost-action compact"
            type="button"
            title="Create storyboard board"
            disabled={isBusy}
            onClick={() => void createStoryboardBoard()}
          >
            <Plus size={14} aria-hidden="true" />
            Board
          </button>
        </div>
        <div className="agent-context-grid" role="group" aria-label="Agent stream role">
          <button
            className={streamRole === "script" ? "primary-action compact" : "ghost-action compact"}
            type="button"
            disabled={isBusy}
            onClick={() => setStreamRole("script")}
          >
            Script
          </button>
          <button
            className={streamRole === "production" ? "primary-action compact" : "ghost-action compact"}
            type="button"
            disabled={isBusy}
            onClick={() => setStreamRole("production")}
          >
            Production
          </button>
        </div>
        <div className="agent-context-grid">
          <button
            className="ghost-action compact"
            type="button"
            disabled={isBusy}
            onClick={() => void startAgentSession()}
          >
            <Send size={14} aria-hidden="true" />
            Start
          </button>
          <button
            className="ghost-action compact"
            type="button"
            disabled={isBusy || !canStopSession}
            onClick={() => void stopAgentSession()}
          >
            <CircleOff size={14} aria-hidden="true" />
            {status === "stopping" ? "Stopping" : "Stop"}
          </button>
        </div>
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
      {streamPayload ? (
        <div className="agent-result" role="status">
          <span>{streamPayload.summary ?? streamStatusLabel(streamPayload)}</span>
          <small>
            {streamPayload.role ?? "agent"} / {streamPayload.phase}
            {streamMode === "fallback" || streamPayload.fallback ? " / polling" : ""}
          </small>
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
          <div className="agent-context-grid">
            <label className="field-label">
              Type
              <select
                value={memoryType}
                onChange={(event) => setMemoryType(event.target.value as AgentMemoryType)}
              >
                <option value="manual_preference">Preference</option>
                <option value="message">Message</option>
                <option value="summary">Summary</option>
                <option value="tool_result">Tool result</option>
              </select>
            </label>
            <label className="field-label">
              Role
              <select
                value={memoryAgentRole}
                onChange={(event) => setMemoryAgentRole(event.target.value as AgentDeploymentRole | "")}
              >
                <option value="">Project</option>
                <option value="script">Script</option>
                <option value="production">Production</option>
                <option value="universal">Universal</option>
              </select>
            </label>
          </div>
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
                  <small>
                    {[memory.type, memory.agentRole, memory.contextNodeId, memory.safetyFiltered ? "filtered" : ""]
                      .filter(Boolean)
                      .join(" / ")}
                  </small>
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

function selectedStoryboardItemIds(
  nodes: readonly CanvasNodeRecord[],
  selection: CanvasSelectionState,
): string[] {
  const selectedIds =
    selection.kind === "multi"
      ? selection.nodeIds
      : selection.kind === "business-node"
        ? [selection.nodeId]
        : [];
  const selectedIdSet = new Set(selectedIds);
  return nodes
    .filter((node) => node.type === "shot" && selectedIdSet.has(node.id))
    .map((node) => node.id);
}

function parseGenerationEvent(event: MessageEvent): GenerationEvent | null {
  try {
    return JSON.parse(event.data as string) as GenerationEvent;
  } catch {
    return null;
  }
}

function isAgentStreamPayload(value: unknown): value is AgentStreamEventPayload {
  return dataObject(value).kind === "agent_session";
}

function agentPayloadFromJob(
  job: GenerationJobRecord,
  fallback?: AgentStreamEventPayload["fallback"],
): AgentStreamEventPayload {
  const input = dataObject(job.inputJson as AgentCanvasActionJobInput);
  const output = dataObject(job.outputJson as AgentCanvasActionJobOutput | undefined);
  const actionKind = stringValue(output.actionKind) as AgentStreamEventPayload["actionKind"];
  const role = stringValue(input.role) as AgentStreamEventPayload["role"];
  const message = stringValue(input.message);
  const summary = stringValue(output.summary) ?? job.errorMessage ?? undefined;
  return {
    kind: "agent_session",
    ...(role ? { role } : {}),
    ...(message ? { message } : {}),
    phase: agentPhaseFromJob(job, actionKind),
    status: job.status,
    ...(summary ? { summary } : {}),
    ...(actionKind ? { actionKind } : {}),
    ...(fallback ? { fallback } : {}),
  };
}

function agentPhaseFromJob(
  job: GenerationJobRecord,
  actionKind: AgentStreamEventPayload["actionKind"],
): AgentStreamEventPayload["phase"] {
  if (job.status === "queued") {
    return "queued";
  }
  if (job.status === "running" || job.status === "provider_waiting") {
    return "thinking";
  }
  if (job.status === "cancelled") {
    return "stopped";
  }
  if (job.status === "failed") {
    return "failed";
  }
  return actionKind ? "tool_result" : "completed";
}

function streamStatusLabel(payload: AgentStreamEventPayload): string {
  const role = payload.role ?? "agent";
  if (payload.phase === "stopped") {
    return `${role} stopped`;
  }
  if (payload.phase === "failed") {
    return `${role} failed`;
  }
  if (payload.phase === "tool_result") {
    return `${role} tool result`;
  }
  if (payload.phase === "completed") {
    return `${role} completed`;
  }
  return `${role} ${payload.phase}`;
}

function dataObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
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
