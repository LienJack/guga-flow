"use client";

import type { CanvasSaveStatus } from "@guga-flow/shared-types";
import React, { useCallback, useState } from "react";

import { WorkbenchShell } from "../workbench-shell";
import { AssetLibrary } from "../projects/asset-library";
import { CanvasEditor } from "./canvas-editor";
import { CanvasSaveStatusBadge } from "./canvas-save-status";

interface ProjectCanvasWorkspaceProps {
  projectId: string;
}

export function ProjectCanvasWorkspace({ projectId }: ProjectCanvasWorkspaceProps) {
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveStatusChange = useCallback((status: CanvasSaveStatus, error: string | null) => {
    setSaveStatus(status);
    setSaveError(error);
  }, []);

  return (
    <WorkbenchShell
      projectId={projectId}
      projectTitle={`Project ${projectId}`}
      saveStateSlot={<CanvasSaveStatusBadge status={saveStatus} error={saveError} />}
      canvasSlot={<CanvasEditor projectId={projectId} onSaveStatusChange={handleSaveStatusChange} />}
      inspectorSlot={<AssetLibrary projectId={projectId} />}
    />
  );
}
