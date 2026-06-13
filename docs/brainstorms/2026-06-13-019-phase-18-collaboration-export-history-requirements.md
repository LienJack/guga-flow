---
date: 2026-06-13
topic: phase-18-collaboration-export-history
---

# Phase 18 Collaboration, Export Presets, and History Requirements

## Summary

Phase 18 covers XQ-13 and XQ-14 with an MVP-safe collaboration path, export presets, and editable history. The shipped slice keeps the app single-user/local-first, records a collaboration evolution decision, writes export presets into jobs and timeline manifests, and lets creators queue a revision from a matched historical export.

## Requirements

- R1. The product has a documented single-user to collaboration evolution decision.
- R2. Editor export creation accepts an export preset for standard ZIP, GIF preview, image sequence, and HD 1080p requests.
- R3. Export presets are written into `EditorExportJobInput`, `TimelineManifest`, timeline metadata, and EditorPackageNode data.
- R4. Export history matching includes selected VideoNodes, sort mode, and export preset.
- R5. A creator can queue a revision from a matched historical export, preserving `sourceEditorExportId`.
- R6. Worker package output validates against the job preset before completing an editor export.
- R7. Existing editor export calls without a preset default to `standard_zip`.
- R8. The implementation does not introduce realtime collaboration infrastructure or non-ZIP binary rendering in this phase.

## Acceptance Examples

- AE1. Given selected VideoNodes and preset `hd_1080p`, when an editor export is queued, the created job input and timeline metadata include `hd_1080p`.
- AE2. Given a completed HD export and current preset `standard_zip`, the UI does not reuse the HD export for the standard ZIP selection.
- AE3. Given a completed matching export, when a creator queues a revision, the new export job includes the completed export ID as `sourceEditorExportId`.
- AE4. Given a worker package whose timeline preset differs from the job preset, completion is rejected before package state is persisted.

## Scope Boundaries

- Do not build realtime multiplayer editing.
- Do not build server-side GIF/image sequence/HD renderers; presets are manifest requests for downstream editor/render tooling.
- Do not change the editor package ZIP format.
- Do not add account, team, invitation, or permission models.
- Do not migrate existing editor exports; missing preset metadata is treated as `standard_zip` in readers.

## Key Decisions

- Store presets in existing JSON payloads rather than adding database columns.
- Keep revision history lightweight with `sourceEditorExportId` instead of a new history table.
- Treat GIF/image/HD as explicit export intents in the manifest until dedicated renderers exist.
- Preserve the existing single-user canvas save model and document the collaboration path separately.
