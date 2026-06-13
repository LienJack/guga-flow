---
date: 2026-06-13
topic: tf-17-settings-center-integration
status: completed
---

# TF-17 Settings Center Integration Requirements

## Summary

Integrate the existing project settings capabilities into a coherent settings center with module navigation, safe project summary/export metadata, import validation, file/storage overview, and version/build information.

## Problem Frame

Provider management, programmable providers, skill templates, project generation settings, asset/file information, and health/version details exist in separate surfaces or backend internals. Users should not need `.env` knowledge or manual DB inspection to understand common project configuration.

## Scope Decision

This TF-17 slice is a settings-center v1. It adds safe summary/export/import-validation surfaces and a grouped UI shell. It does not implement destructive full database restore, arbitrary file browsing, or secret export.

## Actors

- A1. Project admin: reviews and edits common project configuration.
- A2. Settings center: groups existing and new settings modules without leaking secrets.
- A3. Backend settings summary/export API: exposes project operational metadata and safe export payloads.

## Key Flows

- F1. Settings overview
  - **Trigger:** Admin opens `/projects/:projectId/settings`.
  - **Steps:** The page renders grouped modules for providers/models, prompts/skills, project defaults, data operations, files, and version information.
  - **Outcome:** The admin can understand what is configured and where to act.
  - **Covered by:** R1, R2

- F2. Safe export and import validation
  - **Trigger:** Admin opens the Data module.
  - **Steps:** The settings center shows a safe JSON export preview/download path and an import-validation control that checks payload shape without mutating project data.
  - **Outcome:** Configuration can be inspected or backed up without exposing credentials or running manual DB queries.
  - **Covered by:** R3, R4

- F3. File and version awareness
  - **Trigger:** Admin opens Files or Version modules.
  - **Steps:** The settings center displays asset counts/storage totals, asset type breakdown, service version metadata, and enabled module capabilities.
  - **Outcome:** Operational status is visible without shell access.
  - **Covered by:** R5, R6

## Requirements

- R1. The settings page must have a first-class information architecture with stable module anchors for Providers/Models, Prompts/Skills, Project Defaults, Data, Files, and Version.
- R2. Existing Provider and Skill Template panels must remain usable inside the new settings center and must not expose credential values.
- R3. Backend must expose a project settings summary with project metadata, resource counts, file/storage summary, module capability statuses, and version/build metadata.
- R4. Backend must expose a safe settings export payload and an import-validation endpoint that rejects invalid payloads without mutating the database.
- R5. The Files module must show asset counts, type breakdown, and known storage bytes using existing project Asset rows.
- R6. Version information must be visible from the settings center without requiring backend logs or shell commands.

## Acceptance Examples

- AE1. **Covers R1, R2.** Opening the settings page shows module navigation and still renders provider and skill controls.
- AE2. **Covers R3, R5, R6.** Given existing assets/nodes/providers, the summary response includes counts, file totals, and version metadata but no secret values.
- AE3. **Covers R4.** Given a valid settings export payload, import validation returns `valid: true`; given malformed JSON shape, it returns `valid: false` with issues and does not write to the database.
- AE4. **Covers R2, R4.** Settings export and UI output never include stored provider credentials.

## Scope Boundaries

- No full destructive database restore in this slice.
- No arbitrary filesystem browser or raw upload directory exposure.
- No provider credential export.
- No replacement of TF-09/TF-10/TF-13 internals; this integrates them.

## Key Decisions

- Use a backend-owned summary/export API for data that would otherwise require manual DB inspection.
- Treat import as validation-only until a restore/merge policy is explicitly designed.
- Keep module navigation as anchors and grouped panels so future settings modules can be added without route churn.

---

## Completion Notes

- `/projects/:projectId/settings` now renders a module-based settings center over Provider, Skill, Project Defaults, Data, Files, and Version sections.
- Backend settings routes expose summary, safe export, and validation-only import checks under `/api/v1/projects/:projectId/settings`.
- Safe exports include provider credential presence but never stored credential values.
- Full database restore and raw filesystem browsing remain out of scope for this v1 boundary.
