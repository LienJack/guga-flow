---
title: feat: Add multilingual UI foundation
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-032-tf-18-multilingual-ui-requirements.md
---

# feat: Add multilingual UI foundation

## Summary

Implement TF-18 with a lightweight frontend i18n layer, persisted `en`/`zh` switching in the workbench shell, and localized copy for core canvas generation, editor export, save/queue chrome, and settings center controls.

## Requirements

- R1. Shared frontend i18n provider and translation helper with `en` and `zh` locales.
- R2. Workbench topbar language switcher persists locale in local storage.
- R3. Core canvas generation, batch generation, save status, queue, and editor export labels/actions use i18n.
- R4. Settings center static headings, module labels, summaries, export/import controls, file facts, and version labels use i18n.
- R5. Dictionaries hold product UI copy only, not provider logic or project/user content.

## Implementation Units

- U1. **Frontend i18n primitives**
  - **Files:** `apps/frontend/src/lib/i18n.tsx`, i18n tests
  - **Approach:** Add locale types, translation dictionaries, pure `translate` helper, React provider, `useI18n` hook, and localStorage persistence.
  - **Verification:** Unit tests cover fallback behavior, Chinese lookup, and persisted initial locale.

- U2. **Workbench shell language switch and chrome**
  - **Files:** `apps/frontend/src/components/workbench-shell.tsx`, `apps/frontend/src/components/workbench-shell.test.tsx`, `apps/frontend/src/components/canvas/canvas-save-status.tsx`, CSS
  - **Approach:** Wrap workbench content in the provider, add an accessible language switcher, and localize nav, toolbar, save, queue, default inspector, and placeholder text.
  - **Verification:** Workbench tests prove default English still renders and Chinese switcher labels are present.

- U3. **Canvas generation/export and settings center copy**
  - **Files:** generation actions, editor export actions, settings center component/tests
  - **Approach:** Replace stable static workflow strings with `t(...)`, keep provider/model/user content untouched, and map backend module ids to localized frontend labels/summaries.
  - **Verification:** Existing frontend tests continue to pass in English; new coverage proves Chinese labels are available through the provider.

- U4. **Docs and final verification**
  - **Files:** `docs/development.md`, architecture note, requirements doc, this plan
  - **Approach:** Document the lightweight i18n boundary and language-pack rules.
  - **Verification:** Frontend test/lint, full build/test/format/mock workflow, browser smoke on canvas/settings.

---

## Completion Log

- U1 added the shared frontend i18n provider, locale persistence helper, translator, and unit tests.
- U2 wired the workbench shell, language switcher, save status, queue, and core chrome into the i18n layer.
- U3 localized generation, batch generation, editor export, and settings center static copy while keeping provider/project data untouched.
- U4 documented the lightweight i18n boundary and verified the feature.

## Verification Log

- `pnpm --filter @guga-flow/frontend test -- src/lib/i18n.test.tsx src/components/workbench-shell.test.tsx src/components/canvas/generation-actions.test.tsx src/components/canvas/editor-export-actions.test.tsx src/components/projects/settings-center.test.tsx`
- `pnpm --filter @guga-flow/frontend lint`
- `pnpm run build`
- `pnpm run test`
- `pnpm run format:check`
- `pnpm run mock:workflow`
- `git diff --check`
- Browser smoke at `http://localhost:3001/projects/project_1/canvas`: language switcher toggled English to Chinese and localized workbench/queue chrome.
- Browser smoke at `http://localhost:3001/projects/project_1/settings`: Chinese locale persisted and localized settings shell/provider sections; backend was not running, so data/files/version sections were covered by unit tests with initial summary data.
