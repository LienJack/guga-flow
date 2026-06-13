# Script Draft To Storyboard Workbench

Date: 2026-06-13

## Context

TF-15 needed a scriptwriter workbench without replacing the canvas-first import path. Users should be able to create multiple script drafts from a novel, export one, and choose a draft to feed the existing storyboard editor/import workflow.

## Decision

Persist scripts as `ScriptDraft` rows tied to `NovelDocument`, with version, strategy, status, and JSON script content. Script generation is deterministic for the mock-first MVP:

- Use the latest `NovelEventGraph` when available.
- Preserve event ids and source excerpts on script beats.
- Fall back to source excerpts when no event graph exists.
- Convert a selected script draft into a regular `StoryboardDraft`.

The generated storyboard uses provider `local-script-workbench` and model `deterministic-script-v1`, then passes through the same shared `StoryboardResult` validation as LLM-generated drafts.

## Consequences

- Script drafts remain reviewable/versioned without adding canvas nodes prematurely.
- Canvas import stays unchanged and continues to consume ready `StoryboardDraft` records.
- Event graph provenance can survive script adaptation into storyboard scenes and shots.
- Rich screenplay editing, PDF/DOCX export, and LLM script generation can be layered later without changing the storyboard import contract.
