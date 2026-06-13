import { CANVAS_NODE_TYPES } from "@guga-flow/shared-types";
import type { GenerationQueueSummary } from "@guga-flow/shared-types";
import {
  BookOpen,
  Boxes,
  Clapperboard,
  FolderOpen,
  PackageCheck,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import React, { type ReactNode } from "react";

const sidebarItems = [
  ["Novel", 1],
  ["Scenes", 0],
  ["Characters", 0],
  ["Locations", 0],
  ["Assets", 0],
  ["Queue", 0],
] as const;

const railItems = [
  { label: "Projects", icon: FolderOpen, active: false },
  { label: "Storyboard", icon: Clapperboard, active: true },
  { label: "Assets", icon: Boxes, active: false },
  { label: "Team", icon: Users, active: false },
  { label: "Settings", icon: Settings, active: false },
] as const;

interface WorkbenchShellProps {
  projectId?: string;
  projectTitle?: string;
  inspectorSlot?: ReactNode;
  sidebarSlot?: ReactNode;
  canvasSlot?: ReactNode;
  saveStateSlot?: ReactNode;
  queueSummary?: Pick<
    GenerationQueueSummary,
    "queued" | "running" | "failed" | "providerWaiting" | "cancelled"
  >;
  storyboardEnabled?: boolean;
}

export function WorkbenchShell({
  projectId,
  projectTitle = "Untitled project",
  queueSummary = { queued: 0, running: 0, providerWaiting: 0, failed: 0, cancelled: 0 },
  inspectorSlot,
  sidebarSlot,
  canvasSlot,
  saveStateSlot,
  storyboardEnabled = false,
}: WorkbenchShellProps) {
  return (
    <main className="workbench" aria-label="guga-flow workbench">
      <header className="topbar">
        <div className="brand-cluster">
          <div className="brand-mark" aria-hidden="true">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="brand">GugaFlow</div>
            <div className="project-title">{projectTitle}</div>
          </div>
        </div>
        <nav className="toolbar" aria-label="Primary actions">
          <button
            className={`tool-button ${storyboardEnabled ? "active" : ""}`}
            type="button"
            disabled={!storyboardEnabled}
          >
            <BookOpen size={15} aria-hidden="true" />
            Storyboard
          </button>
          <button className="tool-button" type="button" disabled>
            <Clapperboard size={15} aria-hidden="true" />
            Batch
          </button>
          <button className="tool-button" type="button" disabled>
            <PackageCheck size={15} aria-hidden="true" />
            Export
          </button>
        </nav>
        {saveStateSlot ?? <div className="save-state">Saved</div>}
        <div className="window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </header>

      <section className="main-grid">
        <aside className="app-rail" aria-label="Workspace sections">
          <div className="rail-logo" aria-hidden="true">
            <Clapperboard size={22} />
          </div>
          <div className="rail-actions">
            {railItems.map(({ active, icon: Icon, label }) => (
              <button
                className={`rail-button ${active ? "active" : ""}`}
                type="button"
                title={label}
                key={label}
              >
                <Icon size={21} aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>

        <aside className="sidebar" aria-label="Project navigation">
          <div className="panel-kicker">Production</div>
          <h1 className="panel-title">Workspace</h1>
          <ul className="nav-list">
            {sidebarItems.map(([label, count], index) => (
              <li className={`nav-item ${index === 0 ? "active" : ""}`} key={label}>
                <span>{label}</span>
                <span className="count">{count}</span>
              </li>
            ))}
          </ul>
          {sidebarSlot}
        </aside>

        <section className="canvas-stage" aria-label="Canvas">
          {canvasSlot ?? (
            <div className="canvas-placeholder">
              <article className="node-preview">
                <h2>NovelNode</h2>
                <p>
                  {CANVAS_NODE_TYPES.length} node types are available for later canvas
                  phases.
                </p>
              </article>

              <div className="scene-strip" aria-label="Storyboard layout preview">
                <article className="node-preview">
                  <h2>SceneFrame 01</h2>
                  <div className="shot-row">
                    <div className="shot-card">
                      <strong>S01-01</strong>
                      <span>Draft shot</span>
                    </div>
                    <div className="shot-card">
                      <strong>S01-02</strong>
                      <span>Image pending</span>
                    </div>
                    <div className="shot-card">
                      <strong>S01-03</strong>
                      <span>Video pending</span>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          )}
        </section>

        <aside className="inspector" aria-label="Inspector">
          {inspectorSlot ?? (
            <>
              <h2 className="panel-title">Inspector</h2>
              <ul className="property-list">
                <li className="property-item">
                  <span>Selection</span>
                  <span className="property-value">None</span>
                </li>
                <li className="property-item">
                  <span>Provider mode</span>
                  <span className="property-value">Mock</span>
                </li>
                <li className="property-item">
                  <span>Canvas status</span>
                  <span className="property-value">Ready</span>
                </li>
                {projectId ? (
                  <li className="property-item">
                    <span>Project</span>
                    <span className="property-value">{projectId}</span>
                  </li>
                ) : null}
              </ul>
            </>
          )}
        </aside>
      </section>

      <footer className="bottom-queue" aria-label="Generation queue">
        <strong>Queue</strong>
        <div className="queue-summary">
          <span className="queue-pill">{queueSummary.queued} queued</span>
          <span className="queue-pill">{queueSummary.running} running</span>
          <span className="queue-pill">{queueSummary.providerWaiting ?? 0} waiting</span>
          <span className="queue-pill warning">{queueSummary.failed} failed</span>
          <span className="queue-pill">{queueSummary.cancelled ?? 0} cancelled</span>
        </div>
      </footer>
    </main>
  );
}
