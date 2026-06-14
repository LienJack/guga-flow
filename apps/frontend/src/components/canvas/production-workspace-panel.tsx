import type {
  CanvasNodeRecord,
  GenerationQueueSummary,
  ProductionWorkspaceMutationResult,
  ProductionWorkspaceProjection,
  ProductionWorkspaceStoryboardItem,
  ProductionWorkspaceVideoTrack,
} from "@guga-flow/shared-types";
import {
  ArrowDown,
  ArrowUp,
  Clapperboard,
  Grid2X2,
  LocateFixed,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  createEditorExport,
  createProductionMediaClip,
  createProductionStoryboardItems,
  createStoryboardMediaBoard,
  deleteProductionStoryboardItems,
  getProductionWorkspace,
  reorderProductionStoryboardItems,
  selectProductionTrackVideo,
  updateProductionWorkspaceItem,
} from "../../lib/api";

interface ProductionWorkspacePanelProps {
  initialWorkspace?: ProductionWorkspaceProjection;
  nodes: CanvasNodeRecord[];
  projectId: string;
  selectedNodeId?: string;
  onItemUpdated(node: CanvasNodeRecord): void;
  onGenerationQueued?(queueSummary?: GenerationQueueSummary): void;
  onWorkspaceMutation(result: ProductionWorkspaceMutationResult): void;
  onSelectNode(nodeId: string): void;
}

interface StoryboardItemDraft {
  title: string;
  summary: string;
  imagePrompt: string;
  videoPrompt: string;
  durationSeconds: string;
}

export function ProductionWorkspacePanel({
  initialWorkspace,
  nodes,
  onGenerationQueued,
  onItemUpdated,
  onWorkspaceMutation,
  onSelectNode,
  projectId,
  selectedNodeId,
}: ProductionWorkspacePanelProps) {
  const initialItem =
    initialWorkspace?.storyboardItems.find((item) => item.shotNodeId === selectedNodeId) ??
    initialWorkspace?.storyboardItems[0];
  const nodesSignature = useMemo(
    () => nodes.map((node) => `${node.id}:${node.updatedAt}`).join("|"),
    [nodes],
  );
  const [workspace, setWorkspace] = useState<ProductionWorkspaceProjection | null>(
    initialWorkspace ?? null,
  );
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(initialItem?.itemId);
  const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<StoryboardItemDraft>(
    initialItem ? draftFromItem(initialItem) : emptyDraft(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    getProductionWorkspace(projectId)
      .then((result) => {
        if (!cancelled) {
          setWorkspace(result);
          setError(null);
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load production workspace");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setBusy(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, nodesSignature]);

  const selectedItem = useMemo(() => {
    if (!workspace?.storyboardItems.length) {
      return undefined;
    }
    return (
      workspace.storyboardItems.find((item) => item.shotNodeId === selectedNodeId) ??
      workspace.storyboardItems.find((item) => item.itemId === selectedItemId) ??
      workspace.storyboardItems[0]
    );
  }, [selectedItemId, selectedNodeId, workspace]);

  useEffect(() => {
    if (!selectedItem) {
      setSelectedItemId(undefined);
      setSelectedBatchIds(new Set());
      setDraft(emptyDraft());
      return;
    }
    setSelectedItemId(selectedItem.itemId);
    setDraft(draftFromItem(selectedItem));
  }, [selectedItem]);

  async function refreshWorkspace() {
    setBusy(true);
    setError(null);
    try {
      setWorkspace(await getProductionWorkspace(projectId));
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Unable to refresh production workspace");
    } finally {
      setBusy(false);
    }
  }

  function applyMutationResult(result: ProductionWorkspaceMutationResult, focusNodeId?: string) {
    setWorkspace(result.workspace);
    setSelectedBatchIds((current) => {
      const availableIds = new Set(result.workspace.storyboardItems.map((item) => item.itemId));
      return new Set([...current].filter((itemId) => availableIds.has(itemId)));
    });
    onWorkspaceMutation(result);
    const nextFocusNodeId =
      focusNodeId ??
      result.focusNodeId ??
      result.workspace.storyboardItems.find((item) => item.itemId === selectedItemId)?.shotNodeId ??
      result.workspace.storyboardItems[0]?.shotNodeId;
    if (nextFocusNodeId) {
      onSelectNode(nextFocusNodeId);
    }
  }

  async function runWorkspaceAction(
    action: () => Promise<ProductionWorkspaceMutationResult>,
    fallbackMessage: string,
    focusNodeId?: string,
  ) {
    setBusy(true);
    setError(null);
    try {
      applyMutationResult(await action(), focusNodeId);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : fallbackMessage);
    } finally {
      setBusy(false);
    }
  }

  function toggleBatchSelection(itemId: string, checked: boolean) {
    setSelectedBatchIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
  }

  function storyboardItemIds(): string[] {
    return workspace?.storyboardItems.map((item) => item.itemId) ?? [];
  }

  function selectedDeleteIds(): string[] {
    if (selectedBatchIds.size > 0) {
      return [...selectedBatchIds];
    }
    return selectedItem ? [selectedItem.itemId] : [];
  }

  function movedStoryboardOrder(delta: -1 | 1): string[] | undefined {
    if (!selectedItem || !workspace) {
      return undefined;
    }
    const ids = storyboardItemIds();
    const index = ids.indexOf(selectedItem.itemId);
    const nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= ids.length) {
      return undefined;
    }
    const next = [...ids];
    const [itemId] = next.splice(index, 1);
    if (!itemId) {
      return undefined;
    }
    next.splice(nextIndex, 0, itemId);
    return next;
  }

  async function addStoryboardItems(count: number) {
    await runWorkspaceAction(
      () =>
        createProductionStoryboardItems(projectId, {
          count,
          ...(selectedItem ? { afterItemId: selectedItem.itemId } : {}),
        }),
      "Unable to add storyboard items",
    );
  }

  async function deleteSelectedStoryboardItems(itemIds: string[]) {
    if (itemIds.length === 0) {
      return;
    }
    await runWorkspaceAction(
      () => deleteProductionStoryboardItems(projectId, { itemIds }),
      "Unable to delete storyboard items",
    );
  }

  async function moveSelectedStoryboardItem(delta: -1 | 1) {
    const itemIds = movedStoryboardOrder(delta);
    if (!itemIds || !selectedItem) {
      return;
    }
    await runWorkspaceAction(
      () => reorderProductionStoryboardItems(projectId, { itemIds }),
      "Unable to reorder storyboard items",
      selectedItem.shotNodeId,
    );
  }

  async function createBoardFromSelection() {
    if (!workspace?.storyboardItems.length) {
      return;
    }
    const itemIds = selectedBatchIds.size > 0 ? [...selectedBatchIds] : storyboardItemIds();
    await runWorkspaceAction(
      () =>
        createStoryboardMediaBoard(projectId, {
          itemIds,
          title: "Storyboard Board",
          columns: 4,
        }),
      "Unable to create storyboard board",
    );
  }

  function selectedTrackIds(): string[] {
    if (selectedBatchIds.size > 0) {
      return [...selectedBatchIds];
    }
    return selectedItem ? [selectedItem.itemId] : [];
  }

  function tracksForExport(): ProductionWorkspaceVideoTrack[] {
    if (!workspace) {
      return [];
    }
    const ids = selectedBatchIds.size > 0 ? selectedBatchIds : new Set(workspace.videoTracks.map((track) => track.trackId));
    return workspace.videoTracks.filter((track) => ids.has(track.trackId));
  }

  function selectedTrackVideoIds(): string[] {
    return tracksForExport().flatMap((track) => {
      const videoNodeId = track.selectedVideoNodeId ?? track.candidates[0]?.videoNodeId;
      return videoNodeId ? [videoNodeId] : [];
    });
  }

  async function selectTrackVideo(track: ProductionWorkspaceVideoTrack, videoNodeId: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await selectProductionTrackVideo(projectId, track.trackId, {
        videoNodeId: videoNodeId || undefined,
      });
      setWorkspace(result.workspace);
      onItemUpdated(result.updatedNode);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to select primary video");
    } finally {
      setBusy(false);
    }
  }

  async function createMediaClipFromTracks() {
    const trackIds = selectedTrackIds();
    await runWorkspaceAction(
      () =>
        createProductionMediaClip(projectId, {
          trackIds: trackIds.length ? trackIds : undefined,
          title: "MediaClip",
          exportPreset: "standard_zip",
        }),
      "Unable to create MediaClip",
    );
  }

  async function exportSelectedTrackVideos() {
    const videoNodeIds = selectedTrackVideoIds();
    if (videoNodeIds.length === 0) {
      setError("Select at least one video candidate before export");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await createEditorExport(projectId, {
        videoNodeIds,
        sortMode: "shot_index",
        exportPreset: "standard_zip",
      });
      onGenerationQueued?.(result.queueSummary);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to queue editor export");
    } finally {
      setBusy(false);
    }
  }

  async function saveStoryboardItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedItem) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await updateProductionWorkspaceItem(projectId, selectedItem.itemId, {
        itemType: "storyboard_item",
        title: draft.title,
        summary: draft.summary,
        imagePrompt: draft.imagePrompt,
        videoPrompt: draft.videoPrompt,
        ...(Number.parseFloat(draft.durationSeconds) > 0
          ? { durationSeconds: Number.parseFloat(draft.durationSeconds) }
          : {}),
      });
      setWorkspace(result.workspace);
      onItemUpdated(result.updatedNode);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save production item");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="script-workbench" aria-label="Production workspace">
      <div className="panel-heading compact">
        <h2>
          <Clapperboard size={15} aria-hidden="true" />
          Production
        </h2>
        <span>{workspace?.summary.shotCount ?? 0}</span>
      </div>
      <div className="storyboard-action-row">
        <button className="ghost-action compact" type="button" onClick={() => void refreshWorkspace()} disabled={busy}>
          <RefreshCw size={15} aria-hidden="true" />
          Refresh
        </button>
        <button className="ghost-action compact" type="button" onClick={() => void addStoryboardItems(1)} disabled={busy}>
          <Plus size={15} aria-hidden="true" />
          Add
        </button>
        <button className="ghost-action compact" type="button" onClick={() => void addStoryboardItems(3)} disabled={busy}>
          <Plus size={15} aria-hidden="true" />
          Add 3
        </button>
      </div>
      {workspace ? (
        <>
          <div className="empty-state small">
            <strong>{workspace.scriptPlan?.title ?? "No ScriptDraft"}</strong>
            <span>{workspace.agentContext.storyboardTableSummary}</span>
            <span>{workspace.agentContext.assetSummary}</span>
            <span>{workspace.agentContext.generationSummary}</span>
          </div>
          <div className="storyboard-action-row">
            <button
              className="ghost-action compact"
              type="button"
              onClick={() => void moveSelectedStoryboardItem(-1)}
              disabled={busy || !selectedItem || workspace.storyboardItems[0]?.itemId === selectedItem.itemId}
            >
              <ArrowUp size={15} aria-hidden="true" />
              Up
            </button>
            <button
              className="ghost-action compact"
              type="button"
              onClick={() => void moveSelectedStoryboardItem(1)}
              disabled={busy || !selectedItem || workspace.storyboardItems.at(-1)?.itemId === selectedItem.itemId}
            >
              <ArrowDown size={15} aria-hidden="true" />
              Down
            </button>
            <button
              className="ghost-action compact"
              type="button"
              onClick={() => void deleteSelectedStoryboardItems(selectedDeleteIds())}
              disabled={busy || selectedDeleteIds().length === 0}
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete selected
            </button>
            <button
              className="ghost-action compact"
              type="button"
              onClick={() => void deleteSelectedStoryboardItems(storyboardItemIds())}
              disabled={busy || workspace.storyboardItems.length === 0}
            >
              <Trash2 size={15} aria-hidden="true" />
              Delete all
            </button>
            <button
              className="ghost-action compact"
              type="button"
              onClick={() => void createBoardFromSelection()}
              disabled={busy || workspace.storyboardItems.length === 0}
            >
              <Grid2X2 size={15} aria-hidden="true" />
              Board
            </button>
            <button
              className="ghost-action compact"
              type="button"
              onClick={() => void createMediaClipFromTracks()}
              disabled={busy || workspace.videoTracks.every((track) => track.candidates.length === 0)}
            >
              <Clapperboard size={15} aria-hidden="true" />
              Clip
            </button>
            <button
              className="ghost-action compact"
              type="button"
              onClick={() => void exportSelectedTrackVideos()}
              disabled={busy || selectedTrackVideoIds().length === 0}
            >
              <Save size={15} aria-hidden="true" />
              Export videos
            </button>
          </div>
          <div className="script-draft-list">
            {workspace.storyboardTable.slice(0, 8).map((item) => (
              <div
                className={`script-draft-row${item.itemId === selectedItem?.itemId ? " active" : ""}`}
                key={item.itemId}
              >
                <div>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedBatchIds.has(item.itemId)}
                      onChange={(event) => toggleBatchSelection(item.itemId, event.target.checked)}
                    />
                    <strong>{item.orderIndex}. {item.title}</strong>
                  </label>
                  <span>
                    {item.sceneTitle ?? "Scene"} · {item.status}
                    {item.imageNodeId ? " · image" : ""}
                    {item.videoNodeId ? " · video" : ""}
                  </span>
                </div>
                <button
                  className="ghost-action compact"
                  type="button"
                  onClick={() => {
                    setSelectedItemId(item.itemId);
                    onSelectNode(item.shotNodeId);
                  }}
                >
                  <LocateFixed size={15} aria-hidden="true" />
                  {item.durationSeconds ? `${item.durationSeconds}s` : "Locate"}
                </button>
              </div>
            ))}
          </div>
          <div className="empty-state small">
            <strong>Video tracks</strong>
            <span>
              {workspace.videoTracks.reduce((sum, track) => sum + track.candidates.length, 0)} candidates
            </span>
          </div>
          <div className="script-draft-list">
            {workspace.videoTracks.slice(0, 8).map((track) => (
              <div className="script-draft-row" key={track.trackId}>
                <div>
                  <strong>{track.orderIndex}. {track.title}</strong>
                  <span>
                    {track.candidates.length} candidate{track.candidates.length === 1 ? "" : "s"}
                    {track.selectedVideoNodeId ? " · selected" : ""}
                  </span>
                </div>
                <label className="field-label">
                  <span>Primary</span>
                  <select
                    value={track.selectedVideoNodeId ?? ""}
                    onChange={(event) => void selectTrackVideo(track, event.target.value)}
                    disabled={busy || track.candidates.length === 0}
                  >
                    <option value="">Fallback</option>
                    {track.candidates.map((candidate) => (
                      <option key={candidate.videoNodeId} value={candidate.videoNodeId}>
                        {candidate.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ))}
          </div>
          {selectedItem ? (
            <form className="script-workspace-editor" onSubmit={saveStoryboardItem}>
              <label className="field-label">
                <span>Title</span>
                <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
              </label>
              <label className="field-label">
                <span>Summary</span>
                <textarea
                  rows={2}
                  value={draft.summary}
                  onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                />
              </label>
              <label className="field-label">
                <span>Image prompt</span>
                <textarea
                  rows={2}
                  value={draft.imagePrompt}
                  onChange={(event) => setDraft({ ...draft, imagePrompt: event.target.value })}
                />
              </label>
              <label className="field-label">
                <span>Video prompt</span>
                <textarea
                  rows={2}
                  value={draft.videoPrompt}
                  onChange={(event) => setDraft({ ...draft, videoPrompt: event.target.value })}
                />
              </label>
              <label className="field-label">
                <span>Duration</span>
                <input
                  inputMode="decimal"
                  value={draft.durationSeconds}
                  onChange={(event) => setDraft({ ...draft, durationSeconds: event.target.value })}
                />
              </label>
              <button className="primary-action compact" type="submit" disabled={busy}>
                <Save size={15} aria-hidden="true" />
                Save item
              </button>
            </form>
          ) : null}
        </>
      ) : (
        <div className="empty-state small">
          <strong>Production workspace</strong>
          <span>{error ?? "Loading"}</span>
        </div>
      )}
      {error && workspace ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

function draftFromItem(item: ProductionWorkspaceStoryboardItem): StoryboardItemDraft {
  return {
    title: item.title,
    summary: item.summary,
    imagePrompt: item.imagePrompt ?? "",
    videoPrompt: item.videoPrompt ?? "",
    durationSeconds: item.durationSeconds ? String(item.durationSeconds) : "",
  };
}

function emptyDraft(): StoryboardItemDraft {
  return {
    title: "",
    summary: "",
    imagePrompt: "",
    videoPrompt: "",
    durationSeconds: "",
  };
}
