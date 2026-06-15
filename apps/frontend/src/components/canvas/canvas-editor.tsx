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
  createCanvasEdge,
  createCanvasNode,
  deleteCanvasEdge,
  deleteCanvasNode,
  getProjectCanvas,
  saveCanvasSnapshot,
  updateCanvasNodeGeometry,
  uploadAsset,
} from "../../lib/api";
import { loadCanvasPreferences } from "../../lib/shortcuts";
import { mergeCanvasEdgeCreateResult, mergeCanvasEdgeDeleteResult } from "./canvas-edge-data";
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
import { SemanticBindToolbar } from "./semantic-bind-toolbar";
import {
  buildSemanticBindCreateInput,
  canStartSemanticBind,
  findDirectSemanticDropTarget,
  getAvailableSemanticBindTargets,
  semanticBindKey,
  type SemanticBindTarget,
} from "./semantic-bind-interactions";
import {
  buildBusinessNodeShapeProps,
  getBusinessNodeShapeType,
  isBusinessNodeShape,
  type BusinessNodeShape,
} from "./business-node-shape";
import { businessNodeShapeUtils } from "./business-node-shape-utils";
import {
  sourceMediaCreateInput,
  sourceMediaImportSuccessLabel,
  validateSourceMediaDropFiles,
} from "./source-media-drop";
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
type TldrawCreateBindingsInput = Parameters<Editor["createBindings"]>[0];
type TldrawDeleteBindingsInput = Parameters<Editor["deleteBindings"]>[0];
type CanvasFocusScheduler = (callback: () => void) => void;
type CanvasSelectionFocusEditor = Pick<Editor, "getContainer" | "zoomToSelectionIfOffscreen">;
type CanvasContentFocusEditor = Pick<Editor, "getCurrentPageShapeIds" | "zoomToFit">;
type CanvasFocusRestoreScheduler = (callback: () => void) => void;
type CreateMenuState = {
  x: number;
  y: number;
  pageX: number;
  pageY: number;
};

interface CanvasEditorProps {
  projectId: string;
  canvasDocumentId?: string;
  canvasEdges?: CanvasEdgeRecord[];
  canvasNodes?: CanvasNodeRecord[];
  focusRequest?: { nodeId: string; key: number };
  fitRequestKey?: number;
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

function scheduleCanvasFrame(callback: () => void) {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(callback);
    return;
  }

  callback();
}

function hasFileTransfer(dataTransfer: DataTransfer | null): boolean {
  return Boolean(dataTransfer && Array.from(dataTransfer.types).includes("Files"));
}

function scheduleCanvasFocusRestore(callback: () => void) {
  if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
    window.setTimeout(callback, 100);
    return;
  }

  callback();
}

export function focusCanvasSelection(
  editor: CanvasSelectionFocusEditor,
  scheduleFrame: CanvasFocusScheduler = scheduleCanvasFrame,
  scheduleFocusRestore: CanvasFocusRestoreScheduler = scheduleCanvasFocusRestore,
) {
  scheduleFrame(() => {
    const focusContainer = () => editor.getContainer().focus();

    editor.zoomToSelectionIfOffscreen(256, { inset: 0 });
    focusContainer();
    scheduleFocusRestore(focusContainer);
  });
}

export function focusCanvasContent(
  editor: CanvasContentFocusEditor,
  scheduleFrame: CanvasFocusScheduler = scheduleCanvasFrame,
) {
  if (editor.getCurrentPageShapeIds().size === 0) {
    return;
  }

  scheduleFrame(() => {
    editor.zoomToFit();
  });
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
    createBindings: (bindings) =>
      editor.createBindings(bindings as unknown as TldrawCreateBindingsInput),
    deleteBindings: (bindings) =>
      editor.deleteBindings(bindings as unknown as TldrawDeleteBindingsInput),
    getBindingsFromShape: (shapeId, type) => editor.getBindingsFromShape(shapeId as TLShapeId, type),
  };
}

function restoreCanvasEdgeShape(editor: Editor, nodes: CanvasNodeRecord[], edge: CanvasEdgeRecord) {
  const projection = buildCanvasEdgeArrowProjection(edge, nodes);
  if (!projection || editor.getShape(projection.shape.id as TLShapeId)) {
    return;
  }

  const syncEditor = toCanvasEdgeSyncEditor(editor);
  syncEditor.createShape(projection.shape);
  syncEditor.createBindings(projection.bindings);
  editor.setSelectedShapes([projection.shape.id as TLShapeId]);
}

function createSemanticArrowShapeId(sourceNodeId: string, targetNodeId: string): string {
  return createShapeId(
    [
      "semantic-edge",
      sourceNodeId,
      targetNodeId,
      Date.now().toString(36),
      Math.random().toString(36).slice(2, 8),
    ].join("-"),
  );
}

export function CanvasEditor({
  canvasDocumentId,
  canvasEdges = [],
  focusRequest,
  fitRequestKey,
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
  const [sourceDropBusy, setSourceDropBusy] = useState(false);
  const [createMenu, setCreateMenu] = useState<CreateMenuState | null>(null);
  const [canvasPreferences] = useState(() => loadCanvasPreferences());
  const [selectionState, setSelectionState] =
    useState<CanvasSelectionState>(EMPTY_CANVAS_SELECTION);
  const [semanticBindSourceId, setSemanticBindSourceId] = useState<string | null>(null);
  const [bindingBusy, setBindingBusy] = useState(false);
  const editorRef = useRef<Editor | null>(null);
  const loadRequestIdRef = useRef(0);
  const nodesRef = useRef<CanvasNodeRecord[]>(canvasNodes);
  const edgesRef = useRef<CanvasEdgeRecord[]>(canvasEdges);
  const createNodeSequenceRef = useRef(0);
  const geometrySchedulerRef = useRef<ReturnType<
    typeof createBusinessNodeGeometryScheduler
  > | null>(null);
  const knownEdgeShapeIdsRef = useRef(new Set<string>());
  const lastFitRequestKeyRef = useRef<number | undefined>(undefined);
  const lastFocusRequestKeyRef = useRef<number | undefined>(undefined);
  const ignoredRemovedShapeIdsRef = useRef(new Set<string>());
  const ignoredRemovedEdgeShapeIdsRef = useRef(new Set<string>());
  const deletingNodeIdsRef = useRef(new Set<string>());
  const deletingEdgeIdsRef = useRef(new Set<string>());
  const semanticBindingKeysInFlightRef = useRef(new Set<string>());

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

  const publishSelection = useCallback(
    (selection: CanvasSelectionState) => {
      setSelectionState(selection);
      onSelectionChange?.(selection);
    },
    [onSelectionChange],
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
      await saveCanvasSnapshot(currentProjectId, { canvasDocumentId, snapshotJson: nextSnapshotJson });
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

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || loading || fitRequestKey === undefined) {
      return;
    }
    if (lastFitRequestKeyRef.current === fitRequestKey) {
      return;
    }

    lastFitRequestKeyRef.current = fitRequestKey;
    window.requestAnimationFrame(() => {
      editor.zoomToFit();
    });
  }, [canvasEdges, canvasNodes, fitRequestKey, loading]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || loading || !focusRequest) {
      return;
    }
    if (lastFocusRequestKeyRef.current === focusRequest.key) {
      return;
    }

    const node = canvasNodes.find((candidate) => candidate.id === focusRequest.nodeId);
    if (!node || !isPhase3CanvasNodeType(node.type)) {
      return;
    }

    lastFocusRequestKeyRef.current = focusRequest.key;
    const shapeId = nodeShapeId(node);
    if (!editor.getShape(shapeId)) {
      restoreBusinessNodeShape(editor, node);
    }
    editor.setSelectedShapes([shapeId]);
    publishSelection({ kind: "business-node", nodeId: node.id });
    focusCanvasSelection(editor);
  }, [canvasNodes, focusRequest, loading, publishSelection]);

  const loadCanvas = useCallback(() => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    setLoadError(null);
    setNodeActionError(null);
    setSnapshotJson(null);
    publishCanvasNodes([]);
    publishCanvasEdges([]);
    publishSelection(EMPTY_CANVAS_SELECTION);

    getProjectCanvas(projectId, canvasDocumentId)
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
  }, [canvasDocumentId, projectId, publishCanvasEdges, publishCanvasNodes, publishSelection]);

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
      publishSelection(
        selectionFromShapes(editor.getSelectedShapes(), {
          edgeShapeToEdgeId: buildCanvasEdgeShapeIdMap(edgesRef.current),
        }),
      );
    },
    [publishSelection],
  );

  const duplicateBusinessShape = useCallback(
    async (editor: Editor, shape: BusinessNodeShape, sourceNode: CanvasNodeRecord) => {
      if (!isPhase3CanvasNodeType(sourceNode.type)) {
        return;
      }

      try {
        const title = buildBusinessNodeCardModel(sourceNode).title;
        const result = await createCanvasNode(projectId, {
          canvasDocumentId,
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
    [canvasDocumentId, projectId, publishCanvasNodes],
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

  const commitSemanticBinding = useCallback(
    async (
      sourceNode: CanvasNodeRecord,
      target: SemanticBindTarget,
      visualInput: { sourceShapeId?: string; targetShapeId?: string } = {},
    ) => {
      const input = buildSemanticBindCreateInput({
        sourceNode,
        target,
        sourceShapeId: visualInput.sourceShapeId,
        targetShapeId: visualInput.targetShapeId,
        visualArrowShapeId: createSemanticArrowShapeId(sourceNode.id, target.node.id),
      });
      if (!input) {
        return;
      }

      const bindKey = semanticBindKey(input.sourceNodeId, input.targetNodeId);
      if (semanticBindingKeysInFlightRef.current.has(bindKey)) {
        return;
      }

      semanticBindingKeysInFlightRef.current.add(bindKey);
      setBindingBusy(true);
      setNodeActionError(null);
      try {
        const result = await createCanvasEdge(projectId, { ...input, canvasDocumentId });
        const merged = mergeCanvasEdgeCreateResult(
          { nodes: nodesRef.current, edges: edgesRef.current },
          result,
        );
        publishCanvasNodes(merged.nodes);
        publishCanvasEdges(merged.edges);
        setSemanticBindSourceId(null);
      } catch (error) {
        setNodeActionError(errorMessage(error));
      } finally {
        semanticBindingKeysInFlightRef.current.delete(bindKey);
        setBindingBusy(semanticBindingKeysInFlightRef.current.size > 0);
      }
    },
    [canvasDocumentId, projectId, publishCanvasEdges, publishCanvasNodes],
  );

  const handleBusinessShapeUpdated = useCallback(
    (shape: TLShape) => {
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

      if (!node || !canStartSemanticBind(node)) {
        return;
      }

      const movedSourceNode: CanvasNodeRecord = {
        ...node,
        x: shape.x,
        y: shape.y,
        width: shape.props.w,
        height: shape.props.h,
      };
      const nodesWithMovedSource = nodesRef.current.map((candidate) =>
        candidate.id === movedSourceNode.id ? movedSourceNode : candidate,
      );
      const target = findDirectSemanticDropTarget(
        movedSourceNode,
        nodesWithMovedSource,
        edgesRef.current,
      );
      if (target) {
        void commitSemanticBinding(movedSourceNode, target, {
          sourceShapeId: shape.id,
          targetShapeId: target.node.tldrawShapeId,
        });
      }
    },
    [commitSemanticBinding],
  );

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
          publishSelection(EMPTY_CANVAS_SELECTION);
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
    [emitSelection, projectId, publishCanvasEdges, publishCanvasNodes, publishSelection, scheduleSave],
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
          publishSelection(EMPTY_CANVAS_SELECTION);
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
    [emitSelection, projectId, publishCanvasEdges, publishCanvasNodes, publishSelection, scheduleSave],
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
      focusCanvasContent(editor);

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
    async (type: Phase3CanvasNodeType, position?: Pick<CreateMenuState, "pageX" | "pageY">) => {
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
      const x = position?.pageX ?? 96 + offset;
      const y = position?.pageY ?? 96 + offset;
      const input = createBusinessCanvasNodeInput(type, {
        tldrawShapeId: shapeId,
        x,
        y,
        width: canvasPreferences.defaultNodeWidth,
        height: canvasPreferences.defaultNodeHeight,
        zIndex: nodesRef.current.length,
      });

      setCreateMenu(null);
      setCreatingNodeType(type);
      setNodeActionError(null);
      try {
        const result = await createCanvasNode(projectId, { ...input, canvasDocumentId });
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
        focusCanvasSelection(editor);
      } catch (error) {
        setNodeActionError(errorMessage(error));
      } finally {
        setCreatingNodeType(null);
      }
    },
    [canvasDocumentId, canvasPreferences, emitSelection, projectId, publishCanvasNodes],
  );

  const handleCanvasContextMenu = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 240;
    const menuHeight = 420;
    const x = Math.max(10, Math.min(event.clientX - rect.left, rect.width - menuWidth - 10));
    const y = Math.max(10, Math.min(event.clientY - rect.top, rect.height - menuHeight - 10));
    const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY });
    setCreateMenu({ x, y, pageX: pagePoint.x, pageY: pagePoint.y });
  }, []);

  useEffect(() => {
    if (!createMenu) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest(".business-node-toolbar")) {
        return;
      }
      setCreateMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCreateMenu(null);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [createMenu]);

  const handleSourceMediaDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFileTransfer(event.dataTransfer)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = sourceDropBusy ? "none" : "copy";
    },
    [sourceDropBusy],
  );

  const handleSourceMediaDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      if (!hasFileTransfer(event.dataTransfer)) {
        return;
      }
      event.preventDefault();

      const editor = editorRef.current;
      if (!editor) {
        setNodeActionError("Canvas is not ready for file import.");
        return;
      }

      const validation = validateSourceMediaDropFiles(Array.from(event.dataTransfer.files));
      if (validation.accepted.length === 0) {
        setNodeActionError(validation.errors.join(" "));
        return;
      }

      const pagePoint = editor.screenToPage({ x: event.clientX, y: event.clientY });
      const failures = [...validation.errors];
      let importedCount = 0;

      setSourceDropBusy(true);
      setNodeActionError(null);
      try {
        for (const [index, candidate] of validation.accepted.entries()) {
          try {
            const asset = await uploadAsset(projectId, {
              file: candidate.file,
              purpose: "uploaded",
            });
            createNodeSequenceRef.current += 1;
            const shapeId = createShapeId(
              [
                "source",
                candidate.nodeType,
                Date.now().toString(36),
                createNodeSequenceRef.current.toString(36),
                Math.random().toString(36).slice(2, 8),
              ].join("-"),
            );
            const input = sourceMediaCreateInput({
              asset,
              nodeType: candidate.nodeType,
              tldrawShapeId: shapeId,
              x: pagePoint.x + index * 28,
              y: pagePoint.y + index * 28,
              width: canvasPreferences.defaultNodeWidth,
              height: canvasPreferences.defaultNodeHeight,
              zIndex: nodesRef.current.length,
            });
            const result = await createCanvasNode(projectId, { ...input, canvasDocumentId });
            publishCanvasNodes([...nodesRef.current, result.node]);
            editor.createShape({
              id: shapeId,
              type: getBusinessNodeShapeType(candidate.nodeType),
              x: result.node.x,
              y: result.node.y,
              props: buildBusinessNodeShapeProps(result.node),
            });
            editor.setSelectedShapes([shapeId]);
            importedCount += 1;
          } catch (error) {
            const label = candidate.file.name || sourceMediaImportSuccessLabel(candidate.nodeType);
            failures.push(`${label}: ${errorMessage(error)}`);
          }
        }

        if (importedCount > 0) {
          emitSelection(editor);
          focusCanvasSelection(editor);
          scheduleSave(editorSnapshotToJson(editor));
        }
      } finally {
        setSourceDropBusy(false);
      }

      if (failures.length > 0) {
        const prefix = importedCount > 0 ? `Imported ${importedCount} source file${importedCount === 1 ? "" : "s"}. ` : "";
        setNodeActionError(`${prefix}${failures.join(" ")}`);
      }
    },
    [canvasDocumentId, canvasPreferences, emitSelection, projectId, publishCanvasNodes, scheduleSave],
  );

  const selectedBusinessNode =
    selectionState.kind === "business-node"
      ? canvasNodes.find((node) => node.id === selectionState.nodeId)
      : undefined;
  const semanticBindSourceNode = semanticBindSourceId
    ? canvasNodes.find((node) => node.id === semanticBindSourceId)
    : selectedBusinessNode;
  const semanticBindSourceLabel = canStartSemanticBind(semanticBindSourceNode)
    ? buildBusinessNodeCardModel(semanticBindSourceNode).title
    : undefined;
  const semanticBindTargets = semanticBindSourceNode
    ? getAvailableSemanticBindTargets(semanticBindSourceNode, canvasNodes, canvasEdges)
    : [];

  const handleToggleSemanticBind = useCallback(() => {
    if (semanticBindSourceId) {
      setSemanticBindSourceId(null);
      return;
    }
    if (selectedBusinessNode && canStartSemanticBind(selectedBusinessNode)) {
      setSemanticBindSourceId(selectedBusinessNode.id);
    }
  }, [selectedBusinessNode, semanticBindSourceId]);

  const handleCancelSemanticBind = useCallback(() => {
    setSemanticBindSourceId(null);
  }, []);

  const handleSemanticBindTarget = useCallback(
    (target: SemanticBindTarget) => {
      if (!semanticBindSourceNode) {
        return;
      }
      void commitSemanticBinding(semanticBindSourceNode, target);
    },
    [commitSemanticBinding, semanticBindSourceNode],
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
    <div
      className="canvas-editor-shell"
      onContextMenuCapture={handleCanvasContextMenu}
      onDragOver={handleSourceMediaDragOver}
      onDrop={(event) => void handleSourceMediaDrop(event)}
    >
      <Tldraw onMount={handleMount} shapeUtils={businessNodeShapeUtils} autoFocus />
      {createMenu ? (
        <BusinessNodeToolbar
          busy={creatingNodeType !== null || sourceDropBusy}
          style={
            {
              "--create-menu-x": `${createMenu.x}px`,
              "--create-menu-y": `${createMenu.y}px`,
            } as React.CSSProperties
          }
          onCreate={(type) =>
            void handleCreateBusinessNode(type, {
              pageX: createMenu.pageX,
              pageY: createMenu.pageY,
            })
          }
        />
      ) : null}
      <SemanticBindToolbar
        active={semanticBindSourceId !== null}
        busy={bindingBusy}
        sourceLabel={semanticBindSourceLabel}
        targets={semanticBindTargets}
        onBind={handleSemanticBindTarget}
        onCancel={handleCancelSemanticBind}
        onToggle={handleToggleSemanticBind}
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
