import { CANVAS_NODE_TYPES } from "@guga-flow/shared-types";
import React, { type ReactNode } from "react";

const sidebarItems = [
  ["Novel", 1],
  ["Scenes", 0],
  ["Characters", 0],
  ["Locations", 0],
  ["Assets", 0],
  ["Queue", 0],
] as const;

interface WorkbenchShellProps {
  projectId?: string;
  projectTitle?: string;
  inspectorSlot?: ReactNode;
  canvasSlot?: ReactNode;
  saveStateSlot?: ReactNode;
}

export function WorkbenchShell({
  projectId,
  projectTitle = "Untitled project",
  inspectorSlot,
  canvasSlot,
  saveStateSlot,
}: WorkbenchShellProps) {
  return (
    <main className="workbench" aria-label="guga-flow workbench">
      <header className="topbar">
        <div className="brand">guga-flow</div>
        <div className="project-title">{projectTitle}</div>
        <nav className="toolbar" aria-label="Primary actions">
          <button className="tool-button" type="button" disabled>
            Storyboard
          </button>
          <button className="tool-button" type="button" disabled>
            Batch
          </button>
          <button className="tool-button" type="button" disabled>
            Export
          </button>
        </nav>
        {saveStateSlot ?? <div className="save-state">Saved</div>}
      </header>

      <section className="main-grid">
        <aside className="sidebar" aria-label="Project navigation">
          <h1 className="panel-title">Workspace</h1>
          <ul className="nav-list">
            {sidebarItems.map(([label, count], index) => (
              <li className={`nav-item ${index === 0 ? "active" : ""}`} key={label}>
                <span>{label}</span>
                <span className="count">{count}</span>
              </li>
            ))}
          </ul>
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
          <span className="queue-pill">0 queued</span>
          <span className="queue-pill">0 running</span>
          <span className="queue-pill warning">0 failed</span>
        </div>
      </footer>
    </main>
  );
}
