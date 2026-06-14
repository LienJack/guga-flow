import type { TaskCenterItem, TaskCenterResult } from "@guga-flow/shared-types";
import { ListChecks, MapPin, RefreshCw, Square, X } from "lucide-react";
import React, { useMemo, useState } from "react";

interface TaskCenterPanelProps {
  taskCenter: TaskCenterResult | null;
  onCancelTask(taskId: string): Promise<void> | void;
  onRetryTask(taskId: string): Promise<void> | void;
  onSelectNode(nodeId: string): void;
}

export function TaskCenterPanel({
  taskCenter,
  onCancelTask,
  onRetryTask,
  onSelectNode,
}: TaskCenterPanelProps) {
  const [hiddenTaskIds, setHiddenTaskIds] = useState<string[]>([]);
  const hiddenSet = useMemo(() => new Set(hiddenTaskIds), [hiddenTaskIds]);
  const items = (taskCenter?.items ?? []).filter((item) => !hiddenSet.has(item.taskId));
  const failedDiagnostics = taskCenter?.diagnostics.filter((event) => event.severity === "error") ?? [];

  return (
    <section className="generation-panel" aria-label="Task center">
      <div className="section-heading-row">
        <h2 className="panel-title small">
          <ListChecks size={15} aria-hidden="true" />
          Tasks
        </h2>
        <span className="status-chip">{items.length}</span>
      </div>
      <div className="agent-context-grid">
        <QueueMetric label="Queued" value={taskCenter?.queueSummary.queued ?? 0} />
        <QueueMetric label="Running" value={taskCenter?.queueSummary.running ?? 0} />
      </div>
      <div className="agent-memory-list">
        {items.length ? (
          items.slice(0, 8).map((item) => (
            <TaskCenterRow
              item={item}
              key={item.taskId}
              onCancelTask={onCancelTask}
              onClearTask={(taskId) => setHiddenTaskIds((current) => [...current, taskId])}
              onRetryTask={onRetryTask}
              onSelectNode={onSelectNode}
            />
          ))
        ) : (
          <p className="canvas-outline-empty">No tasks</p>
        )}
      </div>
      {failedDiagnostics.length ? (
        <div className="agent-result" role="status">
          <span>{failedDiagnostics[0]?.safeMessage}</span>
          <small>{failedDiagnostics[0]?.traceId}</small>
        </div>
      ) : null}
    </section>
  );
}

function TaskCenterRow({
  item,
  onCancelTask,
  onClearTask,
  onRetryTask,
  onSelectNode,
}: {
  item: TaskCenterItem;
  onCancelTask(taskId: string): Promise<void> | void;
  onClearTask(taskId: string): void;
  onRetryTask(taskId: string): Promise<void> | void;
  onSelectNode(nodeId: string): void;
}) {
  return (
    <article className={`agent-memory-row ${item.status === "failed" ? "disabled" : ""}`}>
      <div>
        <strong>{item.title}</strong>
        <span>
          {item.taskClass} / {item.status}
        </span>
        {item.reason ? <small>{item.reason}</small> : <small>{item.traceId}</small>}
      </div>
      {item.related.nodeId ? (
        <button
          className="icon-action"
          type="button"
          title="Locate task node"
          onClick={() => onSelectNode(item.related.nodeId!)}
        >
          <MapPin size={14} aria-hidden="true" />
        </button>
      ) : null}
      {item.actions.canRetry ? (
        <button
          className="icon-action"
          type="button"
          title="Retry task"
          onClick={() => void onRetryTask(item.taskId)}
        >
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      ) : null}
      {item.actions.canCancel ? (
        <button
          className="icon-action"
          type="button"
          title="Cancel task"
          onClick={() => void onCancelTask(item.taskId)}
        >
          <Square size={14} aria-hidden="true" />
        </button>
      ) : null}
      {item.actions.canClear ? (
        <button
          className="icon-action"
          type="button"
          title="Clear task"
          onClick={() => onClearTask(item.taskId)}
        >
          <X size={14} aria-hidden="true" />
        </button>
      ) : null}
    </article>
  );
}

function QueueMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="agent-context-note">
      <span>{value}</span>
      <small>{label}</small>
    </div>
  );
}
