import type { CanvasNodeRecord, UpdateCanvasNodeInput } from "@guga-flow/shared-types";
import React from "react";

import { updateCanvasNode } from "../../lib/api";
import { AssetLibrary } from "../projects/asset-library";
import type { CanvasSelectionState } from "./canvas-selection";
import { BusinessNodeForm } from "./business-node-form";

interface CanvasInspectorProps {
  projectId: string;
  nodes: CanvasNodeRecord[];
  selection: CanvasSelectionState;
  onNodeUpdated(node: CanvasNodeRecord): void;
}

export function CanvasInspector({
  nodes,
  onNodeUpdated,
  projectId,
  selection,
}: CanvasInspectorProps) {
  const selectedNode =
    selection.kind === "business-node"
      ? nodes.find((node) => node.id === selection.nodeId)
      : undefined;

  return (
    <div className="canvas-inspector">
      <section className="inspector-section" aria-label="Selection details">
        {selection.kind === "empty" ? (
          <InspectorState title="No selection" value="Canvas ready" />
        ) : null}
        {selection.kind === "multi" ? (
          <InspectorState title="Multiple selection" value={`${selection.count} objects`} />
        ) : null}
        {selection.kind === "unsupported" ? (
          <InspectorState title="Canvas object" value={selection.shapeType} />
        ) : null}
        {selection.kind === "business-edge" ? (
          <InspectorState title="Semantic edge" value={selection.edgeId} />
        ) : null}
        {selection.kind === "business-node" && !selectedNode ? (
          <InspectorState title="Node unavailable" value={selection.nodeId} />
        ) : null}
        {selectedNode ? (
          <BusinessNodeForm
            node={selectedNode}
            onSave={async (input) => {
              const result = await saveNode(projectId, selectedNode.id, input);
              onNodeUpdated(result);
            }}
          />
        ) : null}
      </section>

      <AssetLibrary projectId={projectId} />
    </div>
  );
}

function InspectorState({ title, value }: { title: string; value: string }) {
  return (
    <div className="empty-state small inspector-state">
      <strong>{title}</strong>
      <span>{value}</span>
    </div>
  );
}

async function saveNode(
  projectId: string,
  nodeId: string,
  input: UpdateCanvasNodeInput,
): Promise<CanvasNodeRecord> {
  const result = await updateCanvasNode(projectId, nodeId, input);
  return result.node;
}
