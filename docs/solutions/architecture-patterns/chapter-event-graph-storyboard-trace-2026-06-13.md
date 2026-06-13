---
date: 2026-06-13
topic: chapter-event-graph-storyboard-trace
status: accepted
---

# Chapter Event Graph Storyboard Trace

## Context

The storyboard and canvas layers already understand story events, but long-form novels need event extraction before storyboard generation. The first version must be deterministic and local so it does not block the short-story MVP or require another provider.

## Decision

Store extracted chapter events as `NovelEventGraph` snapshots tied to a `NovelDocument`. Extraction splits source text by chapter headings and derives bounded `StoryTimelineEvent` records from paragraphs/sentences.

When a storyboard is generated for a novel with an event graph, the latest graph becomes the storyboard `storyBlueprint.timelineEvents`, and generated scenes/shots receive `storyEventIds` plus source excerpts. The existing import path then copies event traces into canvas node data.

## Consequences

- Long-form source trace is available without changing the storyboard schema.
- Event extraction can be tested deterministically and does not depend on embeddings or LLM calls.
- Shot prompt debug parts can reuse existing `story_event` handling.
- Future semantic extraction can replace the deterministic extractor while keeping the persisted graph and import contracts.

## Guardrails

- Event graphs are per novel and immutable snapshots; extraction creates a new graph record.
- Short-story generation still works when no graph exists.
- V1 does not visualize a graph on canvas; it shows counts and compact previews in the Novel panel.
