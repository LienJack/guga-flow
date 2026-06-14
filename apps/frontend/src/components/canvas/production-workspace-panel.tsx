import type {
  CanvasNodeRecord,
  ProductionWorkspaceProjection,
  ProductionWorkspaceStoryboardItem,
} from "@guga-flow/shared-types";
import { Clapperboard, RefreshCw, Save } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import { getProductionWorkspace, updateProductionWorkspaceItem } from "../../lib/api";

interface ProductionWorkspacePanelProps {
  initialWorkspace?: ProductionWorkspaceProjection;
  nodes: CanvasNodeRecord[];
  projectId: string;
  selectedNodeId?: string;
  onItemUpdated(node: CanvasNodeRecord): void;
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
  onItemUpdated,
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
      </div>
      {workspace ? (
        <>
          <div className="empty-state small">
            <strong>{workspace.scriptPlan?.title ?? "No ScriptDraft"}</strong>
            <span>{workspace.agentContext.storyboardTableSummary}</span>
            <span>{workspace.agentContext.assetSummary}</span>
            <span>{workspace.agentContext.generationSummary}</span>
          </div>
          <div className="script-draft-list">
            {workspace.storyboardTable.slice(0, 8).map((item) => (
              <button
                className={`script-draft-row${item.itemId === selectedItem?.itemId ? " active" : ""}`}
                key={item.itemId}
                type="button"
                onClick={() => {
                  setSelectedItemId(item.itemId);
                  onSelectNode(item.shotNodeId);
                }}
              >
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.sceneTitle ?? "Scene"} · {item.status}</span>
                </div>
                <span>{item.durationSeconds ? `${item.durationSeconds}s` : "Shot"}</span>
              </button>
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
