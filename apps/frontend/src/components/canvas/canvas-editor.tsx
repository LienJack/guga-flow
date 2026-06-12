"use client";

import type {
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
  deleteCanvasNode,
  getProjectCanvas,
  saveCanvasSnapshot,
  updateCanvasNodeGeometry,
} from "../../lib/api";
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
import { selectionFromShapes } from "./use-selected-business-nodes";

type TldrawSnapshot = Parameters<Editor["loadSnapshot"]>[0];

interface CanvasEditorProps {
  projectId: string;
  canvasNodes?: CanvasNodeRecord[];
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

export function CanvasEditor({
  projectId,
  canvasNodes = [],
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
  const geometrySchedulerRef = useRef<ReturnType<
    typeof createBusinessNodeGeometryScheduler
  > | null>(null);
  const ignoredRemovedShapeIdsRef = useRef(new Set<string>());
  const deletingNodeIdsRef = useRef(new Set<string>());

  const publishCanvasNodes = useCallback(
    (nodes: CanvasNodeRecord[]) => {
      nodesRef.current = nodes;
      onCanvasNodesChange?.(nodes);
    },
    [onCanvasNodesChange],
  );

  useEffect(() => {
    nodesRef.current = canvasNodes;
  }, [canvasNodes]);

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
      onError: (message) => setNodeActionError(message),
    });

    return () => {
      geometrySchedulerRef.current?.dispose();
      geometrySchedulerRef.current = null;
    };
  }, [projectId]);

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

  const loadCanvas = useCallback(() => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    setLoading(true);
    setLoadError(null);
    setNodeActionError(null);
    setSnapshotJson(null);
    publishCanvasNodes([]);
    onSelectionChange?.(EMPTY_CANVAS_SELECTION);

    getProjectCanvas(projectId)
      .then((result) => {
        if (loadRequestIdRef.current !== requestId) {
          return;
        }
        setSnapshotJson(result.canvasDocument.snapshotJson);
        publishCanvasNodes(result.nodes);
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (loadRequestIdRef.current !== requestId) {
          return;
        }
        setLoadError(errorMessage(error));
        setLoading(false);
      });
  }, [onSelectionChange, projectId, publishCanvasNodes]);

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
      onSelectionChange?.(selectionFromShapes(editor.getSelectedShapes()));
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

      deletingNodeIdsRef.current.add(shape.props.nodeId);
      deleteCanvasNode(projectId, shape.props.nodeId)
        .then(() => {
          publishCanvasNodes(nodesRef.current.filter((node) => node.id !== shape.props.nodeId));
          onSelectionChange?.(EMPTY_CANVAS_SELECTION);
        })
        .catch((error: unknown) => {
          setNodeActionError(errorMessage(error));
        })
        .finally(() => {
          deletingNodeIdsRef.current.delete(shape.props.nodeId);
        });
    },
    [onSelectionChange, projectId, publishCanvasNodes],
  );

  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      if (snapshotJson && hasPersistedSnapshot(snapshotJson)) {
        editor.loadSnapshot(snapshotJson as unknown as TldrawSnapshot);
      }
      reconcileBusinessNodes(editor, nodesRef.current);
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
      handleBusinessShapeUpdated,
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

      const shapeId = createShapeId(`business-${type}-${Date.now().toString(36)}`);
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
