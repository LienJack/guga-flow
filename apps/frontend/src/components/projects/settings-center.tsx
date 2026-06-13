"use client";

import type {
  ProjectSettingsExportResult,
  ProjectSettingsSummaryResult,
  ProviderManagementResult,
  SkillTemplateSummary,
  ProgrammableProviderDefinitionSummary,
} from "@guga-flow/shared-types";
import { Database, Download, FileArchive, Info, Settings2, SlidersHorizontal, Upload } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  exportProjectSettings,
  getProjectSettingsSummary,
  validateProjectSettingsImport,
} from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { ProviderSettingsPanel } from "./provider-settings-panel";
import { SkillTemplateSettingsPanel } from "./skill-template-settings-panel";

interface SettingsCenterProps {
  initialProgrammableProviders?: ProgrammableProviderDefinitionSummary[];
  initialProviders?: ProviderManagementResult;
  initialSkillTemplates?: SkillTemplateSummary[];
  initialSummary?: ProjectSettingsSummaryResult;
  projectId: string;
}

type PanelState = {
  error?: string;
  status?: string;
  validating?: boolean;
};

export function SettingsCenter({
  initialProgrammableProviders,
  initialProviders,
  initialSkillTemplates,
  initialSummary,
  projectId,
}: SettingsCenterProps) {
  const { t } = useI18n();
  const [summary, setSummary] = useState<ProjectSettingsSummaryResult | null>(initialSummary ?? null);
  const [exportResult, setExportResult] = useState<ProjectSettingsExportResult | null>(null);
  const [importPayload, setImportPayload] = useState("");
  const [importState, setImportState] = useState<PanelState>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialSummary);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProjectSettingsSummary(projectId)
      .then((result) => {
        if (!cancelled) {
          setSummary(result);
          setLoadError(null);
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setLoadError(caught instanceof Error ? caught.message : t("settings.loadFailed"));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const exportJson = useMemo(
    () => (exportResult ? JSON.stringify(exportResult.export, null, 2) : ""),
    [exportResult],
  );
  const exportHref = exportJson
    ? `data:application/json;charset=utf-8,${encodeURIComponent(exportJson)}`
    : undefined;

  async function handleExport() {
    setImportState({});
    try {
      setExportResult(await exportProjectSettings(projectId));
    } catch (caught) {
      setImportState({ error: caught instanceof Error ? caught.message : t("settings.exportFailed") });
    }
  }

  async function handleValidateImport() {
    setImportState({ validating: true });
    try {
      const payload = JSON.parse(importPayload);
      const result = await validateProjectSettingsImport(projectId, { payload });
      setImportState({
        status: result.valid
          ? t("settings.validExport", {
              providers: result.summary?.providers ?? 0,
              skills: result.summary?.skillTemplates ?? 0,
            })
          : result.issues.map((issue) => `${issue.path}: ${issue.message}`).join("; "),
      });
    } catch (caught) {
      setImportState({
        error: caught instanceof Error ? caught.message : t("settings.importFailed"),
      });
    }
  }

  return (
    <div className="settings-center">
      <header className="settings-center-header">
        <div>
          <p className="panel-kicker">{t("settings.kicker")}</p>
          <h1>{t("settings.title")}</h1>
        </div>
        <span>{projectId}</span>
      </header>

      {loadError ? <p className="form-error">{loadError}</p> : null}
      {loading && !summary ? <div className="provider-console-state">{t("settings.loading")}</div> : null}

      {summary ? (
        <>
          <nav className="settings-module-nav" aria-label={t("settings.modules")}>
            {summary.modules.map((module) => (
              <a href={`#settings-${module.module}`} key={module.module}>
                <strong>{settingsModuleLabel(module.module, t)}</strong>
                <span>{settingsStatusLabel(module.status, t)}</span>
              </a>
            ))}
          </nav>

          <section className="settings-summary-grid" aria-label={t("settings.summary")}>
            {summary.modules.map((module) => (
              <div className="settings-summary-card" key={module.module}>
                <strong>{settingsModuleLabel(module.module, t)}</strong>
                <span>{settingsModuleSummary(module, t)}</span>
                {typeof module.itemCount === "number" ? <small>{module.itemCount}</small> : null}
              </div>
            ))}
          </section>
        </>
      ) : null}

      <section id="settings-providers" className="settings-center-section">
        <SectionHeading icon={<SlidersHorizontal size={16} aria-hidden="true" />} title={t("settings.providers")} />
        <ProviderSettingsPanel
          initialProviders={initialProviders}
          initialProgrammableProviders={initialProgrammableProviders}
          projectId={projectId}
        />
      </section>

      <section id="settings-prompts" className="settings-center-section">
        <SectionHeading icon={<Settings2 size={16} aria-hidden="true" />} title={t("settings.prompts")} />
        <SkillTemplateSettingsPanel initialSkillTemplates={initialSkillTemplates} projectId={projectId} />
      </section>

      {summary ? (
        <>
          <section id="settings-project_defaults" className="settings-center-section">
            <SectionHeading
              icon={<SlidersHorizontal size={16} aria-hidden="true" />}
              title={t("settings.projectDefaults")}
            />
            <dl className="settings-fact-grid">
              <div>
                <dt>{t("settings.aspectRatio")}</dt>
                <dd>{summary.project.defaultAspectRatio}</dd>
              </div>
              <div>
                <dt>{t("settings.generationFields")}</dt>
                <dd>{summary.project.generationSettingsCount}</dd>
              </div>
              <div>
                <dt>{t("settings.canvasNodes")}</dt>
                <dd>{summary.resourceCounts.canvasNodes}</dd>
              </div>
            </dl>
          </section>

          <section id="settings-data" className="settings-center-section">
            <SectionHeading icon={<Database size={16} aria-hidden="true" />} title={t("settings.data")} />
            <div className="settings-actions-row">
              <button className="primary-action compact" type="button" onClick={() => void handleExport()}>
                <Download size={14} aria-hidden="true" />
                {t("settings.exportJson")}
              </button>
              {exportHref ? (
                <a
                  className="ghost-action compact"
                  href={exportHref}
                  download={`${summary.project.id}-settings-export.json`}
                >
                  <FileArchive size={14} aria-hidden="true" />
                  {t("settings.download")}
                </a>
              ) : null}
            </div>
            {exportJson ? <pre className="settings-export-preview">{exportJson.slice(0, 1400)}</pre> : null}
            <label className="generation-field">
              <span>{t("settings.importPayload")}</span>
              <textarea
                className="settings-import-input"
                value={importPayload}
                onChange={(event) => setImportPayload(event.target.value)}
              />
            </label>
            <div className="settings-actions-row">
              <button
                className="ghost-action compact"
                type="button"
                disabled={!importPayload.trim() || importState.validating}
                onClick={() => void handleValidateImport()}
              >
                <Upload size={14} aria-hidden="true" />
                {t("settings.validate")}
              </button>
              {importState.status ? <span className="generation-status">{importState.status}</span> : null}
            </div>
            {importState.error ? <p className="form-error">{importState.error}</p> : null}
          </section>

          <section id="settings-files" className="settings-center-section">
            <SectionHeading icon={<FileArchive size={16} aria-hidden="true" />} title={t("settings.files")} />
            <dl className="settings-fact-grid">
              <div>
                <dt>{t("settings.totalAssets")}</dt>
                <dd>{summary.fileSummary.totalAssets}</dd>
              </div>
              <div>
                <dt>{t("settings.storageBytes")}</dt>
                <dd>{summary.fileSummary.totalSizeBytes}</dd>
              </div>
              <div>
                <dt>{t("settings.uploadStorage")}</dt>
                <dd>
                  {summary.fileSummary.uploadStorageConfigured
                    ? t("settings.configured")
                    : t("settings.missing")}
                </dd>
              </div>
            </dl>
            <ul className="settings-breakdown-list">
              {summary.fileSummary.byType.map((item) => (
                <li key={item.type}>
                  <span>{item.type}</span>
                  <strong>{item.count}</strong>
                  <small>{item.sizeBytes} B</small>
                </li>
              ))}
            </ul>
          </section>

          <section id="settings-version" className="settings-center-section">
            <SectionHeading icon={<Info size={16} aria-hidden="true" />} title={t("settings.version")} />
            <dl className="settings-fact-grid">
              <div>
                <dt>{t("settings.app")}</dt>
                <dd>{summary.version.appVersion}</dd>
              </div>
              <div>
                <dt>{t("settings.api")}</dt>
                <dd>{summary.version.apiVersion}</dd>
              </div>
              <div>
                <dt>{t("settings.node")}</dt>
                <dd>{summary.version.nodeVersion ?? t("settings.unknown")}</dd>
              </div>
            </dl>
          </section>
        </>
      ) : null}
    </div>
  );
}

function SectionHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="settings-section-heading">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

type Translator = (key: string, params?: Record<string, string | number>) => string;
type SettingsModule = ProjectSettingsSummaryResult["modules"][number];

function settingsModuleLabel(moduleId: SettingsModule["module"], t: Translator): string {
  const labelKeys: Record<SettingsModule["module"], string> = {
    data: "settings.data",
    files: "settings.files",
    project_defaults: "settings.projectDefaults",
    prompts: "settings.prompts",
    providers: "settings.providers",
    version: "settings.version",
  };
  return t(labelKeys[moduleId]);
}

function settingsModuleSummary(module: SettingsModule, t: Translator): string {
  if (module.module === "providers") {
    const count = module.itemCount ?? 0;
    return t(count === 1 ? "settings.providersSummary" : "settings.providersSummaryPlural", {
      count,
    });
  }
  if (module.module === "prompts") {
    const count = module.itemCount ?? 0;
    return t(count === 1 ? "settings.promptsSummary" : "settings.promptsSummaryPlural", {
      count,
    });
  }
  if (module.module === "files") {
    return t("settings.filesSummary", { count: module.itemCount ?? 0 });
  }
  if (module.module === "project_defaults") {
    return t("settings.projectDefaultsSummary");
  }
  if (module.module === "data") {
    return t("settings.dataSummary");
  }
  return t("settings.versionSummary");
}

function settingsStatusLabel(status: SettingsModule["status"], t: Translator): string {
  return t(`settings.status.${status}`);
}
