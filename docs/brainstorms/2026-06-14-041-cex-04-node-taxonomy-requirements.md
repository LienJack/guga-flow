---
title: "CEX-04 Multimodal Node Taxonomy Requirements"
type: requirements
status: completed
date: 2026-06-14
source: docs/codex-reference-long-task-execution-checklist.md#cex-04
---

# CEX-04 Multimodal Node Taxonomy Requirements

## Context

CEX-04 implements the typed foundation from ACP-01. guga-flow already has story/shot/media canvas node types, semantic edges, and tldraw business shapes, but it lacks a shared node registry that explains each node's family and multimodal capabilities.

AI-CanvasPro validates the value of clear source media, AI generation, media operation, helper, and advanced visual node families. guga-flow should borrow that product idea without copying node classes, renderer code, styles, or desktop-specific implementation.

## Requirements

- R1. Shared types must define guga-flow node families: `business`, `source_media`, `ai_generation`, `media_operation`, `layout_helper`, and `advanced_visual`.
- R2. Shared types must define capability tags for text/image/video/audio acceptance, asset/text production, preview visibility, and task-backed work.
- R3. Every existing `CanvasNodeType` must have a registry entry with family, label, description, and capabilities.
- R4. Existing business node definitions must expose registry metadata without changing persisted canvas node records.
- R5. The node creation toolbar must group entries by node family instead of rendering one flat list.
- R6. Node cards or inspector chrome must surface the node family/capability status enough for users to understand what kind of node they are looking at.

## Scope Boundaries

- Do not add drag-and-drop file import, Asset creation from files, or source media node ingestion; that belongs to CEX-05.
- Do not add input slots, port validation, or connection limits; that belongs to CEX-06.
- Do not implement AI text/audio/video generation nodes beyond classifying the existing image/video nodes as task-backed AI generation outputs.
- Do not copy AI-CanvasPro node classes, renderer code, styles, prompt text, or desktop IPC behavior.
- Do not change backend persistence shape unless the registry requires a type-only contract.

## Acceptance Examples

- AE1. A shared-types test can assert every `CANVAS_NODE_TYPES` item has exactly one registry entry and no unknown family/capability values.
- AE2. A frontend data test can assert each Phase 3 business node definition carries family/capabilities from the shared registry.
- AE3. A toolbar render test can see family group headings such as Business, AI Generation, Media Operation, and Layout / Helper.
- AE4. A node card render test can see family metadata for an image/video/export node without exposing provider secrets or local paths.
