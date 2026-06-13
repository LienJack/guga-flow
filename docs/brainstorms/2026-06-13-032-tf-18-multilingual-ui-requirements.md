---
date: 2026-06-13
topic: tf-18-multilingual-ui
status: completed
---

# TF-18 Multilingual UI Requirements

## Summary

Add a lightweight multilingual UI foundation with English and Chinese language switching for the core workbench, canvas generation actions, editor export actions, and settings center shell.

## Problem Frame

The production workbench currently exposes its core navigation and generation/export controls only in English. TF-18 needs a maintainable i18n boundary that lets users switch between `en` and `zh` without moving product rules, provider metadata, or user-authored project content into translation files.

## Scope Decision

This slice implements UI-string localization for stable product chrome and workflow controls. It does not translate user data, provider/model names, generated content, database records, or validation messages returned from backend services.

## Actors

- A1. Producer: switches between English and Chinese while working on the canvas.
- A2. Frontend i18n layer: stores the selected locale and resolves product UI strings.
- A3. Future language pack maintainer: adds new locale keys without changing workflow logic.

## Key Flows

- F1. Language switch
  - **Trigger:** User opens a project workbench or settings page.
  - **Steps:** The topbar shows an English/Chinese switcher, persists selection locally, and updates supported frontend strings.
  - **Outcome:** The user can switch between `en` and `zh` without reconfiguring the project.
  - **Covered by:** R1, R2

- F2. Canvas generation and export controls
  - **Trigger:** User selects generation-capable nodes or multiple exportable videos.
  - **Steps:** The generation, batch generation, and editor export panels render labels, action buttons, and known result messages through the i18n dictionary.
  - **Outcome:** Core canvas production controls are available in English or Chinese.
  - **Covered by:** R3

- F3. Settings shell localization
  - **Trigger:** User opens `/projects/:projectId/settings`.
  - **Steps:** The settings center chrome, module labels, static facts, and action buttons resolve through the same i18n layer while provider/skill data stays unchanged.
  - **Outcome:** The integrated settings surface follows the selected locale without leaking secrets or translating data values.
  - **Covered by:** R4, R5

## Requirements

- R1. Frontend must expose a shared i18n provider and translation helper with at least `en` and `zh` locales.
- R2. The selected locale must be switchable in the workbench topbar and persisted in browser local storage.
- R3. Core canvas generation, batch generation, save status, queue, and editor export labels/actions must use the shared i18n layer.
- R4. Settings center static headings, module labels, summary labels, export/import controls, file facts, and version labels must use the shared i18n layer.
- R5. Translation dictionaries must contain only product UI copy, not provider logic, model metadata, project content, or backend import/export semantics.

## Acceptance Examples

- AE1. **Covers R1, R2.** Rendering the workbench shows an `EN` / `中文` switcher; switching to Chinese persists `guga-flow-locale=zh`.
- AE2. **Covers R3.** Generation and editor export panels continue to render English by default and render Chinese labels when the selected locale is `zh`.
- AE3. **Covers R4.** The settings center module nav and actions use localized labels, while provider names such as `Image 2` and skill names such as `Art Skill` remain unchanged.
- AE4. **Covers R5.** Translation files contain keys and strings only; provider availability, sort presets, and export payload construction remain in TypeScript logic.

## Scope Boundaries

- No backend locale preference storage in this slice.
- No machine translation or generated content translation.
- No translation of user-authored titles, prompts, provider names, model names, skill names, asset names, or error strings returned from external services.
- No adoption of a large i18n framework unless future locale pluralization/routing requirements justify it.

## Key Decisions

- Use an in-repo React context and dictionary because the current scope is frontend-only and does not need locale-aware routing.
- Persist locale in `localStorage` so switching remains project-independent and does not require backend schema changes.
- Keep English as the fallback language so untranslated future keys fail safely.

---

## Completion Notes

- Workbench topbar now exposes an `EN` / `中文` switcher and persists the selected locale in `localStorage`.
- Core workbench chrome, save status, queue labels, generation panels, editor export panels, and settings center static copy use the shared frontend i18n layer.
- Provider/model names, project content, skill names, asset labels, and backend/external error messages remain data and are not translated.
