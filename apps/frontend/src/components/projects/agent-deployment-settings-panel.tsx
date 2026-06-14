"use client";

import type {
  AgentDeploymentConfig,
  AgentDeploymentIssue,
  AgentDeploymentResult,
  AgentDeploymentRole,
  AgentRoleModelConfig,
  LlmProviderId,
  LlmProviderManagementItem,
  ProviderManagementResult,
} from "@guga-flow/shared-types";
import { AGENT_DEPLOYMENT_ROLES } from "@guga-flow/shared-types";
import { AlertTriangle, Bot, Save } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  getAgentDeployment,
  getProviderManagement,
  updateAgentDeployment,
} from "../../lib/api";

interface AgentDeploymentSettingsPanelProps {
  initialDeployment?: AgentDeploymentResult;
  initialProviders?: ProviderManagementResult;
  projectId: string;
}

type PanelState = {
  error?: string;
  saving?: boolean;
  status?: string;
};

const FALLBACK_DEPLOYMENT: AgentDeploymentConfig = {
  mode: "simple",
  primary: {
    provider: "mock-llm",
    model: "mock-storyboard",
    temperature: 0.2,
    maxOutputTokens: 4096,
  },
  roles: {},
};

export function AgentDeploymentSettingsPanel({
  initialDeployment,
  initialProviders,
  projectId,
}: AgentDeploymentSettingsPanelProps) {
  const [deployment, setDeployment] = useState<AgentDeploymentResult | null>(initialDeployment ?? null);
  const [providers, setProviders] = useState<ProviderManagementResult | null>(initialProviders ?? null);
  const [draft, setDraft] = useState<AgentDeploymentConfig>(() =>
    initialDeployment ? configFromDeployment(initialDeployment) : FALLBACK_DEPLOYMENT,
  );
  const [state, setState] = useState<PanelState>({});
  const [loading, setLoading] = useState(!initialDeployment || !initialProviders);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getAgentDeployment(projectId),
      initialProviders ? Promise.resolve(initialProviders) : getProviderManagement(projectId),
    ])
      .then(([deploymentResult, providerResult]) => {
        if (cancelled) {
          return;
        }
        setDeployment(deploymentResult);
        setDraft(configFromDeployment(deploymentResult));
        setProviders(providerResult);
        setState({});
      })
      .catch((caught) => {
        if (!cancelled) {
          setState({ error: caught instanceof Error ? caught.message : "Unable to load Agent deployment" });
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
  }, [initialProviders, projectId]);

  const llmProviders = useMemo(() => providers?.llm ?? [], [providers]);
  const issueCount = deployment?.issues.length ?? 0;

  function updatePrimary(patch: Partial<AgentRoleModelConfig>) {
    setDraft((current) => ({
      ...current,
      primary: patchRoleConfig(current.primary, patch),
    }));
  }

  function updateRole(role: AgentDeploymentRole, patch: Partial<AgentRoleModelConfig>) {
    setDraft((current) => ({
      ...current,
      roles: {
        ...current.roles,
        [role]: patchRoleConfig(current.roles[role] ?? { ...current.primary, inherit: true }, patch),
      },
    }));
  }

  function updateRoleInherit(role: AgentDeploymentRole, inherit: boolean) {
    setDraft((current) => ({
      ...current,
      roles: {
        ...current.roles,
        [role]: inherit
          ? { inherit: true }
          : {
              ...current.primary,
              inherit: false,
            },
      },
    }));
  }

  async function handleSave() {
    setState({ saving: true });
    try {
      const result = await updateAgentDeployment(projectId, draft);
      setDeployment(result);
      setDraft(configFromDeployment(result));
      setState({ status: `Saved v${result.deployment.version}` });
    } catch (caught) {
      setState({ error: caught instanceof Error ? caught.message : "Agent deployment was not saved" });
    }
  }

  if (loading && !deployment) {
    return <div className="provider-console-state">Loading Agent deployment</div>;
  }

  return (
    <section className="provider-console agent-deployment-console" aria-label="Agent deployment">
      <div className="provider-console-header">
        <div>
          <p className="panel-kicker">Settings</p>
          <h1 className="provider-console-title">Agent Deployment</h1>
        </div>
        <span className="provider-console-project">{deployment ? `v${deployment.deployment.version}` : projectId}</span>
      </div>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <form
        className="provider-row agent-deployment-form"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <div className="provider-row-main">
          <div className="provider-name-block">
            <div className="provider-name-line">
              <strong>Role Runtime</strong>
              <span className={`provider-status-pill ${issueCount ? "blocked" : "ready"}`}>
                {issueCount ? `${issueCount} issues` : "Ready"}
              </span>
            </div>
            <div className="provider-meta-line">
              <span>{draft.mode}</span>
              <span>{AGENT_DEPLOYMENT_ROLES.length} roles</span>
              <span>{draft.primary.provider ?? "no provider"}</span>
            </div>
          </div>
        </div>

        <div className="provider-config-grid agent-primary-grid">
          <label className="generation-field">
            <span>Mode</span>
            <select
              name="agentDeploymentMode"
              value={draft.mode}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  mode: event.target.value === "advanced" ? "advanced" : "simple",
                }))
              }
            >
              <option value="simple">Simple</option>
              <option value="advanced">Advanced</option>
            </select>
          </label>
          <ProviderSelect
            config={draft.primary}
            name="agentPrimaryProvider"
            providers={llmProviders}
            onChange={(provider) =>
              updatePrimary({
                provider,
                model: defaultModelForProvider(llmProviders, provider),
              })
            }
          />
          <ModelSelect
            config={draft.primary}
            name="agentPrimaryModel"
            providers={llmProviders}
            onChange={(model) => updatePrimary({ model })}
          />
          <RuntimeNumberField
            label="Temperature"
            name="agentPrimaryTemperature"
            max={2}
            min={0}
            step={0.1}
            value={draft.primary.temperature ?? 0.2}
            onChange={(temperature) => updatePrimary({ temperature })}
          />
          <RuntimeNumberField
            label="Max tokens"
            name="agentPrimaryMaxTokens"
            max={200000}
            min={1}
            step={1}
            value={draft.primary.maxOutputTokens ?? 4096}
            onChange={(maxOutputTokens) => updatePrimary({ maxOutputTokens })}
          />
        </div>

        {draft.mode === "advanced" ? (
          <div className="agent-role-matrix" aria-label="Agent role model overrides">
            <div className="provider-model-heading">
              <span>Role Overrides</span>
              <span>{AGENT_DEPLOYMENT_ROLES.length}</span>
            </div>
            {AGENT_DEPLOYMENT_ROLES.map((role) => {
              const config = draft.roles[role] ?? { ...draft.primary, inherit: true };
              const inherited = config.inherit !== false;
              return (
                <div className="agent-role-row" key={role}>
                  <strong>{roleLabel(role)}</strong>
                  <label className="provider-toggle">
                    <input
                      checked={inherited}
                      name={`agentRole:${role}:inherit`}
                      onChange={(event) => updateRoleInherit(role, event.target.checked)}
                      type="checkbox"
                    />
                    <span>Inherit</span>
                  </label>
                  <ProviderSelect
                    config={config}
                    disabled={inherited}
                    name={`agentRole:${role}:provider`}
                    providers={llmProviders}
                    onChange={(provider) =>
                      updateRole(role, {
                        inherit: false,
                        provider,
                        model: defaultModelForProvider(llmProviders, provider),
                      })
                    }
                  />
                  <ModelSelect
                    config={config}
                    disabled={inherited}
                    name={`agentRole:${role}:model`}
                    providers={llmProviders}
                    onChange={(model) => updateRole(role, { inherit: false, model })}
                  />
                  <RuntimeNumberField
                    disabled={inherited}
                    label="Temp"
                    name={`agentRole:${role}:temperature`}
                    max={2}
                    min={0}
                    step={0.1}
                    value={config.temperature ?? draft.primary.temperature ?? 0.2}
                    onChange={(temperature) => updateRole(role, { inherit: false, temperature })}
                  />
                  <RuntimeNumberField
                    disabled={inherited}
                    label="Tokens"
                    name={`agentRole:${role}:maxTokens`}
                    max={200000}
                    min={1}
                    step={1}
                    value={config.maxOutputTokens ?? draft.primary.maxOutputTokens ?? 4096}
                    onChange={(maxOutputTokens) => updateRole(role, { inherit: false, maxOutputTokens })}
                  />
                </div>
              );
            })}
          </div>
        ) : null}

        {deployment?.issues.length ? <DeploymentIssues issues={deployment.issues} /> : null}

        <div className="provider-row-actions">
          <button className="primary-action" disabled={state.saving} type="submit">
            <Save size={14} aria-hidden="true" />
            {state.saving ? "Saving" : "Save"}
          </button>
          {state.status ? <span className="generation-status">{state.status}</span> : null}
        </div>
      </form>
    </section>
  );
}

function configFromDeployment(result: AgentDeploymentResult): AgentDeploymentConfig {
  return {
    mode: result.deployment.mode,
    primary: result.deployment.primary,
    roles: result.deployment.roles,
  };
}

function patchRoleConfig(
  current: AgentRoleModelConfig,
  patch: Partial<AgentRoleModelConfig>,
): AgentRoleModelConfig {
  return {
    ...current,
    ...patch,
  };
}

function ProviderSelect({
  config,
  disabled,
  name,
  providers,
  onChange,
}: {
  config: AgentRoleModelConfig;
  disabled?: boolean;
  name: string;
  providers: readonly LlmProviderManagementItem[];
  onChange(provider: LlmProviderId): void;
}) {
  return (
    <label className="generation-field">
      <span>Provider</span>
      <select
        disabled={disabled}
        name={name}
        value={config.provider ?? ""}
        onChange={(event) => onChange(event.target.value as LlmProviderId)}
      >
        <option value="">Provider</option>
        {providers.map((provider) => (
          <option key={provider.id} value={provider.id}>
            {provider.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModelSelect({
  config,
  disabled,
  name,
  providers,
  onChange,
}: {
  config: AgentRoleModelConfig;
  disabled?: boolean;
  name: string;
  providers: readonly LlmProviderManagementItem[];
  onChange(model: string): void;
}) {
  const models = modelsForProvider(providers, config.provider);
  return (
    <label className="generation-field">
      <span>Model</span>
      <select
        disabled={disabled}
        name={name}
        value={config.model ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Model</option>
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.displayName}
          </option>
        ))}
      </select>
    </label>
  );
}

function RuntimeNumberField({
  disabled,
  label,
  max,
  min,
  name,
  step,
  value,
  onChange,
}: {
  disabled?: boolean;
  label: string;
  max: number;
  min: number;
  name: string;
  step: number;
  value: number;
  onChange(value: number): void;
}) {
  return (
    <label className="generation-field">
      <span>{label}</span>
      <input
        disabled={disabled}
        max={max}
        min={min}
        name={name}
        onChange={(event) => onChange(Number(event.target.value))}
        step={step}
        type="number"
        value={value}
      />
    </label>
  );
}

function DeploymentIssues({ issues }: { issues: readonly AgentDeploymentIssue[] }) {
  return (
    <div className="agent-deployment-issues" aria-label="Agent deployment issues">
      {issues.map((issue) => (
        <div className="provider-version-row" key={`${issue.path}:${issue.message}`}>
          <AlertTriangle size={14} aria-hidden="true" />
          <span>{issue.role ? roleLabel(issue.role) : "Deployment"}</span>
          <span>{issue.message}</span>
        </div>
      ))}
    </div>
  );
}

function defaultModelForProvider(
  providers: readonly LlmProviderManagementItem[],
  providerId: LlmProviderId,
): string {
  const provider = providers.find((candidate) => candidate.id === providerId);
  return provider?.models.find((model) => !model.disabled)?.id ?? provider?.defaultModel ?? "";
}

function modelsForProvider(
  providers: readonly LlmProviderManagementItem[],
  providerId: AgentRoleModelConfig["provider"],
) {
  const provider = providers.find((candidate) => candidate.id === providerId);
  return provider?.models.filter((model) => !model.disabled) ?? [];
}

function roleLabel(role: AgentDeploymentRole): string {
  return role
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function AgentDeploymentIcon() {
  return <Bot size={16} aria-hidden="true" />;
}
