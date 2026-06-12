"use client";

import type {
  CanvasEdgeRecord,
  CanvasNodeRecord,
  CanvasSaveStatus,
  ImportStoryboardToCanvasResult,
} from "@guga-flow/shared-types";
import React, { useCallback, useState } from "react";

import { WorkbenchShell } from "../workbench-shell";
import { NovelStoryboardPanel } from "../novels/novel-storyboard-panel";
import { mergeStoryboardImportGraph } from "../novels/storyboard-data";
import { type CanvasSelectionState, EMPTY_CANVAS_SELECTION } from "./canvas-selection";
import { CanvasEditor } from "./canvas-editor";
import { CanvasInspector } from "./canvas-inspector";
import { CanvasSaveStatusBadge } from "./canvas-save-status";

interface ProjectCanvasWorkspaceProps {
  projectId: string;
}

export function ProjectCanvasWorkspace({ projectId }: ProjectCanvasWorkspaceProps) {
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNodeRecord[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<CanvasEdgeRecord[]>([]);
  const [selection, setSelection] = useState<CanvasSelectionState>(EMPTY_CANVAS_SELECTION);
  const [fitRequestKey, setFitRequestKey] = useState(0);

  const handleSaveStatusChange = useCallback((status: CanvasSaveStatus, error: string | null) => {
    setSaveStatus(status);
    setSaveError(error);
  }, []);

  const handleNodeUpdated = useCallback((updatedNode: CanvasNodeRecord) => {
    setCanvasNodes((current) =>
      current.map((node) => (node.id === updatedNode.id ? updatedNode : node)),
    );
  }, []);

  const handleGraphUpdated = useCallback(
    (graph: { nodes: CanvasNodeRecord[]; edges: CanvasEdgeRecord[] }) => {
      setCanvasNodes(graph.nodes);
      setCanvasEdges(graph.edges);
    },
    [],
  );

  const handleStoryboardImported = useCallback((result: ImportStoryboardToCanvasResult) => {
    setCanvasNodes((currentNodes) =>
      mergeStoryboardImportGraph({ nodes: currentNodes, edges: [] }, result).nodes,
    );
    setCanvasEdges((currentEdges) =>
      mergeStoryboardImportGraph({ nodes: [], edges: currentEdges }, result).edges,
    );
    setFitRequestKey((current) => current + 1);
  }, []);

  return (
    <WorkbenchShell
      projectId={projectId}
      projectTitle={`Project ${projectId}`}
      storyboardEnabled
      saveStateSlot={<CanvasSaveStatusBadge status={saveStatus} error={saveError} />}
      sidebarSlot={
        <NovelStoryboardPanel
          canvasNodes={canvasNodes}
          projectId={projectId}
          onStoryboardImported={handleStoryboardImported}
        />
      }
      canvasSlot={
        <CanvasEditor
          projectId={projectId}
          canvasEdges={canvasEdges}
          canvasNodes={canvasNodes}
          fitRequestKey={fitRequestKey}
          onCanvasEdgesChange={setCanvasEdges}
          onCanvasNodesChange={setCanvasNodes}
          onSelectionChange={setSelection}
          onSaveStatusChange={handleSaveStatusChange}
        />
      }
      inspectorSlot={
        <CanvasInspector
          edges={canvasEdges}
          projectId={projectId}
          nodes={canvasNodes}
          selection={selection}
          onGraphUpdated={handleGraphUpdated}
          onNodeUpdated={handleNodeUpdated}
          onSelectionChange={setSelection}
        />
      }
    />
  );
}
