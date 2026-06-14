import type {
  CanvasEdgeData,
  CanvasEdgeRecord,
  CanvasNodeRecord,
  DeleteCanvasEdgeResult,
} from "@guga-flow/shared-types";
import React, { useState } from "react";

import { deleteCanvasEdge } from "../../lib/api";
import {
  getCanvasEdgeEndpointLabel,
  getCanvasEdgeRelationLabel,
  mergeCanvasEdgeDeleteResult,
  type CanvasGraphState,
} from "./canvas-edge-data";
import { EMPTY_CANVAS_SELECTION, type CanvasSelectionState } from "./canvas-selection";

interface CanvasEdgeInspectorProps {
  edge: CanvasEdgeRecord;
  edges: CanvasEdgeRecord[];
  nodes: CanvasNodeRecord[];
  projectId: string;
  onGraphUpdated(graph: CanvasGraphState): void;
  onSelectionChange(selection: CanvasSelectionState): void;
}

export function CanvasEdgeInspector({
  edge,
  edges,
  nodes,
  onGraphUpdated,
  onSelectionChange,
  projectId,
}: CanvasEdgeInspectorProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceNode = nodes.find((node) => node.id === edge.sourceNodeId);
  const targetNode = nodes.find((node) => node.id === edge.targetNodeId);
  const edgeData = canvasEdgeData(edge.dataJson);
  const appliedCount = edgeData.appliedShotNodeIds?.length ?? 0;

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      await deleteCanvasEdgeSelection({
        projectId,
        edge,
        nodes,
        edges,
        onGraphUpdated,
        onSelectionChange,
      });
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete edge");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="canvas-edge-inspector">
      <div className="panel-heading compact">
        <h2>{getCanvasEdgeRelationLabel(edge.relation)}</h2>
        <span>{edge.id}</span>
      </div>
      <dl className="edge-detail-list">
        <div>
          <dt>Source</dt>
          <dd>{getCanvasEdgeEndpointLabel(sourceNode)}</dd>
        </div>
        <div>
          <dt>Target</dt>
          <dd>{getCanvasEdgeEndpointLabel(targetNode)}</dd>
        </div>
        {appliedCount > 0 ? (
          <div>
            <dt>Applied shots</dt>
            <dd>{appliedCount}</dd>
          </div>
        ) : null}
        {edgeData.slotId ? (
          <div>
            <dt>Input slot</dt>
            <dd>
              {edgeData.slotId}
              {edgeData.inputKind ? ` / ${edgeData.inputKind}` : ""}
              {typeof edgeData.order === "number" ? ` #${edgeData.order + 1}` : ""}
            </dd>
          </div>
        ) : null}
      </dl>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="danger-action compact" type="button" disabled={busy} onClick={handleDelete}>
        Delete
      </button>
    </div>
  );
}

export async function deleteCanvasEdgeSelection(input: {
  projectId: string;
  edge: CanvasEdgeRecord;
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
  deleteEdge?: (projectId: string, edgeId: string) => Promise<DeleteCanvasEdgeResult>;
  onGraphUpdated?: (graph: CanvasGraphState) => void;
  onSelectionChange?: (selection: CanvasSelectionState) => void;
}): Promise<CanvasGraphState> {
  const deleteEdge = input.deleteEdge ?? deleteCanvasEdge;
  const result = await deleteEdge(input.projectId, input.edge.id);
  const graph = mergeCanvasEdgeDeleteResult(
    { nodes: input.nodes, edges: input.edges },
    result,
  );

  input.onGraphUpdated?.(graph);
  input.onSelectionChange?.(EMPTY_CANVAS_SELECTION);
  return graph;
}

function canvasEdgeData(value: unknown): CanvasEdgeData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const data = value as CanvasEdgeData;
  return {
    slotId: typeof data.slotId === "string" ? data.slotId : undefined,
    inputKind: typeof data.inputKind === "string" ? data.inputKind : undefined,
    inputRole: typeof data.inputRole === "string" ? data.inputRole : undefined,
    order: typeof data.order === "number" && Number.isInteger(data.order) ? data.order : undefined,
    appliedShotNodeIds: Array.isArray(data.appliedShotNodeIds)
      ? data.appliedShotNodeIds.filter((id): id is string => typeof id === "string")
      : undefined,
    childEdgeIds: Array.isArray(data.childEdgeIds)
      ? data.childEdgeIds.filter((id): id is string => typeof id === "string")
      : undefined,
    batchSourceEdgeId: typeof data.batchSourceEdgeId === "string" ? data.batchSourceEdgeId : undefined,
  };
}
