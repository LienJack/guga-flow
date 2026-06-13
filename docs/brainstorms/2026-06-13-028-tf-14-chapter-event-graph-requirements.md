---
date: 2026-06-13
topic: tf-14-chapter-event-graph
status: completed
---

# TF-14 Chapter Event Graph Requirements

## Summary

Add a long-form novel event extraction layer that splits novel content into chapters, derives deterministic timeline events, persists the graph, and uses it to trace generated/imported Shots back to chapter events and source excerpts.

## Problem Frame

The storyboard schema already supports `storyBlueprint.timelineEvents`, scene/shot `storyEventIds`, and imported Shot `storyEvents`. What is missing for TF-14 is a first-class event graph extracted from novel chapters before storyboard generation. Without it, long-form source traceability depends on provider output alone.

## Requirements

- R1. Extract chapters from pasted/imported novel content using deterministic heading and fallback rules.
- R2. Create bounded timeline events per chapter with event id, chapter index, source excerpt, summary, conflict/result hints, and order.
- R3. Persist extracted chapter summaries and events per NovelDocument.
- R4. Expose backend APIs to extract and fetch a novel event graph.
- R5. Use the latest event graph during storyboard generation so scenes and shots reference extracted event ids.
- R6. Preserve event source excerpts on imported Shot data through the existing storyboard import path.
- R7. Add frontend API/UI controls in the Novel panel to extract and review event graph counts.
- R8. Keep extraction deterministic and local; no LLM/vector dependency in this slice.

## Acceptance Examples

- AE1. Given a long novel with chapter headings, extracting events returns chapter summaries and timeline events with matching `chapterIndex`.
- AE2. Given an extracted graph, generating a storyboard creates a draft whose scenes/shots reference graph event ids.
- AE3. Given that draft is imported, Shot node data includes `storyEvents` with the event source excerpt.
- AE4. Given a novel without headings, extraction creates one fallback chapter with bounded events.

## Scope Boundaries

- No semantic event clustering, embeddings, or LLM event extraction.
- No separate graph visualization UI; the first UI shows counts and compact rows.
- No blocking of short-story storyboard generation when no event graph exists.
- No cross-novel event graph merge.

## Key Decisions

- Persist event graphs as JSON snapshots tied to a NovelDocument.
- Use deterministic heading/paragraph/sentence heuristics for v1.
- Reuse existing `StoryTimelineEvent` and storyboard import trace fields.
