"use client";

import type {
  CanvasEdgeRecord,
  CanvasNodeRecord,
  CanvasSaveStatus,
  GenerationJobRecord,
  GenerationQueueSummary,
  ImportStoryboardToCanvasResult,
} from "@guga-flow/shared-types";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { getProjectCanvas, listGenerationJobs } from "../../lib/api";
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
  const [generationJobs, setGenerationJobs] = useState<GenerationJobRecord[]>([]);
  const [queueSummary, setQueueSummary] = useState<Pick<GenerationQueueSummary, "queued" | "running" | "failed">>({
    queued: 0,
    running: 0,
    failed: 0,
  });
  const [selection, setSelection] = useState<CanvasSelectionState>(EMPTY_CANVAS_SELECTION);
  const [fitRequestKey, setFitRequestKey] = useState(0);
  const generationSignatureRef = useRef("");

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

  const refreshCanvasFacts = useCallback(async () => {
    const canvas = await getProjectCanvas(projectId);
    setCanvasNodes(canvas.nodes);
    setCanvasEdges(canvas.edges);
  }, [projectId]);

  const refreshGenerationState = useCallback(
    async (input: { refreshCanvas?: boolean } = {}) => {
      const result = await listGenerationJobs(projectId);
      const nextSignature = result.jobs
        .map((job) => `${job.id}:${job.status}:${job.targetNodeId ?? ""}:${job.updatedAt}`)
        .join("|");

      setGenerationJobs(result.jobs);
      setQueueSummary(result.queueSummary);

      if (input.refreshCanvas || (generationSignatureRef.current && generationSignatureRef.current !== nextSignature)) {
        await refreshCanvasFacts();
      }
      generationSignatureRef.current = nextSignature;
    },
    [projectId, refreshCanvasFacts],
  );

  useEffect(() => {
    let cancelled = false;

    async function pollGenerationJobs() {
      try {
        if (!cancelled) {
          await refreshGenerationState();
        }
      } catch {
        // Queue visibility is best-effort in the MVP; explicit actions still surface errors.
      }
    }

    void pollGenerationJobs();
    const intervalId = window.setInterval(() => void pollGenerationJobs(), 2500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [refreshGenerationState]);

  const handleGenerationChanged = useCallback(
    (summary?: GenerationQueueSummary) => {
      if (summary) {
        setQueueSummary(summary);
      }
      void refreshGenerationState({ refreshCanvas: true });
    },
    [refreshGenerationState],
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
      queueSummary={queueSummary}
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
          generationJobs={generationJobs}
          nodes={canvasNodes}
          selection={selection}
          onGraphUpdated={handleGraphUpdated}
          onGenerationChanged={handleGenerationChanged}
          onNodeUpdated={handleNodeUpdated}
          onSelectionChange={setSelection}
        />
      }
    />
  );
}
