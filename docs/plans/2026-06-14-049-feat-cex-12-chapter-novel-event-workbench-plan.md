# CEX-12 Chapter Novel Event Workbench Plan

Date: 2026-06-14
Status: completed

## Goal

Make long-form novel sources chapter-addressable across shared contracts, backend APIs, and the existing Novel storyboard panel.

## Implementation Units

### U1 Shared Contracts

- Extend `NovelChapterSummary` with event extraction state, event count, event IDs, optional failure reason, and extraction timestamp.
- Add chapter detail/update/extraction result types.
- Keep event metadata compatible with existing `StoryTimelineEvent` and storyboard import trace data.

### U2 Backend API

- Add endpoints for chapter list, chapter detail, chapter update, batch extraction, and single-chapter extraction.
- Reuse existing chapter parsing and JSON-backed `NovelEventGraph` storage.
- Preserve existing full-novel extraction behavior while adding chapter-level state.
- Add service coverage for chapter update, chapter extraction failure state, and traceability through ScriptDraft/Storyboard.

### U3 Frontend Workbench

- Add API client helpers and request tests for chapter endpoints.
- Upgrade the existing EventGraph summary into a chapter event workbench inside `NovelStoryboardPanel`.
- Render per-chapter state, event counts, failure reasons, and source excerpts without requiring a new page.

### U4 Verification

- Run targeted backend/frontend/shared tests.
- Run full lint/test/build checks used by prior CEX modules.
- Commit this module once green.

## Scope Boundaries

- Do not alter unrelated canvas import behavior.
- Do not edit user-owned `apps/frontend/src/app/globals.css` changes.
- Do not stage original reference documents.
