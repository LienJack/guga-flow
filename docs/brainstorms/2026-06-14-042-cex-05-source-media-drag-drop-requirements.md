---
title: "CEX-05 Source Media Drag Drop Requirements"
type: requirements
status: completed
date: 2026-06-14
source: docs/codex-reference-long-task-execution-checklist.md#cex-05
---

# CEX-05 Source Media Drag Drop Requirements

## Context

CEX-05 implements ACP-02 after the CEX-04 taxonomy registry. guga-flow already
has project-scoped Asset upload/storage and normalized CanvasNode records, but a
user cannot drop a text, image, video, or audio file directly onto the canvas and
get a durable source-media node.

The implementation must keep the Asset boundary intact: files are uploaded to
the backend and stored as Asset rows before any canvas node references them.

## Requirements

- R1. Shared canvas types define source media nodes for text, image, video, and
  audio as `source_media` family entries with matching capability tags.
- R2. Source node data records the Asset id, mime type, original filename, size,
  dimensions/duration when known, source/import method, and preview URL when
  available.
- R3. Canvas drag/drop accepts text, image, video, and audio files, uploads each
  file through the backend Asset API, then creates a source node at the drop
  position.
- R4. Duplicate files within one drop batch, unsupported files, and upload or
  node-create failures surface readable canvas errors.
- R5. Source media nodes render as normal canvas nodes with cards, shapes,
  navigator entries, and grouped toolbar affordances.
- R6. Source nodes can participate as upstream references without copying raw
  file bytes or local paths into browser-only state.

## Scope Boundaries

- Do not add a new persistence table or change `CanvasNodeRecord` schema.
- Do not implement remote URL import, local directory allow-listing, thumbnails,
  transcoding, or media probing beyond metadata already returned by Asset.
- Do not store raw dropped file bytes in node data or tldraw snapshots.
- Do not implement CEX-06 slot cardinality or provider-specific connection
  validation in this slice.

## Acceptance Examples

- AE1. Shared tests assert all four source node types have registry entries in
  the `source_media` family.
- AE2. Frontend data tests build source node defaults and source node create
  inputs from an uploaded Asset detail.
- AE3. Canvas drag/drop tests cover duplicate file rejection, unsupported file
  rejection, and upload-plus-create success.
- AE4. Backend canvas create validation accepts source node types and persists
  source node data like other canvas nodes.
