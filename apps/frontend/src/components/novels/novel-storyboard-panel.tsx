"use client";

import type {
  CanvasNodeRecord,
  CreateCreativeStoryboardResult,
  ImportNovelSourceInput,
  ImportStoryboardToCanvasResult,
  NovelChapterDetail,
  NovelChapterSummary,
  NovelDocumentRecord,
  NovelEventGraphRecord,
  ScriptAdaptationStrategy,
  ScriptAssetCandidate,
  ScriptBeat,
  ScriptDraftRecord,
  ScriptDraftWorkspace,
  ScriptScene,
  StoryboardDraftRecord,
  StoryboardResult,
} from "@guga-flow/shared-types";
import { CheckCircle2, Download, FileText, Import, Plus, RefreshCw, Save, Trash2, Upload, X } from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createScriptDraft,
  createNovelDocument,
  deleteNovelDocument,
  extractNovelChapterEvents,
  extractNovelEvents,
  extractScriptAssets,
  exportScriptDraft,
  generateStoryboardFromScriptDraft,
  generateStoryboardDraft,
  getActiveStoryboardDraft,
  getNovelChapter,
  getNovelEventGraph,
  importStoryboardToCanvas,
  importNovelSource,
  importScriptAssets,
  listNovelChapters,
  listScriptDrafts,
  listNovelDocuments,
  markStoryboardDraftReady,
  updateNovelChapter,
  updateNovelDocument,
  updateScriptDraft,
  updateStoryboardDraft,
} from "../../lib/api";
import { CreativeAgentEntry } from "./creative-agent-entry";
import {
  buildStoryboardDraftUiState,
  formatStoryboardValidationIssues,
  hasExistingStoryboardImports,
  isStoryboardDraftImportable,
  summarizeStoryboardImport,
  summarizeStoryboardActionError,
} from "./storyboard-data";
import { StoryboardEditor } from "./storyboard-editor";

interface NovelStoryboardPanelProps {
  projectId: string;
  canvasNodes?: CanvasNodeRecord[];
  selectedNodeId?: string;
  initialNovels?: NovelDocumentRecord[];
  initialDraft?: StoryboardDraftRecord;
  initialEventGraph?: NovelEventGraphRecord;
  initialScriptDrafts?: ScriptDraftRecord[];
  onStoryboardImported?: (result: ImportStoryboardToCanvasResult) => void;
}

type BusyAction =
  | "load"
  | "create"
  | "import"
  | "update"
  | "delete"
  | "events"
  | "chapter"
  | "script"
  | "generate"
  | "draft"
  | "canvas-import"
  | null;

export function NovelStoryboardPanel({
  canvasNodes = [],
  selectedNodeId,
  projectId,
  initialNovels = [],
  initialDraft,
  initialEventGraph,
  initialScriptDrafts = [],
  onStoryboardImported,
}: NovelStoryboardPanelProps) {
  const [novels, setNovels] = useState<NovelDocumentRecord[]>(initialNovels);
  const [selectedNovelId, setSelectedNovelId] = useState(initialDraft?.novelDocumentId ?? initialNovels[0]?.id ?? "");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedTitle, setSelectedTitle] = useState("");
  const [selectedContent, setSelectedContent] = useState("");
  const [draft, setDraft] = useState<StoryboardDraftRecord | undefined>(initialDraft);
  const [storyboard, setStoryboard] = useState<StoryboardResult | undefined>(initialDraft?.storyboard);
  const [eventGraph, setEventGraph] = useState<NovelEventGraphRecord | undefined>(initialEventGraph);
  const [chapters, setChapters] = useState<NovelChapterSummary[]>(initialEventGraph?.chapters ?? []);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number | undefined>(
    initialEventGraph?.chapters[0]?.chapterIndex,
  );
  const [chapterDetail, setChapterDetail] = useState<NovelChapterDetail | undefined>();
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [scriptDrafts, setScriptDrafts] = useState<ScriptDraftRecord[]>(initialScriptDrafts);
  const [selectedScriptDraftId, setSelectedScriptDraftId] = useState<string | undefined>(
    initialScriptDrafts[0]?.id,
  );
  const [scriptWorkspace, setScriptWorkspace] = useState<ScriptDraftWorkspace | undefined>(
    initialScriptDrafts[0] ? cloneWorkspace(initialScriptDrafts[0].workspace) : undefined,
  );
  const [scriptWorkspaceDirty, setScriptWorkspaceDirty] = useState(false);
  const [scriptAssetCandidates, setScriptAssetCandidates] = useState<ScriptAssetCandidate[]>([]);
  const [scriptStrategy, setScriptStrategy] = useState<ScriptAdaptationStrategy>("faithful");
  const [draftDirty, setDraftDirty] = useState(false);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmNewVersion, setConfirmNewVersion] = useState(false);

  const selectedNovel = useMemo(
    () => novels.find((novel) => novel.id === selectedNovelId),
    [novels, selectedNovelId],
  );
  const selectedScriptDraft = useMemo(
    () => scriptDrafts.find((scriptDraft) => scriptDraft.id === selectedScriptDraftId),
    [scriptDrafts, selectedScriptDraftId],
  );
  const draftState = buildStoryboardDraftUiState(
    draft && storyboard ? { ...draft, storyboard, readyForImport: draftDirty ? false : draft.readyForImport } : draft,
  );
  const hasPriorStoryboardImport = hasExistingStoryboardImports(canvasNodes);
  const canImportStoryboard = isStoryboardDraftImportable(
    draft && storyboard ? { ...draft, storyboard } : draft,
    draftDirty,
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
    setEventGraph(undefined);
    setChapters([]);
    setSelectedChapterIndex(undefined);
    setChapterDetail(undefined);
    setChapterTitle("");
    setChapterContent("");
    setScriptDrafts([]);
    setSelectedScriptDraftId(undefined);
    setScriptWorkspace(undefined);
    setScriptWorkspaceDirty(false);
    setScriptAssetCandidates([]);
    setConfirmNewVersion(false);
  }, [selectedNovel]);

  useEffect(() => {
    if (!selectedNovelId) {
      setChapters([]);
      setSelectedChapterIndex(undefined);
      return;
    }

    let ignore = false;
    listNovelChapters(projectId, selectedNovelId)
      .then((result) => {
        if (ignore) {
          return;
        }
        setChapters(result.chapters);
        if (result.eventGraph) {
          setEventGraph(result.eventGraph);
        }
        setSelectedChapterIndex((current) =>
          current && result.chapters.some((chapter) => chapter.chapterIndex === current)
            ? current
            : result.chapters[0]?.chapterIndex,
        );
      })
      .catch((loadError: unknown) => {
        if (!ignore && !isNotFoundError(loadError)) {
          setError(summarizeStoryboardActionError(loadError, "Unable to load chapters"));
        }
      });

    return () => {
      ignore = true;
    };
  }, [projectId, selectedNovelId]);

  useEffect(() => {
    if (!selectedNovelId || !selectedChapterIndex) {
      setChapterDetail(undefined);
      setChapterTitle("");
      setChapterContent("");
      return;
    }

    let ignore = false;
    getNovelChapter(projectId, selectedNovelId, selectedChapterIndex)
      .then((result) => {
        if (ignore) {
          return;
        }
        applyChapterDetail(result.chapter, result.eventGraph);
      })
      .catch((loadError: unknown) => {
        if (!ignore && !isNotFoundError(loadError)) {
          setError(summarizeStoryboardActionError(loadError, "Unable to load chapter"));
        }
      });

    return () => {
      ignore = true;
    };
  }, [projectId, selectedNovelId, selectedChapterIndex]);

  useEffect(() => {
    if (!selectedNovelId) {
      setEventGraph(undefined);
      return;
    }

    let ignore = false;
    getNovelEventGraph(projectId, selectedNovelId)
      .then((result) => {
        if (!ignore) {
          setEventGraph(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!ignore && !isNotFoundError(loadError)) {
          setError(summarizeStoryboardActionError(loadError, "Unable to load event graph"));
        }
      });

    return () => {
      ignore = true;
    };
  }, [projectId, selectedNovelId]);

  useEffect(() => {
    if (!selectedNovelId) {
      setScriptDrafts([]);
      return;
    }

    let ignore = false;
    listScriptDrafts(projectId, selectedNovelId)
      .then((result) => {
        if (!ignore) {
          setScriptDrafts(result.scriptDrafts);
          setSelectedScriptDraftId((current) =>
            current && result.scriptDrafts.some((scriptDraft) => scriptDraft.id === current)
              ? current
              : result.scriptDrafts[0]?.id,
          );
        }
      })
      .catch((loadError: unknown) => {
        if (!ignore && !isNotFoundError(loadError)) {
          setError(summarizeStoryboardActionError(loadError, "Unable to load script drafts"));
        }
      });

    return () => {
      ignore = true;
    };
  }, [projectId, selectedNovelId]);

  useEffect(() => {
    setScriptWorkspace(selectedScriptDraft ? cloneWorkspace(selectedScriptDraft.workspace) : undefined);
    setScriptWorkspaceDirty(false);
    setScriptAssetCandidates([]);
  }, [selectedScriptDraft]);

  useEffect(() => {
    if (!selectedNovelId) {
      setDraft(undefined);
      setStoryboard(undefined);
      setDraftDirty(false);
      setConfirmNewVersion(false);
      return;
    }

    let ignore = false;
    setDraft(undefined);
    setStoryboard(undefined);
    setDraftDirty(false);
    setConfirmNewVersion(false);
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
      const nextNovels = novels.filter((novel) => novel.id !== selectedNovel.id);
      setNovels(nextNovels);
      setSelectedNovelId(nextNovels[0]?.id ?? "");
      setDraft(undefined);
      setStoryboard(undefined);
      setEventGraph(undefined);
      setScriptDrafts([]);
      setDraftDirty(false);
      setNotice("Novel deleted");
    });
  }

  async function handleExtractEvents() {
    if (!selectedNovel) {
      return;
    }
    await runAction("events", async () => {
      const result = await extractNovelEvents(projectId, selectedNovel.id);
      applyEventGraph(result.eventGraph);
      setNotice("Events extracted");
    });
  }

  async function handleUpdateChapter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedNovel || !selectedChapterIndex) {
      return;
    }
    await runAction("chapter", async () => {
      const result = await updateNovelChapter(projectId, selectedNovel.id, selectedChapterIndex, {
        title: chapterTitle,
        content: chapterContent,
      });
      replaceNovel(result.novel);
      setSelectedContent(result.novel.content);
      applyChapterDetail(result.chapter, result.eventGraph);
      setNotice("Chapter saved");
    });
  }

  async function handleExtractChapterEvents() {
    if (!selectedNovel || !selectedChapterIndex) {
      return;
    }
    await runAction("chapter", async () => {
      const result = await extractNovelChapterEvents(projectId, selectedNovel.id, selectedChapterIndex);
      applyChapterDetail(result.chapter, result.eventGraph);
      setNotice("Chapter events extracted");
    });
  }

  async function handleCreateScriptDraft() {
    if (!selectedNovel) {
      return;
    }
    await runAction("script", async () => {
      const result = await createScriptDraft(projectId, selectedNovel.id, {
        strategy: scriptStrategy,
      });
      setScriptDrafts((current) => [
        result.scriptDraft,
        ...current.filter((draftItem) => draftItem.id !== result.scriptDraft.id),
      ]);
      setSelectedScriptDraftId(result.scriptDraft.id);
      setScriptWorkspace(cloneWorkspace(result.scriptDraft.workspace));
      setScriptWorkspaceDirty(false);
      setNotice("Script draft created");
    });
  }

  async function handleSaveScriptWorkspace() {
    if (!selectedNovel || !selectedScriptDraft || !scriptWorkspace) {
      return;
    }
    await runAction("script", async () => {
      const result = await updateScriptDraft(projectId, selectedNovel.id, selectedScriptDraft.id, {
        workspace: scriptWorkspace,
      });
      setScriptDrafts((current) =>
        current.map((item) => (item.id === result.scriptDraft.id ? result.scriptDraft : item)),
      );
      setSelectedScriptDraftId(result.scriptDraft.id);
      setScriptWorkspace(cloneWorkspace(result.scriptDraft.workspace));
      setScriptWorkspaceDirty(false);
      setNotice("Script workspace saved");
    });
  }

  async function handleExtractScriptAssets() {
    if (!selectedNovel || !selectedScriptDraft) {
      return;
    }
    await runAction("script", async () => {
      const result = await extractScriptAssets(projectId, selectedNovel.id, selectedScriptDraft.id);
      setScriptAssetCandidates(result.candidates);
      setNotice("Script assets extracted");
    });
  }

  async function handleImportScriptAssets() {
    if (!selectedNovel || !selectedScriptDraft || scriptAssetCandidates.length === 0) {
      return;
    }
    await runAction("script", async () => {
      const result = await importScriptAssets(projectId, selectedNovel.id, selectedScriptDraft.id, {
        candidates: scriptAssetCandidates,
      });
      setNotice(`Imported ${result.importedCount}, merged ${result.mergedCount}`);
    });
  }

  function updateScriptAssetCandidate(
    candidateId: string,
    patch: Partial<ScriptAssetCandidate>,
  ) {
    setScriptAssetCandidates((current) =>
      current.map((candidate) =>
        candidate.candidateId === candidateId ? { ...candidate, ...patch } : candidate,
      ),
    );
  }

  async function handleExportScriptDraft(scriptDraft: ScriptDraftRecord) {
    if (!selectedNovel) {
      return;
    }
    await runAction("script", async () => {
      const result = await exportScriptDraft(projectId, selectedNovel.id, scriptDraft.id);
      downloadTextFile(result.filename, result.content);
      setScriptDrafts((current) =>
        current.map((item) =>
          item.id === scriptDraft.id ? { ...item, status: "exported" } : item,
        ),
      );
      setNotice(`Exported ${result.filename}`);
    });
  }

  async function handleGenerateStoryboardFromScript(scriptDraft: ScriptDraftRecord) {
    if (!selectedNovel) {
      return;
    }
    await runAction("script", async () => {
      const result = await generateStoryboardFromScriptDraft(projectId, selectedNovel.id, scriptDraft.id);
      if (!result.draft) {
        setError(
          result.validation.success
            ? "Script storyboard generation did not return a draft"
            : formatStoryboardValidationIssues(result.validation.issues),
        );
        return;
      }
      applyDraft(result.draft);
      setScriptDrafts((current) =>
        current.map((item) => (item.id === scriptDraft.id ? { ...item, status: "selected" } : item)),
      );
      setNotice("Storyboard generated from script");
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

  async function handleImportStoryboard() {
    if (!selectedNovel || !draft) {
      return;
    }
    if (!canImportStoryboard) {
      setError(draftDirty ? "Save the draft before importing" : "Storyboard must be ready");
      return;
    }
    if (hasPriorStoryboardImport && !confirmNewVersion) {
      setConfirmNewVersion(true);
      setNotice("New version");
      setError(null);
      return;
    }

    await runAction("canvas-import", async () => {
      const result = await importStoryboardToCanvas(projectId, {
        novelDocumentId: selectedNovel.id,
        storyboardDraftId: draft.id,
        duplicatePolicy: "new_version",
      });
      onStoryboardImported?.(result);
      setConfirmNewVersion(false);
      setNotice(summarizeStoryboardImport(result.summary));
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
    setNovels((current) =>
      current.some((item) => item.id === novel.id)
        ? current.map((item) => (item.id === novel.id ? novel : item))
        : [novel, ...current],
    );
  }

  function applyDraft(nextDraft: StoryboardDraftRecord) {
    setDraft(nextDraft);
    setStoryboard(nextDraft.storyboard);
    setDraftDirty(false);
  }

  function applyEventGraph(nextEventGraph: NovelEventGraphRecord) {
    setEventGraph(nextEventGraph);
    setChapters(nextEventGraph.chapters);
    setSelectedChapterIndex((current) =>
      current && nextEventGraph.chapters.some((chapter) => chapter.chapterIndex === current)
        ? current
        : nextEventGraph.chapters[0]?.chapterIndex,
    );
    if (chapterDetail) {
      const nextChapter = nextEventGraph.chapters.find(
        (chapter) => chapter.chapterIndex === chapterDetail.chapterIndex,
      );
      if (nextChapter) {
        setChapterDetail({
          ...chapterDetail,
          ...nextChapter,
          events: nextEventGraph.events.filter((event) => event.chapterIndex === nextChapter.chapterIndex),
        });
      }
    }
  }

  function applyChapterDetail(
    nextChapter: NovelChapterDetail,
    nextEventGraph: NovelEventGraphRecord | undefined,
  ) {
    setChapterDetail(nextChapter);
    setChapterTitle(nextChapter.title);
    setChapterContent(nextChapter.content);
    setChapters((current) =>
      current.some((chapter) => chapter.chapterIndex === nextChapter.chapterIndex)
        ? current.map((chapter) =>
            chapter.chapterIndex === nextChapter.chapterIndex ? toChapterSummary(nextChapter) : chapter,
          )
        : [...current, toChapterSummary(nextChapter)].sort((left, right) => left.chapterIndex - right.chapterIndex),
    );
    if (nextEventGraph) {
      setEventGraph(nextEventGraph);
      setChapters(nextEventGraph.chapters);
      setSelectedChapterIndex((current) =>
        current && nextEventGraph.chapters.some((chapter) => chapter.chapterIndex === current)
          ? current
          : nextEventGraph.chapters[0]?.chapterIndex,
      );
    }
  }

  function updateScriptWorkspace(
    updater: (workspace: ScriptDraftWorkspace) => ScriptDraftWorkspace,
  ) {
    setScriptWorkspace((current) => {
      if (!current) {
        return current;
      }
      setScriptWorkspaceDirty(true);
      return updater(current);
    });
  }

  function updateSkeleton<K extends keyof ScriptDraftWorkspace["storySkeleton"]>(
    key: K,
    value: ScriptDraftWorkspace["storySkeleton"][K],
  ) {
    updateScriptWorkspace((workspace) => ({
      ...workspace,
      storySkeleton: {
        ...workspace.storySkeleton,
        [key]: value,
      },
    }));
  }

  function updateAdaptation<K extends keyof ScriptDraftWorkspace["adaptationStrategy"]>(
    key: K,
    value: ScriptDraftWorkspace["adaptationStrategy"][K],
  ) {
    updateScriptWorkspace((workspace) => {
      const nextAdaptation = {
        ...workspace.adaptationStrategy,
        [key]: value,
      };
      return {
        ...workspace,
        adaptationStrategy: nextAdaptation,
        script:
          key === "strategy"
            ? { ...workspace.script, strategy: value as ScriptAdaptationStrategy }
            : workspace.script,
      };
    });
  }

  function updateScript<K extends keyof ScriptDraftWorkspace["script"]>(
    key: K,
    value: ScriptDraftWorkspace["script"][K],
  ) {
    updateScriptWorkspace((workspace) => ({
      ...workspace,
      script: {
        ...workspace.script,
        [key]: value,
      },
    }));
  }

  function handleCreativeStoryboardCreated(result: CreateCreativeStoryboardResult) {
    replaceNovel(result.novel);
    setSelectedNovelId(result.novel.id);
    applyDraft(result.draft);
    setConfirmNewVersion(false);
  }

  return (
    <section className="novel-storyboard-panel" aria-label="Novel storyboard workflow">
      <div className="panel-heading compact">
        <h2>Novel</h2>
        <span>{novels.length}</span>
      </div>

      <CreativeAgentEntry
        canvasNodes={canvasNodes}
        projectId={projectId}
        selectedNodeId={selectedNodeId}
        hasPriorStoryboardImport={hasPriorStoryboardImport}
        onCreativeStoryboardCreated={handleCreativeStoryboardCreated}
        onStoryboardImported={onStoryboardImported}
      />

      <form className="novel-source-form" onSubmit={handleCreateNovel}>
        <label className="field-label">
          <span>Title</span>
          <input
            name="new-novel-title"
            required
            value={newTitle}
            onChange={(event) => setNewTitle(event.target.value)}
          />
        </label>
        <label className="field-label">
          <span>Content</span>
          <textarea
            name="new-novel-content"
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
            <input
              name="selected-novel-title"
              value={selectedTitle}
              onChange={(event) => setSelectedTitle(event.target.value)}
            />
          </label>
          <label className="field-label">
            <span>Content</span>
            <textarea
              name="selected-novel-content"
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
              className="ghost-action compact"
              type="button"
              onClick={() => void handleExtractEvents()}
              disabled={Boolean(busyAction)}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Extract events
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
        <ChapterEventWorkbench
          busy={Boolean(busyAction)}
          chapterContent={chapterContent}
          chapterDetail={chapterDetail}
          chapterTitle={chapterTitle}
          chapters={chapters}
          eventGraph={eventGraph}
          selectedChapterIndex={selectedChapterIndex}
          onChapterContentChange={setChapterContent}
          onChapterTitleChange={setChapterTitle}
          onExtractChapterEvents={() => void handleExtractChapterEvents()}
          onSelectChapter={setSelectedChapterIndex}
          onUpdateChapter={(event) => void handleUpdateChapter(event)}
        />
      ) : null}

      {selectedNovel ? (
        <section className="script-workbench" aria-label="Script workbench">
          <div className="panel-heading compact">
            <h2>Script</h2>
            <span>{scriptDrafts.length}</span>
          </div>
          <div className="storyboard-action-row">
            <label className="field-label script-strategy-field">
              <span>Strategy</span>
              <select
                name="script-strategy"
                value={scriptStrategy}
                onChange={(event) => setScriptStrategy(event.target.value as ScriptAdaptationStrategy)}
              >
                <option value="faithful">Faithful</option>
                <option value="short_drama">Short drama</option>
                <option value="visual_first">Visual first</option>
              </select>
            </label>
            <button
              className="primary-action compact"
              type="button"
              onClick={() => void handleCreateScriptDraft()}
              disabled={Boolean(busyAction)}
            >
              <Plus size={15} aria-hidden="true" />
              Create script
            </button>
          </div>
          {scriptDrafts.length === 0 ? (
            <div className="empty-state small">
              <strong>No scripts</strong>
              <span>Create a draft from this source.</span>
            </div>
          ) : (
            <ul className="script-draft-list">
              {scriptDrafts.map((scriptDraft) => (
                <li className="script-draft-row" key={scriptDraft.id}>
                  <button
                    className={`novel-select ${selectedScriptDraftId === scriptDraft.id ? "active" : ""}`}
                    type="button"
                    onClick={() => setSelectedScriptDraftId(scriptDraft.id)}
                  >
                    <FileText size={15} aria-hidden="true" />
                    <span>{scriptDraft.title}</span>
                    <span>
                      v{scriptDraft.version} · {formatScriptStrategy(scriptDraft.strategy)} · {scriptDraft.status}
                    </span>
                  </button>
                  <div className="storyboard-action-row">
                    <button
                      className="ghost-action compact"
                      type="button"
                      onClick={() => void handleGenerateStoryboardFromScript(scriptDraft)}
                      disabled={Boolean(busyAction)}
                    >
                      <RefreshCw size={15} aria-hidden="true" />
                      Storyboard
                    </button>
                    <button
                      className="icon-action"
                      type="button"
                      title="Export script"
                      onClick={() => void handleExportScriptDraft(scriptDraft)}
                      disabled={Boolean(busyAction)}
                    >
                      <Download size={14} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {selectedScriptDraft && scriptWorkspace ? (
            <ScriptWorkspaceEditor
              busy={Boolean(busyAction)}
              dirty={scriptWorkspaceDirty}
              workspace={scriptWorkspace}
              onAdaptationChange={updateAdaptation}
              onSave={() => void handleSaveScriptWorkspace()}
              onScriptChange={updateScript}
              onSkeletonChange={updateSkeleton}
            />
          ) : null}
          {selectedScriptDraft ? (
            <ScriptAssetCandidatePanel
              busy={Boolean(busyAction)}
              candidates={scriptAssetCandidates}
              onCandidateChange={updateScriptAssetCandidate}
              onExtract={() => void handleExtractScriptAssets()}
              onImport={() => void handleImportScriptAssets()}
            />
          ) : null}
        </section>
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
          <div className="storyboard-action-row">
            <button
              className={confirmNewVersion ? "primary-action compact" : "ghost-action compact"}
              type="button"
              onClick={() => void handleImportStoryboard()}
              disabled={Boolean(busyAction) || !canImportStoryboard}
            >
              <Import size={15} aria-hidden="true" />
              {confirmNewVersion ? "Confirm new version" : "Import"}
            </button>
            {confirmNewVersion ? (
              <button
                className="icon-action"
                type="button"
                title="Cancel import"
                onClick={() => {
                  setConfirmNewVersion(false);
                  setNotice(null);
                }}
                disabled={Boolean(busyAction)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            ) : null}
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

interface ChapterEventWorkbenchProps {
  busy: boolean;
  chapters: NovelChapterSummary[];
  selectedChapterIndex: number | undefined;
  chapterDetail: NovelChapterDetail | undefined;
  chapterTitle: string;
  chapterContent: string;
  eventGraph: NovelEventGraphRecord | undefined;
  onSelectChapter: (chapterIndex: number) => void;
  onChapterTitleChange: (title: string) => void;
  onChapterContentChange: (content: string) => void;
  onUpdateChapter: (event: FormEvent<HTMLFormElement>) => void;
  onExtractChapterEvents: () => void;
}

interface ScriptWorkspaceEditorProps {
  busy: boolean;
  dirty: boolean;
  workspace: ScriptDraftWorkspace;
  onSkeletonChange: <K extends keyof ScriptDraftWorkspace["storySkeleton"]>(
    key: K,
    value: ScriptDraftWorkspace["storySkeleton"][K],
  ) => void;
  onAdaptationChange: <K extends keyof ScriptDraftWorkspace["adaptationStrategy"]>(
    key: K,
    value: ScriptDraftWorkspace["adaptationStrategy"][K],
  ) => void;
  onScriptChange: <K extends keyof ScriptDraftWorkspace["script"]>(
    key: K,
    value: ScriptDraftWorkspace["script"][K],
  ) => void;
  onSave: () => void;
}

function ScriptWorkspaceEditor({
  busy,
  dirty,
  workspace,
  onAdaptationChange,
  onSave,
  onScriptChange,
  onSkeletonChange,
}: ScriptWorkspaceEditorProps) {
  return (
    <form
      className="novel-detail-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <div className="panel-heading compact">
        <h2>Workspace</h2>
        <span>{dirty ? "Edited" : "Saved"}</span>
      </div>
      <label className="field-label">
        <span>Skeleton title</span>
        <input
          name="script-skeleton-title"
          value={workspace.storySkeleton.title}
          onChange={(event) => onSkeletonChange("title", event.target.value)}
        />
      </label>
      <label className="field-label">
        <span>Story skeleton</span>
        <textarea
          name="script-skeleton-logline"
          rows={3}
          value={workspace.storySkeleton.logline}
          onChange={(event) => onSkeletonChange("logline", event.target.value)}
        />
      </label>
      <label className="field-label">
        <span>Skeleton beats</span>
        <textarea
          name="script-skeleton-beats"
          rows={4}
          value={scriptBeatsText(workspace.storySkeleton.beats)}
          onChange={(event) =>
            onSkeletonChange("beats", scriptBeatsFromText(event.target.value, workspace.storySkeleton.beats))
          }
        />
      </label>
      <div className="storyboard-action-row">
        <label className="field-label script-strategy-field">
          <span>Strategy</span>
          <select
            name="workspace-script-strategy"
            value={workspace.adaptationStrategy.strategy}
            onChange={(event) => onAdaptationChange("strategy", event.target.value as ScriptAdaptationStrategy)}
          >
            <option value="faithful">Faithful</option>
            <option value="short_drama">Short drama</option>
            <option value="visual_first">Visual first</option>
          </select>
        </label>
      </div>
      <label className="field-label">
        <span>Adaptation strategy</span>
        <textarea
          name="script-adaptation-summary"
          rows={3}
          value={workspace.adaptationStrategy.summary}
          onChange={(event) => onAdaptationChange("summary", event.target.value)}
        />
      </label>
      <label className="field-label">
        <span>Supervision</span>
        <textarea
          name="script-supervision-notes"
          rows={2}
          value={workspace.adaptationStrategy.supervisionNotes ?? ""}
          onChange={(event) => onAdaptationChange("supervisionNotes", event.target.value)}
        />
      </label>
      <label className="field-label">
        <span>Revision</span>
        <textarea
          name="script-revision-notes"
          rows={2}
          value={workspace.adaptationStrategy.revisionNotes ?? ""}
          onChange={(event) => onAdaptationChange("revisionNotes", event.target.value)}
        />
      </label>
      <label className="field-label">
        <span>Script title</span>
        <input
          name="workspace-script-title"
          value={workspace.script.title}
          onChange={(event) => onScriptChange("title", event.target.value)}
        />
      </label>
      <label className="field-label">
        <span>Script logline</span>
        <textarea
          name="workspace-script-logline"
          rows={3}
          value={workspace.script.logline}
          onChange={(event) => onScriptChange("logline", event.target.value)}
        />
      </label>
      <label className="field-label">
        <span>Script scenes</span>
        <textarea
          name="workspace-script-scenes"
          rows={5}
          value={scriptScenesText(workspace.script.scenes)}
          onChange={(event) =>
            onScriptChange("scenes", scriptScenesFromText(event.target.value, workspace.script.scenes))
          }
        />
      </label>
      <button className="primary-action compact" type="submit" disabled={busy || !dirty}>
        <Save size={15} aria-hidden="true" />
        Save workspace
      </button>
    </form>
  );
}

interface ScriptAssetCandidatePanelProps {
  busy: boolean;
  candidates: ScriptAssetCandidate[];
  onCandidateChange: (candidateId: string, patch: Partial<ScriptAssetCandidate>) => void;
  onExtract: () => void;
  onImport: () => void;
}

function ScriptAssetCandidatePanel({
  busy,
  candidates,
  onCandidateChange,
  onExtract,
  onImport,
}: ScriptAssetCandidatePanelProps) {
  return (
    <section className="script-workbench" aria-label="Script asset candidates">
      <div className="panel-heading compact">
        <h2>Assets</h2>
        <span>{candidates.length}</span>
      </div>
      <div className="storyboard-action-row">
        <button className="ghost-action compact" type="button" onClick={onExtract} disabled={busy}>
          <RefreshCw size={15} aria-hidden="true" />
          Extract assets
        </button>
        <button
          className="primary-action compact"
          type="button"
          onClick={onImport}
          disabled={busy || candidates.length === 0}
        >
          <Import size={15} aria-hidden="true" />
          Import assets
        </button>
      </div>
      {candidates.length === 0 ? (
        <div className="empty-state small">
          <strong>No asset candidates</strong>
          <span>0 pending</span>
        </div>
      ) : (
        <ul className="script-draft-list">
          {candidates.map((candidate) => (
            <li className="script-draft-row" key={candidate.candidateId}>
              <div>
                <strong>{candidate.name}</strong>
                <span>
                  {candidate.type} · {candidate.dedupeKey}
                </span>
              </div>
              <label className="field-label">
                <span>Name</span>
                <input
                  value={candidate.name}
                  onChange={(event) => onCandidateChange(candidate.candidateId, { name: event.target.value })}
                />
              </label>
              <label className="field-label">
                <span>Description</span>
                <textarea
                  rows={2}
                  value={candidate.description}
                  onChange={(event) =>
                    onCandidateChange(candidate.candidateId, { description: event.target.value })
                  }
                />
              </label>
              <label className="field-label">
                <span>Prompt</span>
                <textarea
                  rows={2}
                  value={candidate.prompt}
                  onChange={(event) => onCandidateChange(candidate.candidateId, { prompt: event.target.value })}
                />
              </label>
              <label className="field-label">
                <span>Merge target</span>
                <input
                  value={candidate.mergeTargetNodeId ?? ""}
                  onChange={(event) =>
                    onCandidateChange(candidate.candidateId, {
                      mergeTargetNodeId: event.target.value.trim() || undefined,
                    })
                  }
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ChapterEventWorkbench({
  busy,
  chapters,
  selectedChapterIndex,
  chapterDetail,
  chapterTitle,
  chapterContent,
  eventGraph,
  onSelectChapter,
  onChapterTitleChange,
  onChapterContentChange,
  onUpdateChapter,
  onExtractChapterEvents,
}: ChapterEventWorkbenchProps) {
  return (
    <section className="script-workbench" aria-label="Chapter event workbench">
      <div className="panel-heading compact">
        <h2>Chapters</h2>
        <span>{chapters.length}</span>
      </div>
      <div className="event-graph-summary" aria-label="Novel event graph">
        <div>
          <strong>{eventGraph?.events.length ?? 0}</strong>
          <span>events</span>
        </div>
        <div>
          <strong>{chapters.filter((chapter) => chapter.eventState === "succeeded").length}</strong>
          <span>succeeded</span>
        </div>
        <div>
          <strong>{chapters.filter((chapter) => chapter.eventState === "failed").length}</strong>
          <span>failed</span>
        </div>
      </div>

      {chapters.length === 0 ? (
        <div className="empty-state small">
          <strong>No chapters</strong>
          <span>No graph</span>
        </div>
      ) : (
        <ul className="script-draft-list">
          {chapters.map((chapter) => (
            <li className="script-draft-row" key={chapter.chapterIndex}>
              <button
                className={`novel-select ${selectedChapterIndex === chapter.chapterIndex ? "active" : ""}`}
                type="button"
                onClick={() => onSelectChapter(chapter.chapterIndex)}
              >
                <FileText size={15} aria-hidden="true" />
                <span>{chapter.title}</span>
                <small>
                  {chapterStatusLabel(chapter.eventState)} · {chapter.eventCount} events
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}

      {chapterDetail ? (
        <form className="novel-detail-form" onSubmit={onUpdateChapter}>
          <div className="panel-heading compact">
            <h2>Chapter {chapterDetail.chapterIndex}</h2>
            <span>{chapterStatusLabel(chapterDetail.eventState)}</span>
          </div>
          <label className="field-label">
            <span>Title</span>
            <input
              name="chapter-title"
              value={chapterTitle}
              onChange={(event) => onChapterTitleChange(event.target.value)}
            />
          </label>
          <label className="field-label">
            <span>Content</span>
            <textarea
              name="chapter-content"
              rows={5}
              value={chapterContent}
              onChange={(event) => onChapterContentChange(event.target.value)}
            />
          </label>
          {chapterDetail.errorReason ? (
            <p className="form-error">{chapterDetail.errorReason}</p>
          ) : null}
          <div className="storyboard-action-row">
            <button className="primary-action compact" type="submit" disabled={busy}>
              <Save size={15} aria-hidden="true" />
              Save chapter
            </button>
            <button
              className="ghost-action compact"
              type="button"
              onClick={onExtractChapterEvents}
              disabled={busy}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Extract chapter
            </button>
          </div>
          {chapterDetail.events.length > 0 ? (
            <ul className="script-draft-list">
              {chapterDetail.events.map((event) => (
                <li className="script-draft-row" key={event.eventId}>
                  <div>
                    <strong>{event.title ?? event.eventId}</strong>
                    <span>{event.summary}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}

function toChapterSummary(chapter: NovelChapterDetail): NovelChapterSummary {
  const { content: _content, events: _events, ...summary } = chapter;
  return summary;
}

function cloneWorkspace(workspace: ScriptDraftWorkspace): ScriptDraftWorkspace {
  return JSON.parse(JSON.stringify(workspace)) as ScriptDraftWorkspace;
}

function scriptBeatsText(beats: readonly ScriptBeat[]): string {
  return beats.map((beat) => `${beat.title}: ${beat.summary}`).join("\n");
}

function scriptBeatsFromText(value: string, current: readonly ScriptBeat[]): ScriptBeat[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const currentBeat = current[index];
      const [titlePart, ...summaryParts] = line.split(":");
      const summary = summaryParts.join(":").trim() || line;
      return {
        ...(currentBeat ?? {
          beatId: `beat_${index + 1}`,
          eventIds: [],
        }),
        orderIndex: index + 1,
        title: titlePart?.trim() || `Beat ${index + 1}`,
        summary,
      };
    });
}

function scriptScenesText(scenes: readonly ScriptScene[]): string {
  return scenes.map((scene) => `${scene.title}: ${scene.summary}`).join("\n");
}

function scriptScenesFromText(value: string, current: readonly ScriptScene[]): ScriptScene[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const currentScene = current[index];
      const [titlePart, ...summaryParts] = line.split(":");
      const summary = summaryParts.join(":").trim() || line;
      return {
        ...(currentScene ?? {
          sceneId: `script_scene_${index + 1}`,
          beats: [],
        }),
        orderIndex: index + 1,
        title: titlePart?.trim() || `Scene ${index + 1}`,
        summary,
      };
    });
}

function chapterStatusLabel(state: NovelChapterSummary["eventState"]): string {
  if (state === "succeeded") {
    return "Succeeded";
  }
  if (state === "failed") {
    return "Failed";
  }
  return "Pending";
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

function formatScriptStrategy(strategy: ScriptAdaptationStrategy): string {
  if (strategy === "short_drama") {
    return "Short drama";
  }
  if (strategy === "visual_first") {
    return "Visual first";
  }
  return "Faithful";
}

function downloadTextFile(filename: string, content: string) {
  if (typeof document === "undefined") {
    return;
  }
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
