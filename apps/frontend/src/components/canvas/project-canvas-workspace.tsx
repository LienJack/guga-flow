"use client";

import type { CanvasEdgeRecord, CanvasNodeRecord, CanvasSaveStatus } from "@guga-flow/shared-types";
import React, { useCallback, useState } from "react";

import { WorkbenchShell } from "../workbench-shell";
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

  const handleSaveStatusChange = useCallback((status: CanvasSaveStatus, error: string | null) => {
    setSaveStatus(status);
    setSaveError(error);
  }, []);

  const handleNodeUpdated = useCallback((updatedNode: CanvasNodeRecord) => {
    setCanvasNodes((current) =>
      current.map((node) => (node.id === updatedNode.id ? updatedNode : node)),
    );
  }, []);

  return (
    <WorkbenchShell
      projectId={projectId}
      projectTitle={`Project ${projectId}`}
      saveStateSlot={<CanvasSaveStatusBadge status={saveStatus} error={saveError} />}
      canvasSlot={
        <CanvasEditor
          projectId={projectId}
          canvasEdges={canvasEdges}
          canvasNodes={canvasNodes}
          onCanvasEdgesChange={setCanvasEdges}
          onCanvasNodesChange={setCanvasNodes}
          onSelectionChange={setSelection}
          onSaveStatusChange={handleSaveStatusChange}
        />
      }
      inspectorSlot={
        <CanvasInspector
          projectId={projectId}
          nodes={canvasNodes}
          selection={selection}
          onNodeUpdated={handleNodeUpdated}
        />
      }
    />
  );
}
