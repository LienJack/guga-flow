import type {
  CanvasEdgeRecord,
  CanvasNodeRecord,
  CanvasSnapshotJson,
  CreateCanvasNodeInput,
  ImageNodeData,
  SceneFrameNodeData,
  ShotNodeData,
  UpdateCanvasNodeInput,
  VideoNodeData,
} from "@guga-flow/shared-types";
import { CopyPlus, ImageIcon, PanelTopClose, PanelTopOpen, Video } from "lucide-react";
import React, { useMemo, useState } from "react";

import {
  createCanvasEdge,
  createCanvasNode,
  updateCanvasNode,
} from "../../lib/api";
import { mergeCanvasEdgeCreateResult, type CanvasGraphState } from "./canvas-edge-data";
import type { CanvasSelectionState } from "./canvas-selection";
import { buildBusinessNodeCardModel, isPhase3CanvasNodeType } from "./business-node-data";

interface CanvasProductivityActionsProps {
  edges: CanvasEdgeRecord[];
  node: CanvasNodeRecord;
  nodes: CanvasNodeRecord[];
  projectId: string;
  onGraphUpdated(graph: CanvasGraphState): void;
  onNodeUpdated(node: CanvasNodeRecord): void;
  onSelectionChange(selection: CanvasSelectionState): void;
}

export interface GeneratedMediaCandidates {
  images: Array<CanvasNodeRecord<ImageNodeData>>;
  videos: Array<CanvasNodeRecord<VideoNodeData>>;
}

export function CanvasProductivityActions({
  edges,
  node,
  nodes,
  onGraphUpdated,
  onNodeUpdated,
  onSelectionChange,
  projectId,
}: CanvasProductivityActionsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaCandidates = useMemo(
    () => (node.type === "shot" ? findGeneratedMediaCandidates(node, nodes, edges) : undefined),
    [edges, node, nodes],
  );
  const sceneFrameData = node.type === "scene_frame" ? (node.dataJson as SceneFrameNodeData) : undefined;
  const shotData = node.type === "shot" ? (node.dataJson as ShotNodeData) : undefined;

  async function patchSelectedNode(input: UpdateCanvasNodeInput) {
    setBusy(true);
    setError(null);
    try {
      const result = await updateCanvasNode(projectId, node.id, input);
      onNodeUpdated(result.node);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Node update failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDuplicateVariant() {
    setBusy(true);
    setError(null);
    try {
      const graph = await duplicateNodeAsVariant({
        projectId,
        node,
        nodes,
        edges,
        createNode: createCanvasNode,
        createEdge: createCanvasEdge,
      });
      onGraphUpdated(graph);
      const createdNode = graph.nodes[graph.nodes.length - 1];
      if (createdNode) {
        onSelectionChange({ kind: "business-node", nodeId: createdNode.id });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Variant duplicate failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isPhase3CanvasNodeType(node.type)) {
    return null;
  }

  return (
    <section className="canvas-productivity-actions generation-panel" aria-label="Productivity actions">
      <div className="section-heading-row">
        <h3>Productivity</h3>
        <span className="status-chip">{buildBusinessNodeCardModel(node).title}</span>
      </div>
      {sceneFrameData ? (
        <button
          className="ghost-action compact"
          type="button"
          disabled={busy}
          onClick={() =>
            void patchSelectedNode({
              dataJson: toggleSceneFrameCollapsedData(sceneFrameData),
            })
          }
        >
          {sceneFrameData.collapsed ? (
            <PanelTopOpen size={14} aria-hidden="true" />
          ) : (
            <PanelTopClose size={14} aria-hidden="true" />
          )}
          {sceneFrameData.collapsed ? "Expand Frame" : "Collapse Frame"}
        </button>
      ) : null}
      {shotData && mediaCandidates ? (
        <div className="preferred-media-controls">
          <MediaSelect
            icon={<ImageIcon size={14} aria-hidden="true" />}
            label="Preferred Image"
            value={shotData.selectedImageNodeId ?? ""}
            nodes={mediaCandidates.images}
            onChange={(selectedImageNodeId) =>
              void patchSelectedNode({
                dataJson: buildSelectedShotMediaData(shotData, { selectedImageNodeId }),
              })
            }
          />
          <MediaSelect
            icon={<Video size={14} aria-hidden="true" />}
            label="Preferred Video"
            value={shotData.selectedVideoNodeId ?? ""}
            nodes={mediaCandidates.videos}
            onChange={(selectedVideoNodeId) =>
              void patchSelectedNode({
                dataJson: buildSelectedShotMediaData(shotData, { selectedVideoNodeId }),
              })
            }
          />
        </div>
      ) : null}
      <button
        className="ghost-action compact"
        type="button"
        disabled={busy}
        onClick={() => void handleDuplicateVariant()}
      >
        <CopyPlus size={14} aria-hidden="true" />
        Duplicate Variant
      </button>
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

function MediaSelect({
  icon,
  label,
  nodes,
  onChange,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  nodes: CanvasNodeRecord[];
  value: string;
  onChange(value: string | undefined): void;
}) {
  return (
    <label className="preferred-media-field">
      <span>
        {icon}
        {label}
      </span>
      <select value={value} onChange={(event) => onChange(event.target.value || undefined)}>
        <option value="">None</option>
        {nodes.map((node) => (
          <option key={node.id} value={node.id}>
            {buildBusinessNodeCardModel(node).title}
          </option>
        ))}
      </select>
    </label>
  );
}

export function toggleSceneFrameCollapsedData(
  dataJson: SceneFrameNodeData,
  collapsed = !dataJson.collapsed,
): Record<string, CanvasSnapshotJson> {
  return {
    ...toCanvasData(dataJson),
    collapsed,
  };
}

export function buildSelectedShotMediaData(
  dataJson: ShotNodeData,
  selection: { selectedImageNodeId?: string; selectedVideoNodeId?: string },
): Record<string, CanvasSnapshotJson> {
  const next = { ...toCanvasData(dataJson) };
  if ("selectedImageNodeId" in selection) {
    if (selection.selectedImageNodeId) {
      next.selectedImageNodeId = selection.selectedImageNodeId;
    } else {
      delete next.selectedImageNodeId;
    }
  }
  if ("selectedVideoNodeId" in selection) {
    if (selection.selectedVideoNodeId) {
      next.selectedVideoNodeId = selection.selectedVideoNodeId;
    } else {
      delete next.selectedVideoNodeId;
    }
  }
  return next;
}

export function findGeneratedMediaCandidates(
  shotNode: CanvasNodeRecord,
  nodes: CanvasNodeRecord[],
  edges: CanvasEdgeRecord[],
): GeneratedMediaCandidates {
  if (shotNode.type !== "shot") {
    return { images: [], videos: [] };
  }

  const imageNodeIds = new Set(
    edges
      .filter((edge) => edge.relation === "generated_image" && edge.sourceNodeId === shotNode.id)
      .map((edge) => edge.targetNodeId),
  );
  const images = nodes.filter(
    (node): node is CanvasNodeRecord<ImageNodeData> =>
      node.type === "image" && imageNodeIds.has(node.id),
  );
  const imageIds = new Set(images.map((image) => image.id));
  const videoNodeIds = new Set(
    edges
      .filter((edge) => edge.relation === "generated_video" && imageIds.has(edge.sourceNodeId))
      .map((edge) => edge.targetNodeId),
  );
  const videos = nodes.filter(
    (node): node is CanvasNodeRecord<VideoNodeData> =>
      node.type === "video" && videoNodeIds.has(node.id),
  );

  return { images, videos };
}

export function buildVariantCanvasNodeInput(
  sourceNode: CanvasNodeRecord,
  input: { shapeId?: string; offset?: number } = {},
): CreateCanvasNodeInput<Record<string, CanvasSnapshotJson>> {
  if (!isPhase3CanvasNodeType(sourceNode.type)) {
    throw new Error("Only Phase 3 business nodes can be duplicated as variants");
  }
  const offset = input.offset ?? 36;
  const shapeId =
    input.shapeId ??
    `shape:variant-${sourceNode.id}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  return {
    tldrawShapeId: shapeId,
    type: sourceNode.type,
    title: `${buildBusinessNodeCardModel(sourceNode).title} Variant`,
    x: sourceNode.x + offset,
    y: sourceNode.y + offset,
    width: sourceNode.width,
    height: sourceNode.height,
    zIndex: sourceNode.zIndex + 1,
    status: sourceNode.status,
    dataJson: {
      ...toCanvasData(sourceNode.dataJson),
      variantOfNodeId: sourceNode.id,
    },
  };
}

export async function duplicateNodeAsVariant(input: {
  projectId: string;
  node: CanvasNodeRecord;
  nodes: CanvasNodeRecord[];
  edges: CanvasEdgeRecord[];
  createNode: typeof createCanvasNode;
  createEdge: typeof createCanvasEdge;
}): Promise<CanvasGraphState> {
  const createResult = await input.createNode(
    input.projectId,
    buildVariantCanvasNodeInput(input.node),
  );
  const graphWithNode = {
    nodes: [...input.nodes, createResult.node],
    edges: input.edges,
  };
  const edgeResult = await input.createEdge(input.projectId, {
    sourceNodeId: input.node.id,
    targetNodeId: createResult.node.id,
    relation: "derived_from",
    sourceShapeId: input.node.tldrawShapeId,
    targetShapeId: createResult.node.tldrawShapeId,
    dataJson: {
      variantCreatedAt: new Date().toISOString(),
    },
  });

  return mergeCanvasEdgeCreateResult(graphWithNode, edgeResult);
}

function toCanvasData(value: unknown): Record<string, CanvasSnapshotJson> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? ({ ...(value as Record<string, CanvasSnapshotJson>) } as Record<string, CanvasSnapshotJson>)
    : {};
}
