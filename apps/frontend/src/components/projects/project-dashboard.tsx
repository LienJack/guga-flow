"use client";

import type { ProjectAspectRatio, ProjectListItem } from "@guga-flow/shared-types";
import {
  Clapperboard,
  Copy,
  FolderOpen,
  LayoutList,
  LogOut,
  PenLine,
  Plus,
  Settings,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { FormEvent, useEffect, useMemo, useState } from "react";

import {
  createProject,
  deleteProject,
  duplicateProject,
  isUnauthorizedError,
  listProjects,
  logout,
  updateProject,
} from "../../lib/api";

const defaultProjects: ProjectListItem[] = [];

interface ProjectDashboardProps {
  initialDraft?: ProjectDashboardDraft;
  initialProjects?: ProjectListItem[];
}

interface ProjectDashboardDraft {
  title?: string;
  description?: string;
  defaultAspectRatio?: ProjectAspectRatio;
}

export function ProjectDashboard({ initialDraft, initialProjects = defaultProjects }: ProjectDashboardProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>(initialProjects);
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [description, setDescription] = useState(initialDraft?.description ?? "");
  const [defaultAspectRatio, setDefaultAspectRatio] = useState<ProjectAspectRatio>(
    initialDraft?.defaultAspectRatio ?? "9:16",
  );
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let ignore = false;

    listProjects()
      .then((result) => {
        if (!ignore) {
          setProjects(result);
        }
      })
      .catch((loadError: unknown) => {
        if (!ignore) {
          handleRequestError(loadError, "Unable to load projects");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const editingProject = useMemo(
    () => projects.find((project) => project.id === editingProjectId),
    [editingProjectId, projects],
  );

  function resetForm() {
    setTitle("");
    setDescription("");
    setDefaultAspectRatio("9:16");
    setEditingProjectId(null);
  }

  function redirectToLogin() {
    const next = typeof window === "undefined" ? "/" : window.location.pathname || "/";
    router.push(`/login?next=${encodeURIComponent(next)}`);
  }

  function handleRequestError(error: unknown, fallback: string) {
    if (isUnauthorizedError(error)) {
      redirectToLogin();
      return;
    }
    setError(error instanceof Error ? error.message : fallback);
  }

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
    } finally {
      router.push("/login");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (editingProjectId) {
        const updated = await updateProject(editingProjectId, {
          title,
          description,
          defaultAspectRatio,
        });
        setProjects((current) =>
          current.map((project) =>
            project.id === updated.id ? { ...updated, assetCount: project.assetCount } : project,
          ),
        );
      } else {
        const created = await createProject({
          title,
          description,
          defaultAspectRatio,
        });
        setProjects((current) => [created, ...current]);
        router.push(`/projects/${created.id}/canvas`);
      }
      resetForm();
    } catch (submitError) {
      handleRequestError(submitError, "Unable to save project");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(project: ProjectListItem) {
    setEditingProjectId(project.id);
    setTitle(project.title);
    setDescription(project.description ?? "");
    setDefaultAspectRatio(project.defaultAspectRatio);
    setPendingDeleteProjectId(null);
  }

  async function handleDuplicate(projectId: string) {
    setBusy(true);
    setError(null);
    try {
      const duplicated = await duplicateProject(projectId);
      setProjects((current) => [duplicated, ...current]);
    } catch (duplicateError) {
      handleRequestError(duplicateError, "Unable to duplicate");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(projectId: string) {
    setBusy(true);
    setError(null);
    try {
      await deleteProject(projectId);
      setProjects((current) => current.filter((project) => project.id !== projectId));
      if (editingProjectId === projectId) {
        resetForm();
      }
      setPendingDeleteProjectId(null);
    } catch (deleteError) {
      handleRequestError(deleteError, "Unable to delete");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="project-dashboard" aria-label="Project dashboard">
      <header className="dashboard-topbar">
        <div className="brand-cluster">
          <div className="brand-mark" aria-hidden="true">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="brand">GugaFlow</div>
            <div className="project-title">AI short-drama factory</div>
          </div>
        </div>
        <div className="dashboard-actions">
          <button
            className="ghost-action compact"
            type="button"
            onClick={() => void handleLogout()}
            disabled={busy}
          >
            <LogOut size={15} aria-hidden="true" />
            Log out
          </button>
          <div className="window-dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </header>

      <section className="dashboard-shell">
        <aside className="app-rail dashboard-rail" aria-label="Application sections">
          <div className="rail-logo" aria-hidden="true">
            <Clapperboard size={22} />
          </div>
          <div className="rail-actions">
            <button className="rail-button active" type="button" title="Projects" aria-label="Projects">
              <FolderOpen size={21} aria-hidden="true" />
            </button>
            <button className="rail-button" type="button" title="Scripts" aria-label="Scripts" disabled>
              <LayoutList size={21} aria-hidden="true" />
            </button>
            <button className="rail-button" type="button" title="Settings" aria-label="Settings" disabled>
              <Settings size={21} aria-hidden="true" />
            </button>
          </div>
        </aside>

        <section className="dashboard-workspace">
          <div className="dashboard-heading">
            <div>
              <h1>Projects</h1>
              <p>管理你的短剧项目、分镜画布和素材生产。</p>
            </div>
            <div className="save-state">Mock-ready</div>
          </div>

          <section className="dashboard-grid">
            <form className="project-form" onSubmit={handleSubmit}>
              <div>
                <div className="panel-kicker">Project setup</div>
                <h2>{editingProject ? "Edit project" : "New project"}</h2>
              </div>
              <label>
                <span>Title</span>
                <input
                  name="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Novel video project"
                  required
                />
              </label>
              <label>
                <span>Description</span>
                <textarea
                  name="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                />
              </label>
              <label>
                <span>Default aspect</span>
                <select
                  name="defaultAspectRatio"
                  value={defaultAspectRatio}
                  onChange={(event) => setDefaultAspectRatio(event.target.value as ProjectAspectRatio)}
                >
                  <option value="9:16">9:16</option>
                  <option value="16:9">16:9</option>
                  <option value="1:1">1:1</option>
                </select>
              </label>
              {error ? <p className="form-error">{error}</p> : null}
              <div className="form-actions">
                <button className="primary-action" type="submit" disabled={busy}>
                  <Plus size={16} aria-hidden="true" />
                  {editingProject ? "Save project" : "Create project"}
                </button>
                {editingProject ? (
                  <button className="ghost-action" type="button" onClick={resetForm}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>

            <section className="project-list-panel" aria-label="Project list">
              <div className="panel-heading">
                <div>
                  <div className="panel-kicker">Studio board</div>
                  <h2>Recent work</h2>
                </div>
                <span>{projects.length} projects</span>
              </div>
              {projects.length === 0 ? (
                <div className="empty-state">
                  <strong>No projects yet</strong>
                  <span>Create one to open the canvas workspace.</span>
                </div>
              ) : (
                <ul className="project-list">
                  {projects.map((project) => (
                    <li className="project-row" key={project.id}>
                      <div className="project-row-main">
                        <strong>{project.title}</strong>
                        <span>
                          {project.defaultAspectRatio} · {project.assetCount} assets
                        </span>
                      </div>
                      <div className="project-row-actions">
                        <button
                          className="icon-action"
                          type="button"
                          title="Open canvas"
                          aria-label={`Open ${project.title} canvas`}
                          onClick={() => router.push(`/projects/${project.id}/canvas`)}
                        >
                          <FolderOpen size={16} aria-hidden="true" />
                        </button>
                        <button
                          className="icon-action"
                          type="button"
                          title="Edit project"
                          aria-label={`Edit ${project.title}`}
                          onClick={() => startEdit(project)}
                        >
                          <PenLine size={16} aria-hidden="true" />
                        </button>
                        <button
                          className="icon-action"
                          type="button"
                          title="Duplicate project"
                          aria-label={`Duplicate ${project.title}`}
                          onClick={() => void handleDuplicate(project.id)}
                          disabled={busy}
                        >
                          <Copy size={16} aria-hidden="true" />
                        </button>
                        {pendingDeleteProjectId === project.id ? (
                          <button
                            className="danger-action"
                            type="button"
                            aria-label={`Confirm delete ${project.title}`}
                            onClick={() => void handleDelete(project.id)}
                            disabled={busy}
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            className="icon-action danger"
                            type="button"
                            title="Delete project"
                            aria-label={`Delete ${project.title}`}
                            onClick={() => setPendingDeleteProjectId(project.id)}
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </section>
        </section>
      </section>
    </main>
  );
}
