# CEX-12 Chapter Novel Event Workbench Requirements

Date: 2026-06-14
Status: completed

## Source

- Checklist item: CEX-12
- Reference module: TFR-11
- Scope: `apps/backend/src/novels/*`, `packages/shared-types/src/domain/novel-events.ts`, `apps/frontend/src/components/novels/*`

## Product Need

Long-form novel sources need to become chapter-addressable before they can reliably feed event extraction, ScriptDraft generation, and storyboard/shot traceability. The current system can split chapters during whole-novel event extraction, but chapters are not independently visible or editable, and extraction state is not visible at the chapter level.

## Required Outcomes

- Users can view a long novel as a chapter list derived from headings or fallback single-chapter parsing.
- Users can inspect and update a chapter without manually editing the entire document.
- Users can extract events for one chapter or all chapters.
- Each chapter exposes an extraction state, event count, and any failure reason.
- ScriptDraft beats and storyboard shots continue to trace back to event IDs, with event metadata carrying `chapterIndex` and source excerpts.

## Non-Goals

- No full automatic 100k-word video production pipeline.
- No replacement for the lightweight paste-to-storyboard path.
- No database migration unless JSON storage proves insufficient.

## Acceptance Gates

- Long novels can be viewed, updated, and extracted by chapter.
- Each chapter event extraction success/failure state is visible.
- Shot or ScriptDraft output can trace back to chapter events.
