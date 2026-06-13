---
title: "Model Reference Image Story Generation as Seed Provenance"
date: 2026-06-13
category: architecture-patterns
module: phase-16-reference-image-story-generation
problem_type: architecture_pattern
component: storyboard
severity: medium
applies_when:
  - "Using image Assets or ImageNodes as story-generation seeds"
  - "Preserving reference image provenance through storyboard import"
  - "Connecting upstream generated media to a new Novel node"
related_components:
  - creative_agent_entry
  - storyboard_schema
  - canvas_import
  - semantic_edges
  - mock_llm_provider
tags:
  - reference-image
  - story-seed
  - storyboard-import
  - provenance
---

# Model Reference Image Story Generation as Seed Provenance

## Context

Phase 16 lets creators use an uploaded image Asset or an existing canvas ImageNode as the seed for a creative storyboard draft. The seed must influence mock storyboard generation, remain editable inside the draft, and survive canvas import as explicit graph provenance.

## Guidance

Resolve reference ImageNodes server-side before creating the creative storyboard job. ImageNode seeds should be project-owned `image` nodes with an attached image Asset; direct Asset seeds should also be project-owned image Assets. Reject invalid references before creating `NovelDocument`, `StoryboardDraft`, or `GenerationJob` side effects.

Store seed metadata in the storyboard result as `storySeedReferences`, then propagate reference Asset IDs into imported Character, Location, and Shot node data. When a seed came from an existing ImageNode, create a `story_seed` edge from that ImageNode to the imported Novel node during storyboard import.

Keep uploaded Asset seeds and ImageNode seeds distinct. Uploaded Assets are enough to anchor prompt/reference data; existing ImageNodes additionally carry canvas lineage and deserve a semantic edge.

## Why This Matters

Reference-image generation can otherwise disappear into prompt text. Durable seed provenance lets later prompt composition, inspection, and export flows explain which image anchored a story draft. It also preserves the canvas-first model: a creator can inspect a visible ImageNode-to-Novel relationship after import instead of hunting through hidden job payloads.

## When to Apply

- Adding new seed types such as video, character sheets, or style boards.
- Adding real image-understanding providers while keeping validation backend-owned.
- Extending import provenance for externally sourced story material.
- Reviewing semantic edge additions that connect generated planning artifacts.

## Related

- [Model Lightweight Agent Entry as a Backend-Completed Generation Job](./light-agent-entry-generation-job-boundary-2026-06-13.md)
- [Storyboard Import Layout Provenance](./storyboard-import-layout-provenance-2026-06-12.md)
- [Semantic canvas edge projection lifecycle](./semantic-canvas-edge-projection-lifecycle-2026-06-12.md)
