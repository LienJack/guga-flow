import type {
  AssetDetail,
  AssetBatchInput,
  AssetBatchResult,
  AssetCollectionRecord,
  AssetListFilters,
  AssetListItem,
  AssetMaintenanceInput,
  AssetMaintenanceResult,
  AssetPurpose,
  AssetTagRecord,
  CurrentSessionResult,
  CanvasLoadResult,
  CanvasPageListResult,
  CreateCanvasEdgeInput,
  CreateCanvasEdgeResult,
  CreateCanvasNodeInput,
  CreateCanvasNodeResult,
  CreateCanvasPageInput,
  CreateCanvasPageResult,
  CreateBatchImagesToVideosJobInput,
  CreateBatchImagesToVideosJobResult,
  CreateBatchShotsToImagesJobInput,
  CreateBatchShotsToImagesJobResult,
  CreateAgentCanvasActionInput,
  CreateAgentCanvasActionResult,
  CreateAgentSessionInput,
  CreateAgentSessionResult,
  CreateProductionAgentActionInput,
  CreateProductionAgentActionResult,
  CreateAgentMemoryInput,
  CreateCreativeStoryboardInput,
  CreateCreativeStoryboardResult,
  CreateScriptDraftInput,
  CreateScriptDraftResult,
  CreateEditorExportInput,
  CreateEditorExportResult,
  CreateGenerationJobInput,
  CreateGenerationJobResult,
  CreateAssetAnalysisJobInput,
  CreateAssetAnalysisJobResult,
  CreateAssetImageGenerationJobInput,
  CreateAssetImageGenerationJobResult,
  CreateAssetPromptPolishJobInput,
  CreateAssetPromptPolishJobResult,
  CreateMediaMetadataJobInput,
  CreateMediaMetadataJobResult,
  CreateSceneFrameExtractionJobInput,
  CreateSceneFrameExtractionJobResult,
  CreateWorkflowDefinitionInput,
  CreateWorkflowVersionInput,
  CreateWorkflowRunInput,
  WorkflowDefinitionResult,
  WorkflowListResult,
  WorkflowRunResult,
  ExportCanvasFragmentInput,
  ExportCanvasFragmentResult,
  ImportCanvasFragmentInput,
  ImportCanvasFragmentResult,
  CreateNovelDocumentInput,
  CreateNovelDocumentResult,
  CreateProjectInput,
  ExportProjectPackageResult,
  CreateProductionMediaClipInput,
  CreateProductionMediaClipResult,
  CreateProductionStoryboardItemsInput,
  CreateStoryboardMediaBoardInput,
  CreateStoryboardMediaBoardResult,
  DeleteCanvasEdgeResult,
  DeleteCanvasNodeResult,
  DeleteProductionStoryboardItemsInput,
  DeleteNovelDocumentResult,
  ComposeShotPromptInput,
  ExtractNovelChapterEventsInput,
  ExtractNovelChapterEventsResult,
  ExtractNovelEventsInput,
  ExtractNovelEventsResult,
  ExtractScriptAssetsResult,
  GenerateStoryboardResult,
  EditorExportDetailResult,
  EditorExportListResult,
  EditorExportSendResult,
  GenerationJobListResult,
  GenerationJobRecord,
  TaskCenterResult,
  AgentDeploymentResult,
  AgentMemoryListResult,
  AgentMemoryRecord,
  ResolveAgentRoleInput,
  ResolveAgentRoleResult,
  RecallAgentMemoriesInput,
  RecallAgentMemoriesResult,
  ClearAgentMemoriesInput,
  ClearAgentMemoriesResult,
  ImageProviderCatalogResult,
  LlmProviderCatalogResult,
  LoginInput,
  LoginResult,
  ListSkillTemplatesInput,
  LogoutResult,
  VideoProviderCatalogResult,
  ProviderConfigUpdateResult,
  ProviderConnectionTestInput,
  ProviderConnectionTestResult,
  ProviderManagementResult,
  ProviderModelDiscoveryInput,
  ProviderModelDiscoveryResult,
  ProgrammableProviderDefinitionResult,
  ProgrammableProviderDefinitionSummary,
  ProductionWorkspaceAgentContext,
  ProductionWorkspaceMutationResult,
  ProductionWorkspaceProjection,
  ReorderProductionStoryboardItemsInput,
  SelectProductionTrackVideoInput,
  SelectProductionTrackVideoResult,
  ImportNovelSourceInput,
  ImportNovelSourceResult,
  ImportedAssetResult,
  ImportLocalAssetInput,
  ImportRemoteAssetInput,
  ImportScriptAssetsInput,
  ImportScriptAssetsResult,
  ImportStoryboardToCanvasInput,
  ImportStoryboardToCanvasResult,
  MarkStoryboardDraftReadyResult,
  NovelChapterDetailResult,
  NovelChapterListResult,
  NovelDocumentRecord,
  NovelEventGraphRecord,
  ProjectDetail,
  ImportProjectPackageInput,
  ImportProjectPackageResult,
  ProjectPackageValidationResult,
  ProjectRecoverySnapshotResult,
  ProjectSettingsExportResult,
  ProjectSettingsImportValidationResult,
  ProjectSettingsSummaryResult,
  ProjectListItem,
  RetryGenerationJobResult,
  SaveCanvasSnapshotInput,
  SaveCanvasSnapshotResult,
  ShotPromptCompositionResult,
  SkillTemplateListResult,
  SkillTemplateResult,
  ScriptDraftListResult,
  ScriptExportResult,
  StoryboardDraftRecord,
  UpdateStoryboardDraftInput,
  UpdateStoryboardDraftResult,
  UpdateProjectInput,
  UpdateNovelChapterInput,
  UpdateNovelChapterResult,
  UpdateScriptDraftInput,
  UpdateScriptDraftResult,
  ValidateProjectSettingsImportInput,
  UpdateCanvasNodeGeometryInput,
  UpdateCanvasNodeGeometryResult,
  UpdateCanvasNodeInput,
  UpdateCanvasNodeResult,
  UpdateNovelDocumentInput,
  UpdateNovelDocumentResult,
  UpdateProviderConfigInput,
  UpdateSkillTemplateSourceInput,
  UndoAgentCanvasActionResult,
  UpdateAgentDeploymentInput,
  UpdateAgentMemoryInput,
  UpdateProductionWorkspaceItemInput,
  UpdateProductionWorkspaceItemResult,
  CreateProgrammableProviderInput,
  UpdateProgrammableProviderSourceInput,
  ActivateProgrammableProviderVersionInput,
  ActivateSkillTemplateVersionInput,
} from "@guga-flow/shared-types";

import { clearAuthToken, getAuthToken, setAuthToken } from "./session";

export type ComposeShotPromptRequest = Pick<
  ComposeShotPromptInput,
  "globalStylePrompt" | "modelPromptSuffix"
>;

const CONFIGURED_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const DEFAULT_API_PORT = process.env.NEXT_PUBLIC_API_PORT ?? "3002";

function defaultApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname && hostname !== "localhost" && hostname !== "127.0.0.1" && hostname !== "::1") {
      const protocol = window.location.protocol || "http:";
      return `${protocol}//${hostForUrl(hostname)}:${DEFAULT_API_PORT}/api/v1`;
    }
  }

  return `http://localhost:${DEFAULT_API_PORT}/api/v1`;
}

function hostForUrl(hostname: string): string {
  return hostname.includes(":") && !hostname.startsWith("[") ? `[${hostname}]` : hostname;
}

export function apiUrl(path: string): string {
  const baseUrl = CONFIGURED_API_BASE_URL ?? defaultApiBaseUrl();
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly statusText: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 401;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = normalizeHeaders(init?.headers);
  if (!(init?.body instanceof FormData) && !hasHeader(headers, "Content-Type")) {
    headers["Content-Type"] = "application/json";
  }

  const token = path === "/auth/login" ? undefined : getAuthToken();
  if (token && !hasHeader(headers, "Authorization")) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
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
    if (response.status === 401) {
      clearAuthToken();
    }
    throw new ApiRequestError(message, response.status, response.statusText);
  }

  return response.json() as Promise<T>;
}

function normalizeHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) {
    return {};
  }
  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  if (Array.isArray(headers)) {
    return Object.fromEntries(headers.map(([key, value]) => [key, value]));
  }
  return { ...headers };
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((key) => key.toLocaleLowerCase() === name.toLocaleLowerCase());
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const session = await requestJson<LoginResult>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
  setAuthToken(session.token);
  return session;
}

export function getCurrentSession(): Promise<CurrentSessionResult> {
  return requestJson<CurrentSessionResult>("/auth/session");
}

export async function logout(): Promise<LogoutResult> {
  try {
    return await requestJson<LogoutResult>("/auth/logout", {
      method: "POST",
    });
  } finally {
    clearAuthToken();
  }
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

export function getProject(projectId: string): Promise<ProjectDetail> {
  return requestJson<ProjectDetail>(`/projects/${projectId}`);
}

export function exportProjectPackage(projectId: string): Promise<ExportProjectPackageResult> {
  return requestJson<ExportProjectPackageResult>(`/projects/${projectId}/package`);
}

export function validateProjectPackageImport(
  input: ImportProjectPackageInput,
): Promise<ProjectPackageValidationResult> {
  return requestJson<ProjectPackageValidationResult>("/projects/import-package/validate", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function importProjectPackage(
  input: ImportProjectPackageInput,
): Promise<ImportProjectPackageResult> {
  return requestJson<ImportProjectPackageResult>("/projects/import-package", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getProjectRecoverySnapshot(
  projectId: string,
): Promise<ProjectRecoverySnapshotResult> {
  return requestJson<ProjectRecoverySnapshotResult>(`/projects/${projectId}/recovery-snapshot`);
}

export function updateProject(projectId: string, input: UpdateProjectInput): Promise<ProjectDetail> {
  return requestJson<ProjectDetail>(`/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function getProjectSettingsSummary(projectId: string): Promise<ProjectSettingsSummaryResult> {
  return requestJson<ProjectSettingsSummaryResult>(`/projects/${projectId}/settings`);
}

export function exportProjectSettings(projectId: string): Promise<ProjectSettingsExportResult> {
  return requestJson<ProjectSettingsExportResult>(`/projects/${projectId}/settings/export`);
}

export function validateProjectSettingsImport(
  projectId: string,
  input: ValidateProjectSettingsImportInput,
): Promise<ProjectSettingsImportValidationResult> {
  return requestJson<ProjectSettingsImportValidationResult>(`/projects/${projectId}/settings/import/validate`, {
    method: "POST",
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

function assetFiltersQuery(filters?: AssetListFilters): string {
  if (!filters) {
    return "";
  }

  const params = new URLSearchParams();
  if (filters.query) {
    params.set("query", filters.query);
  }
  if (filters.type) {
    params.set("type", filters.type);
  }
  if (filters.purpose) {
    params.set("purpose", filters.purpose);
  }
  if (filters.collectionId) {
    params.set("collectionId", filters.collectionId);
  }
  if (filters.tagIds?.length) {
    params.set("tagIds", filters.tagIds.join(","));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function listAssets(
  projectId: string,
  filters?: AssetListFilters,
): Promise<AssetListItem[]> {
  return requestJson<AssetListItem[]>(
    `/projects/${projectId}/assets${assetFiltersQuery(filters)}`,
  );
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

export function importRemoteAsset(
  projectId: string,
  input: ImportRemoteAssetInput,
): Promise<ImportedAssetResult> {
  return requestJson<ImportedAssetResult>(`/projects/${projectId}/assets/import-url`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function importLocalAsset(
  projectId: string,
  input: ImportLocalAssetInput,
): Promise<ImportedAssetResult> {
  return requestJson<ImportedAssetResult>(`/projects/${projectId}/assets/import-local`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteAsset(projectId: string, assetId: string): Promise<{ deleted: true }> {
  return requestJson<{ deleted: true }>(`/projects/${projectId}/assets/${assetId}`, {
    method: "DELETE",
  });
}

export function listAssetCollections(projectId: string): Promise<AssetCollectionRecord[]> {
  return requestJson<AssetCollectionRecord[]>(`/projects/${projectId}/assets/collections`);
}

export function createAssetCollection(
  projectId: string,
  input: Pick<AssetCollectionRecord, "name"> & Partial<Pick<AssetCollectionRecord, "kind" | "parentId" | "sortOrder">>,
): Promise<AssetCollectionRecord> {
  return requestJson<AssetCollectionRecord>(`/projects/${projectId}/assets/collections`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listAssetTags(projectId: string): Promise<AssetTagRecord[]> {
  return requestJson<AssetTagRecord[]>(`/projects/${projectId}/assets/tags`);
}

export function createAssetTag(
  projectId: string,
  input: Pick<AssetTagRecord, "name"> & Partial<Pick<AssetTagRecord, "color">>,
): Promise<AssetTagRecord> {
  return requestJson<AssetTagRecord>(`/projects/${projectId}/assets/tags`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function batchAssets(
  projectId: string,
  input: AssetBatchInput,
): Promise<AssetBatchResult> {
  return requestJson<AssetBatchResult>(`/projects/${projectId}/assets/batch`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function cleanupAssets(
  projectId: string,
  input: AssetMaintenanceInput,
): Promise<AssetMaintenanceResult> {
  return requestJson<AssetMaintenanceResult>(`/projects/${projectId}/assets/maintenance/cleanup`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createAssetAnalysisJob(
  projectId: string,
  input: CreateAssetAnalysisJobInput,
): Promise<CreateAssetAnalysisJobResult> {
  return requestJson<CreateAssetAnalysisJobResult>(`/projects/${projectId}/generation/jobs/asset-analysis`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createMediaMetadataJob(
  projectId: string,
  input: CreateMediaMetadataJobInput,
): Promise<CreateMediaMetadataJobResult> {
  return requestJson<CreateMediaMetadataJobResult>(`/projects/${projectId}/generation/jobs/media-metadata`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createSceneFrameExtractionJob(
  projectId: string,
  input: CreateSceneFrameExtractionJobInput,
): Promise<CreateSceneFrameExtractionJobResult> {
  return requestJson<CreateSceneFrameExtractionJobResult>(
    `/projects/${projectId}/generation/jobs/scene-frame-extraction`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function createAssetPromptPolishJob(
  projectId: string,
  input: CreateAssetPromptPolishJobInput,
): Promise<CreateAssetPromptPolishJobResult> {
  return requestJson<CreateAssetPromptPolishJobResult>(`/projects/${projectId}/generation/jobs/asset-prompt-polish`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createAssetImageGenerationJob(
  projectId: string,
  input: CreateAssetImageGenerationJobInput,
): Promise<CreateAssetImageGenerationJobResult> {
  return requestJson<CreateAssetImageGenerationJobResult>(
    `/projects/${projectId}/generation/jobs/asset-image-generation`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
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

export function extractNovelEvents(
  projectId: string,
  novelId: string,
  input?: ExtractNovelEventsInput,
): Promise<ExtractNovelEventsResult> {
  return requestJson<ExtractNovelEventsResult>(
    `/projects/${projectId}/novels/${novelId}/extract-events`,
    {
      method: "POST",
      ...(input ? { body: JSON.stringify(input) } : {}),
    },
  );
}

export function listNovelChapters(
  projectId: string,
  novelId: string,
): Promise<NovelChapterListResult> {
  return requestJson<NovelChapterListResult>(
    `/projects/${projectId}/novels/${novelId}/chapters`,
  );
}

export function getNovelChapter(
  projectId: string,
  novelId: string,
  chapterIndex: number,
): Promise<NovelChapterDetailResult> {
  return requestJson<NovelChapterDetailResult>(
    `/projects/${projectId}/novels/${novelId}/chapters/${chapterIndex}`,
  );
}

export function updateNovelChapter(
  projectId: string,
  novelId: string,
  chapterIndex: number,
  input: UpdateNovelChapterInput,
): Promise<UpdateNovelChapterResult> {
  return requestJson<UpdateNovelChapterResult>(
    `/projects/${projectId}/novels/${novelId}/chapters/${chapterIndex}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function extractNovelChapterEvents(
  projectId: string,
  novelId: string,
  chapterIndex: number,
  input?: ExtractNovelChapterEventsInput,
): Promise<ExtractNovelChapterEventsResult> {
  return requestJson<ExtractNovelChapterEventsResult>(
    `/projects/${projectId}/novels/${novelId}/chapters/${chapterIndex}/extract-events`,
    {
      method: "POST",
      ...(input ? { body: JSON.stringify(input) } : {}),
    },
  );
}

export function getNovelEventGraph(
  projectId: string,
  novelId: string,
): Promise<NovelEventGraphRecord> {
  return requestJson<NovelEventGraphRecord>(
    `/projects/${projectId}/novels/${novelId}/event-graph`,
  );
}

export function listScriptDrafts(
  projectId: string,
  novelId: string,
): Promise<ScriptDraftListResult> {
  return requestJson<ScriptDraftListResult>(
    `/projects/${projectId}/novels/${novelId}/script-drafts`,
  );
}

export function createScriptDraft(
  projectId: string,
  novelId: string,
  input: CreateScriptDraftInput,
): Promise<CreateScriptDraftResult> {
  return requestJson<CreateScriptDraftResult>(
    `/projects/${projectId}/novels/${novelId}/script-drafts`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function updateScriptDraft(
  projectId: string,
  novelId: string,
  scriptDraftId: string,
  input: UpdateScriptDraftInput,
): Promise<UpdateScriptDraftResult> {
  return requestJson<UpdateScriptDraftResult>(
    `/projects/${projectId}/novels/${novelId}/script-drafts/${scriptDraftId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function exportScriptDraft(
  projectId: string,
  novelId: string,
  scriptDraftId: string,
): Promise<ScriptExportResult> {
  return requestJson<ScriptExportResult>(
    `/projects/${projectId}/novels/${novelId}/script-drafts/${scriptDraftId}/export`,
  );
}

export function generateStoryboardFromScriptDraft(
  projectId: string,
  novelId: string,
  scriptDraftId: string,
): Promise<GenerateStoryboardResult> {
  return requestJson<GenerateStoryboardResult>(
    `/projects/${projectId}/novels/${novelId}/script-drafts/${scriptDraftId}/generate-storyboard`,
    { method: "POST" },
  );
}

export function extractScriptAssets(
  projectId: string,
  novelId: string,
  scriptDraftId: string,
): Promise<ExtractScriptAssetsResult> {
  return requestJson<ExtractScriptAssetsResult>(
    `/projects/${projectId}/novels/${novelId}/script-drafts/${scriptDraftId}/extract-assets`,
    { method: "POST" },
  );
}

export function importScriptAssets(
  projectId: string,
  novelId: string,
  scriptDraftId: string,
  input: ImportScriptAssetsInput,
): Promise<ImportScriptAssetsResult> {
  return requestJson<ImportScriptAssetsResult>(
    `/projects/${projectId}/novels/${novelId}/script-drafts/${scriptDraftId}/import-assets`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function createCreativeStoryboard(
  projectId: string,
  input: CreateCreativeStoryboardInput,
): Promise<CreateCreativeStoryboardResult> {
  return requestJson<CreateCreativeStoryboardResult>(
    `/projects/${projectId}/novels/creative-brief`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
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

export function exportCanvasFragment(
  projectId: string,
  input: ExportCanvasFragmentInput,
): Promise<ExportCanvasFragmentResult> {
  return requestJson<ExportCanvasFragmentResult>(`/projects/${projectId}/canvas/fragments/export`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function importCanvasFragment(
  projectId: string,
  input: ImportCanvasFragmentInput,
): Promise<ImportCanvasFragmentResult> {
  return requestJson<ImportCanvasFragmentResult>(`/projects/${projectId}/canvas/fragments/import`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function generationEventsUrl(projectId: string): string {
  return apiUrl(`/projects/${projectId}/generation/events`);
}

export function createAgentCanvasAction(
  projectId: string,
  input: CreateAgentCanvasActionInput,
): Promise<CreateAgentCanvasActionResult> {
  return requestJson<CreateAgentCanvasActionResult>(
    `/projects/${projectId}/agents/canvas-actions`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function createAgentSession(
  projectId: string,
  input: CreateAgentSessionInput,
): Promise<CreateAgentSessionResult> {
  return requestJson<CreateAgentSessionResult>(`/projects/${projectId}/agents/sessions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function undoAgentCanvasAction(
  projectId: string,
  jobId: string,
): Promise<UndoAgentCanvasActionResult> {
  return requestJson<UndoAgentCanvasActionResult>(
    `/projects/${projectId}/agents/canvas-actions/${jobId}/undo`,
    { method: "POST" },
  );
}

export function getAgentDeployment(projectId: string): Promise<AgentDeploymentResult> {
  return requestJson<AgentDeploymentResult>(`/projects/${projectId}/agents/deployment`);
}

export function updateAgentDeployment(
  projectId: string,
  input: UpdateAgentDeploymentInput,
): Promise<AgentDeploymentResult> {
  return requestJson<AgentDeploymentResult>(`/projects/${projectId}/agents/deployment`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function resolveAgentRole(
  projectId: string,
  input: ResolveAgentRoleInput,
): Promise<ResolveAgentRoleResult> {
  return requestJson<ResolveAgentRoleResult>(`/projects/${projectId}/agents/deployment/resolve`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listAgentMemories(projectId: string): Promise<AgentMemoryListResult> {
  return requestJson<AgentMemoryListResult>(`/projects/${projectId}/agents/memories`);
}

export function createAgentMemory(
  projectId: string,
  input: CreateAgentMemoryInput,
): Promise<AgentMemoryRecord> {
  return requestJson<AgentMemoryRecord>(`/projects/${projectId}/agents/memories`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAgentMemory(
  projectId: string,
  memoryId: string,
  input: UpdateAgentMemoryInput,
): Promise<AgentMemoryRecord> {
  return requestJson<AgentMemoryRecord>(`/projects/${projectId}/agents/memories/${memoryId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function disableAgentMemory(projectId: string, memoryId: string): Promise<AgentMemoryRecord> {
  return requestJson<AgentMemoryRecord>(
    `/projects/${projectId}/agents/memories/${memoryId}/disable`,
    { method: "POST" },
  );
}

export function clearAgentMemories(
  projectId: string,
  input: ClearAgentMemoriesInput = {},
): Promise<ClearAgentMemoriesResult> {
  return requestJson<ClearAgentMemoriesResult>(`/projects/${projectId}/agents/memories/clear`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function recallAgentMemories(
  projectId: string,
  input: RecallAgentMemoriesInput,
): Promise<RecallAgentMemoriesResult> {
  return requestJson<RecallAgentMemoriesResult>(`/projects/${projectId}/agents/memories/recall`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getProjectCanvas(
  projectId: string,
  canvasDocumentId?: string,
): Promise<CanvasLoadResult> {
  const path = canvasDocumentId
    ? `/projects/${projectId}/canvas/pages/${canvasDocumentId}`
    : `/projects/${projectId}/canvas`;
  return requestJson<CanvasLoadResult>(path);
}

export function listCanvasPages(projectId: string): Promise<CanvasPageListResult> {
  return requestJson<CanvasPageListResult>(`/projects/${projectId}/canvas/pages`);
}

export function createCanvasPage(
  projectId: string,
  input: CreateCanvasPageInput,
): Promise<CreateCanvasPageResult> {
  return requestJson<CreateCanvasPageResult>(`/projects/${projectId}/canvas/pages`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getProductionWorkspace(projectId: string): Promise<ProductionWorkspaceProjection> {
  return requestJson<ProductionWorkspaceProjection>(
    `/projects/${projectId}/canvas/production-workspace`,
  );
}

export function updateProductionWorkspaceItem(
  projectId: string,
  itemId: string,
  input: UpdateProductionWorkspaceItemInput,
): Promise<UpdateProductionWorkspaceItemResult> {
  return requestJson<UpdateProductionWorkspaceItemResult>(
    `/projects/${projectId}/canvas/production-workspace/items/${itemId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function createProductionStoryboardItems(
  projectId: string,
  input: CreateProductionStoryboardItemsInput,
): Promise<ProductionWorkspaceMutationResult> {
  return requestJson<ProductionWorkspaceMutationResult>(
    `/projects/${projectId}/canvas/production-workspace/storyboard-items`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function deleteProductionStoryboardItems(
  projectId: string,
  input: DeleteProductionStoryboardItemsInput,
): Promise<ProductionWorkspaceMutationResult> {
  return requestJson<ProductionWorkspaceMutationResult>(
    `/projects/${projectId}/canvas/production-workspace/storyboard-items/delete`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function reorderProductionStoryboardItems(
  projectId: string,
  input: ReorderProductionStoryboardItemsInput,
): Promise<ProductionWorkspaceMutationResult> {
  return requestJson<ProductionWorkspaceMutationResult>(
    `/projects/${projectId}/canvas/production-workspace/storyboard-items/sequence`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function createStoryboardMediaBoard(
  projectId: string,
  input: CreateStoryboardMediaBoardInput,
): Promise<CreateStoryboardMediaBoardResult> {
  return requestJson<CreateStoryboardMediaBoardResult>(
    `/projects/${projectId}/canvas/production-workspace/storyboard-board`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function createProductionAgentAction(
  projectId: string,
  input: CreateProductionAgentActionInput,
): Promise<CreateProductionAgentActionResult> {
  return requestJson<CreateProductionAgentActionResult>(
    `/projects/${projectId}/agents/production-actions`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function selectProductionTrackVideo(
  projectId: string,
  trackId: string,
  input: SelectProductionTrackVideoInput,
): Promise<SelectProductionTrackVideoResult> {
  return requestJson<SelectProductionTrackVideoResult>(
    `/projects/${projectId}/canvas/production-workspace/video-tracks/${trackId}/selected-video`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function createProductionMediaClip(
  projectId: string,
  input: CreateProductionMediaClipInput,
): Promise<CreateProductionMediaClipResult> {
  return requestJson<CreateProductionMediaClipResult>(
    `/projects/${projectId}/canvas/production-workspace/media-clips`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function getAgentProductionWorkspaceContext(
  projectId: string,
): Promise<ProductionWorkspaceAgentContext> {
  return requestJson<ProductionWorkspaceAgentContext>(
    `/projects/${projectId}/agents/production-workspace-context`,
  );
}

export function saveCanvasSnapshot(
  projectId: string,
  input: SaveCanvasSnapshotInput,
): Promise<SaveCanvasSnapshotResult> {
  const path = input.canvasDocumentId
    ? `/projects/${projectId}/canvas/pages/${input.canvasDocumentId}/snapshot`
    : `/projects/${projectId}/canvas/snapshot`;
  return requestJson<SaveCanvasSnapshotResult>(path, {
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

export function getLlmProviderCatalog(): Promise<LlmProviderCatalogResult> {
  return requestJson<LlmProviderCatalogResult>("/providers/llm");
}

export function getVideoProviderCatalog(): Promise<VideoProviderCatalogResult> {
  return requestJson<VideoProviderCatalogResult>("/providers/video");
}

export function getProviderManagement(projectId: string): Promise<ProviderManagementResult> {
  return requestJson<ProviderManagementResult>(`/projects/${projectId}/providers`);
}

export function listWorkflows(projectId: string): Promise<WorkflowListResult> {
  return requestJson<WorkflowListResult>(`/projects/${projectId}/workflows`);
}

export function createWorkflowDefinition(
  projectId: string,
  input: CreateWorkflowDefinitionInput,
): Promise<WorkflowDefinitionResult> {
  return requestJson<WorkflowDefinitionResult>(`/projects/${projectId}/workflows`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createWorkflowVersion(
  projectId: string,
  workflowId: string,
  input: CreateWorkflowVersionInput,
): Promise<WorkflowDefinitionResult> {
  return requestJson<WorkflowDefinitionResult>(`/projects/${projectId}/workflows/${workflowId}/versions`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function activateWorkflowVersion(
  projectId: string,
  workflowId: string,
  versionId: string,
): Promise<WorkflowDefinitionResult> {
  return requestJson<WorkflowDefinitionResult>(
    `/projects/${projectId}/workflows/${workflowId}/versions/${versionId}/activate`,
    { method: "POST" },
  );
}

export function runWorkflow(
  projectId: string,
  workflowId: string,
  input: CreateWorkflowRunInput,
): Promise<WorkflowRunResult> {
  return requestJson<WorkflowRunResult>(`/projects/${projectId}/workflows/${workflowId}/run`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listProgrammableProviders(
  projectId: string,
): Promise<{ providers: ProgrammableProviderDefinitionSummary[] }> {
  return requestJson<{ providers: ProgrammableProviderDefinitionSummary[] }>(
    `/projects/${projectId}/providers/programmable`,
  );
}

export function createProgrammableProvider(
  projectId: string,
  input: CreateProgrammableProviderInput,
): Promise<ProgrammableProviderDefinitionResult> {
  return requestJson<ProgrammableProviderDefinitionResult>(
    `/projects/${projectId}/providers/programmable`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function updateProgrammableProviderSource(
  projectId: string,
  kind: string,
  provider: string,
  input: UpdateProgrammableProviderSourceInput,
): Promise<ProgrammableProviderDefinitionResult> {
  return requestJson<ProgrammableProviderDefinitionResult>(
    `/projects/${projectId}/providers/programmable/${encodeURIComponent(kind)}/${encodeURIComponent(provider)}/source`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function activateProgrammableProviderVersion(
  projectId: string,
  kind: string,
  provider: string,
  input: ActivateProgrammableProviderVersionInput,
): Promise<ProgrammableProviderDefinitionResult> {
  return requestJson<ProgrammableProviderDefinitionResult>(
    `/projects/${projectId}/providers/programmable/${encodeURIComponent(kind)}/${encodeURIComponent(provider)}/activate`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function disableProgrammableProvider(
  projectId: string,
  kind: string,
  provider: string,
): Promise<ProgrammableProviderDefinitionResult> {
  return requestJson<ProgrammableProviderDefinitionResult>(
    `/projects/${projectId}/providers/programmable/${encodeURIComponent(kind)}/${encodeURIComponent(provider)}/disable`,
    {
      method: "POST",
    },
  );
}

export function listSkillTemplates(
  projectId: string,
  filters: ListSkillTemplatesInput = {},
): Promise<SkillTemplateListResult> {
  const params = new URLSearchParams();
  if (filters.query) {
    params.set("query", filters.query);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.triggerMode) {
    params.set("triggerMode", filters.triggerMode);
  }
  if (filters.agentRole) {
    params.set("agentRole", filters.agentRole);
  }
  if (filters.templateIds?.length) {
    params.set("templateIds", filters.templateIds.join(","));
  }
  const query = params.toString();
  return requestJson<SkillTemplateListResult>(`/projects/${projectId}/skills${query ? `?${query}` : ""}`);
}

export function updateSkillTemplateSource(
  projectId: string,
  kind: string,
  slug: string,
  input: UpdateSkillTemplateSourceInput,
): Promise<SkillTemplateResult> {
  return requestJson<SkillTemplateResult>(
    `/projects/${projectId}/skills/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}/source`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function activateSkillTemplateVersion(
  projectId: string,
  kind: string,
  slug: string,
  input: ActivateSkillTemplateVersionInput,
): Promise<SkillTemplateResult> {
  return requestJson<SkillTemplateResult>(
    `/projects/${projectId}/skills/${encodeURIComponent(kind)}/${encodeURIComponent(slug)}/activate`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function getProjectImageProviderCatalog(projectId: string): Promise<ImageProviderCatalogResult> {
  return requestJson<ImageProviderCatalogResult>(`/projects/${projectId}/providers/image`);
}

export function getProjectLlmProviderCatalog(projectId: string): Promise<LlmProviderCatalogResult> {
  return requestJson<LlmProviderCatalogResult>(`/projects/${projectId}/providers/llm`);
}

export function getProjectVideoProviderCatalog(projectId: string): Promise<VideoProviderCatalogResult> {
  return requestJson<VideoProviderCatalogResult>(`/projects/${projectId}/providers/video`);
}

export function updateProviderConfig(
  projectId: string,
  kind: string,
  provider: string,
  input: UpdateProviderConfigInput,
): Promise<ProviderConfigUpdateResult> {
  return requestJson<ProviderConfigUpdateResult>(
    `/projects/${projectId}/providers/${kind}/${provider}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
}

export function discoverProviderModels(
  projectId: string,
  input: ProviderModelDiscoveryInput,
): Promise<ProviderModelDiscoveryResult> {
  return requestJson<ProviderModelDiscoveryResult>(
    `/projects/${projectId}/providers/discover-models`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function testProviderConfig(
  projectId: string,
  kind: string,
  provider: string,
  input: ProviderConnectionTestInput = {},
): Promise<ProviderConnectionTestResult> {
  return requestJson<ProviderConnectionTestResult>(
    `/projects/${projectId}/providers/${kind}/${provider}/test`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
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

export function createBatchShotsToImagesJobs(
  projectId: string,
  input: CreateBatchShotsToImagesJobInput,
): Promise<CreateBatchShotsToImagesJobResult> {
  return requestJson<CreateBatchShotsToImagesJobResult>(
    `/projects/${projectId}/generation/jobs/batch-shots-to-images`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function listGenerationJobs(projectId: string): Promise<GenerationJobListResult> {
  return requestJson<GenerationJobListResult>(`/projects/${projectId}/generation/jobs`);
}

export function getTaskCenter(projectId: string): Promise<TaskCenterResult> {
  return requestJson<TaskCenterResult>(`/projects/${projectId}/generation/jobs/task-center`);
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

export function createEditorExport(
  projectId: string,
  input: CreateEditorExportInput,
): Promise<CreateEditorExportResult> {
  return requestJson<CreateEditorExportResult>(`/projects/${projectId}/editor-exports`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function listEditorExports(projectId: string): Promise<EditorExportListResult> {
  return requestJson<EditorExportListResult>(`/projects/${projectId}/editor-exports`, {
    cache: "no-store",
  });
}

export function getEditorExport(
  projectId: string,
  exportId: string,
): Promise<EditorExportDetailResult> {
  return requestJson<EditorExportDetailResult>(
    `/projects/${projectId}/editor-exports/${exportId}`,
  );
}

export function sendEditorExportToLocalEditor(
  projectId: string,
  exportId: string,
): Promise<EditorExportSendResult> {
  return requestJson<EditorExportSendResult>(
    `/projects/${projectId}/editor-exports/${exportId}/send`,
    { method: "POST" },
  );
}

export function editorExportDownloadUrl(projectId: string, exportId: string): string {
  return apiUrl(`/projects/${projectId}/editor-exports/${exportId}/download`);
}
