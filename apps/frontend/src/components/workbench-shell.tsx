"use client";

import { CANVAS_NODE_TYPES } from "@guga-flow/shared-types";
import type { GenerationQueueSummary } from "@guga-flow/shared-types";
import {
  BookOpen,
  Boxes,
  ChevronDown,
  ChevronLeft,
  Clapperboard,
  Eye,
  FolderOpen,
  Globe2,
  Hand,
  LogOut,
  Maximize2,
  MessageCircle,
  Minus,
  MousePointer2,
  PackageCheck,
  Plus,
  Redo2,
  Send,
  Settings,
  Sparkles,
  Undo2,
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
        <a className="canvas-back-link" href="/" aria-label={t("workbench.projects")}>
          <ChevronLeft size={20} aria-hidden="true" />
          <span>{projectTitle}</span>
        </a>
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
        <LanguageSwitcher locale={locale} setLocale={setLocale} />
        <button className="tool-button session-button" type="button" onClick={() => void handleLogout()}>
          <LogOut size={15} aria-hidden="true" />
          Logout
        </button>
        {saveStateSlot ?? <div className="save-state">{t("save.saved")}</div>}
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
          <ul className="nav-list">
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
                <h2>NovelNode</h2>
                <p>
                  {t("workbench.nodeTypesAvailable", { count: CANVAS_NODE_TYPES.length })}
                </p>
              </article>

              <div className="scene-strip" aria-label={t("workbench.storyboardLayoutPreview")}>
                <article className="node-preview">
                  <h2>SceneFrame 01</h2>
                  <div className="shot-row">
                    <div className="shot-card">
                      <strong>S01-01</strong>
                      <span>{t("workbench.draftShot")}</span>
                    </div>
                    <div className="shot-card">
                      <strong>S01-02</strong>
                      <span>{t("workbench.imagePending")}</span>
                    </div>
                    <div className="shot-card">
                      <strong>S01-03</strong>
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
              <button className="assistant-chip-button" type="button">
                <Plus size={14} aria-hidden="true" />
                新建对话
              </button>
              <button className="assistant-chip-button" type="button">
                <MessageCircle size={14} aria-hidden="true" />
                对话管理
                <ChevronDown size={13} aria-hidden="true" />
              </button>
              <button className="assistant-icon-button" type="button" aria-label="Expand panel">
                <Maximize2 size={15} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="assistant-panel-body">
            <div className="assistant-greeting">
              <span className="assistant-greeting-icon" aria-hidden="true">
                <Sparkles size={28} />
              </span>
              <p>你好！输入你的创意，我来帮你完成剧本、分镜、角色设计等工作。</p>
            </div>
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
          </div>

          <form className="assistant-composer" onSubmit={(event) => event.preventDefault()}>
            <div className="assistant-composer-tabs">
              <button type="button">技能库</button>
              <button type="button">
                <Globe2 size={13} aria-hidden="true" />
                技能社区
              </button>
            </div>
            <label className="assistant-input">
              <textarea
                rows={3}
                placeholder="输入创意想法，按 / 调用技能，@ 引用素材库"
                aria-label="Creative prompt"
              />
            </label>
            <div className="assistant-composer-footer">
              <div className="assistant-quick-actions">
                <button type="button" aria-label="Add image">
                  <Boxes size={15} aria-hidden="true" />
                </button>
                <button type="button" aria-label="Add script">
                  <BookOpen size={15} aria-hidden="true" />
                </button>
                <button type="button" aria-label="Add audio">
                  <Clapperboard size={15} aria-hidden="true" />
                </button>
              </div>
              <button className="assistant-ask-button" type="submit">
                <MessageCircle size={14} aria-hidden="true" />
                询问
                <ChevronDown size={13} aria-hidden="true" />
              </button>
              <button className="assistant-send-button" type="submit" aria-label="Send">
                <Send size={16} aria-hidden="true" />
              </button>
            </div>
          </form>
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
          <span className="dock-divider" />
          <button className="dock-button" type="button" aria-label="Zoom out">
            <Minus size={16} aria-hidden="true" />
          </button>
          <span className="dock-zoom">100%</span>
          <button className="dock-button" type="button" aria-label="Zoom in">
            <Plus size={16} aria-hidden="true" />
          </button>
          <span className="dock-divider" />
          <button className="dock-button" type="button" aria-label="Fit view">
            <Maximize2 size={16} aria-hidden="true" />
          </button>
          <span className="dock-divider" />
          <button className="dock-button" type="button" aria-label="Preview">
            <Eye size={16} aria-hidden="true" />
          </button>
          <span className="dock-divider" />
          <button className="dock-button" type="button" aria-label="Undo">
            <Undo2 size={16} aria-hidden="true" />
          </button>
          <button className="dock-button" type="button" aria-label="Redo">
            <Redo2 size={16} aria-hidden="true" />
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
