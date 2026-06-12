import type {
  CanvasEdgeRecord,
  CanvasNodeRecord,
  GenerationJobRecord,
  GenerationQueueSummary,
  ImageNodeData,
  UpdateCanvasNodeInput,
} from "@guga-flow/shared-types";
import React from "react";

import { updateCanvasNode } from "../../lib/api";
import { AssetLibrary } from "../projects/asset-library";
import { type CanvasGraphState } from "./canvas-edge-data";
import { CanvasEdgeInspector } from "./canvas-edge-inspector";
import type { CanvasSelectionState } from "./canvas-selection";
import { BusinessNodeForm } from "./business-node-form";
import { GenerationActions, GenerationBatchActions } from "./generation-actions";
import { NodeReferenceAssets } from "./node-reference-assets";
import { buildPromptPreviewRefreshKey, ShotPromptPreview } from "./shot-prompt-preview";

interface CanvasInspectorProps {
  edges: CanvasEdgeRecord[];
  projectId: string;
  nodes: CanvasNodeRecord[];
  generationJobs?: GenerationJobRecord[];
  selection: CanvasSelectionState;
  onGraphUpdated(graph: CanvasGraphState): void;
  onGenerationChanged?(queueSummary?: GenerationQueueSummary): void;
  onNodeUpdated(node: CanvasNodeRecord): void;
  onSelectionChange(selection: CanvasSelectionState): void;
}

export function CanvasInspector({
  edges,
  generationJobs = [],
  nodes,
  onGenerationChanged,
  onGraphUpdated,
  onNodeUpdated,
  onSelectionChange,
  projectId,
  selection,
}: CanvasInspectorProps) {
  const selectedNode =
    selection.kind === "business-node"
      ? nodes.find((node) => node.id === selection.nodeId)
      : undefined;
  const selectedEdge =
    selection.kind === "business-edge"
      ? edges.find((edge) => edge.id === selection.edgeId)
      : undefined;
  const promptRefreshKey = selectedNode ? buildPromptPreviewRefreshKey(nodes, edges) : "";
  const selectedBatchImageNodes =
    selection.kind === "multi"
      ? selection.nodeIds
          .map((nodeId) => nodes.find((node) => node.id === nodeId))
          .filter((node): node is CanvasNodeRecord<ImageNodeData> => {
            if (!node || node.type !== "image") {
              return false;
            }
            return typeof (node.dataJson as ImageNodeData | undefined)?.assetId === "string";
          })
      : [];

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
        {selection.kind === "business-edge" && !selectedEdge ? (
          <InspectorState title="Edge unavailable" value={selection.edgeId} />
        ) : null}
        {selection.kind === "business-node" && !selectedNode ? (
          <InspectorState title="Node unavailable" value={selection.nodeId} />
        ) : null}
        {selectedEdge ? (
          <CanvasEdgeInspector
            edge={selectedEdge}
            edges={edges}
            nodes={nodes}
            projectId={projectId}
            onGraphUpdated={onGraphUpdated}
            onSelectionChange={onSelectionChange}
          />
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
        {selectedNode ? (
          <NodeReferenceAssets
            projectId={projectId}
            node={selectedNode}
            onNodeUpdated={onNodeUpdated}
          />
        ) : null}
        {selectedNode ? (
          <GenerationActions
            generationJobs={generationJobs}
            projectId={projectId}
            node={selectedNode}
            onGenerationChanged={onGenerationChanged}
          />
        ) : null}
        {selection.kind === "multi" ? (
          <GenerationBatchActions
            generationJobs={generationJobs}
            imageNodes={selectedBatchImageNodes}
            projectId={projectId}
            onGenerationChanged={onGenerationChanged}
          />
        ) : null}
        {selectedNode ? (
          <ShotPromptPreview projectId={projectId} node={selectedNode} refreshKey={promptRefreshKey} />
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
