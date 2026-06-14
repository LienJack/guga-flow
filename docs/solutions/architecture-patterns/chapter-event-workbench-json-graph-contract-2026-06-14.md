# Chapter Event Workbench JSON Graph Contract

Date: 2026-06-14
Scope: CEX-12

## Problem

Long-form novels need chapter-level editing and event extraction without introducing a new relational chapter table. Existing `NovelEventGraph` records already store chapter summaries and story events as JSON, and downstream ScriptDraft/storyboard import paths already trace by `eventId`.

## Pattern

Keep `NovelDocument.content` as the source of truth and derive chapters from headings on demand. Persist extraction state inside `NovelEventGraph.chaptersJson`:

- `eventState`: `pending`, `succeeded`, or `failed`
- `eventCount` and `eventIds`
- optional `errorReason`
- optional `extractedAt`

`StoryTimelineEvent` remains the downstream trace object. Events keep `chapterIndex`, `sourceExcerpt`, and stable IDs such as `chapter_2_event_1`. ScriptDraft beats store those IDs in `eventIds`; storyboard scenes and shots store them in `storyEventIds`; canvas import expands them to `storyEvents` on node data.

## Backend Flow

- Chapter list/detail endpoints parse the current novel content and merge in latest event graph state.
- Updating one chapter rewrites only that chapter body/title, creates a new graph snapshot, removes stale events for that chapter, and marks it `pending`.
- Whole-novel extraction targets all chapters by default.
- Single-chapter extraction reuses the same graph snapshot path with one target chapter.

## Frontend Flow

The existing Novel storyboard panel owns the workflow:

- source text controls remain the full-document path
- the Chapter event workbench shows per-chapter status and counts
- single-chapter save/extract actions update the local chapter list and latest graph

## Tradeoffs

This avoids a migration and keeps old graphs readable. The cost is that chapter identity is currently index-based, so major chapter reordering should be treated as a new graph snapshot with affected chapters returning to `pending`.
