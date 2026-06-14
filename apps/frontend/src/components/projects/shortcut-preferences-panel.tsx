"use client";

import { FileArchive, RotateCcw, Save, Upload } from "lucide-react";
import React, { useMemo, useState } from "react";

import { useI18n } from "../../lib/i18n";
import {
  DEFAULT_CANVAS_PREFERENCES,
  SHORTCUT_ACTIONS,
  defaultShortcutPreferences,
  exportShortcutSettings,
  importShortcutSettings,
  loadCanvasPreferences,
  loadShortcutPreferences,
  normalizeCanvasPreferences,
  normalizeShortcutPreferences,
  saveCanvasPreferences,
  saveShortcutPreferences,
  shortcutConflicts,
  type CanvasPreferences,
  type ShortcutActionId,
  type ShortcutPreferences,
} from "../../lib/shortcuts";

type ShortcutDrafts = Record<ShortcutActionId, string>;

export function ShortcutPreferencesPanel() {
  const { t } = useI18n();
  const [canvasPreferences, setCanvasPreferences] = useState<CanvasPreferences>(() =>
    loadCanvasPreferences(),
  );
  const [drafts, setDrafts] = useState<ShortcutDrafts>(() =>
    draftsFromPreferences(loadShortcutPreferences()),
  );
  const [importPayload, setImportPayload] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const draftPreferences = useMemo(() => preferencesFromDrafts(drafts), [drafts]);
  const conflicts = useMemo(() => shortcutConflicts(draftPreferences), [draftPreferences]);
  const exportPayload = useMemo(
    () =>
      JSON.stringify(
        exportShortcutSettings({ shortcuts: draftPreferences, canvasPreferences }),
        null,
        2,
      ),
    [canvasPreferences, draftPreferences],
  );
  const exportHref = `data:application/json;charset=utf-8,${encodeURIComponent(exportPayload)}`;

  function savePreferences(nextShortcuts = draftPreferences, nextCanvas = canvasPreferences) {
    const normalizedShortcuts = normalizeShortcutPreferences(nextShortcuts);
    const normalizedCanvas = normalizeCanvasPreferences(nextCanvas);
    setDrafts(draftsFromPreferences(normalizedShortcuts));
    setCanvasPreferences(normalizedCanvas);
    saveShortcutPreferences(normalizedShortcuts);
    saveCanvasPreferences(normalizedCanvas);
    setStatus(t("shortcuts.saved"));
  }

  function resetDefaults() {
    const nextShortcuts = defaultShortcutPreferences();
    setDrafts(draftsFromPreferences(nextShortcuts));
    savePreferences(nextShortcuts, DEFAULT_CANVAS_PREFERENCES);
  }

  function applyImport() {
    try {
      const parsed = JSON.parse(importPayload) as unknown;
      const imported = importShortcutSettings(parsed);
      setDrafts(draftsFromPreferences(imported.shortcuts));
      savePreferences(imported.shortcuts, imported.canvasPreferences);
      setImportPayload("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("shortcuts.importFailed"));
    }
  }

  return (
    <div className="provider-console" aria-label={t("shortcuts.title")}>
      <div className="provider-console-header">
        <div>
          <h2 className="provider-console-title">{t("shortcuts.title")}</h2>
          <p>{t("shortcuts.subtitle")}</p>
        </div>
        <div className="settings-actions-row">
          <button className="ghost-action compact" type="button" onClick={() => savePreferences()}>
            <Save size={14} aria-hidden="true" />
            {t("shortcuts.save")}
          </button>
          <button className="ghost-action compact" type="button" onClick={resetDefaults}>
            <RotateCcw size={14} aria-hidden="true" />
            {t("shortcuts.reset")}
          </button>
          <a
            className="ghost-action compact"
            href={exportHref}
            download="guga-flow-shortcuts.json"
          >
            <FileArchive size={14} aria-hidden="true" />
            {t("shortcuts.export")}
          </a>
        </div>
      </div>

      <div className="provider-config-list">
        {SHORTCUT_ACTIONS.map((action) => (
          <label className="generation-field" key={action.id}>
            <span>{t(action.labelKey)}</span>
            <input
              value={drafts[action.id]}
              onChange={(event) =>
                setDrafts((current) => ({ ...current, [action.id]: event.target.value }))
              }
            />
          </label>
        ))}
      </div>

      {conflicts.length ? (
        <div className="form-error" role="status">
          {conflicts
            .map((conflict) =>
              t("shortcuts.conflict", {
                binding: conflict.binding,
                actions: conflict.actionIds.map((id) => t(shortcutLabelKey(id))).join(", "),
              }),
            )
            .join(" ")}
        </div>
      ) : null}

      <div className="settings-summary-grid" aria-label={t("shortcuts.canvasPreferences")}>
        <ToggleField
          checked={canvasPreferences.gridVisible}
          label={t("shortcuts.gridVisible")}
          onChange={(gridVisible) =>
            setCanvasPreferences((current) => ({ ...current, gridVisible }))
          }
        />
        <ToggleField
          checked={canvasPreferences.snapToGrid}
          label={t("shortcuts.snapToGrid")}
          onChange={(snapToGrid) =>
            setCanvasPreferences((current) => ({ ...current, snapToGrid }))
          }
        />
        <ToggleField
          checked={canvasPreferences.minimapVisible}
          label={t("shortcuts.minimapVisible")}
          onChange={(minimapVisible) =>
            setCanvasPreferences((current) => ({ ...current, minimapVisible }))
          }
        />
        <NumberField
          label={t("shortcuts.defaultZoom")}
          max={4}
          min={0.25}
          step={0.25}
          value={canvasPreferences.defaultZoom}
          onChange={(defaultZoom) =>
            setCanvasPreferences((current) => ({ ...current, defaultZoom }))
          }
        />
        <NumberField
          label={t("shortcuts.defaultNodeWidth")}
          max={960}
          min={160}
          step={20}
          value={canvasPreferences.defaultNodeWidth}
          onChange={(defaultNodeWidth) =>
            setCanvasPreferences((current) => ({ ...current, defaultNodeWidth }))
          }
        />
        <NumberField
          label={t("shortcuts.defaultNodeHeight")}
          max={720}
          min={120}
          step={20}
          value={canvasPreferences.defaultNodeHeight}
          onChange={(defaultNodeHeight) =>
            setCanvasPreferences((current) => ({ ...current, defaultNodeHeight }))
          }
        />
      </div>

      <label className="generation-field">
        <span>{t("shortcuts.import")}</span>
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
          disabled={!importPayload.trim()}
          onClick={applyImport}
        >
          <Upload size={14} aria-hidden="true" />
          {t("shortcuts.import")}
        </button>
        {status ? <span className="generation-status">{status}</span> : null}
      </div>
    </div>
  );
}

function draftsFromPreferences(preferences: ShortcutPreferences): ShortcutDrafts {
  return Object.fromEntries(
    SHORTCUT_ACTIONS.map((action) => [action.id, (preferences[action.id] ?? []).join(", ")]),
  ) as ShortcutDrafts;
}

function preferencesFromDrafts(drafts: ShortcutDrafts): ShortcutPreferences {
  return normalizeShortcutPreferences(
    Object.fromEntries(
      SHORTCUT_ACTIONS.map((action) => [
        action.id,
        drafts[action.id].split(",").map((value) => value.trim()),
      ]),
    ),
  );
}

function shortcutLabelKey(actionId: ShortcutActionId): string {
  return SHORTCUT_ACTIONS.find((action) => action.id === actionId)?.labelKey ?? actionId;
}

function ToggleField({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange(checked: boolean): void;
}) {
  return (
    <label className="settings-summary-card">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function NumberField({
  label,
  max,
  min,
  onChange,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange(value: number): void;
  step: number;
  value: number;
}) {
  return (
    <label className="settings-summary-card">
      <span>{label}</span>
      <input
        max={max}
        min={min}
        step={step}
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
