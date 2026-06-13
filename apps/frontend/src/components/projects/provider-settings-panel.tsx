"use client";

import type {
  ProviderConnectionTestResult,
  ProviderManagementItem,
  ProviderManagementResult,
  ProgrammableProviderDefinitionSummary,
} from "@guga-flow/shared-types";
import { CheckCircle2, Code2, KeyRound, Power, RefreshCw, Save, ShieldAlert } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

import {
  activateProgrammableProviderVersion,
  createProgrammableProvider,
  disableProgrammableProvider,
  getProviderManagement,
  listProgrammableProviders,
  testProviderConfig,
  updateProviderConfig,
  updateProgrammableProviderSource,
} from "../../lib/api";

interface ProviderSettingsPanelProps {
  initialProviders?: ProviderManagementResult;
  initialProgrammableProviders?: ProgrammableProviderDefinitionSummary[];
  projectId: string;
}

interface ProviderDraft {
  credential: string;
  clearCredential: boolean;
  defaultModel: string;
  enabled: boolean;
}

type RowState = {
  error?: string;
  saving?: boolean;
  status?: string;
  testing?: boolean;
};

const DEFAULT_PROGRAMMABLE_SOURCE = `export default {
  id: "custom:atlas-cloud",
  kind: "image",
  displayName: "Atlas Cloud",
  credentials: [{ key: "apiKey", label: "API Key", type: "password", required: true }],
  models: [{ id: "atlas-image-v1", displayName: "Atlas Image v1" }],
  defaultModel: "atlas-image-v1",
  supportedModes: ["text_to_image"],
  defaultAspectRatio: "16:9",
  supportedAspectRatios: ["16:9"],
  parameters: [],
  image: {
    supportsReferenceImages: false,
    maxReferenceImages: 0,
    supportsMultipleOutputs: false,
    maxOutputs: 1,
    action: {
      request: {
        method: "POST",
        url: "https://api.example.test/images",
        headers: { Authorization: "Bearer {{credential.apiKey}}" },
        bodyJson: { prompt: "{{input.prompt}}", model: "{{input.model}}" },
      },
      output: { source: "url", path: "data.url", mimeType: "image/png" },
    },
  },
};`;

export function ProviderSettingsPanel({
  initialProviders,
  initialProgrammableProviders,
  projectId,
}: ProviderSettingsPanelProps) {
  const [providers, setProviders] = useState<ProviderManagementResult | null>(initialProviders ?? null);
  const [programmableProviders, setProgrammableProviders] = useState<ProgrammableProviderDefinitionSummary[]>(
    initialProgrammableProviders ?? [],
  );
  const [drafts, setDrafts] = useState<Record<string, ProviderDraft>>(() =>
    initialProviders ? draftsForProviders(initialProviders) : {},
  );
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [programmableSource, setProgrammableSource] = useState(DEFAULT_PROGRAMMABLE_SOURCE);
  const [selectedProgrammableKey, setSelectedProgrammableKey] = useState("new");
  const [programmableState, setProgrammableState] = useState<RowState>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialProviders);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getProviderManagement(projectId), listProgrammableProviders(projectId)])
      .then(([result, programmableResult]) => {
        if (cancelled) {
          return;
        }
        setProviders(result);
        setProgrammableProviders(programmableResult.providers);
        setDrafts(draftsForProviders(result));
        setLoadError(null);
      })
      .catch((caught) => {
        if (!cancelled) {
          setLoadError(caught instanceof Error ? caught.message : "Unable to load provider settings");
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

  const providerGroups = useMemo(
    () => [
      { label: "Image Providers", providers: providers?.image ?? [] },
      { label: "Video Providers", providers: providers?.video ?? [] },
    ],
    [providers],
  );

  function setDraft(provider: ProviderManagementItem, next: Partial<ProviderDraft>) {
    const key = providerKey(provider);
    setDrafts((current) => ({
      ...current,
      [key]: {
        ...draftForProvider(provider),
        ...current[key],
        ...next,
      },
    }));
  }

  async function refreshSettings() {
    const [management, programmable] = await Promise.all([
      getProviderManagement(projectId),
      listProgrammableProviders(projectId),
    ]);
    setProviders(management);
    setProgrammableProviders(programmable.providers);
    setDrafts(draftsForProviders(management));
  }

  async function handleSaveProgrammableSource() {
    setProgrammableState({ saving: true });
    try {
      const selected = programmableProviders.find((provider) => programmableKey(provider) === selectedProgrammableKey);
      const result = selected
        ? await updateProgrammableProviderSource(projectId, selected.kind, selected.provider, {
            sourceCode: programmableSource,
          })
        : await createProgrammableProvider(projectId, { sourceCode: programmableSource });
      setProgrammableProviders((current) => upsertProgrammableProvider(current, result.provider));
      setSelectedProgrammableKey(programmableKey(result.provider));
      setProgrammableState({ status: `Version ${result.provider.versions[0]?.version ?? ""} saved` });
    } catch (caught) {
      setProgrammableState({
        error: caught instanceof Error ? caught.message : "Programmable provider source was not saved",
      });
    }
  }

  async function handleActivateProgrammable(
    provider: ProgrammableProviderDefinitionSummary,
    versionId: string,
  ) {
    setProgrammableState({ saving: true });
    try {
      await activateProgrammableProviderVersion(projectId, provider.kind, provider.provider, { versionId });
      await refreshSettings();
      setProgrammableState({ status: "Activated" });
    } catch (caught) {
      setProgrammableState({
        error: caught instanceof Error ? caught.message : "Programmable provider was not activated",
      });
    }
  }

  async function handleDisableProgrammable(provider: ProgrammableProviderDefinitionSummary) {
    setProgrammableState({ saving: true });
    try {
      await disableProgrammableProvider(projectId, provider.kind, provider.provider);
      await refreshSettings();
      setProgrammableState({ status: "Disabled" });
    } catch (caught) {
      setProgrammableState({
        error: caught instanceof Error ? caught.message : "Programmable provider was not disabled",
      });
    }
  }

  async function handleSave(provider: ProviderManagementItem) {
    const key = providerKey(provider);
    const draft = drafts[key] ?? draftForProvider(provider);
    setRowState((current) => ({
      ...current,
      [key]: { saving: true },
    }));

    try {
      const result = await updateProviderConfig(projectId, provider.kind, provider.id, {
        enabled: draft.enabled,
        defaultModel: draft.defaultModel,
        credential: draft.clearCredential
          ? { action: "clear" }
          : draft.credential.trim()
            ? { action: "set", value: draft.credential.trim() }
            : undefined,
      });
      setProviders((current) => mergeProvider(current, result.provider));
      setDrafts((current) => ({
        ...current,
        [key]: draftForProvider(result.provider),
      }));
      setRowState((current) => ({
        ...current,
        [key]: { status: "Saved" },
      }));
    } catch (caught) {
      setRowState((current) => ({
        ...current,
        [key]: {
          error: caught instanceof Error ? caught.message : "Provider settings were not saved",
        },
      }));
    }
  }

  async function handleTest(provider: ProviderManagementItem) {
    const key = providerKey(provider);
    const draft = drafts[key] ?? draftForProvider(provider);
    setRowState((current) => ({
      ...current,
      [key]: { testing: true },
    }));

    try {
      const result = await testProviderConfig(projectId, provider.kind, provider.id, {
        model: draft.defaultModel,
      });
      setProviders((current) => mergeProviderTest(current, result));
      setRowState((current) => ({
        ...current,
        [key]: { status: result.message },
      }));
    } catch (caught) {
      setRowState((current) => ({
        ...current,
        [key]: {
          error: caught instanceof Error ? caught.message : "Provider test failed",
        },
      }));
    }
  }

  if (loading && !providers) {
    return <div className="provider-console-state">Loading provider settings</div>;
  }

  if (loadError && !providers) {
    return <div className="form-error">{loadError}</div>;
  }

  return (
    <section className="provider-console" aria-label="Provider settings">
      <div className="provider-console-header">
        <div>
          <p className="panel-kicker">Settings</p>
          <h1 className="provider-console-title">Providers</h1>
        </div>
        <span className="provider-console-project">{projectId}</span>
      </div>

      {loadError ? <p className="form-error">{loadError}</p> : null}

      {providerGroups.map((group) => (
        <section className="provider-group" key={group.label} aria-label={group.label}>
          <div className="provider-group-heading">
            <h2>{group.label}</h2>
            <span>{group.providers.length}</span>
          </div>
          <div className="provider-rows">
            {group.providers.map((provider) => {
              const key = providerKey(provider);
              const draft = drafts[key] ?? draftForProvider(provider);
              const state = rowState[key] ?? {};
              const credentialLabel = provider.requiresApiKey
                ? provider.credentialSource ?? "missing"
                : "not required";

              return (
                <form
                  className="provider-row"
                  key={key}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleSave(provider);
                  }}
                >
                  <input
                    aria-hidden="true"
                    autoComplete="username"
                    className="provider-hidden-username"
                    name={`${key}:credentialOwner`}
                    readOnly
                    tabIndex={-1}
                    value={provider.id}
                  />
                  <div className="provider-row-main">
                    <div className="provider-name-block">
                      <div className="provider-name-line">
                        <strong>{provider.displayName}</strong>
                        <span className={`provider-status-pill ${provider.enabled ? "ready" : "blocked"}`}>
                          {provider.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </div>
                      <div className="provider-meta-line">
                        <span>{provider.id}</span>
                        <span>{provider.models.length} models</span>
                        <span>{credentialLabel}</span>
                      </div>
                    </div>

                    <label className="provider-toggle">
                      <input
                        checked={draft.enabled}
                        name={`${key}:enabled`}
                        onChange={(event) => setDraft(provider, { enabled: event.target.checked })}
                        type="checkbox"
                      />
                      <span>Enable</span>
                    </label>
                  </div>

                  <div className="provider-config-grid">
                    <label className="generation-field">
                      <span>Default model</span>
                      <select
                        name={`${key}:defaultModel`}
                        value={draft.defaultModel}
                        onChange={(event) => setDraft(provider, { defaultModel: event.target.value })}
                      >
                        {provider.models.map((model) => (
                          <option key={model.id} value={model.id}>
                            {model.displayName}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="generation-field">
                      <span>Credential</span>
                      <input
                        autoComplete="new-password"
                        disabled={!provider.requiresApiKey || draft.clearCredential}
                        name={`${key}:credential`}
                        onChange={(event) => setDraft(provider, { credential: event.target.value })}
                        placeholder={provider.requiresApiKey ? "New API key" : "Not required"}
                        type="password"
                        value={draft.credential}
                      />
                    </label>

                    <label className="provider-clear-toggle">
                      <input
                        checked={draft.clearCredential}
                        disabled={provider.credentialSource !== "stored"}
                        name={`${key}:clearCredential`}
                        onChange={(event) =>
                          setDraft(provider, {
                            clearCredential: event.target.checked,
                            credential: event.target.checked ? "" : draft.credential,
                          })
                        }
                        type="checkbox"
                      />
                      <span>Clear stored key</span>
                    </label>
                  </div>

                  <div className="provider-row-actions">
                    <button
                      className="primary-action"
                      disabled={state.saving || state.testing}
                      onClick={() => void handleSave(provider)}
                      type="button"
                    >
                      <Save size={14} aria-hidden="true" />
                      {state.saving ? "Saving" : "Save"}
                    </button>
                    <button
                      className="ghost-action"
                      disabled={state.saving || state.testing}
                      onClick={() => void handleTest(provider)}
                      type="button"
                    >
                      <RefreshCw size={14} aria-hidden="true" />
                      {state.testing ? "Testing" : "Test"}
                    </button>
                    <ProviderHealth provider={provider} />
                  </div>

                  {state.status ? <p className="generation-status">{state.status}</p> : null}
                  {state.error ? <p className="form-error">{state.error}</p> : null}
                  {!provider.enabled && provider.disabledReason ? (
                    <p className="provider-disabled-reason">{provider.disabledReason}</p>
                  ) : null}
                </form>
              );
            })}
          </div>
        </section>
      ))}

      <section className="provider-group" aria-label="Programmable Providers">
        <div className="provider-group-heading">
          <h2>Programmable Providers</h2>
          <span>{programmableProviders.length}</span>
        </div>
        <form
          className="provider-programmable-form"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSaveProgrammableSource();
          }}
        >
          <div className="provider-config-grid programmable">
            <label className="generation-field">
              <span>Target</span>
              <select
                value={selectedProgrammableKey}
                onChange={(event) => setSelectedProgrammableKey(event.target.value)}
              >
                <option value="new">New provider</option>
                {programmableProviders.map((provider) => (
                  <option key={programmableKey(provider)} value={programmableKey(provider)}>
                    {provider.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="generation-field wide">
              <span>Source</span>
              <textarea
                className="provider-source-editor"
                value={programmableSource}
                onChange={(event) => setProgrammableSource(event.target.value)}
              />
            </label>
          </div>
          <div className="provider-row-actions">
            <button
              className="primary-action"
              disabled={programmableState.saving}
              type="submit"
            >
              <Code2 size={14} aria-hidden="true" />
              {programmableState.saving ? "Saving" : "Save Source"}
            </button>
            {programmableState.status ? <span className="generation-status">{programmableState.status}</span> : null}
          </div>
          {programmableState.error ? <p className="form-error">{programmableState.error}</p> : null}
        </form>

        <div className="provider-rows">
          {programmableProviders.map((provider) => (
            <div className="provider-row programmable" key={programmableKey(provider)}>
              <div className="provider-row-main">
                <div className="provider-name-block">
                  <div className="provider-name-line">
                    <strong>{provider.displayName}</strong>
                    <span className={`provider-status-pill ${provider.enabled ? "ready" : "blocked"}`}>
                      {provider.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="provider-meta-line">
                    <span>{provider.provider}</span>
                    <span>{provider.kind}</span>
                    <span>{provider.credentialConfigured ? "stored" : "missing"}</span>
                  </div>
                </div>
                <button
                  className="ghost-action"
                  disabled={programmableState.saving}
                  onClick={() => void handleDisableProgrammable(provider)}
                  type="button"
                >
                  <Power size={14} aria-hidden="true" />
                  Disable
                </button>
              </div>
              <div className="provider-version-list">
                {provider.versions.map((version) => (
                  <div className="provider-version-row" key={version.id}>
                    <span>v{version.version}</span>
                    <span className={`provider-status-pill ${version.status === "valid" ? "ready" : "blocked"}`}>
                      {version.status}
                    </span>
                    <span>{version.active ? "Active" : version.createdAt.slice(0, 10)}</span>
                    <button
                      className="ghost-action compact"
                      disabled={programmableState.saving || version.status !== "valid" || version.active}
                      onClick={() => void handleActivateProgrammable(provider, version.id)}
                      type="button"
                    >
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
          ))}
        </div>
      </section>
    </section>
  );
}

function ProviderHealth({ provider }: { provider: ProviderManagementItem }) {
  if (!provider.lastTest) {
    return (
      <span className="provider-health">
        <KeyRound size={14} aria-hidden="true" />
        Untested
      </span>
    );
  }

  const succeeded = provider.lastTest.status === "succeeded";
  return (
    <span className={`provider-health ${succeeded ? "ready" : "blocked"}`}>
      {succeeded ? <CheckCircle2 size={14} aria-hidden="true" /> : <ShieldAlert size={14} aria-hidden="true" />}
      {succeeded ? "Ready" : "Failed"}
    </span>
  );
}

function providerKey(provider: Pick<ProviderManagementItem, "id" | "kind">): string {
  return `${provider.kind}:${provider.id}`;
}

function draftForProvider(provider: ProviderManagementItem): ProviderDraft {
  return {
    credential: "",
    clearCredential: false,
    defaultModel: provider.defaultModel,
    enabled: provider.configuredEnabled,
  };
}

function draftsForProviders(result: ProviderManagementResult): Record<string, ProviderDraft> {
  return [...result.image, ...result.video].reduce<Record<string, ProviderDraft>>((drafts, provider) => {
    drafts[providerKey(provider)] = draftForProvider(provider);
    return drafts;
  }, {});
}

function mergeProvider(
  current: ProviderManagementResult | null,
  provider: ProviderManagementItem,
): ProviderManagementResult {
  const base = current ?? { image: [], video: [] };
  return provider.kind === "image"
    ? { ...base, image: replaceProvider(base.image, provider) }
    : { ...base, video: replaceProvider(base.video, provider) };
}

function mergeProviderTest(
  current: ProviderManagementResult | null,
  result: ProviderConnectionTestResult,
): ProviderManagementResult | null {
  if (!current) {
    return current;
  }

  const lastTest = {
    status: result.status,
    testedAt: result.testedAt,
    model: result.model,
    message: result.message,
  };

  if (result.kind === "image") {
    return {
      ...current,
      image: current.image.map((provider) =>
        provider.id === result.provider
          ? {
              ...provider,
              lastTest,
            }
          : provider,
      ),
    };
  }

  return {
    ...current,
    video: current.video.map((provider) =>
      provider.id === result.provider
        ? {
            ...provider,
            lastTest,
          }
        : provider,
    ),
  };
}

function replaceProvider<TProvider extends ProviderManagementItem>(
  providers: TProvider[],
  provider: ProviderManagementItem,
): TProvider[] {
  const index = providers.findIndex((candidate) => candidate.id === provider.id);
  if (index === -1) {
    return [...providers, provider as TProvider];
  }
  return providers.map((candidate) => (candidate.id === provider.id ? (provider as TProvider) : candidate));
}

function programmableKey(provider: Pick<ProgrammableProviderDefinitionSummary, "kind" | "provider">): string {
  return `${provider.kind}:${provider.provider}`;
}

function upsertProgrammableProvider(
  providers: ProgrammableProviderDefinitionSummary[],
  provider: ProgrammableProviderDefinitionSummary,
): ProgrammableProviderDefinitionSummary[] {
  const key = programmableKey(provider);
  if (!providers.some((candidate) => programmableKey(candidate) === key)) {
    return [provider, ...providers];
  }
  return providers.map((candidate) => (programmableKey(candidate) === key ? provider : candidate));
}
