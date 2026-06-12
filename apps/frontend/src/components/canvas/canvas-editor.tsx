"use client";

import type {
  CanvasEdgeRecord,
  CanvasNodeRecord,
  CanvasSaveStatus,
  CanvasSnapshotJson,
  Phase3CanvasNodeType,
} from "@guga-flow/shared-types";
import { Maximize2, RotateCcw } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, createShapeId, type Editor, type TLShape, type TLShapeId } from "tldraw";

import {
  createCanvasNode,
  deleteCanvasEdge,
  deleteCanvasNode,
  getProjectCanvas,
  saveCanvasSnapshot,
  updateCanvasNodeGeometry,
} from "../../lib/api";
import { mergeCanvasEdgeDeleteResult } from "./canvas-edge-data";
import {
  buildCanvasEdgeArrowProjection,
  buildCanvasEdgeShapeIdMap,
  findCanvasEdgeByVisualShapeId,
  getCanvasEdgeVisualShapeId,
} from "./canvas-edge-visuals";
import { type CanvasSelectionState, EMPTY_CANVAS_SELECTION } from "./canvas-selection";
import {
  buildBusinessNodeCardModel,
  createBusinessCanvasNodeInput,
  isPhase3CanvasNodeType,
} from "./business-node-data";
import { BusinessNodeToolbar } from "./business-node-toolbar";
import {
  buildBusinessNodeShapeProps,
  getBusinessNodeShapeType,
  isBusinessNodeShape,
  type BusinessNodeShape,
} from "./business-node-shape";
import {
  BUSINESS_NODE_DEFAULT_HEIGHT,
  BUSINESS_NODE_DEFAULT_WIDTH,
  businessNodeShapeUtils,
} from "./business-node-shape-utils";
import { createBusinessNodeGeometryScheduler } from "./use-business-node-sync";
import { useCanvasAutosave } from "./use-canvas-autosave";
import {
  connectedCanvasEdgeShapeIds,
  reconcileCanvasEdgeShapes,
  type CanvasEdgeSyncEditor,
} from "./use-canvas-edge-sync";
import { selectionFromShapes } from "./use-selected-business-nodes";

type TldrawSnapshot = Parameters<Editor["loadSnapshot"]>[0];
type TldrawCreateShapeInput = Parameters<Editor["createShape"]>[0];
type TldrawUpdateShapeInput = Parameters<Editor["updateShape"]>[0];

interface CanvasEditorProps {
  projectId: string;
  canvasEdges?: CanvasEdgeRecord[];
  canvasNodes?: CanvasNodeRecord[];
  onCanvasEdgesChange?: (edges: CanvasEdgeRecord[]) => void;
  onCanvasNodesChange?: (nodes: CanvasNodeRecord[]) => void;
  onSelectionChange?: (selection: CanvasSelectionState) => void;
  onSaveStatusChange?: (status: CanvasSaveStatus, error: string | null) => void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load canvas";
}

function hasPersistedSnapshot(snapshotJson: CanvasSnapshotJson): boolean {
  return (
    typeof snapshotJson === "object" &&
    snapshotJson !== null &&
    !Array.isArray(snapshotJson) &&
    Object.keys(snapshotJson).length > 0
  );
}

function editorSnapshotToJson(editor: Editor): CanvasSnapshotJson {
  return editor.getSnapshot() as unknown as CanvasSnapshotJson;
}

function nodeShapeId(node: CanvasNodeRecord): TLShapeId {
  return node.tldrawShapeId as TLShapeId;
}

function nodeDataForCreate(node: CanvasNodeRecord): CanvasSnapshotJson {
  return node.dataJson as CanvasSnapshotJson;
}

function zIndexForNode(node: CanvasNodeRecord | undefined): number {
  return node?.zIndex ?? 0;
}

function mergeCanvasNode(nodes: CanvasNodeRecord[], nextNode: CanvasNodeRecord): CanvasNodeRecord[] {
  const index = nodes.findIndex((node) => node.id === nextNode.id);
  if (index === -1) {
    return [...nodes, nextNode];
  }

  const nextNodes = [...nodes];
  nextNodes[index] = nextNode;
  return nextNodes;
}

function restoreBusinessNodeShape(editor: Editor, node: CanvasNodeRecord) {
  if (!isPhase3CanvasNodeType(node.type)) {
    return;
  }

  const shapeId = nodeShapeId(node);
  if (editor.getShape(shapeId)) {
    return;
  }

  editor.createShape({
    id: shapeId,
    type: getBusinessNodeShapeType(node.type),
    x: node.x,
    y: node.y,
    props: buildBusinessNodeShapeProps(node),
  });
  editor.setSelectedShapes([shapeId]);
}

function toCanvasEdgeSyncEditor(editor: Editor): CanvasEdgeSyncEditor {
  return {
    getShape: (shapeId) => editor.getShape(shapeId as TLShapeId),
    createShape: (shape) => editor.createShape(shape as unknown as TldrawCreateShapeInput),
    updateShape: (shape) => editor.updateShape(shape as unknown as TldrawUpdateShapeInput),
    deleteShapes: (shapeIds) => editor.deleteShapes(shapeIds as TLShapeId[]),
  };
}

function restoreCanvasEdgeShape(editor: Editor, nodes: CanvasNodeRecord[], edge: CanvasEdgeRecord) {
  const projection = buildCanvasEdgeArrowProjection(edge, nodes);
  if (!projection || editor.getShape(projection.id as TLShapeId)) {
    return;
  }

  editor.createShape(projection as unknown as TldrawCreateShapeInput);
  editor.setSelectedShapes([projection.id as TLShapeId]);
}

export function CanvasEditor({
  canvasEdges = [],
  projectId,
  canvasNodes = [],
  onCanvasEdgesChange,
  onCanvasNodesChange,
  onSaveStatusChange,
  onSelectionChange,
}: CanvasEditorProps) {
  const [snapshotJson, setSnapshotJson] = useState<CanvasSnapshotJson | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nodeActionError, setNodeActionError] = useState<string | null>(null);
  const [creatingNodeType, setCreatingNodeType] = useState<Phase3CanvasNodeType | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const loadRequestIdRef = useRef(0);
  const nodesRef = useRef<CanvasNodeRecord[]>(canvasNodes);
  const edgesRef = useRef<CanvasEdgeRecord[]>(canvasEdges);
  const createNodeSequenceRef = useRef(0);
  const geometrySchedulerRef = useRef<ReturnType<
    typeof createBusinessNodeGeometryScheduler
  > | null>(null);
  const knownEdgeShapeIdsRef = useRef(new Set<string>());
  const ignoredRemovedShapeIdsRef = useRef(new Set<string>());
  const ignoredRemovedEdgeShapeIdsRef = useRef(new Set<string>());
  const deletingNodeIdsRef = useRef(new Set<string>());
  const deletingEdgeIdsRef = useRef(new Set<string>());

  const publishCanvasNodes = useCallback(
    (nodes: CanvasNodeRecord[]) => {
      nodesRef.current = nodes;
      onCanvasNodesChange?.(nodes);
    },
    [onCanvasNodesChange],
  );

  const publishCanvasEdges = useCallback(
    (edges: CanvasEdgeRecord[]) => {
      edgesRef.current = edges;
      onCanvasEdgesChange?.(edges);
    },
    [onCanvasEdgesChange],
  );

  useEffect(() => {
    nodesRef.current = canvasNodes;
  }, [canvasNodes]);

  useEffect(() => {
    edgesRef.current = canvasEdges;
  }, [canvasEdges]);

  const autosave = useCanvasAutosave({
    projectId,
    saveSnapshot: async (currentProjectId, nextSnapshotJson) => {
      await saveCanvasSnapshot(currentProjectId, { snapshotJson: nextSnapshotJson });
    },
  });
  const {
    error: autosaveError,
    retry: retryAutosave,
    scheduleSave,
    status: autosaveStatus,
  } = autosave;

  useEffect(() => {
    geometrySchedulerRef.current?.dispose();
    geometrySchedulerRef.current = createBusinessNodeGeometryScheduler({
      projectId,
      patchGeometry: updateCanvasNodeGeometry,
      onGeometrySaved: (node) => {
        publishCanvasNodes(mergeCanvasNode(nodesRef.current, node));
      },
      onError: (message) => setNodeActionError(message),
    });

    return () => {
      geometrySchedulerRef.current?.dispose();
      geometrySchedulerRef.current = null;
    };
  }, [projectId, publishCanvasNodes]);

  const reconcileBusinessNodes = useCallback((editor: Editor, nodes: CanvasNodeRecord[]) => {
    for (const node of nodes) {
      if (!isPhase3CanvasNodeType(node.type)) {
        continue;
      }

      const shapeId = nodeShapeId(node);
      const shapeType = getBusinessNodeShapeType(node.type);
      const props = buildBusinessNodeShapeProps(node);
      const existingShape = editor.getShape(shapeId);

      if (!existingShape) {
        editor.createShape({
          id: shapeId,
          type: shapeType,
          x: node.x,
          y: node.y,
          props,
        });
        continue;
      }

      if (isBusinessNodeShape(existingShape)) {
        editor.updateShape({
          id: shapeId,
          type: existingShape.type,
          x: node.x,
          y: node.y,
          props,
        });
      }
    }
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || loading) {
      return;
    }

    try {
      reconcileBusinessNodes(editor, canvasNodes);
    } catch (error) {
      setNodeActionError(errorMessage(error));
    }
  }, [canvasNodes, loading, reconcileBusinessNodes]);

  const reconcileCanvasEdges = useCallback(
    (editor: Editor, nodes: CanvasNodeRecord[], edges: CanvasEdgeRecord[]) => {
      const result = reconcileCanvasEdgeShapes({
        editor: toCanvasEdgeSyncEditor(editor),
        nodes,
        edges,
        knownShapeIds: knownEdgeShapeIdsRef.current,
      });
      knownEdgeShapeIdsRef.current = result.nextKnownShapeIds;
      return result;
    },
    [],
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || loading) {
      return;
    }

    try {
      const result = reconcileCanvasEdges(editor, canvasNodes, canvasEdges);
      if (result.changed) {
        scheduleSave(editorSnapshotToJson(editor));
      }
    } catch (error) {
      setNodeActionError(errorMessage(error));
    }
  }, [canvasEdges, canvasNodes, loading, reconcileCanvasEdges, scheduleSave]);

  const loadCanvas = useCallback(() => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    setLoadError(null);
    setNodeActionError(null);
    setSnapshotJson(null);
    publishCanvasNodes([]);
    publishCanvasEdges([]);
    onSelectionChange?.(EMPTY_CANVAS_SELECTION);

    getProjectCanvas(projectId)
      .then((result) => {
        if (loadRequestIdRef.current !== requestId) {
          return;
        }
        setSnapshotJson(result.canvasDocument.snapshotJson);
        publishCanvasNodes(result.nodes);
        publishCanvasEdges(result.edges);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (loadRequestIdRef.current !== requestId) {
          return;
        }
        setLoadError(errorMessage(error));
        setLoading(false);
      });
  }, [onSelectionChange, projectId, publishCanvasEdges, publishCanvasNodes]);

  useEffect(() => {
    loadCanvas();

    return () => {
      loadRequestIdRef.current += 1;
    };
  }, [loadCanvas]);

  useEffect(() => {
    if (loadError) {
      onSaveStatusChange?.("failed", loadError);
      return;
    }
    onSaveStatusChange?.(autosaveStatus, autosaveError);
  }, [autosaveError, autosaveStatus, loadError, onSaveStatusChange]);

  const emitSelection = useCallback(
    (editor: Editor) => {
      onSelectionChange?.(
        selectionFromShapes(editor.getSelectedShapes(), {
          edgeShapeToEdgeId: buildCanvasEdgeShapeIdMap(edgesRef.current),
        }),
      );
    },
    [onSelectionChange],
  );

  const duplicateBusinessShape = useCallback(
    async (editor: Editor, shape: BusinessNodeShape, sourceNode: CanvasNodeRecord) => {
      if (!isPhase3CanvasNodeType(sourceNode.type)) {
        return;
      }

      try {
        const title = buildBusinessNodeCardModel(sourceNode).title;
        const result = await createCanvasNode(projectId, {
          tldrawShapeId: shape.id,
          type: sourceNode.type,
          title: `${title} Copy`,
          x: shape.x,
          y: shape.y,
          width: shape.props.w,
          height: shape.props.h,
          zIndex: sourceNode.zIndex + 1,
          status: sourceNode.status,
          dataJson: nodeDataForCreate(sourceNode),
        });
        const nextNodes = [...nodesRef.current, result.node];
        publishCanvasNodes(nextNodes);
        editor.updateShape({
          id: shape.id,
          type: shape.type,
          props: buildBusinessNodeShapeProps(result.node),
        });
      } catch (error) {
        ignoredRemovedShapeIdsRef.current.add(shape.id);
        editor.deleteShapes([shape.id]);
        setNodeActionError(errorMessage(error));
      }
    },
    [projectId, publishCanvasNodes],
  );

  const handleBusinessShapeAdded = useCallback(
    (editor: Editor, shape: TLShape) => {
      if (!isBusinessNodeShape(shape)) {
        return;
      }

      const sourceNode = nodesRef.current.find((node) => node.id === shape.props.nodeId);
      if (!sourceNode || sourceNode.tldrawShapeId === shape.id) {
        return;
      }

      void duplicateBusinessShape(editor, shape, sourceNode);
    },
    [duplicateBusinessShape],
  );

  const handleBusinessShapeUpdated = useCallback((shape: TLShape) => {
    if (!isBusinessNodeShape(shape)) {
      return;
    }

    const node = nodesRef.current.find((candidate) => candidate.id === shape.props.nodeId);
    geometrySchedulerRef.current?.schedule(shape.props.nodeId, {
      x: shape.x,
      y: shape.y,
      width: shape.props.w,
      height: shape.props.h,
      zIndex: zIndexForNode(node),
    });
  }, []);

  const handleBusinessShapeRemoved = useCallback(
    (shape: TLShape) => {
      if (!isBusinessNodeShape(shape)) {
        return;
      }

      if (ignoredRemovedShapeIdsRef.current.delete(shape.id)) {
        return;
      }
      if (deletingNodeIdsRef.current.has(shape.props.nodeId)) {
        return;
      }

      const removedNode = nodesRef.current.find((node) => node.id === shape.props.nodeId);
      deletingNodeIdsRef.current.add(shape.props.nodeId);
      deleteCanvasNode(projectId, shape.props.nodeId)
        .then(() => {
          const connectedShapeIds = connectedCanvasEdgeShapeIds(edgesRef.current, shape.props.nodeId);
          for (const shapeId of connectedShapeIds) {
            ignoredRemovedEdgeShapeIdsRef.current.add(shapeId);
          }
          if (connectedShapeIds.length > 0) {
            editorRef.current?.deleteShapes(connectedShapeIds as TLShapeId[]);
          }
          knownEdgeShapeIdsRef.current = new Set(
            Array.from(knownEdgeShapeIdsRef.current).filter(
              (shapeId) => !connectedShapeIds.includes(shapeId),
            ),
          );
          publishCanvasEdges(
            edgesRef.current.filter(
              (edge) =>
                edge.sourceNodeId !== shape.props.nodeId && edge.targetNodeId !== shape.props.nodeId,
            ),
          );
          publishCanvasNodes(nodesRef.current.filter((node) => node.id !== shape.props.nodeId));
          onSelectionChange?.(EMPTY_CANVAS_SELECTION);
        })
        .catch((error: unknown) => {
          setNodeActionError(errorMessage(error));
          const editor = editorRef.current;
          if (editor && removedNode) {
            restoreBusinessNodeShape(editor, removedNode);
            emitSelection(editor);
            scheduleSave(editorSnapshotToJson(editor));
          }
        })
        .finally(() => {
          deletingNodeIdsRef.current.delete(shape.props.nodeId);
        });
    },
    [emitSelection, onSelectionChange, projectId, publishCanvasEdges, publishCanvasNodes, scheduleSave],
  );

  const handleCanvasEdgeShapeRemoved = useCallback(
    (shape: TLShape) => {
      if (shape.type !== "arrow") {
        return;
      }
      if (ignoredRemovedEdgeShapeIdsRef.current.delete(shape.id)) {
        return;
      }

      const edge = findCanvasEdgeByVisualShapeId(edgesRef.current, shape.id);
      if (!edge || deletingEdgeIdsRef.current.has(edge.id)) {
        return;
      }

      deletingEdgeIdsRef.current.add(edge.id);
      deleteCanvasEdge(projectId, edge.id)
        .then((result) => {
          const deletedShapeIds = new Set(
            edgesRef.current
              .filter((candidate) => result.deletedEdgeIds.includes(candidate.id))
              .map((candidate) => getCanvasEdgeVisualShapeId(candidate)),
          );
          const merged = mergeCanvasEdgeDeleteResult(
            { nodes: nodesRef.current, edges: edgesRef.current },
            result,
          );
          knownEdgeShapeIdsRef.current = new Set(
            Array.from(knownEdgeShapeIdsRef.current).filter(
              (shapeId) => !deletedShapeIds.has(shapeId),
            ),
          );
          publishCanvasNodes(merged.nodes);
          publishCanvasEdges(merged.edges);
          onSelectionChange?.(EMPTY_CANVAS_SELECTION);
        })
        .catch((error: unknown) => {
          setNodeActionError(errorMessage(error));
          const editor = editorRef.current;
          if (editor) {
            restoreCanvasEdgeShape(editor, nodesRef.current, edge);
            knownEdgeShapeIdsRef.current.add(getCanvasEdgeVisualShapeId(edge));
            emitSelection(editor);
            scheduleSave(editorSnapshotToJson(editor));
          }
        })
        .finally(() => {
          deletingEdgeIdsRef.current.delete(edge.id);
        });
    },
    [emitSelection, onSelectionChange, projectId, publishCanvasEdges, publishCanvasNodes, scheduleSave],
  );

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      if (snapshotJson && hasPersistedSnapshot(snapshotJson)) {
        editor.loadSnapshot(snapshotJson as unknown as TldrawSnapshot);
      }
      reconcileBusinessNodes(editor, nodesRef.current);
      const edgeReconcileResult = reconcileCanvasEdges(editor, nodesRef.current, edgesRef.current);
      if (edgeReconcileResult.changed) {
        scheduleSave(editorSnapshotToJson(editor));
      }
      emitSelection(editor);

      const removeListener = editor.store.listen(
        (entry) => {
          scheduleSave(editorSnapshotToJson(editor));
          for (const record of Object.values(entry.changes.added)) {
            if (record.typeName === "shape") {
              handleBusinessShapeAdded(editor, record as TLShape);
            }
          }
          for (const [, to] of Object.values(entry.changes.updated)) {
            if (to.typeName === "shape") {
              handleBusinessShapeUpdated(to as TLShape);
            }
          }
          for (const record of Object.values(entry.changes.removed)) {
            if (record.typeName === "shape") {
              handleBusinessShapeRemoved(record as TLShape);
              handleCanvasEdgeShapeRemoved(record as TLShape);
            }
          }
        },
        { source: "user", scope: "document" },
      );
      const removeSelectionListener = editor.store.listen(() => {
        emitSelection(editor);
      });

      return () => {
        removeListener();
        removeSelectionListener();
        if (editorRef.current === editor) {
          editorRef.current = null;
        }
      };
    },
    [
      emitSelection,
      handleBusinessShapeAdded,
      handleBusinessShapeRemoved,
      handleCanvasEdgeShapeRemoved,
      handleBusinessShapeUpdated,
      reconcileCanvasEdges,
      reconcileBusinessNodes,
      scheduleSave,
      snapshotJson,
    ],
  );

  const handleFitToContent = useCallback(() => {
    editorRef.current?.zoomToFit();
  }, []);

  const handleCreateBusinessNode = useCallback(
    async (type: Phase3CanvasNodeType) => {
      const editor = editorRef.current;
      if (!editor) {
        return;
      }

      createNodeSequenceRef.current += 1;
      const shapeId = createShapeId(
        [
          "business",
          type,
          Date.now().toString(36),
          createNodeSequenceRef.current.toString(36),
          Math.random().toString(36).slice(2, 8),
        ].join("-"),
      );
      const offset = Math.min(nodesRef.current.length, 12) * 28;
      const input = createBusinessCanvasNodeInput(type, {
        tldrawShapeId: shapeId,
        x: 96 + offset,
        y: 96 + offset,
        width: BUSINESS_NODE_DEFAULT_WIDTH,
        height: BUSINESS_NODE_DEFAULT_HEIGHT,
        zIndex: nodesRef.current.length,
      });

      setCreatingNodeType(type);
      setNodeActionError(null);
      try {
        const result = await createCanvasNode(projectId, input);
        publishCanvasNodes([...nodesRef.current, result.node]);
        editor.createShape({
          id: shapeId,
          type: getBusinessNodeShapeType(type),
          x: result.node.x,
          y: result.node.y,
          props: buildBusinessNodeShapeProps(result.node),
        });
        editor.setSelectedShapes([shapeId]);
        emitSelection(editor);
      } catch (error) {
        setNodeActionError(errorMessage(error));
      } finally {
        setCreatingNodeType(null);
      }
    },
    [emitSelection, projectId, publishCanvasNodes],
  );

  if (loading) {
    return (
      <div className="canvas-editor-state" role="status">
        Loading canvas
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="canvas-editor-state error" role="alert">
        <strong>Canvas unavailable</strong>
        <span>{loadError}</span>
        <button className="ghost-action" type="button" onClick={loadCanvas}>
          <RotateCcw size={15} aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="canvas-editor-shell">
      <Tldraw onMount={handleMount} shapeUtils={businessNodeShapeUtils} autoFocus />
      <BusinessNodeToolbar
        busy={creatingNodeType !== null}
        onCreate={(type) => void handleCreateBusinessNode(type)}
      />
      <div className="canvas-editor-controls" aria-label="Canvas controls">
        <button
          className="canvas-control-button"
          type="button"
          title="Fit to content"
          onClick={handleFitToContent}
        >
          <Maximize2 size={16} aria-hidden="true" />
        </button>
      </div>
      {autosaveStatus === "failed" ? (
        <div className="canvas-save-error" role="alert">
          <span>{autosaveError ?? "Canvas save failed"}</span>
          <button className="ghost-action" type="button" onClick={() => void retryAutosave()}>
            <RotateCcw size={15} aria-hidden="true" />
            Retry
          </button>
        </div>
      ) : null}
      {nodeActionError ? (
        <div className="canvas-save-error node-action-error" role="alert">
          <span>{nodeActionError}</span>
          <button className="ghost-action" type="button" onClick={() => setNodeActionError(null)}>
            <RotateCcw size={15} aria-hidden="true" />
            Dismiss
          </button>
        </div>
      ) : null}
    </div>
  );
}
