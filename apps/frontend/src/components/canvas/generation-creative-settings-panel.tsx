import type {
  CanvasSnapshotJson,
  CanvasNodeRecord,
  GenerationCreativeSettingKey,
  GenerationCreativeSettings,
  GenerationContinuityMode,
  GenerationPackagingReference,
  ProjectAspectRatio,
  ProjectDetail,
  ResolvedGenerationSettings,
  ShotNodeData,
  UpdateCanvasNodeInput,
} from "@guga-flow/shared-types";
import {
  GENERATION_CONTINUITY_MODES,
  GENERATION_PACKAGING_REFERENCE_STATUSES,
  PROJECT_ASPECT_RATIOS,
  normalizeGenerationCreativeSettings,
  resolveGenerationSettings,
} from "@guga-flow/shared-types";
import React, { useEffect, useMemo, useState } from "react";

import { updateCanvasNode, updateProject } from "../../lib/api";

const TEXT_SETTINGS = [
  { key: "visualStyle", label: "Visual style" },
  { key: "narrationLanguage", label: "Narration language" },
  { key: "narrationAccent", label: "Narration accent" },
  { key: "narrationVoice", label: "Voice" },
] as const;

const PACKAGING_SETTINGS = [
  { key: "subtitle", label: "Subtitle" },
  { key: "bgm", label: "BGM" },
  { key: "transition", label: "Transition" },
  { key: "stylePack", label: "Style pack" },
] as const;

const VIRAL_REFERENCE_FIELDS = [
  { key: "sourceSummary", label: "Manual summary", multiline: true },
  { key: "hook", label: "Hook", multiline: false },
  { key: "pacing", label: "Pacing", multiline: false },
  { key: "theme", label: "Theme", multiline: false },
  { key: "visualStyle", label: "Reference style", multiline: false },
  { key: "transformationNotes", label: "Transformation notes", multiline: true },
  { key: "complianceNote", label: "Compliance note", multiline: true },
] as const;

const VISUAL_MANUAL_FIELDS = [
  { key: "artStyle", label: "Art style", multiline: true },
  { key: "palette", label: "Palette", multiline: true },
  { key: "lighting", label: "Lighting", multiline: true },
  { key: "lens", label: "Lens", multiline: false },
  { key: "composition", label: "Composition", multiline: true },
  { key: "texture", label: "Texture", multiline: true },
  { key: "consistencyRules", label: "Consistency rules", multiline: true },
  { key: "negativeStyle", label: "Negative style", multiline: true },
] as const;

const DIRECTOR_MANUAL_FIELDS = [
  { key: "pacing", label: "Pacing", multiline: true },
  { key: "cameraLanguage", label: "Camera language", multiline: true },
  { key: "performance", label: "Performance", multiline: true },
  { key: "editingRhythm", label: "Editing rhythm", multiline: true },
  { key: "audioNarration", label: "Audio narration", multiline: true },
  { key: "productionConstraints", label: "Production constraints", multiline: true },
] as const;

const CONTINUITY_TEXT_FIELDS = [
  { key: "transitionPrompt", label: "Transition prompt", multiline: true },
  { key: "adjacentShotPrompt", label: "Adjacent Shot prompt", multiline: true },
  { key: "cameraBridge", label: "Camera bridge", multiline: false },
  { key: "subjectAnchor", label: "Subject anchor", multiline: false },
] as const;

const TALKING_PHOTO_TEXT_FIELDS = [
  { key: "sourceAssetId", label: "Portrait asset ID", multiline: false },
  { key: "personaPrompt", label: "Persona prompt", multiline: true },
  { key: "voicePrompt", label: "Voice prompt", multiline: false },
  { key: "scriptPrompt", label: "Script prompt", multiline: true },
] as const;

const MARKETING_TEXT_FIELDS = [
  { key: "callToAction", label: "Call to action", multiline: false },
  { key: "layoutNotes", label: "Layout notes", multiline: true },
] as const;

const MARKETING_REFERENCE_SETTINGS = [
  { key: "cover", label: "Cover" },
  { key: "poster", label: "Poster" },
  { key: "promo", label: "Promo cut" },
] as const;

const RESOLVED_ROWS: Array<{ key: GenerationCreativeSettingKey; label: string }> = [
  { key: "visualStyle", label: "Style" },
  { key: "aspectRatio", label: "Aspect" },
  { key: "narrationLanguage", label: "Language" },
  { key: "narrationAccent", label: "Accent" },
  { key: "narrationVoice", label: "Voice" },
  { key: "visualManual", label: "Visual manual" },
  { key: "directorManual", label: "Director manual" },
  { key: "subtitle", label: "Subtitle" },
  { key: "bgm", label: "BGM" },
  { key: "transition", label: "Transition" },
  { key: "stylePack", label: "Style pack" },
  { key: "viralReference", label: "Viral ref" },
  { key: "continuity", label: "Continuity" },
  { key: "talkingPhoto", label: "Talking" },
  { key: "marketing", label: "Marketing" },
];

type TextSettingKey = (typeof TEXT_SETTINGS)[number]["key"];
type PackagingSettingKey = (typeof PACKAGING_SETTINGS)[number]["key"];
type ViralReferenceKey = (typeof VIRAL_REFERENCE_FIELDS)[number]["key"];
type VisualManualKey = (typeof VISUAL_MANUAL_FIELDS)[number]["key"];
type DirectorManualKey = (typeof DIRECTOR_MANUAL_FIELDS)[number]["key"];
type ContinuityTextKey = (typeof CONTINUITY_TEXT_FIELDS)[number]["key"];
type TalkingPhotoTextKey = (typeof TALKING_PHOTO_TEXT_FIELDS)[number]["key"];
type MarketingTextKey = (typeof MARKETING_TEXT_FIELDS)[number]["key"];
type MarketingReferenceKey = (typeof MARKETING_REFERENCE_SETTINGS)[number]["key"];

export function ProjectGenerationSettingsPanel({
  onProjectUpdated,
  project,
}: {
  onProjectUpdated?(project: ProjectDetail): void;
  project?: ProjectDetail | null;
}) {
  const [draft, setDraft] = useState<GenerationCreativeSettings>(() =>
    normalizeGenerationCreativeSettings(project?.generationSettings),
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(normalizeGenerationCreativeSettings(project?.generationSettings));
  }, [project?.generationSettings]);

  if (!project) {
    return null;
  }

  async function handleSave() {
    if (!project) {
      return;
    }
    setBusy(true);
    setStatus(null);
    setError(null);

    try {
      const result = await updateProject(project.id, {
        generationSettings: normalizeGenerationCreativeSettings(draft),
      });
      setDraft(normalizeGenerationCreativeSettings(result.generationSettings));
      onProjectUpdated?.(result);
      setStatus("Saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Project settings save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="generation-panel creative-settings-panel" aria-label="Project generation defaults">
      <div className="section-heading-row">
        <h3>Project defaults</h3>
        {settingCount(draft) ? <span className="status-chip">{settingCount(draft)} set</span> : null}
      </div>
      <GenerationCreativeSettingsForm
        busy={busy}
        idPrefix="project-generation"
        settings={draft}
        emptyAspectLabel="Not set"
        onSettingsChange={setDraft}
        onSave={handleSave}
        saveLabel="Save Defaults"
      />
      {status ? <p className="generation-status">{status}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

export function ShotGenerationSettingsPanel({
  node,
  onNodeUpdated,
  projectGenerationSettings,
  projectId,
}: {
  node: CanvasNodeRecord<ShotNodeData>;
  onNodeUpdated(node: CanvasNodeRecord): void;
  projectGenerationSettings?: GenerationCreativeSettings;
  projectId: string;
}) {
  const shotSettings = normalizeGenerationCreativeSettings(node.dataJson.generationSettings);
  const [draft, setDraft] = useState<GenerationCreativeSettings>(() => shotSettings);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resolved = useMemo(
    () =>
      resolveGenerationSettings({
        projectSettings: projectGenerationSettings,
        shotSettings: draft,
      }),
    [draft, projectGenerationSettings],
  );

  useEffect(() => {
    setDraft(normalizeGenerationCreativeSettings(node.dataJson.generationSettings));
  }, [node.dataJson.generationSettings]);

  async function handleSave() {
    setBusy(true);
    setStatus(null);
    setError(null);

    try {
      const normalized = normalizeGenerationCreativeSettings(draft);
      const nextData: ShotNodeData = { ...node.dataJson };
      if (Object.keys(normalized).length) {
        nextData.generationSettings = normalized;
      } else {
        delete nextData.generationSettings;
      }
      const result = await updateCanvasNode(projectId, node.id, {
        dataJson: nextData as UpdateCanvasNodeInput["dataJson"],
      });
      onNodeUpdated(result.node);
      setStatus("Saved");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Shot settings save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="generation-panel creative-settings-panel" aria-label="Shot generation overrides">
      <div className="section-heading-row">
        <h3>Shot overrides</h3>
        {settingCount(draft) ? <span className="status-chip">{settingCount(draft)} set</span> : null}
      </div>
      <ResolvedGenerationSettingsSummary resolved={resolved} />
      <GenerationCreativeSettingsForm
        busy={busy}
        idPrefix={`shot-generation-${node.id}`}
        settings={draft}
        emptyAspectLabel="Inherit"
        onSettingsChange={setDraft}
        onSave={handleSave}
        saveLabel="Save Overrides"
      />
      {status ? <p className="generation-status">{status}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </section>
  );
}

function GenerationCreativeSettingsForm({
  busy,
  emptyAspectLabel,
  idPrefix,
  onSave,
  onSettingsChange,
  saveLabel,
  settings,
}: {
  busy: boolean;
  emptyAspectLabel: string;
  idPrefix: string;
  onSave(): Promise<void>;
  onSettingsChange(settings: GenerationCreativeSettings): void;
  saveLabel: string;
  settings: GenerationCreativeSettings;
}) {
  function updateTextSetting(key: TextSettingKey, value: string) {
    onSettingsChange({
      ...settings,
      [key]: value.trim() || undefined,
    });
  }

  function updateAspectRatio(value: string) {
    onSettingsChange({
      ...settings,
      aspectRatio: value ? (value as ProjectAspectRatio) : undefined,
    });
  }

  function updateReference(
    key: PackagingSettingKey,
    patch: Partial<GenerationPackagingReference>,
  ) {
    onSettingsChange({
      ...settings,
      [key]: {
        ...referenceValue(settings[key]),
        ...patch,
      },
    });
  }

  function updateViralReference(key: ViralReferenceKey, value: string) {
    onSettingsChange({
      ...settings,
      viralReference: {
        ...referenceObject(settings.viralReference),
        [key]: value.trim() || undefined,
      },
    });
  }

  function updateVisualManual(key: VisualManualKey, value: string) {
    onSettingsChange({
      ...settings,
      visualManual: {
        ...referenceObject(settings.visualManual),
        [key]: value.trim() || undefined,
      },
    });
  }

  function updateDirectorManual(key: DirectorManualKey, value: string) {
    onSettingsChange({
      ...settings,
      directorManual: {
        ...referenceObject(settings.directorManual),
        [key]: value.trim() || undefined,
      },
    });
  }

  function updateContinuityMode(value: string) {
    onSettingsChange({
      ...settings,
      continuity: {
        ...referenceObject(settings.continuity),
        mode: value ? (value as GenerationContinuityMode) : undefined,
      },
    });
  }

  function updateContinuityText(key: ContinuityTextKey, value: string) {
    onSettingsChange({
      ...settings,
      continuity: {
        ...referenceObject(settings.continuity),
        [key]: value.trim() || undefined,
      },
    });
  }

  function updateTalkingPhotoText(key: TalkingPhotoTextKey, value: string) {
    onSettingsChange({
      ...settings,
      talkingPhoto: {
        ...referenceObject(settings.talkingPhoto),
        [key]: value.trim() || undefined,
      },
    });
  }

  function updateTalkingPhotoFlag(key: "enabled" | "consentConfirmed", checked: boolean) {
    onSettingsChange({
      ...settings,
      talkingPhoto: {
        ...referenceObject(settings.talkingPhoto),
        [key]: checked || undefined,
      },
    });
  }

  function updateMarketingText(key: MarketingTextKey, value: string) {
    onSettingsChange({
      ...settings,
      marketing: {
        ...referenceObject(settings.marketing),
        [key]: value.trim() || undefined,
      },
    });
  }

  function updateMarketingReference(
    key: MarketingReferenceKey,
    patch: Partial<GenerationPackagingReference>,
  ) {
    const marketing = referenceObject(settings.marketing);
    onSettingsChange({
      ...settings,
      marketing: {
        ...marketing,
        [key]: {
          ...referenceValue(marketing[key]),
          ...patch,
        },
      },
    });
  }

  return (
    <form
      className="generation-settings creative-settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <div className="generation-field-grid creative-settings-grid">
        {TEXT_SETTINGS.map((field) => (
          <div className="generation-field" key={field.key}>
            <label htmlFor={`${idPrefix}-${field.key}`}>{field.label}</label>
            <input
              id={`${idPrefix}-${field.key}`}
              type="text"
              value={stringValue(settings[field.key])}
              disabled={busy}
              onChange={(event) => updateTextSetting(field.key, event.target.value)}
            />
          </div>
        ))}
        <div className="generation-field">
          <label htmlFor={`${idPrefix}-aspectRatio`}>Aspect</label>
          <select
            id={`${idPrefix}-aspectRatio`}
            value={settings.aspectRatio ?? ""}
            disabled={busy}
            onChange={(event) => updateAspectRatio(event.target.value)}
          >
            <option value="">{emptyAspectLabel}</option>
            {PROJECT_ASPECT_RATIOS.map((aspectRatio) => (
              <option key={aspectRatio} value={aspectRatio}>
                {aspectRatio}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="generation-reference-list">
        <SettingsDetails
          title="Packaging references"
          meta={groupStatus(packagingReferenceCount(settings))}
        >
          {PACKAGING_SETTINGS.map((field) => {
            const reference = referenceValue(settings[field.key]);
            return (
              <div className="generation-reference-row" key={field.key}>
                <strong>{field.label}</strong>
                <PackagingReferenceFields
                  busy={busy}
                  idPrefix={`${idPrefix}-${field.key}`}
                  reference={reference}
                  onChange={(patch) => updateReference(field.key, patch)}
                />
              </div>
            );
          })}
        </SettingsDetails>

        <SettingsDetails title="Visual manual" meta={groupStatus(objectSettingCount(settings.visualManual))}>
          <div className="generation-field-grid creative-settings-grid">
            {VISUAL_MANUAL_FIELDS.map((field) => (
              <TextField
                busy={busy}
                id={`${idPrefix}-visual-manual-${field.key}`}
                key={field.key}
                label={field.label}
                multiline={field.multiline}
                value={stringValue(settings.visualManual?.[field.key])}
                onChange={(value) => updateVisualManual(field.key, value)}
              />
            ))}
          </div>
        </SettingsDetails>

        <SettingsDetails title="Director manual" meta={groupStatus(objectSettingCount(settings.directorManual))}>
          <div className="generation-field-grid creative-settings-grid">
            {DIRECTOR_MANUAL_FIELDS.map((field) => (
              <TextField
                busy={busy}
                id={`${idPrefix}-director-manual-${field.key}`}
                key={field.key}
                label={field.label}
                multiline={field.multiline}
                value={stringValue(settings.directorManual?.[field.key])}
                onChange={(value) => updateDirectorManual(field.key, value)}
              />
            ))}
          </div>
        </SettingsDetails>

        <SettingsDetails
          title="Manual viral reference"
          meta={groupStatus(objectSettingCount(settings.viralReference))}
        >
          <div className="generation-field-grid creative-settings-grid">
            {VIRAL_REFERENCE_FIELDS.map((field) => (
              <TextField
                busy={busy}
                id={`${idPrefix}-viral-${field.key}`}
                key={field.key}
                label={field.label}
                multiline={field.multiline}
                value={stringValue(settings.viralReference?.[field.key])}
                onChange={(value) => updateViralReference(field.key, value)}
              />
            ))}
          </div>
        </SettingsDetails>

        <SettingsDetails
          title="Continuity strategy"
          meta={groupStatus(objectSettingCount(settings.continuity))}
        >
          <div className="generation-field-grid creative-settings-grid">
            <div className="generation-field">
              <label htmlFor={`${idPrefix}-continuity-mode`}>Mode</label>
              <select
                id={`${idPrefix}-continuity-mode`}
                value={settings.continuity?.mode ?? ""}
                disabled={busy}
                onChange={(event) => updateContinuityMode(event.target.value)}
              >
                <option value="">Not set</option>
                {GENERATION_CONTINUITY_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {mode}
                  </option>
                ))}
              </select>
            </div>
            {CONTINUITY_TEXT_FIELDS.map((field) => (
              <TextField
                busy={busy}
                id={`${idPrefix}-continuity-${field.key}`}
                key={field.key}
                label={field.label}
                multiline={field.multiline}
                value={stringValue(settings.continuity?.[field.key])}
                onChange={(value) => updateContinuityText(field.key, value)}
              />
            ))}
          </div>
        </SettingsDetails>

        <SettingsDetails
          title="Talking photo brief"
          meta={groupStatus(objectSettingCount(settings.talkingPhoto))}
        >
          <div className="generation-field-grid creative-settings-grid">
            <label className="generation-checkbox" htmlFor={`${idPrefix}-talking-enabled`}>
              <input
                id={`${idPrefix}-talking-enabled`}
                type="checkbox"
                checked={settings.talkingPhoto?.enabled === true}
                disabled={busy}
                onChange={(event) => updateTalkingPhotoFlag("enabled", event.target.checked)}
              />
              Enabled
            </label>
            <label className="generation-checkbox" htmlFor={`${idPrefix}-talking-consent`}>
              <input
                id={`${idPrefix}-talking-consent`}
                type="checkbox"
                checked={settings.talkingPhoto?.consentConfirmed === true}
                disabled={busy}
                onChange={(event) => updateTalkingPhotoFlag("consentConfirmed", event.target.checked)}
              />
              Consent confirmed
            </label>
            {TALKING_PHOTO_TEXT_FIELDS.map((field) => (
              <TextField
                busy={busy}
                id={`${idPrefix}-talking-${field.key}`}
                key={field.key}
                label={field.label}
                multiline={field.multiline}
                value={stringValue(settings.talkingPhoto?.[field.key])}
                onChange={(value) => updateTalkingPhotoText(field.key, value)}
              />
            ))}
          </div>
        </SettingsDetails>

        <SettingsDetails
          title="Marketing materials"
          meta={groupStatus(objectSettingCount(settings.marketing))}
        >
          <div className="generation-field-grid creative-settings-grid">
            {MARKETING_TEXT_FIELDS.map((field) => (
              <TextField
                busy={busy}
                id={`${idPrefix}-marketing-${field.key}`}
                key={field.key}
                label={field.label}
                multiline={field.multiline}
                value={stringValue(settings.marketing?.[field.key])}
                onChange={(value) => updateMarketingText(field.key, value)}
              />
            ))}
          </div>
          {MARKETING_REFERENCE_SETTINGS.map((field) => (
            <div className="generation-reference-row nested" key={field.key}>
              <strong>{field.label}</strong>
              <PackagingReferenceFields
                busy={busy}
                idPrefix={`${idPrefix}-marketing-${field.key}`}
                reference={referenceValue(settings.marketing?.[field.key])}
                onChange={(patch) => updateMarketingReference(field.key, patch)}
              />
            </div>
          ))}
        </SettingsDetails>
      </div>

      <div className="generation-actions">
        <button className="primary-action compact" type="submit" disabled={busy}>
          {saveLabel}
        </button>
      </div>
    </form>
  );
}

function SettingsDetails({
  children,
  meta,
  title,
}: {
  children: React.ReactNode;
  meta: string;
  title: string;
}) {
  return (
    <details className="generation-settings-details">
      <summary>
        <strong>{title}</strong>
        <span>{meta}</span>
      </summary>
      <div className="generation-settings-details-body">{children}</div>
    </details>
  );
}

function TextField({
  busy,
  id,
  label,
  multiline,
  onChange,
  value,
}: {
  busy: boolean;
  id: string;
  label: string;
  multiline?: boolean;
  onChange(value: string): void;
  value: string;
}) {
  return (
    <div className={`generation-field${multiline ? " wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          rows={3}
          value={value}
          disabled={busy}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          disabled={busy}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

function PackagingReferenceFields({
  busy,
  idPrefix,
  onChange,
  reference,
}: {
  busy: boolean;
  idPrefix: string;
  onChange(patch: Partial<GenerationPackagingReference>): void;
  reference: GenerationPackagingReference;
}) {
  return (
    <div className="generation-reference-grid">
      <div className="generation-field">
        <label htmlFor={`${idPrefix}-status`}>State</label>
        <select
          id={`${idPrefix}-status`}
          value={reference.status ?? ""}
          disabled={busy}
          onChange={(event) =>
            onChange({
              status: event.target.value
                ? (event.target.value as GenerationPackagingReference["status"])
                : undefined,
            })
          }
        >
          <option value="">Not set</option>
          {GENERATION_PACKAGING_REFERENCE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </div>
      <div className="generation-field">
        <label htmlFor={`${idPrefix}-label`}>Label</label>
        <input
          id={`${idPrefix}-label`}
          type="text"
          value={reference.label ?? ""}
          disabled={busy}
          onChange={(event) => onChange({ label: event.target.value.trim() || undefined })}
        />
      </div>
      <div className="generation-field">
        <label htmlFor={`${idPrefix}-asset`}>Asset ID</label>
        <input
          id={`${idPrefix}-asset`}
          type="text"
          value={reference.assetId ?? ""}
          disabled={busy}
          onChange={(event) => onChange({ assetId: event.target.value.trim() || undefined })}
        />
      </div>
    </div>
  );
}

function ResolvedGenerationSettingsSummary({ resolved }: { resolved: ResolvedGenerationSettings }) {
  const rows = RESOLVED_ROWS.map((row) => ({
    ...row,
    source: resolved.sources[row.key],
    value: resolved.effective[row.key],
  })).filter((row) => hasSettingValue(row.value));

  if (!rows.length) {
    return null;
  }

  return (
    <div className="generation-resolved-settings" aria-label="Effective generation settings">
      {rows.map((row) => (
        <div className="generation-resolved-row" key={row.key}>
          <span>{row.label}</span>
          <strong>{settingLabel(row.value)}</strong>
          {row.source ? <em>{row.source}</em> : null}
        </div>
      ))}
    </div>
  );
}

function settingCount(settings: GenerationCreativeSettings): number {
  return Object.keys(normalizeGenerationCreativeSettings(settings)).length;
}

function groupStatus(count: number): string {
  return count ? `${count} set` : "Not set";
}

function packagingReferenceCount(settings: GenerationCreativeSettings): number {
  return PACKAGING_SETTINGS.filter((field) => hasSettingValue(settings[field.key])).length;
}

function objectSettingCount(value: unknown): number {
  return Object.values(referenceObject(value)).filter(hasSettingValue).length;
}

function referenceValue(value: unknown): GenerationPackagingReference {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as GenerationPackagingReference)
    : {};
}

function referenceObject(value: unknown): { [key: string]: CanvasSnapshotJson | undefined } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as { [key: string]: CanvasSnapshotJson | undefined })
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function hasSettingValue(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return Object.values(value).some((item) => item !== undefined && item !== "");
  }
  return value !== undefined;
}

function settingLabel(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  const object = referenceObject(value);
  const semanticLabel = compactLabel([
    stringValue(object.mode),
    stringValue(object.artStyle),
    stringValue(object.palette),
    stringValue(object.cameraLanguage),
    stringValue(object.pacing),
    stringValue(object.hook),
    stringValue(object.sourceSummary),
    stringValue(object.sourceAssetId),
    stringValue(object.callToAction),
    referenceValue(object.cover).label,
    referenceValue(object.poster).label,
    referenceValue(object.promo).label,
  ]);
  if (semanticLabel) {
    return semanticLabel;
  }
  const reference = referenceValue(value);
  return [
    reference.status,
    reference.label,
    reference.assetId ? `asset:${reference.assetId}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function compactLabel(values: Array<string | undefined>): string {
  return values.filter(Boolean).join(" / ");
}
