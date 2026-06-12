import type {
  AssetDetail,
  AssetListItem,
  AssetPurpose,
  CanvasLoadResult,
  CreateCanvasEdgeInput,
  CreateCanvasEdgeResult,
  CreateCanvasNodeInput,
  CreateCanvasNodeResult,
  CreateBatchImagesToVideosJobInput,
  CreateBatchImagesToVideosJobResult,
  CreateGenerationJobInput,
  CreateGenerationJobResult,
  CreateNovelDocumentInput,
  CreateNovelDocumentResult,
  CreateProjectInput,
  DeleteCanvasEdgeResult,
  DeleteCanvasNodeResult,
  DeleteNovelDocumentResult,
  ComposeShotPromptInput,
  GenerateStoryboardResult,
  GenerationJobListResult,
  GenerationJobRecord,
  ImageProviderCatalogResult,
  VideoProviderCatalogResult,
  ImportNovelSourceInput,
  ImportNovelSourceResult,
  ImportStoryboardToCanvasInput,
  ImportStoryboardToCanvasResult,
  MarkStoryboardDraftReadyResult,
  NovelDocumentRecord,
  ProjectDetail,
  ProjectListItem,
  RetryGenerationJobResult,
  SaveCanvasSnapshotInput,
  SaveCanvasSnapshotResult,
  ShotPromptCompositionResult,
  StoryboardDraftRecord,
  UpdateStoryboardDraftInput,
  UpdateStoryboardDraftResult,
  UpdateProjectInput,
  UpdateCanvasNodeGeometryInput,
  UpdateCanvasNodeGeometryResult,
  UpdateCanvasNodeInput,
  UpdateCanvasNodeResult,
  UpdateNovelDocumentInput,
  UpdateNovelDocumentResult,
} from "@guga-flow/shared-types";

export type ComposeShotPromptRequest = Pick<
  ComposeShotPromptInput,
  "globalStylePrompt" | "modelPromptSuffix"
>;

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3002/api/v1").replace(
  /\/$/,
  "",
);

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`;
    try {
      const error = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(error.message)) {
        message = error.message.join(", ");
      } else if (error.message) {
        message = error.message;
      }
    } catch {
      // Keep the status message when the response is not JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function listProjects(): Promise<ProjectListItem[]> {
  return requestJson<ProjectListItem[]>("/projects");
}

export function createProject(input: CreateProjectInput): Promise<ProjectDetail> {
  return requestJson<ProjectDetail>("/projects", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectDetail> {
  return requestJson<ProjectDetail>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function duplicateProject(projectId: string): Promise<ProjectDetail> {
  return requestJson<ProjectDetail>(`/projects/${projectId}/duplicate`, {
    method: "POST",
  });
}

export function deleteProject(projectId: string): Promise<{ deleted: true }> {
  return requestJson<{ deleted: true }>(`/projects/${projectId}`, {
    method: "DELETE",
  });
}

export function listAssets(projectId: string): Promise<AssetListItem[]> {
  return requestJson<AssetListItem[]>(`/projects/${projectId}/assets`);
}

export function getAsset(projectId: string, assetId: string): Promise<AssetDetail> {
  return requestJson<AssetDetail>(`/projects/${projectId}/assets/${assetId}`);
}

export function uploadAsset(
  projectId: string,
  input: { file: File; purpose?: AssetPurpose },
): Promise<AssetDetail> {
  const formData = new FormData();
  formData.set("file", input.file);
  if (input.purpose) {
    formData.set("purpose", input.purpose);
  }

  return requestJson<AssetDetail>(`/projects/${projectId}/assets/upload`, {
    method: "POST",
    body: formData,
  });
}

export function deleteAsset(projectId: string, assetId: string): Promise<{ deleted: true }> {
  return requestJson<{ deleted: true }>(`/projects/${projectId}/assets/${assetId}`, {
    method: "DELETE",
  });
}

export function assetPreviewUrl(projectId: string, assetId: string): string {
  return apiUrl(`/projects/${projectId}/assets/${assetId}/preview`);
}

export function listNovelDocuments(projectId: string): Promise<NovelDocumentRecord[]> {
  return requestJson<NovelDocumentRecord[]>(`/projects/${projectId}/novels`);
}

export function createNovelDocument(
  projectId: string,
  input: CreateNovelDocumentInput,
): Promise<CreateNovelDocumentResult> {
  return requestJson<CreateNovelDocumentResult>(`/projects/${projectId}/novels`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function importNovelSource(
  projectId: string,
  input: ImportNovelSourceInput,
): Promise<ImportNovelSourceResult> {
  return requestJson<ImportNovelSourceResult>(`/projects/${projectId}/novels/import`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getNovelDocument(
  projectId: string,
  novelId: string,
): Promise<NovelDocumentRecord> {
  return requestJson<NovelDocumentRecord>(`/projects/${projectId}/novels/${novelId}`);
}

export function updateNovelDocument(
  projectId: string,
  novelId: string,
  input: UpdateNovelDocumentInput,
): Promise<UpdateNovelDocumentResult> {
  return requestJson<UpdateNovelDocumentResult>(`/projects/${projectId}/novels/${novelId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteNovelDocument(
  projectId: string,
  novelId: string,
): Promise<DeleteNovelDocumentResult> {
  return requestJson<DeleteNovelDocumentResult>(`/projects/${projectId}/novels/${novelId}`, {
    method: "DELETE",
  });
}

export function generateStoryboardDraft(
  projectId: string,
  novelId: string,
): Promise<GenerateStoryboardResult> {
  return requestJson<GenerateStoryboardResult>(
    `/projects/${projectId}/novels/${novelId}/generate-storyboard`,
    { method: "POST" },
  );
}

export function getActiveStoryboardDraft(
  projectId: string,
  novelId: string,
): Promise<StoryboardDraftRecord> {
  return requestJson<StoryboardDraftRecord>(
    `/projects/${projectId}/novels/${novelId}/storyboard-draft`,
  );
}

export function updateStoryboardDraft(
  projectId: string,
  novelId: string,
  draftId: string,
  input: UpdateStoryboardDraftInput,
): Promise<UpdateStoryboardDraftResult> {
  return requestJson<UpdateStoryboardDraftResult>(
    `/projects/${projectId}/novels/${novelId}/storyboard-draft/${draftId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function markStoryboardDraftReady(
  projectId: string,
  novelId: string,
  draftId: string,
): Promise<MarkStoryboardDraftReadyResult> {
  return requestJson<MarkStoryboardDraftReadyResult>(
    `/projects/${projectId}/novels/${novelId}/storyboard-draft/${draftId}/ready`,
    { method: "POST" },
  );
}

export function importStoryboardToCanvas(
  projectId: string,
  input: ImportStoryboardToCanvasInput,
): Promise<ImportStoryboardToCanvasResult> {
  return requestJson<ImportStoryboardToCanvasResult>(
    `/projects/${projectId}/canvas/import-storyboard`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function getProjectCanvas(projectId: string): Promise<CanvasLoadResult> {
  return requestJson<CanvasLoadResult>(`/projects/${projectId}/canvas`);
}

export function saveCanvasSnapshot(
  projectId: string,
  input: SaveCanvasSnapshotInput,
): Promise<SaveCanvasSnapshotResult> {
  return requestJson<SaveCanvasSnapshotResult>(`/projects/${projectId}/canvas/snapshot`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function createCanvasNode<TData = unknown>(
  projectId: string,
  input: CreateCanvasNodeInput<TData>,
): Promise<CreateCanvasNodeResult> {
  return requestJson<CreateCanvasNodeResult>(`/projects/${projectId}/canvas/nodes`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createCanvasEdge<TData = unknown>(
  projectId: string,
  input: CreateCanvasEdgeInput<TData>,
): Promise<CreateCanvasEdgeResult> {
  return requestJson<CreateCanvasEdgeResult>(`/projects/${projectId}/canvas/edges`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCanvasNode(
  projectId: string,
  nodeId: string,
  input: UpdateCanvasNodeInput,
): Promise<UpdateCanvasNodeResult> {
  return requestJson<UpdateCanvasNodeResult>(`/projects/${projectId}/canvas/nodes/${nodeId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function updateCanvasNodeGeometry(
  projectId: string,
  nodeId: string,
  input: UpdateCanvasNodeGeometryInput,
): Promise<UpdateCanvasNodeGeometryResult> {
  return requestJson<UpdateCanvasNodeGeometryResult>(
    `/projects/${projectId}/canvas/nodes/${nodeId}/geometry`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function deleteCanvasNode(
  projectId: string,
  nodeId: string,
): Promise<DeleteCanvasNodeResult> {
  return requestJson<DeleteCanvasNodeResult>(`/projects/${projectId}/canvas/nodes/${nodeId}`, {
    method: "DELETE",
  });
}

export function deleteCanvasEdge(
  projectId: string,
  edgeId: string,
): Promise<DeleteCanvasEdgeResult> {
  return requestJson<DeleteCanvasEdgeResult>(`/projects/${projectId}/canvas/edges/${edgeId}`, {
    method: "DELETE",
  });
}

export function composeShotPrompt(
  projectId: string,
  shotNodeId: string,
  input: ComposeShotPromptRequest = {},
): Promise<ShotPromptCompositionResult> {
  return requestJson<ShotPromptCompositionResult>(
    `/projects/${projectId}/prompts/shot/${shotNodeId}/compose`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function createGenerationJob(
  projectId: string,
  input: CreateGenerationJobInput,
): Promise<CreateGenerationJobResult> {
  return requestJson<CreateGenerationJobResult>(`/projects/${projectId}/generation/jobs`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getImageProviderCatalog(): Promise<ImageProviderCatalogResult> {
  return requestJson<ImageProviderCatalogResult>("/providers/image");
}

export function getVideoProviderCatalog(): Promise<VideoProviderCatalogResult> {
  return requestJson<VideoProviderCatalogResult>("/providers/video");
}

export function createBatchImagesToVideosJobs(
  projectId: string,
  input: CreateBatchImagesToVideosJobInput,
): Promise<CreateBatchImagesToVideosJobResult> {
  return requestJson<CreateBatchImagesToVideosJobResult>(
    `/projects/${projectId}/generation/jobs/batch-images-to-videos`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function listGenerationJobs(projectId: string): Promise<GenerationJobListResult> {
  return requestJson<GenerationJobListResult>(`/projects/${projectId}/generation/jobs`);
}

export function retryGenerationJob(
  projectId: string,
  jobId: string,
): Promise<RetryGenerationJobResult> {
  return requestJson<RetryGenerationJobResult>(
    `/projects/${projectId}/generation/jobs/${jobId}/retry`,
    { method: "POST" },
  );
}

export function cancelGenerationJob(projectId: string, jobId: string): Promise<GenerationJobRecord> {
  return requestJson<GenerationJobRecord>(
    `/projects/${projectId}/generation/jobs/${jobId}/cancel`,
    { method: "POST" },
  );
}
