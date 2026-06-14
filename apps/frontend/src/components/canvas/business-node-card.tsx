import React from "react";

import { getBusinessNodeDefinition } from "./business-node-data";
import type { BusinessNodeShapeProps } from "./business-node-shape";

type BusinessNodeCardProps = BusinessNodeShapeProps & { collapsed?: boolean };

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
  collapsed,
  h,
  nodeType,
  status,
  summary,
  title,
}: BusinessNodeCardProps) {
  const definition = getBusinessNodeDefinition(nodeType);
  const isCollapsed = collapsed ?? (nodeType === "scene_frame" && h <= 112);
  const semanticRoleClass =
    nodeType === "character_asset" || nodeType === "location_asset"
      ? "semantic-source"
      : nodeType === "shot" || nodeType === "scene_frame"
        ? "semantic-target"
        : "";

  return (
    <article
      className={`business-node-card tone-${definition.tone} type-${nodeType} status-${status} ${semanticRoleClass}${isCollapsed ? " collapsed" : ""}`}
      aria-label={`${definition.label}: ${title}`}
    >
      <header className="business-node-card-header">
        <span className="business-node-type">{definition.shortLabel}</span>
        <span className="business-node-status">{STATUS_LABELS[status]}</span>
      </header>
      <div className="business-node-meta" aria-label="Node taxonomy">
        <span>{definition.familyLabel}</span>
        <span>{capabilitySummary(definition.capabilities)}</span>
      </div>
      <h3>{title}</h3>
      <p>{summary}</p>
      {isCollapsed ? null : <footer>{detail}</footer>}
    </article>
  );
}

function capabilitySummary(capabilities: readonly string[]): string {
  if (capabilities.includes("has_task") && capabilities.includes("produces_asset")) {
    return "Task + asset";
  }
  if (capabilities.includes("produces_asset")) {
    return "Asset";
  }
  if (capabilities.includes("produces_text")) {
    return "Text";
  }
  if (capabilities.includes("has_preview")) {
    return "Preview";
  }
  return "Metadata";
}
