"use client";

import type {
  AgentDeploymentRole,
  ListSkillTemplatesInput,
  SkillTemplatePresetCategory,
  SkillTemplateSummary,
  SkillTemplateTriggerMode,
} from "@guga-flow/shared-types";
import {
  AGENT_DEPLOYMENT_ROLES,
  SKILL_TEMPLATE_PRESET_CATEGORIES,
  SKILL_TEMPLATE_TRIGGER_MODES,
  filterSkillTemplateSummaries,
} from "@guga-flow/shared-types";
import { FileText, RotateCcw, Save } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  activateSkillTemplateVersion,
  listSkillTemplates,
  updateSkillTemplateSource,
} from "../../lib/api";

interface SkillTemplateSettingsPanelProps {
  initialSkillTemplates?: SkillTemplateSummary[];
  projectId: string;
}

type PanelState = {
  error?: string;
  saving?: boolean;
  status?: string;
};

export function SkillTemplateSettingsPanel({
  initialSkillTemplates,
  projectId,
}: SkillTemplateSettingsPanelProps) {
  const [templates, setTemplates] = useState<SkillTemplateSummary[]>(initialSkillTemplates ?? []);
  const [selectedKey, setSelectedKey] = useState(() => initialSkillTemplates?.[0] ? templateKey(initialSkillTemplates[0]) : "");
  const [sourceDraft, setSourceDraft] = useState(() => activeVersion(initialSkillTemplates?.[0])?.sourceText ?? "");
  const [filters, setFilters] = useState<ListSkillTemplatesInput>({});
  const [state, setState] = useState<PanelState>({});
  const [loading, setLoading] = useState(!initialSkillTemplates);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listSkillTemplates(projectId)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setTemplates(result.templates);
        setSelectedKey((current) => current || (result.templates[0] ? templateKey(result.templates[0]) : ""));
        setState({});
      })
      .catch((caught) => {
        if (!cancelled) {
          setState({ error: caught instanceof Error ? caught.message : "Unable to load skill templates" });
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

  const filteredTemplates = useMemo(
    () => filterSkillTemplateSummaries(templates, filters),
    [filters, templates],
  );
  const selectedTemplate = useMemo(
    () =>
      filteredTemplates.find((template) => templateKey(template) === selectedKey) ??
      filteredTemplates[0],
    [filteredTemplates, selectedKey],
  );

  useEffect(() => {
    setSourceDraft(activeVersion(selectedTemplate)?.sourceText ?? "");
  }, [selectedTemplate]);

  async function refreshTemplates(nextTemplate?: SkillTemplateSummary) {
    if (nextTemplate) {
      setTemplates((current) => upsertTemplate(current, nextTemplate));
      setSelectedKey(templateKey(nextTemplate));
      return;
    }
    const result = await listSkillTemplates(projectId);
    setTemplates(result.templates);
  }

  async function handleSaveSource() {
    if (!selectedTemplate) {
      return;
    }
    setState({ saving: true });
    try {
      const result = await updateSkillTemplateSource(
        projectId,
        selectedTemplate.kind,
        selectedTemplate.slug,
        { sourceText: sourceDraft },
      );
      await refreshTemplates(result.template);
      const latest = result.template.versions[0];
      setState({
        status: latest?.status === "invalid" ? "Saved as invalid version" : `Version ${latest?.version ?? ""} saved`,
      });
    } catch (caught) {
      setState({ error: caught instanceof Error ? caught.message : "Skill template was not saved" });
    }
  }

  async function handleActivate(versionId: string) {
    if (!selectedTemplate) {
      return;
    }
    setState({ saving: true });
    try {
      const result = await activateSkillTemplateVersion(
        projectId,
        selectedTemplate.kind,
        selectedTemplate.slug,
        { versionId },
      );
      await refreshTemplates(result.template);
      setState({ status: "Activated" });
    } catch (caught) {
      setState({ error: caught instanceof Error ? caught.message : "Skill template version was not activated" });
    }
  }

  if (loading && templates.length === 0) {
    return <div className="provider-console-state">Loading skill templates</div>;
  }

  return (
    <section className="provider-console skill-console" aria-label="Skill templates">
      <div className="provider-console-header">
        <div>
          <p className="panel-kicker">Settings</p>
          <h1 className="provider-console-title">Skill Templates</h1>
        </div>
        <span className="provider-console-project">{templates.length}</span>
      </div>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <div className="provider-group">
        <div className="provider-group-heading">
          <h2>Prompt and Agent Skills</h2>
          <span>{filteredTemplates.length}/{templates.length}</span>
        </div>
        <div className="provider-config-grid programmable">
          <label className="generation-field">
            <span>Search</span>
            <input
              value={filters.query ?? ""}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            />
          </label>
          <label className="generation-field">
            <span>Category</span>
            <select
              value={filters.category ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  category: optionalSelectValue<SkillTemplatePresetCategory>(event.target.value),
                }))
              }
            >
              <option value="">All categories</option>
              {SKILL_TEMPLATE_PRESET_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {categoryLabel(category)}
                </option>
              ))}
            </select>
          </label>
          <label className="generation-field">
            <span>Agent role</span>
            <select
              value={filters.agentRole ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  agentRole: optionalSelectValue<AgentDeploymentRole>(event.target.value),
                }))
              }
            >
              <option value="">All roles</option>
              {AGENT_DEPLOYMENT_ROLES.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </label>
          <label className="generation-field">
            <span>Trigger</span>
            <select
              value={filters.triggerMode ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  triggerMode: optionalSelectValue<SkillTemplateTriggerMode>(event.target.value),
                }))
              }
            >
              <option value="">All triggers</option>
              {SKILL_TEMPLATE_TRIGGER_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {triggerLabel(mode)}
                </option>
              ))}
            </select>
          </label>
          <label className="generation-field">
            <span>Target</span>
            <select
              value={selectedTemplate ? templateKey(selectedTemplate) : ""}
              onChange={(event) => setSelectedKey(event.target.value)}
            >
              {filteredTemplates.map((template) => (
                <option key={templateKey(template)} value={templateKey(template)}>
                  {template.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className="generation-field wide">
            <span>Source</span>
            <textarea
              className="skill-source-editor"
              value={sourceDraft}
              onChange={(event) => setSourceDraft(event.target.value)}
            />
          </label>
        </div>
        <div className="provider-row-actions">
          <button className="primary-action" disabled={!selectedTemplate || state.saving} onClick={() => void handleSaveSource()} type="button">
            <Save size={14} aria-hidden="true" />
            {state.saving ? "Saving" : "Save Source"}
          </button>
          {state.status ? <span className="generation-status">{state.status}</span> : null}
        </div>
      </div>

      {selectedTemplate ? (
        <div className="provider-row skill-template-row">
          <div className="provider-row-main">
            <div className="provider-name-block">
              <div className="provider-name-line">
                <strong>{selectedTemplate.displayName}</strong>
                <span className={`provider-status-pill ${selectedTemplate.indexStatus === "ready" ? "ready" : "blocked"}`}>
                  {indexStatusLabel(selectedTemplate.indexStatus)}
                </span>
              </div>
              <div className="provider-meta-line">
                <span>{selectedTemplate.kind}</span>
                <span>{selectedTemplate.slug}</span>
                <span>{selectedTemplate.presetCategories.map(categoryLabel).join(", ")}</span>
                <span>{selectedTemplate.agentRoles.map(roleLabel).join(", ")}</span>
                <span>{selectedTemplate.triggerModes.map(triggerLabel).join(", ")}</span>
              </div>
              {selectedTemplate.activeSummary ? (
                <div className="provider-meta-line">
                  <span>{selectedTemplate.activeSummary}</span>
                </div>
              ) : null}
            </div>
            <FileText size={18} aria-hidden="true" />
          </div>
          <div className="provider-version-list">
            {selectedTemplate.versions.map((version) => (
              <div className="provider-version-row" key={version.id}>
                <span>v{version.version}</span>
                <span className={`provider-status-pill ${version.status === "valid" ? "ready" : "blocked"}`}>
                  {version.status}
                </span>
                <span>{version.active ? "Active" : version.createdAt.slice(0, 10)}</span>
                <button
                  className="ghost-action compact"
                  disabled={state.saving || version.status !== "valid" || version.active}
                  onClick={() => void handleActivate(version.id)}
                  type="button"
                >
                  <RotateCcw size={14} aria-hidden="true" />
                  Activate
                </button>
                {version.diagnostics.length ? (
                  <span className="provider-version-diagnostic">
                    {version.diagnostics.map((diagnostic) => diagnostic.message).join("; ")}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function templateKey(template: Pick<SkillTemplateSummary, "kind" | "slug">): string {
  return `${template.kind}:${template.slug}`;
}

function activeVersion(template: SkillTemplateSummary | undefined) {
  return template?.versions.find((version) => version.active) ?? template?.versions[0];
}

function optionalSelectValue<TValue extends string>(value: string): TValue | undefined {
  return value ? (value as TValue) : undefined;
}

function categoryLabel(category: SkillTemplatePresetCategory): string {
  return category.replace("ai-", "AI ");
}

function triggerLabel(mode: SkillTemplateTriggerMode): string {
  return mode === "insert_prompt" ? "Insert prompt" : "Direct generate";
}

function roleLabel(role: AgentDeploymentRole): string {
  return role.replace(/_/g, " ");
}

function indexStatusLabel(status: SkillTemplateSummary["indexStatus"]): string {
  return status.replace(/_/g, " ");
}

function upsertTemplate(
  templates: readonly SkillTemplateSummary[],
  next: SkillTemplateSummary,
): SkillTemplateSummary[] {
  const key = templateKey(next);
  const existing = templates.some((template) => templateKey(template) === key);
  if (!existing) {
    return [...templates, next];
  }
  return templates.map((template) => (templateKey(template) === key ? next : template));
}
