---
date: 2026-06-13
topic: tf-15-scriptwriter-workbench
status: completed
---

# TF-15 Scriptwriter Workbench Requirements

## Summary

Add a scriptwriter workbench slice that creates versioned script drafts from a novel, tracks adaptation strategy, exports a readable script, and can turn a chosen script draft into a storyboard draft for the existing canvas import path.

## Requirements

- R1. Persist multiple script drafts per NovelDocument with version and strategy metadata.
- R2. Generate deterministic script content from the novel and latest chapter event graph when present.
- R3. List script drafts for a selected novel.
- R4. Export a script draft as plain text.
- R5. Convert a chosen script draft into a valid StoryboardDraft.
- R6. Keep canvas import unchanged: users still import the resulting storyboard draft through the existing flow.
- R7. Add compact Novel panel controls for strategy, create script, export, and generate storyboard.

## Acceptance Examples

- AE1. Given a novel, creating scripts twice yields v1 and v2 drafts.
- AE2. Given a novel event graph, generated script beats reference event ids/source excerpts.
- AE3. Given a script draft, exporting returns readable scene/beat text.
- AE4. Given a script draft, generating storyboard creates a valid StoryboardDraft that can be imported by existing controls.

## Scope Boundaries

- No rich screenplay editor.
- No collaborative script comments.
- No PDF/DOCX export.
- No LLM script generation in this slice.

## Implementation Outcome

Completed in TF-15:

- Added shared script draft contracts and statuses.
- Added persisted `ScriptDraft` rows with per-novel versioning.
- Added deterministic script draft generation from the latest `NovelEventGraph` when present, with source fallback when absent.
- Added backend list/create/export/script-to-storyboard routes.
- Added compact Novel panel Script controls for strategy, draft creation, storyboard generation, and export.
- Kept canvas import unchanged by converting selected scripts into standard `StoryboardDraft` records.
