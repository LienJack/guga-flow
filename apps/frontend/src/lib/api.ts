import type {
  AssetDetail,
  AssetListItem,
  AssetPurpose,
  CanvasLoadResult,
  CreateCanvasNodeInput,
  CreateCanvasNodeResult,
  CreateProjectInput,
  DeleteCanvasNodeResult,
  ProjectDetail,
  ProjectListItem,
  SaveCanvasSnapshotInput,
  SaveCanvasSnapshotResult,
  UpdateProjectInput,
  UpdateCanvasNodeGeometryInput,
  UpdateCanvasNodeGeometryResult,
  UpdateCanvasNodeInput,
  UpdateCanvasNodeResult,
} from "@guga-flow/shared-types";

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

export function createCanvasNode(
  projectId: string,
  input: CreateCanvasNodeInput,
): Promise<CreateCanvasNodeResult> {
  return requestJson<CreateCanvasNodeResult>(`/projects/${projectId}/canvas/nodes`, {
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
