"use client";

import type {
  CanvasDocumentRecord,
  CanvasEdgeRecord,
  CanvasNodeRecord,
  CanvasSaveStatus,
  CreateAgentCanvasActionResult,
  GenerationJobRecord,
  GenerationQueueSummary,
  ImportStoryboardToCanvasResult,
  ProductionWorkspaceMutationResult,
  ProjectDetail,
  TaskCenterResult,
  UndoAgentCanvasActionResult,
} from "@guga-flow/shared-types";
import { Bot, Boxes, Clapperboard, Plus } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import {
  cancelGenerationJob,
  createCanvasPage,
  getProject,
  getProjectCanvas,
  getTaskCenter,
  listCanvasPages,
  listGenerationJobs,
  retryGenerationJob,
} from "../../lib/api";
import {
  eventMatchesShortcut,
  isEditableShortcutTarget,
  loadShortcutPreferences,
  type ShortcutPreferences,
} from "../../lib/shortcuts";
import { WorkbenchShell } from "../workbench-shell";
import { NovelStoryboardPanel } from "../novels/novel-storyboard-panel";
import { mergeStoryboardImportGraph } from "../novels/storyboard-data";
import { type CanvasSelectionState, EMPTY_CANVAS_SELECTION } from "./canvas-selection";
import { AgentCanvasActionsPanel } from "./agent-canvas-actions-panel";
import { CanvasEditor } from "./canvas-editor";
import { CanvasInspector } from "./canvas-inspector";
import { CanvasProductivityPanel } from "./canvas-productivity-panel";
import { CanvasSaveStatusBadge } from "./canvas-save-status";
import { ProductionWorkspacePanel } from "./production-workspace-panel";
import { ProjectPackagePanel } from "./project-package-panel";
import { TaskCenterPanel } from "./task-center-panel";

interface ProjectCanvasWorkspaceProps {
  projectId: string;
}

export function ProjectCanvasWorkspace({ projectId }: ProjectCanvasWorkspaceProps) {
  const [saveStatus, setSaveStatus] = useState<CanvasSaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [canvasNodes, setCanvasNodes] = useState<CanvasNodeRecord[]>([]);
  const [canvasEdges, setCanvasEdges] = useState<CanvasEdgeRecord[]>([]);
  const [canvasPages, setCanvasPages] = useState<CanvasDocumentRecord[]>([]);
  const [activeCanvasDocumentId, setActiveCanvasDocumentId] = useState<string | undefined>();
  const [shortcutPreferences, setShortcutPreferences] = useState<ShortcutPreferences>(() =>
    loadShortcutPreferences(),
  );
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [generationJobs, setGenerationJobs] = useState<GenerationJobRecord[]>([]);
  const [taskCenter, setTaskCenter] = useState<TaskCenterResult | null>(null);
  const [queueSummary, setQueueSummary] = useState<
    Pick<GenerationQueueSummary, "queued" | "running" | "failed" | "providerWaiting" | "cancelled">
  >({
    queued: 0,
    running: 0,
    providerWaiting: 0,
    failed: 0,
    cancelled: 0,
  });
  const [selection, setSelection] = useState<CanvasSelectionState>(EMPTY_CANVAS_SELECTION);
  const [fitRequestKey, setFitRequestKey] = useState(0);
  const [searchFocusRequestKey, setSearchFocusRequestKey] = useState<number | undefined>(undefined);
  const [focusRequest, setFocusRequest] = useState<{ nodeId: string; key: number } | undefined>();
  const generationSignatureRef = useRef("");
  const focusRequestSequenceRef = useRef(0);

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
    const canvas = await getProjectCanvas(projectId, activeCanvasDocumentId);
    setCanvasNodes(canvas.nodes);
    setCanvasEdges(canvas.edges);
  }, [activeCanvasDocumentId, projectId]);

  useEffect(() => {
    let cancelled = false;
    listCanvasPages(projectId)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setCanvasPages(result.pages);
        setActiveCanvasDocumentId((current) => current ?? result.activePageId);
      })
      .catch(() => {
        if (!cancelled) {
          setCanvasPages([]);
          setActiveCanvasDocumentId(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    setShortcutPreferences(loadShortcutPreferences());
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    getProject(projectId)
      .then((result) => {
        if (!cancelled) {
          setProject(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProject(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const refreshGenerationState = useCallback(
    async (input: { refreshCanvas?: boolean } = {}) => {
      const [result, taskCenterResult] = await Promise.all([
        listGenerationJobs(projectId),
        getTaskCenter(projectId),
      ]);
      const nextSignature = result.jobs
        .map((job) => `${job.id}:${job.status}:${job.targetNodeId ?? ""}:${job.updatedAt}`)
        .join("|");

      setGenerationJobs(result.jobs);
      setQueueSummary(result.queueSummary);
      setTaskCenter(taskCenterResult);

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

  const handleFitToContent = useCallback(() => {
    setFitRequestKey((current) => current + 1);
  }, []);

  const handleSelectCanvasPage = useCallback((canvasDocumentId: string) => {
    setActiveCanvasDocumentId(canvasDocumentId);
    setSelection(EMPTY_CANVAS_SELECTION);
    setFocusRequest(undefined);
    setSaveStatus("idle");
    setSaveError(null);
  }, []);

  const handleCreateCanvasPage = useCallback(async () => {
    const result = await createCanvasPage(projectId, {
      title: `Canvas ${canvasPages.length + 1}`,
    });
    setCanvasPages((current) =>
      [...current, result.page].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id.localeCompare(b.id),
      ),
    );
    handleSelectCanvasPage(result.page.id);
  }, [canvasPages.length, handleSelectCanvasPage, projectId]);

  const handleSelectCanvasNode = useCallback((nodeId: string) => {
    focusRequestSequenceRef.current += 1;
    setSelection({ kind: "business-node", nodeId });
    setFocusRequest({ nodeId, key: focusRequestSequenceRef.current });
  }, []);

  const handleAgentActionComplete = useCallback(
    async (result: CreateAgentCanvasActionResult) => {
      if (result.nodes.length > 0) {
        setCanvasNodes((current) => mergeCanvasNodeRecords(current, result.nodes));
      }
      if (result.edges.length > 0) {
        setCanvasEdges((current) => mergeCanvasEdgeRecords(current, result.edges));
      }
      try {
        await refreshGenerationState({ refreshCanvas: true });
      } catch {
        // The action result already contains changed artifacts; queue refresh is best-effort.
      }
      const focusNodeId = result.focusNodeId ?? result.nodes[0]?.id;
      if (focusNodeId) {
        handleSelectCanvasNode(focusNodeId);
      }
    },
    [handleSelectCanvasNode, refreshGenerationState],
  );

  const handleAgentUndoComplete = useCallback(
    async (result: UndoAgentCanvasActionResult) => {
      if (result.deletedNodeIds.length > 0 || result.restoredNodes.length > 0) {
        setCanvasNodes((current) =>
          mergeCanvasNodeRecords(
            current.filter((node) => !result.deletedNodeIds.includes(node.id)),
            result.restoredNodes,
          ),
        );
      }
      if (result.deletedEdgeIds.length > 0) {
        setCanvasEdges((current) =>
          current.filter((edge) => !result.deletedEdgeIds.includes(edge.id)),
        );
      }
      try {
        await refreshGenerationState({ refreshCanvas: true });
      } catch {
        // Undo returned the affected artifacts; queue refresh is best-effort.
      }
      const focusNodeId = result.restoredNodes[0]?.id;
      if (focusNodeId) {
        handleSelectCanvasNode(focusNodeId);
      }
    },
    [handleSelectCanvasNode, refreshGenerationState],
  );

  const handleRetryTask = useCallback(
    async (taskId: string) => {
      await retryGenerationJob(projectId, taskId);
      await refreshGenerationState({ refreshCanvas: true });
    },
    [projectId, refreshGenerationState],
  );

  const handleCancelTask = useCallback(
    async (taskId: string) => {
      await cancelGenerationJob(projectId, taskId);
      await refreshGenerationState({ refreshCanvas: true });
    },
    [projectId, refreshGenerationState],
  );

  const handleProductionWorkspaceMutation = useCallback(
    (result: ProductionWorkspaceMutationResult) => {
      const deletedNodeIds = new Set(result.deletedNodeIds ?? []);
      const replacesSequenceEdges =
        result.nodes.some((node) => node.type === "shot") || deletedNodeIds.size > 0;

      if (result.nodes.length > 0 || deletedNodeIds.size > 0) {
        setCanvasNodes((current) =>
          mergeCanvasNodeRecords(
            current.filter((node) => !deletedNodeIds.has(node.id)),
            result.nodes,
          ),
        );
      }
      if (result.edges.length > 0 || deletedNodeIds.size > 0 || replacesSequenceEdges) {
        setCanvasEdges((current) =>
          mergeCanvasEdgeRecords(
            current.filter(
              (edge) =>
                !deletedNodeIds.has(edge.sourceNodeId) &&
                !deletedNodeIds.has(edge.targetNodeId) &&
                (!replacesSequenceEdges || edge.relation !== "sequence_next"),
            ),
            result.edges,
          ),
        );
      }
      if (result.focusNodeId) {
        handleSelectCanvasNode(result.focusNodeId);
      }
    },
    [handleSelectCanvasNode],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableShortcutTarget(event.target)) {
        return;
      }
      if (eventMatchesShortcut(event, shortcutPreferences["canvas.search"])) {
        event.preventDefault();
        setSearchFocusRequestKey((current) => (current ?? 0) + 1);
        return;
      }
      if (eventMatchesShortcut(event, shortcutPreferences["canvas.fit"])) {
        event.preventDefault();
        handleFitToContent();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFitToContent, shortcutPreferences]);

  return (
    <WorkbenchShell
      projectId={projectId}
      projectTitle={project?.title ?? `Project ${projectId}`}
      storyboardEnabled
      queueSummary={queueSummary}
      saveStateSlot={<CanvasSaveStatusBadge status={saveStatus} error={saveError} />}
      sidebarSlot={
        <CanvasSidebarTabs
          canvasNodes={canvasNodes}
          generationQueue={{
            taskCenter,
            onCancelTask: handleCancelTask,
            onRetryTask: handleRetryTask,
          }}
          projectId={projectId}
          searchFocusRequestKey={searchFocusRequestKey}
          selectedNodeId={selection.kind === "business-node" ? selection.nodeId : undefined}
          selection={selection}
          onActionComplete={handleAgentActionComplete}
          onFitToContent={handleFitToContent}
          onGenerationQueued={handleGenerationChanged}
          onItemUpdated={handleNodeUpdated}
          onProductionWorkspaceMutation={handleProductionWorkspaceMutation}
          onSelectNode={handleSelectCanvasNode}
          onStoryboardImported={handleStoryboardImported}
          onUndoComplete={handleAgentUndoComplete}
        />
      }
      canvasSlot={
        <>
          <CanvasPageTabs
            activeCanvasDocumentId={activeCanvasDocumentId}
            pages={canvasPages}
            onCreatePage={() => void handleCreateCanvasPage()}
            onSelectPage={handleSelectCanvasPage}
          />
          <CanvasEditor
            key={activeCanvasDocumentId ?? "default-canvas"}
            projectId={projectId}
            canvasDocumentId={activeCanvasDocumentId}
            canvasEdges={canvasEdges}
            canvasNodes={canvasNodes}
            focusRequest={focusRequest}
            fitRequestKey={fitRequestKey}
            onCanvasEdgesChange={setCanvasEdges}
            onCanvasNodesChange={setCanvasNodes}
            onSelectionChange={setSelection}
            onSaveStatusChange={handleSaveStatusChange}
          />
        </>
      }
      inspectorSlot={
        <CanvasInspector
          edges={canvasEdges}
          projectId={projectId}
          project={project}
          generationJobs={generationJobs}
          nodes={canvasNodes}
          selection={selection}
          onGraphUpdated={handleGraphUpdated}
          onGenerationChanged={handleGenerationChanged}
          onNodeUpdated={handleNodeUpdated}
          onProjectUpdated={setProject}
          onSelectionChange={setSelection}
        />
      }
    />
  );
}

type CanvasSidebarTab = "agent" | "production" | "library";

function CanvasSidebarTabs({
  canvasNodes,
  generationQueue,
  onActionComplete,
  onFitToContent,
  onGenerationQueued,
  onItemUpdated,
  onProductionWorkspaceMutation,
  onSelectNode,
  onStoryboardImported,
  onUndoComplete,
  projectId,
  searchFocusRequestKey,
  selectedNodeId,
  selection,
}: {
  canvasNodes: CanvasNodeRecord[];
  generationQueue: {
    taskCenter: TaskCenterResult | null;
    onCancelTask(taskId: string): Promise<void> | void;
    onRetryTask(taskId: string): Promise<void> | void;
  };
  projectId: string;
  searchFocusRequestKey?: number;
  selectedNodeId?: string;
  selection: CanvasSelectionState;
  onActionComplete(result: CreateAgentCanvasActionResult): Promise<void> | void;
  onFitToContent(): void;
  onGenerationQueued(summary?: GenerationQueueSummary): void;
  onItemUpdated(node: CanvasNodeRecord): void;
  onProductionWorkspaceMutation(result: ProductionWorkspaceMutationResult): void;
  onSelectNode(nodeId: string): void;
  onStoryboardImported(result: ImportStoryboardToCanvasResult): void;
  onUndoComplete(result: UndoAgentCanvasActionResult): Promise<void> | void;
}) {
  const [activeTab, setActiveTab] = useState<CanvasSidebarTab>("agent");

  return (
    <section className="canvas-sidebar-tabs" aria-label="Workspace panels">
      <div className="sidebar-tab-list" role="tablist" aria-label="Workspace panel groups">
        {SIDEBAR_TABS.map((tab) => {
          const Icon = tab.icon;

          return (
            <button
              className={activeTab === tab.id ? "active" : ""}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="sidebar-tab-mark" aria-hidden="true">
                <Icon size={14} />
              </span>
              <span className="sidebar-tab-copy">
                <strong>{tab.label}</strong>
                <small>{tab.detail}</small>
              </span>
            </button>
          );
        })}
      </div>

      <div className="sidebar-tab-panel">
        {activeTab === "agent" ? (
          <AgentCanvasActionsPanel
            nodes={canvasNodes}
            projectId={projectId}
            selection={selection}
            onActionComplete={onActionComplete}
            onUndoComplete={onUndoComplete}
          />
        ) : null}
        {activeTab === "production" ? (
          <>
            <ProductionWorkspacePanel
              nodes={canvasNodes}
              projectId={projectId}
              selectedNodeId={selectedNodeId}
              onGenerationQueued={onGenerationQueued}
              onItemUpdated={onItemUpdated}
              onWorkspaceMutation={onProductionWorkspaceMutation}
              onSelectNode={onSelectNode}
            />
            <NovelStoryboardPanel
              canvasNodes={canvasNodes}
              projectId={projectId}
              selectedNodeId={selectedNodeId}
              onStoryboardImported={onStoryboardImported}
            />
          </>
        ) : null}
        {activeTab === "library" ? (
          <>
            <TaskCenterPanel
              taskCenter={generationQueue.taskCenter}
              onCancelTask={generationQueue.onCancelTask}
              onRetryTask={generationQueue.onRetryTask}
              onSelectNode={onSelectNode}
            />
            <ProjectPackagePanel projectId={projectId} />
            <CanvasProductivityPanel
              nodes={canvasNodes}
              selectedNodeId={selectedNodeId}
              searchFocusRequestKey={searchFocusRequestKey}
              onFitToContent={onFitToContent}
              onSelectNode={onSelectNode}
            />
          </>
        ) : null}
      </div>
    </section>
  );
}

const SIDEBAR_TABS: Array<{ id: CanvasSidebarTab; label: string; detail: string; icon: typeof Bot }> = [
  { id: "agent", label: "Agent", detail: "Command", icon: Bot },
  { id: "production", label: "Production", detail: "Build", icon: Clapperboard },
  { id: "library", label: "Library", detail: "Assets", icon: Boxes },
];

function CanvasPageTabs({
  activeCanvasDocumentId,
  pages,
  onCreatePage,
  onSelectPage,
}: {
  activeCanvasDocumentId?: string;
  pages: CanvasDocumentRecord[];
  onCreatePage(): void;
  onSelectPage(canvasDocumentId: string): void;
}) {
  return (
    <nav className="canvas-page-tabs" aria-label="Canvas pages">
      {pages.map((page, index) => (
        <button
          className={`tool-button ${page.id === activeCanvasDocumentId ? "active" : ""}`}
          type="button"
          key={page.id}
          title={page.title ?? `Canvas ${index + 1}`}
          onClick={() => onSelectPage(page.id)}
        >
          {page.title ?? `Canvas ${index + 1}`}
        </button>
      ))}
      <button className="tool-button" type="button" title="New canvas page" onClick={onCreatePage}>
        <Plus size={14} aria-hidden="true" />
      </button>
    </nav>
  );
}

function mergeCanvasNodeRecords(
  current: CanvasNodeRecord[],
  incoming: CanvasNodeRecord[],
): CanvasNodeRecord[] {
  if (incoming.length === 0) {
    return current;
  }
  const byId = new Map(current.map((node) => [node.id, node]));
  for (const node of incoming) {
    byId.set(node.id, node);
  }
  return Array.from(byId.values()).sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
}

function mergeCanvasEdgeRecords(
  current: CanvasEdgeRecord[],
  incoming: CanvasEdgeRecord[],
): CanvasEdgeRecord[] {
  if (incoming.length === 0) {
    return current;
  }
  const byId = new Map(current.map((edge) => [edge.id, edge]));
  for (const edge of incoming) {
    byId.set(edge.id, edge);
  }
  return Array.from(byId.values());
}
