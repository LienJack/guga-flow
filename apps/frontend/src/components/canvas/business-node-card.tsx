import React from "react";

import { getBusinessNodeDefinition } from "./business-node-data";
import type { BusinessNodeShapeProps } from "./business-node-shape";

const STATUS_LABELS: Record<BusinessNodeShapeProps["status"], string> = {
  draft: "Draft",
  queued: "Queued",
  running: "Running",
  provider_waiting: "Waiting",
  succeeded: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function BusinessNodeCard({
  detail,
  nodeType,
  status,
  summary,
  title,
}: BusinessNodeShapeProps) {
  const definition = getBusinessNodeDefinition(nodeType);

  return (
    <article
      className={`business-node-card tone-${definition.tone} type-${nodeType} status-${status}`}
      aria-label={`${definition.label}: ${title}`}
    >
      <header className="business-node-card-header">
        <span className="business-node-type">{definition.shortLabel}</span>
        <span className="business-node-status">{STATUS_LABELS[status]}</span>
      </header>
      <h3>{title}</h3>
      <p>{summary}</p>
      <footer>{detail}</footer>
    </article>
  );
}
