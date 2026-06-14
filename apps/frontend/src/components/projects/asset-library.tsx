"use client";

import type {
  AssetBatchAction,
  AssetBatchInput,
  AssetCollectionRecord,
  AssetDetail,
  AssetListFilters,
  AssetListItem,
  AssetPurpose,
  AssetTagRecord,
  AssetType,
  GenerationJobRecord,
} from "@guga-flow/shared-types";
import {
  CheckSquare,
  FileText,
  FolderPlus,
  Image as ImageIcon,
  Search,
  Sparkles,
  Tags,
  Trash2,
  Upload,
  Video,
  Volume2,
  X,
} from "lucide-react";
import React, { FormEvent, useEffect, useMemo, useState } from "react";

import {
  assetPreviewUrl,
  batchAssets,
  cancelGenerationJob,
  createAssetCollection,
  createAssetImageGenerationJob,
  createAssetAnalysisJob,
  createAssetPromptPolishJob,
  createAssetTag,
  deleteAsset,
  getAsset,
  listGenerationJobs,
  listAssetCollections,
  listAssets,
  listAssetTags,
  retryGenerationJob,
  uploadAsset,
} from "../../lib/api";

interface AssetLibraryProps {
  projectId: string;
  initialAssets?: AssetListItem[];
}

const ALL_VALUE = "__all";
const NONE_VALUE = "__none";

const ASSET_TYPE_OPTIONS: Array<{ value: AssetType; label: string }> = [
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
  { value: "document", label: "Docs" },
  { value: "package", label: "Packages" },
];

const PURPOSE_LABELS: Record<AssetPurpose, string> = {
  uploaded: "Uploaded",
  shot_keyframe: "Keyframe",
  shot_audio: "Shot audio",
  character_reference: "Character ref",
  voice_reference: "Voice ref",
  location_reference: "Location ref",
  style_reference: "Style ref",
  background_music: "BGM",
  shot_clip: "Shot clip",
  editor_package: "Editor package",
  canvas_fragment: "Canvas fragment",
};

function formatBytes(value?: number): string {
  if (!value) {
    return "0 B";
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${Math.round(value / 102.4) / 10} KB`;
  }
  return `${Math.round(value / 1024 / 102.4) / 10} MB`;
}

function assetLabel(asset: Pick<AssetListItem, "id" | "originalFilename">): string {
  return asset.originalFilename ?? asset.id;
}

function AssetTypeIcon({ previewKind }: { previewKind: AssetListItem["previewKind"] }) {
  if (previewKind === "image") {
    return <ImageIcon size={15} aria-hidden="true" />;
  }
  if (previewKind === "video") {
    return <Video size={15} aria-hidden="true" />;
  }
  if (previewKind === "audio") {
    return <Volume2 size={15} aria-hidden="true" />;
  }
  return <FileText size={15} aria-hidden="true" />;
}

function mergeById<T extends { id: string }>(items: T[], item: T): T[] {
  const next = items.filter((candidate) => candidate.id !== item.id);
  return [item, ...next];
}

function assetJobOperation(job: GenerationJobRecord): string | undefined {
  const input = job.inputJson as { operation?: unknown };
  return typeof input.operation === "string" ? input.operation : undefined;
}

function isAssetPromptJob(job: GenerationJobRecord): boolean {
  const operation = assetJobOperation(job);
  return operation === "asset_prompt_polish" || operation === "asset_image_generation";
}

function assetJobLabel(job: GenerationJobRecord): string {
  return assetJobOperation(job) === "asset_image_generation" ? "Generate" : "Polish";
}

export function AssetLibrary({ projectId, initialAssets = [] }: AssetLibraryProps) {
  const [assets, setAssets] = useState<AssetListItem[]>(initialAssets);
  const [collections, setCollections] = useState<AssetCollectionRecord[]>([]);
  const [tags, setTags] = useState<AssetTagRecord[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [assetJobs, setAssetJobs] = useState<GenerationJobRecord[]>([]);
  const [purpose, setPurpose] = useState<AssetPurpose>("uploaded");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | typeof ALL_VALUE>(ALL_VALUE);
  const [collectionFilter, setCollectionFilter] = useState(ALL_VALUE);
  const [tagFilter, setTagFilter] = useState(ALL_VALUE);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [bulkAction, setBulkAction] = useState<AssetBatchAction>("move_collection");
  const [bulkCollectionId, setBulkCollectionId] = useState(NONE_VALUE);
  const [bulkTagId, setBulkTagId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const filters = useMemo<AssetListFilters>(() => {
    const trimmedQuery = query.trim();
    return {
      query: trimmedQuery || undefined,
      type: typeFilter === ALL_VALUE ? undefined : typeFilter,
      collectionId: collectionFilter === ALL_VALUE ? undefined : collectionFilter,
      tagIds: tagFilter === ALL_VALUE ? undefined : [tagFilter],
    };
  }, [collectionFilter, query, tagFilter, typeFilter]);

  function applyAssetList(result: AssetListItem[]) {
    const nextIds = new Set(result.map((asset) => asset.id));
    setAssets(result);
    setSelectedAsset((current) => {
      if (!current) {
        return null;
      }

      const refreshed = result.find((asset) => asset.id === current.id);
      return refreshed ? { ...current, ...refreshed } : null;
    });
    setSelectedAssetIds((current) => {
      const next = new Set<string>();
      for (const assetId of current) {
        if (nextIds.has(assetId)) {
          next.add(assetId);
        }
      }
      return next;
    });
  }

  useEffect(() => {
    let ignore = false;

    Promise.all([listAssetCollections(projectId), listAssetTags(projectId)])
      .then(([loadedCollections, loadedTags]) => {
        if (!ignore) {
          setCollections(loadedCollections);
          setTags(loadedTags);
        }
      })
      .catch((loadError: unknown) => {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load asset library");
        }
      });

    return () => {
      ignore = true;
    };
  }, [projectId]);

  useEffect(() => {
    let ignore = false;

    async function refreshJobs() {
      try {
        const result = await listGenerationJobs(projectId);
        if (!ignore) {
          setAssetJobs(result.jobs.filter(isAssetPromptJob).slice(0, 5));
        }
      } catch {
        if (!ignore) {
          setAssetJobs([]);
        }
      }
    }

    void refreshJobs();
    const intervalId = window.setInterval(() => void refreshJobs(), 2500);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [projectId]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);

    listAssets(projectId, filters)
      .then((result) => {
        if (!ignore) {
          applyAssetList(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!ignore) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load assets");
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [filters, projectId]);

  async function refreshAssets() {
    const result = await listAssets(projectId, filters);
    applyAssetList(result);
    return result;
  }

  async function refreshAssetJobs() {
    const result = await listGenerationJobs(projectId);
    setAssetJobs(result.jobs.filter(isAssetPromptJob).slice(0, 5));
    return result;
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("file");
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const uploaded = await uploadAsset(projectId, { file, purpose });
      setAssets((current) => mergeById(current, uploaded));
      setSelectedAsset(uploaded);
      form.reset();

      if (uploaded.previewKind === "text") {
        try {
          setSelectedAsset(await getAsset(projectId, uploaded.id));
        } catch {
          setError("Uploaded asset saved, but text preview could not be loaded");
        }
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload asset");
    } finally {
      setBusy(false);
    }
  }

  async function handleSelect(asset: AssetListItem) {
    setError(null);
    try {
      const detail = await getAsset(projectId, asset.id);
      setSelectedAsset(detail);
    } catch (selectError) {
      setError(selectError instanceof Error ? selectError.message : "Unable to load asset");
    }
  }

  async function handleDelete(assetId: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteAsset(projectId, assetId);
      setAssets((current) => current.filter((asset) => asset.id !== assetId));
      setSelectedAssetIds((current) => {
        const next = new Set(current);
        next.delete(assetId);
        return next;
      });
      if (selectedAsset?.id === assetId) {
        setSelectedAsset(null);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete asset");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCollection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newCollectionName.trim();
    if (!name) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const created = await createAssetCollection(projectId, { name, kind: "manual" });
      setCollections((current) => mergeById(current, created));
      setCollectionFilter(created.id);
      setNewCollectionName("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create collection");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newTagName.trim();
    if (!name) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const created = await createAssetTag(projectId, { name });
      setTags((current) => mergeById(current, created));
      setTagFilter(created.id);
      setBulkTagId(created.id);
      setNewTagName("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create tag");
    } finally {
      setBusy(false);
    }
  }

  function toggleAssetSelection(assetId: string) {
    setSelectedAssetIds((current) => {
      const next = new Set(current);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  }

  async function handleBatch() {
    if (selectedAssetIds.size === 0) {
      return;
    }

    const input: AssetBatchInput = {
      assetIds: [...selectedAssetIds],
      action: bulkAction,
    };

    if (bulkAction === "move_collection" && bulkCollectionId !== NONE_VALUE) {
      input.collectionId = bulkCollectionId;
    }
    if (bulkAction === "add_tags" || bulkAction === "remove_tags") {
      if (!bulkTagId) {
        setError("Choose a tag");
        return;
      }
      input.tagIds = [bulkTagId];
    }

    setBusy(true);
    setError(null);
    try {
      const result = await batchAssets(projectId, input);
      if (result.deletedAssetIds?.length) {
        const deleted = new Set(result.deletedAssetIds);
        setAssets((current) => current.filter((asset) => !deleted.has(asset.id)));
        if (selectedAsset && deleted.has(selectedAsset.id)) {
          setSelectedAsset(null);
        }
      } else {
        applyAssetList(result.assets);
      }
      setSelectedAssetIds(new Set());
      await refreshAssets();
    } catch (batchError) {
      setError(batchError instanceof Error ? batchError.message : "Unable to update assets");
    } finally {
      setBusy(false);
    }
  }

  async function handleAnalyze(operation: "asset_caption" | "asset_classification") {
    if (selectedAssetIds.size === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createAssetAnalysisJob(projectId, {
        operation,
        assetIds: [...selectedAssetIds],
        provider: "mock-vision",
        model: "mock-vision-v1",
        overwrite: false,
      });
      setSelectedAssetIds(new Set());
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : "Unable to queue asset analysis");
    } finally {
      setBusy(false);
    }
  }

  async function handlePromptPolish() {
    if (selectedAssetIds.size === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createAssetPromptPolishJob(projectId, {
        operation: "asset_prompt_polish",
        assetIds: [...selectedAssetIds],
        overwrite: false,
      });
      setSelectedAssetIds(new Set());
      await refreshAssetJobs();
    } catch (polishError) {
      setError(polishError instanceof Error ? polishError.message : "Unable to queue prompt polish");
    } finally {
      setBusy(false);
    }
  }

  async function handleAssetImageGeneration() {
    if (selectedAssetIds.size === 0) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createAssetImageGenerationJob(projectId, {
        operation: "asset_image_generation",
        assetIds: [...selectedAssetIds],
        provider: "mock-image",
        model: "mock-image-v1",
        count: 1,
        overwrite: false,
      });
      setSelectedAssetIds(new Set());
      await refreshAssetJobs();
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Unable to queue asset generation");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelJob(jobId: string) {
    setBusy(true);
    setError(null);
    try {
      await cancelGenerationJob(projectId, jobId);
      await refreshAssetJobs();
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel job");
    } finally {
      setBusy(false);
    }
  }

  async function handleRetryJob(jobId: string) {
    setBusy(true);
    setError(null);
    try {
      await retryGenerationJob(projectId, jobId);
      await refreshAssetJobs();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "Unable to retry job");
    } finally {
      setBusy(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setTypeFilter(ALL_VALUE);
    setCollectionFilter(ALL_VALUE);
    setTagFilter(ALL_VALUE);
  }

  const hasFilters =
    query.trim() !== "" ||
    typeFilter !== ALL_VALUE ||
    collectionFilter !== ALL_VALUE ||
    tagFilter !== ALL_VALUE;
  const selectedCount = selectedAssetIds.size;
  const needsBatchTag = bulkAction === "add_tags" || bulkAction === "remove_tags";
  const batchDisabled = busy || selectedCount === 0 || (needsBatchTag && !bulkTagId);

  return (
    <section className="asset-library" aria-label="Asset library">
      <div className="panel-heading compact">
        <h2>Assets</h2>
        <span>{loading ? "Loading" : `${assets.length}`}</span>
      </div>

      <form className="asset-upload" onSubmit={handleUpload}>
        <input
          name="file"
          type="file"
          accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,audio/mpeg,audio/mp4,audio/wav,audio/x-wav,audio/ogg,audio/webm,text/plain,text/markdown,.mp3,.m4a,.wav,.ogg,.webm,.md"
        />
        <select
          name="purpose"
          value={purpose}
          onChange={(event) => setPurpose(event.target.value as AssetPurpose)}
        >
          {Object.entries(PURPOSE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button className="primary-action compact" type="submit" disabled={busy}>
          <Upload size={15} aria-hidden="true" />
          Upload
        </button>
      </form>

      <div className="asset-toolbar">
        <label className="asset-search">
          <Search size={14} aria-hidden="true" />
          <input
            aria-label="Search assets"
            placeholder="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <select
          aria-label="Asset type"
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as AssetType | typeof ALL_VALUE)}
        >
          <option value={ALL_VALUE}>All types</option>
          {ASSET_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Collection"
          value={collectionFilter}
          onChange={(event) => setCollectionFilter(event.target.value)}
        >
          <option value={ALL_VALUE}>All collections</option>
          {collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
            </option>
          ))}
        </select>
        <select aria-label="Tag" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
          <option value={ALL_VALUE}>All tags</option>
          {tags.map((tag) => (
            <option key={tag.id} value={tag.id}>
              {tag.name}
            </option>
          ))}
        </select>
        <button
          className="icon-action"
          type="button"
          title="Clear filters"
          onClick={clearFilters}
          disabled={!hasFilters}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="asset-create-row">
        <form onSubmit={handleCreateCollection}>
          <input
            aria-label="Collection name"
            placeholder="New collection"
            value={newCollectionName}
            onChange={(event) => setNewCollectionName(event.target.value)}
          />
          <button className="ghost-action compact" type="submit" disabled={busy || !newCollectionName.trim()}>
            <FolderPlus size={14} aria-hidden="true" />
            Create
          </button>
        </form>
        <form onSubmit={handleCreateTag}>
          <input
            aria-label="Tag name"
            placeholder="New tag"
            value={newTagName}
            onChange={(event) => setNewTagName(event.target.value)}
          />
          <button className="ghost-action compact" type="submit" disabled={busy || !newTagName.trim()}>
            <Tags size={14} aria-hidden="true" />
            Tag
          </button>
        </form>
      </div>

      <div className="asset-batch-bar">
        <span>{selectedCount} selected</span>
        <select
          aria-label="Batch action"
          value={bulkAction}
          onChange={(event) => setBulkAction(event.target.value as AssetBatchAction)}
        >
          <option value="move_collection">Move</option>
          <option value="add_tags">Add tag</option>
          <option value="remove_tags">Remove tag</option>
          <option value="delete">Delete</option>
        </select>
        {bulkAction === "move_collection" ? (
          <select
            aria-label="Target collection"
            value={bulkCollectionId}
            onChange={(event) => setBulkCollectionId(event.target.value)}
          >
            <option value={NONE_VALUE}>No collection</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </select>
        ) : null}
        {needsBatchTag ? (
          <select
            aria-label="Batch tag"
            value={bulkTagId}
            onChange={(event) => setBulkTagId(event.target.value)}
          >
            <option value="">Choose tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        ) : null}
        <button className="ghost-action compact" type="button" onClick={() => void handleBatch()} disabled={batchDisabled}>
          <CheckSquare size={14} aria-hidden="true" />
          Apply
        </button>
        <button
          className="ghost-action compact"
          type="button"
          onClick={() => void handleAnalyze("asset_caption")}
          disabled={busy || selectedCount === 0}
        >
          <Sparkles size={14} aria-hidden="true" />
          Caption
        </button>
        <button
          className="ghost-action compact"
          type="button"
          onClick={() => void handleAnalyze("asset_classification")}
          disabled={busy || selectedCount === 0}
        >
          <Tags size={14} aria-hidden="true" />
          Classify
        </button>
        <button
          className="ghost-action compact"
          type="button"
          onClick={() => void handlePromptPolish()}
          disabled={busy || selectedCount === 0}
        >
          <Sparkles size={14} aria-hidden="true" />
          Polish
        </button>
        <button
          className="ghost-action compact"
          type="button"
          onClick={() => void handleAssetImageGeneration()}
          disabled={busy || selectedCount === 0}
        >
          <ImageIcon size={14} aria-hidden="true" />
          Generate
        </button>
      </div>

      {assetJobs.length ? (
        <div className="asset-batch-bar">
          <span>Jobs</span>
          {assetJobs.map((job) => (
            <React.Fragment key={job.id}>
              <small>{assetJobLabel(job)} · {job.status}</small>
              {job.errorMessage ? <small>{job.errorMessage}</small> : null}
              {job.status === "queued" || job.status === "running" || job.status === "provider_waiting" ? (
                <button
                  className="ghost-action compact"
                  type="button"
                  onClick={() => void handleCancelJob(job.id)}
                  disabled={busy}
                >
                  <X size={14} aria-hidden="true" />
                  Cancel
                </button>
              ) : null}
              {job.status === "failed" ? (
                <button
                  className="ghost-action compact"
                  type="button"
                  onClick={() => void handleRetryJob(job.id)}
                  disabled={busy}
                >
                  <Sparkles size={14} aria-hidden="true" />
                  Retry
                </button>
              ) : null}
            </React.Fragment>
          ))}
        </div>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      {assets.length === 0 ? (
        <div className="empty-state small">
          <strong>No assets</strong>
          <span>Upload references or source media.</span>
        </div>
      ) : (
        <ul className="asset-list">
          {assets.map((asset) => (
            <li className="asset-row" key={asset.id}>
              <input
                className="asset-row-check"
                type="checkbox"
                aria-label={`Select ${assetLabel(asset)}`}
                checked={selectedAssetIds.has(asset.id)}
                onChange={() => toggleAssetSelection(asset.id)}
              />
              <button
                className={`asset-select ${selectedAsset?.id === asset.id ? "active" : ""}`}
                type="button"
                onClick={() => void handleSelect(asset)}
              >
                <AssetTypeIcon previewKind={asset.previewKind} />
                <span className="asset-copy">
                  <span className="asset-name">{assetLabel(asset)}</span>
                  <span className="asset-meta">
                    {PURPOSE_LABELS[asset.purpose]} · {formatBytes(asset.sizeBytes)}
                  </span>
                  <span className="asset-pills">
                    {asset.collection ? <small>{asset.collection.name}</small> : null}
                    {asset.tags?.map((tag) => (
                      <small key={tag.id}>{tag.name}</small>
                    ))}
                  </span>
                </span>
              </button>
              <button
                className="icon-action danger"
                type="button"
                title="Delete asset"
                onClick={() => void handleDelete(asset.id)}
                disabled={busy}
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedAsset ? (
        <div className="asset-preview">
          <strong>{assetLabel(selectedAsset)}</strong>
          {selectedAsset.collection || selectedAsset.tags?.length ? (
            <div className="asset-pills">
              {selectedAsset.collection ? <small>{selectedAsset.collection.name}</small> : null}
              {selectedAsset.tags?.map((tag) => (
                <small key={tag.id}>{tag.name}</small>
              ))}
            </div>
          ) : null}
          {selectedAsset.previewKind === "image" ? (
            <img src={assetPreviewUrl(projectId, selectedAsset.id)} alt="" />
          ) : null}
          {selectedAsset.previewKind === "video" ? (
            <video src={assetPreviewUrl(projectId, selectedAsset.id)} controls />
          ) : null}
          {selectedAsset.previewKind === "audio" ? (
            <audio src={assetPreviewUrl(projectId, selectedAsset.id)} controls />
          ) : null}
          {selectedAsset.previewKind === "text" ? (
            <pre>{selectedAsset.textPreview ?? "Text preview unavailable"}</pre>
          ) : null}
          {selectedAsset.previewKind === "metadata" ? <p>{selectedAsset.mimeType}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
