"use client";

import { CANVAS_NODE_TYPES } from "@guga-flow/shared-types";
import type { GenerationQueueSummary } from "@guga-flow/shared-types";
import {
  BookOpen,
  Boxes,
  ChevronLeft,
  Clapperboard,
  FolderOpen,
  Hand,
  LogOut,
  Maximize2,
  MessageCircle,
  MousePointer2,
  PackageCheck,
  Send,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { type ReactNode } from "react";

import { I18nProvider, type Locale, useI18n } from "../lib/i18n";
import { logout } from "../lib/api";

const sidebarItems = [
  ["workbench.novel", 1],
  ["workbench.scenes", 0],
  ["workbench.characters", 0],
  ["workbench.locations", 0],
  ["workbench.assets", 0],
  ["workbench.queue", 0],
] as const;

const railItems = [
  { labelKey: "workbench.projects", icon: FolderOpen, section: "projects" },
  { labelKey: "workbench.storyboard", icon: Clapperboard, section: "storyboard" },
  { labelKey: "workbench.assets", icon: Boxes, section: "assets" },
  { labelKey: "workbench.team", icon: Users, section: "team" },
  { labelKey: "workbench.settings", icon: Settings, section: "settings" },
] as const;

type WorkbenchSection = (typeof railItems)[number]["section"];
type AssistantMode = "inspect" | "chat";

interface WorkbenchShellProps {
  activeSection?: WorkbenchSection;
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
  ...props
}: WorkbenchShellProps) {
  return (
    <I18nProvider>
      <WorkbenchShellContent {...props} />
    </I18nProvider>
  );
}

function WorkbenchShellContent({
  activeSection = "storyboard",
  projectId,
  projectTitle = "Untitled project",
  queueSummary = { queued: 0, running: 0, providerWaiting: 0, failed: 0, cancelled: 0 },
  inspectorSlot,
  sidebarSlot,
  canvasSlot,
  saveStateSlot,
  storyboardEnabled = false,
}: WorkbenchShellProps) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const [assistantMode, setAssistantMode] = React.useState<AssistantMode>("inspect");

  async function handleLogout() {
    try {
      await logout();
    } finally {
      router.push("/login");
    }
  }

  return (
    <main className="workbench" aria-label={t("workbench.aria")}>
      <header className="topbar">
        <div className="topbar-project">
          <a className="canvas-back-link" href="/" aria-label={t("workbench.projects")}>
            <ChevronLeft size={20} aria-hidden="true" />
            <span>{projectTitle}</span>
          </a>
          <div className="topbar-project-meta" aria-label="Canvas workspace status">
            <span>{t("workbench.canvas")}</span>
            <span>{t("inspector.ready")}</span>
          </div>
        </div>
        <nav className="toolbar" aria-label={t("workbench.primaryActions")}>
          <button
            className={`tool-button ${storyboardEnabled ? "active" : ""}`}
            type="button"
            disabled={!storyboardEnabled}
          >
            <BookOpen size={15} aria-hidden="true" />
            {t("workbench.storyboard")}
          </button>
          <button className="tool-button" type="button" disabled>
            <Clapperboard size={15} aria-hidden="true" />
            {t("workbench.batch")}
          </button>
          <button className="tool-button" type="button" disabled>
            <PackageCheck size={15} aria-hidden="true" />
            {t("workbench.export")}
          </button>
        </nav>
        <div className="topbar-actions">
          <LanguageSwitcher locale={locale} setLocale={setLocale} />
          <button className="tool-button session-button" type="button" onClick={() => void handleLogout()}>
            <LogOut size={15} aria-hidden="true" />
            Logout
          </button>
          {saveStateSlot ?? <div className="save-state">{t("save.saved")}</div>}
        </div>
      </header>

      <section className="main-grid">
        <aside className="app-rail" aria-label={t("workbench.workspaceSections")}>
          <div className="rail-logo" aria-hidden="true">
            <Clapperboard size={22} />
          </div>
          <div className="rail-actions">
            {railItems.map(({ icon: Icon, labelKey, section }) => {
              const label = t(labelKey);
              const href = railHref(section, projectId);
              const active = section === activeSection;
              return href ? (
                <a
                  aria-label={label}
                  className={`rail-button ${active ? "active" : ""}`}
                  href={href}
                  title={label}
                  key={labelKey}
                >
                  <Icon size={21} aria-hidden="true" />
                </a>
              ) : (
                <button
                  className={`rail-button ${active ? "active" : ""}`}
                  disabled
                  type="button"
                  aria-label={label}
                  title={label}
                  key={labelKey}
                >
                  <Icon size={21} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </aside>

        <aside className="sidebar" aria-label={t("workbench.projectNavigation")}>
          <div className="panel-kicker">{t("workbench.production")}</div>
          <h1 className="panel-title">{t("workbench.workspace")}</h1>
          <ul className="nav-list sidebar-summary-list">
            {sidebarItems.map(([labelKey, count], index) => (
              <li className={`nav-item ${index === 0 ? "active" : ""}`} key={labelKey}>
                <span>{t(labelKey)}</span>
                <span className="count">{count}</span>
              </li>
            ))}
          </ul>
          {sidebarSlot}
        </aside>

        <section className="canvas-stage" aria-label={t("workbench.canvas")}>
          {canvasSlot ?? (
            <div className="canvas-placeholder">
              <article className="node-preview">
                <h2>Source Text</h2>
                <p>
                  {t("workbench.nodeTypesAvailable", { count: CANVAS_NODE_TYPES.length })}
                </p>
              </article>

              <div className="scene-strip" aria-label={t("workbench.storyboardLayoutPreview")}>
                <article className="node-preview">
                  <h2>AI Video Flow</h2>
                  <div className="shot-row">
                    <div className="shot-card">
                      <strong>Source Image</strong>
                      <span>{t("workbench.imagePending")}</span>
                    </div>
                    <div className="shot-card">
                      <strong>AI Image</strong>
                      <span>{t("workbench.draftShot")}</span>
                    </div>
                    <div className="shot-card">
                      <strong>AI Video</strong>
                      <span>{t("workbench.videoPending")}</span>
                    </div>
                  </div>
                </article>
              </div>
            </div>
          )}
        </section>

        <aside className="inspector assistant-panel" aria-label={t("workbench.inspector")}>
          <div className="assistant-panel-header">
            <div className="assistant-brand">
              <span className="assistant-logo" aria-hidden="true">
                <Sparkles size={16} />
              </span>
              <strong>GugaFlow</strong>
            </div>
            <div className="assistant-header-actions" aria-label={t("workbench.primaryActions")}>
              <button
                className={`assistant-mode-button ${assistantMode === "inspect" ? "active" : ""}`}
                type="button"
                aria-pressed={assistantMode === "inspect"}
                onClick={() => setAssistantMode("inspect")}
              >
                属性
              </button>
              <button
                className={`assistant-mode-button ${assistantMode === "chat" ? "active" : ""}`}
                type="button"
                aria-pressed={assistantMode === "chat"}
                onClick={() => setAssistantMode("chat")}
              >
                <MessageCircle size={14} aria-hidden="true" />
                对话
              </button>
              <button className="assistant-icon-button" type="button" aria-label="Expand panel">
                <Maximize2 size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="assistant-panel-body">
            {assistantMode === "chat" ? (
              <div className="assistant-greeting">
                <span className="assistant-greeting-icon" aria-hidden="true">
                  <Sparkles size={28} />
                </span>
                <p>输入创意或制作问题，我会把结果落回画布。</p>
              </div>
            ) : (
              <div className="assistant-scroll">
                {inspectorSlot ?? (
                  <>
                    <h2 className="panel-title">{t("workbench.inspector")}</h2>
                    <ul className="property-list">
                      <li className="property-item">
                        <span>{t("inspector.selection")}</span>
                        <span className="property-value">{t("inspector.none")}</span>
                      </li>
                      <li className="property-item">
                        <span>{t("inspector.providerMode")}</span>
                        <span className="property-value">{t("inspector.mock")}</span>
                      </li>
                      <li className="property-item">
                        <span>{t("inspector.canvasStatus")}</span>
                        <span className="property-value">{t("inspector.ready")}</span>
                      </li>
                      {projectId ? (
                        <li className="property-item">
                          <span>{t("inspector.project")}</span>
                          <span className="property-value">{projectId}</span>
                        </li>
                      ) : null}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>

          {assistantMode === "chat" ? (
            <form className="assistant-composer" onSubmit={(event) => event.preventDefault()}>
              <label className="assistant-input">
                <textarea rows={3} placeholder="输入创意想法" aria-label="Creative prompt" />
              </label>
              <div className="assistant-composer-footer">
                <button className="assistant-send-button" type="submit" aria-label="Send">
                  <Send size={16} aria-hidden="true" />
                </button>
              </div>
            </form>
          ) : null}
        </aside>
      </section>

      <footer className="bottom-queue" aria-label={t("queue.aria")}>
        <div className="canvas-bottom-dock" aria-label="Canvas view controls">
          <button className="dock-button active" type="button" aria-label="Select tool">
            <MousePointer2 size={17} aria-hidden="true" />
          </button>
          <button className="dock-button" type="button" aria-label="Pan tool">
            <Hand size={17} aria-hidden="true" />
          </button>
        </div>
        <strong className="queue-title">{t("queue.title")}</strong>
        <div className="queue-summary">
          <span className="queue-pill">{t("queue.queued", { count: queueSummary.queued })}</span>
          <span className="queue-pill">{t("queue.running", { count: queueSummary.running })}</span>
          <span className="queue-pill">
            {t("queue.waiting", { count: queueSummary.providerWaiting ?? 0 })}
          </span>
          <span className="queue-pill warning">{t("queue.failed", { count: queueSummary.failed })}</span>
          <span className="queue-pill">
            {t("queue.cancelled", { count: queueSummary.cancelled ?? 0 })}
          </span>
        </div>
      </footer>
    </main>
  );
}

function LanguageSwitcher({
  locale,
  setLocale,
}: {
  locale: Locale;
  setLocale(locale: Locale): void;
}) {
  const { t } = useI18n();

  return (
    <div className="locale-switcher" role="group" aria-label={t("language.label")}>
      <button
        className={locale === "en" ? "active" : ""}
        type="button"
        aria-pressed={locale === "en"}
        onClick={() => setLocale("en")}
      >
        {t("language.english")}
      </button>
      <button
        className={locale === "zh" ? "active" : ""}
        type="button"
        aria-pressed={locale === "zh"}
        onClick={() => setLocale("zh")}
      >
        {t("language.chinese")}
      </button>
    </div>
  );
}

function railHref(section: WorkbenchSection, projectId: string | undefined): string | undefined {
  if (section === "projects") {
    return "/";
  }
  if (!projectId) {
    return undefined;
  }
  if (section === "storyboard") {
    return `/projects/${projectId}/canvas`;
  }
  if (section === "settings") {
    return `/projects/${projectId}/settings`;
  }
  return undefined;
}
