import type { CanvasNodeRecord, CanvasNodeType } from "@guga-flow/shared-types";
import { Search, Target } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

export { isEditableShortcutTarget } from "../../lib/shortcuts";

import { buildBusinessNodeCardModel, isPhase3CanvasNodeType } from "./business-node-data";

const OUTLINE_NODE_TYPES: CanvasNodeType[] = [
  "scene_frame",
  "scene",
  "shot",
  "character_asset",
  "location_asset",
  "image",
  "video",
  "editor_package",
];

const NODE_TYPE_LABELS: Record<string, string> = {
  scene_frame: "Scene Frames",
  scene: "Scenes",
  shot: "Shots",
  character_asset: "Characters",
  location_asset: "Locations",
  image: "Images",
  video: "Videos",
  editor_package: "Editor Packages",
};

interface CanvasProductivityPanelProps {
  nodes: CanvasNodeRecord[];
  selectedNodeId?: string;
  searchFocusRequestKey?: number;
  onFitToContent(): void;
  onSelectNode(nodeId: string): void;
}

export interface CanvasOutlineGroup {
  type: CanvasNodeType;
  label: string;
  nodes: CanvasNodeRecord[];
}

export function CanvasProductivityPanel({
  nodes,
  onFitToContent,
  onSelectNode,
  searchFocusRequestKey,
  selectedNodeId,
}: CanvasProductivityPanelProps) {
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const filteredNodes = useMemo(() => searchCanvasNodes(nodes, query), [nodes, query]);
  const groups = useMemo(() => groupCanvasOutline(filteredNodes), [filteredNodes]);

  useEffect(() => {
    if (searchFocusRequestKey === undefined) {
      return;
    }
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  }, [searchFocusRequestKey]);

  return (
    <section className="canvas-productivity-panel" aria-label="Canvas navigation">
      <div className="section-heading-row">
        <h2 className="panel-title small">Navigator</h2>
        <button className="icon-action" type="button" title="Fit to content" onClick={onFitToContent}>
          <Target size={15} aria-hidden="true" />
        </button>
      </div>
      <label className="canvas-search-field">
        <Search size={14} aria-hidden="true" />
        <input
          ref={searchInputRef}
          type="search"
          value={query}
          placeholder="Search nodes"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="canvas-outline">
        {groups.length ? (
          groups.map((group) => (
            <section className="canvas-outline-group" key={group.type}>
              <div className="canvas-outline-heading">
                <span>{group.label}</span>
                <span>{group.nodes.length}</span>
              </div>
              <div className="canvas-outline-rows">
                {group.nodes.map((node) => {
                  const summary = nodeOutlineSummary(node);
                  return (
                    <button
                      className={`canvas-outline-row${node.id === selectedNodeId ? " active" : ""}`}
                      key={node.id}
                      type="button"
                      onClick={() => onSelectNode(node.id)}
                    >
                      <span>{nodeOutlineTitle(node)}</span>
                      {summary ? <small>{summary}</small> : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <p className="canvas-outline-empty">No matches</p>
        )}
      </div>
    </section>
  );
}

export function searchCanvasNodes(nodes: CanvasNodeRecord[], query: string): CanvasNodeRecord[] {
  const terms = query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!terms.length) {
    return nodes;
  }

  return nodes.filter((node) => {
    const haystack = nodeSearchText(node);
    return terms.every((term) => haystack.includes(term));
  });
}

export function groupCanvasOutline(nodes: CanvasNodeRecord[]): CanvasOutlineGroup[] {
  const byType = new Map<CanvasNodeType, CanvasNodeRecord[]>();
  for (const node of nodes) {
    const current = byType.get(node.type) ?? [];
    current.push(node);
    byType.set(node.type, current);
  }

  return OUTLINE_NODE_TYPES.flatMap((type) => {
    const groupNodes = byType.get(type) ?? [];
    return groupNodes.length
      ? [
          {
            type,
            label: NODE_TYPE_LABELS[type] ?? type,
            nodes: groupNodes.sort((a, b) => a.x - b.x || a.y - b.y || a.id.localeCompare(b.id)),
          },
        ]
      : [];
  });
}

export function nodeSearchText(node: CanvasNodeRecord): string {
  return [
    node.id,
    node.tldrawShapeId,
    node.type,
    node.title,
    flattenSearchValues(node.dataJson),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
}

function flattenSearchValues(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(flattenSearchValues).join(" ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => `${key} ${flattenSearchValues(item)}`)
      .join(" ");
  }
  return "";
}

function nodeOutlineTitle(node: CanvasNodeRecord): string {
  if (isPhase3CanvasNodeType(node.type)) {
    return buildBusinessNodeCardModel(node).title;
  }
  return node.title?.trim() || node.id;
}

function nodeOutlineSummary(node: CanvasNodeRecord): string {
  if (isPhase3CanvasNodeType(node.type)) {
    return buildBusinessNodeCardModel(node).summary;
  }
  return node.type;
}
