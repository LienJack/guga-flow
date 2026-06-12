"use client";

import type {
  ImportNovelSourceInput,
  NovelDocumentRecord,
  StoryboardDraftRecord,
  StoryboardResult,
} from "@guga-flow/shared-types";
import { CheckCircle2, FileText, Plus, RefreshCw, Save, Trash2, Upload } from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createNovelDocument,
  deleteNovelDocument,
  generateStoryboardDraft,
  getActiveStoryboardDraft,
  importNovelSource,
  listNovelDocuments,
  markStoryboardDraftReady,
  updateNovelDocument,
  updateStoryboardDraft,
} from "../../lib/api";
import {
  buildStoryboardDraftUiState,
  formatStoryboardValidationIssues,
  summarizeStoryboardActionError,
} from "./storyboard-data";
import { StoryboardEditor } from "./storyboard-editor";

interface NovelStoryboardPanelProps {
  projectId: string;
  initialNovels?: NovelDocumentRecord[];
  initialDraft?: StoryboardDraftRecord;
}

type BusyAction = "load" | "create" | "import" | "update" | "delete" | "generate" | "draft" | null;

export function NovelStoryboardPanel({
  projectId,
  initialNovels = [],
  initialDraft,
}: NovelStoryboardPanelProps) {
  const [novels, setNovels] = useState<NovelDocumentRecord[]>(initialNovels);
  const [selectedNovelId, setSelectedNovelId] = useState(initialDraft?.novelDocumentId ?? initialNovels[0]?.id ?? "");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedContent, setSelectedContent] = useState("");
  const [draft, setDraft] = useState<StoryboardDraftRecord | undefined>(initialDraft);
  const [storyboard, setStoryboard] = useState<StoryboardResult | undefined>(initialDraft?.storyboard);
  const [draftDirty, setDraftDirty] = useState(false);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedNovel = useMemo(
    () => novels.find((novel) => novel.id === selectedNovelId),
    [novels, selectedNovelId],
  );
  const draftState = buildStoryboardDraftUiState(
    draft && storyboard ? { ...draft, storyboard, readyForImport: draftDirty ? false : draft.readyForImport } : draft,
  );

  useEffect(() => {
    let ignore = false;
    setBusyAction("load");
    listNovelDocuments(projectId)
      .then((result) => {
        if (ignore) {
          return;
        }
        setNovels(result);
        setSelectedNovelId((current) =>
          current && result.some((novel) => novel.id === current) ? current : result[0]?.id ?? "",
        );
      })
      .catch((loadError: unknown) => {
        if (!ignore) {
          setError(summarizeStoryboardActionError(loadError, "Unable to load novels"));
        }
      })
      .finally(() => {
        if (!ignore) {
          setBusyAction(null);
        }
      });

    return () => {
      ignore = true;
    };
  }, [projectId]);

  useEffect(() => {
    setSelectedTitle(selectedNovel?.title ?? "");
    setSelectedContent(selectedNovel?.content ?? "");
  }, [selectedNovel]);

  useEffect(() => {
    if (!selectedNovelId) {
      setDraft(undefined);
      setStoryboard(undefined);
      setDraftDirty(false);
      return;
    }

    let ignore = false;
    setDraft(undefined);
    setStoryboard(undefined);
    setDraftDirty(false);
    getActiveStoryboardDraft(projectId, selectedNovelId)
      .then((result) => {
        if (!ignore) {
          applyDraft(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!ignore && !isNotFoundError(loadError)) {
          setError(summarizeStoryboardActionError(loadError, "Unable to load storyboard draft"));
        }
      });

    return () => {
      ignore = true;
    };
  }, [projectId, selectedNovelId]);

  async function handleCreateNovel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction("create", async () => {
      const result = await createNovelDocument(projectId, {
        title: newTitle,
        content: newContent,
      });
      setNovels((current) => [result.novel, ...current.filter((novel) => novel.id !== result.novel.id)]);
      setSelectedNovelId(result.novel.id);
      setNewTitle("");
      setNewContent("");
      setNotice("Novel saved");
    });
  }

  async function handleImportNovel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("novel-file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a text or markdown file");
      return;
    }

    const sourceType = getNovelImportSourceType(file);
    if (!sourceType) {
      setError("Novel import supports .txt and .md files");
      return;
    }

    await runAction("import", async () => {
      const content = await file.text();
      const result = await importNovelSource(projectId, {
        title: file.name.replace(/\.(txt|md|markdown)$/iu, "") || file.name,
        content,
        sourceType,
      });
      setNovels((current) => [result.novel, ...current.filter((novel) => novel.id !== result.novel.id)]);
      setSelectedNovelId(result.novel.id);
      form.reset();
      setNotice("Novel imported");
    });
  }

  async function handleUpdateNovel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNovel) {
      return;
    }
    await runAction("update", async () => {
      const result = await updateNovelDocument(projectId, selectedNovel.id, {
        title: selectedTitle,
        content: selectedContent,
      });
      replaceNovel(result.novel);
      setNotice("Novel updated");
    });
  }

  async function handleDeleteNovel() {
    if (!selectedNovel) {
      return;
    }
    await runAction("delete", async () => {
      await deleteNovelDocument(projectId, selectedNovel.id);
      setNovels((current) => {
        const next = current.filter((novel) => novel.id !== selectedNovel.id);
        setSelectedNovelId(next[0]?.id ?? "");
        return next;
      });
      setDraft(undefined);
      setStoryboard(undefined);
      setDraftDirty(false);
      setNotice("Novel deleted");
    });
  }

  async function handleGenerateStoryboard() {
    if (!selectedNovel) {
      return;
    }
    await runAction("generate", async () => {
      const result = await generateStoryboardDraft(projectId, selectedNovel.id);
      if (!result.draft) {
        setError(
          result.validation.success
            ? "Storyboard generation did not return a draft"
            : formatStoryboardValidationIssues(result.validation.issues),
        );
        return;
      }
      applyDraft(result.draft);
      setNotice("Storyboard generated");
    });
  }

  async function handleReloadDraft() {
    if (!selectedNovel) {
      return;
    }
    await runAction("draft", async () => {
      applyDraft(await getActiveStoryboardDraft(projectId, selectedNovel.id));
      setNotice("Storyboard reloaded");
    });
  }

  async function handleSaveDraft() {
    if (!selectedNovel || !draft || !storyboard) {
      return;
    }
    await runAction("draft", async () => {
      const result = await updateStoryboardDraft(projectId, selectedNovel.id, draft.id, { storyboard });
      applyDraft(result.draft);
      setNotice("Storyboard saved");
    });
  }

  async function handleMarkReady() {
    if (!selectedNovel || !draft) {
      return;
    }
    if (draftDirty) {
      setError("Save the draft before marking it ready");
      return;
    }
    await runAction("draft", async () => {
      const result = await markStoryboardDraftReady(projectId, selectedNovel.id, draft.id);
      applyDraft(result.draft);
      setNotice("Storyboard ready");
    });
  }

  async function runAction(action: BusyAction, callback: () => Promise<void>) {
    setBusyAction(action);
    setError(null);
    setNotice(null);
    try {
      await callback();
    } catch (actionError) {
      setError(summarizeStoryboardActionError(actionError));
    } finally {
      setBusyAction(null);
    }
  }

  function replaceNovel(novel: NovelDocumentRecord) {
    setNovels((current) => current.map((item) => (item.id === novel.id ? novel : item)));
  }

  function applyDraft(nextDraft: StoryboardDraftRecord) {
    setDraft(nextDraft);
    setStoryboard(nextDraft.storyboard);
    setDraftDirty(false);
  }

  return (
    <section className="novel-storyboard-panel" aria-label="Novel storyboard workflow">
      <div className="panel-heading compact">
        <h2>Novel</h2>
        <span>{novels.length}</span>
      </div>

      <form className="novel-source-form" onSubmit={handleCreateNovel}>
        <label className="field-label">
          <span>Title</span>
          <input
            required
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
          />
        </label>
        <label className="field-label">
          <span>Content</span>
          <textarea
            required
            rows={5}
            value={newContent}
            onChange={(event) => setNewContent(event.target.value)}
          />
        </label>
        <button className="primary-action compact" type="submit" disabled={Boolean(busyAction)}>
          <Plus size={15} aria-hidden="true" />
          Save novel
        </button>
      </form>

      <form className="novel-import-form" onSubmit={handleImportNovel}>
        <label className="field-label">
          <span>Import</span>
          <input
            name="novel-file"
            type="file"
            accept="text/plain,text/markdown,.txt,.md,.markdown"
          />
        </label>
        <button className="ghost-action compact" type="submit" disabled={Boolean(busyAction)}>
          <Upload size={15} aria-hidden="true" />
          Import file
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}

      {novels.length === 0 ? (
        <div className="empty-state small">
          <strong>No novels</strong>
          <span>Create or import a source text.</span>
        </div>
      ) : (
        <ul className="novel-list">
          {novels.map((novel) => (
            <li className="novel-row" key={novel.id}>
              <button
                className={`novel-select ${selectedNovelId === novel.id ? "active" : ""}`}
                type="button"
                onClick={() => setSelectedNovelId(novel.id)}
              >
                <FileText size={15} aria-hidden="true" />
                <span>{novel.title}</span>
                <small>{novel.wordCount} words</small>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedNovel ? (
        <form className="novel-detail-form" onSubmit={handleUpdateNovel}>
          <div className="panel-heading compact">
            <h2>Source</h2>
            <span>{selectedNovel.language}</span>
          </div>
          <label className="field-label">
            <span>Title</span>
            <input value={selectedTitle} onChange={(event) => setSelectedTitle(event.target.value)} />
          </label>
          <label className="field-label">
            <span>Content</span>
            <textarea
              rows={6}
              value={selectedContent}
              onChange={(event) => setSelectedContent(event.target.value)}
            />
          </label>
          <div className="storyboard-action-row">
            <button className="primary-action compact" type="submit" disabled={Boolean(busyAction)}>
              <Save size={15} aria-hidden="true" />
              Save source
            </button>
            <button
              className="icon-action danger"
              type="button"
              title="Delete novel"
              onClick={() => void handleDeleteNovel()}
              disabled={Boolean(busyAction)}
            >
              <Trash2 size={14} aria-hidden="true" />
            </button>
          </div>
        </form>
      ) : null}

      {selectedNovel ? (
        <section className="storyboard-controls" aria-label="Storyboard actions">
          <div className="panel-heading compact">
            <h2>Draft</h2>
            <span>{draftState.label}</span>
          </div>
          <div className="storyboard-action-row">
            <button
              className="primary-action compact"
              type="button"
              onClick={() => void handleGenerateStoryboard()}
              disabled={Boolean(busyAction)}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Generate
            </button>
            <button
              className="ghost-action compact"
              type="button"
              onClick={() => void handleReloadDraft()}
              disabled={Boolean(busyAction)}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Reload
            </button>
            <span className={`storyboard-status-pill ${draftState.isReady ? "ready" : ""}`}>
              <CheckCircle2 size={13} aria-hidden="true" />
              {draftState.isReady ? "Ready" : "Draft"}
            </span>
          </div>
        </section>
      ) : null}

      <StoryboardEditor
        busy={Boolean(busyAction)}
        dirty={draftDirty}
        draft={draft}
        storyboard={storyboard}
        onMarkReady={() => void handleMarkReady()}
        onSave={() => void handleSaveDraft()}
        onStoryboardChange={(nextStoryboard) => {
          setStoryboard(nextStoryboard);
          setDraftDirty(true);
        }}
      />
    </section>
  );
}

export function getNovelImportSourceType(
  file: Pick<File, "name" | "type">,
): ImportNovelSourceInput["sourceType"] | null {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (name.endsWith(".md") || name.endsWith(".markdown") || type === "text/markdown") {
    return "md";
  }
  if (name.endsWith(".txt") || type === "text/plain") {
    return "txt";
  }
  return null;
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && /not found|404/i.test(error.message);
}
