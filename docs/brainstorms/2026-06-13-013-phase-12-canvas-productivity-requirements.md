---
date: 2026-06-13
topic: phase-12-canvas-productivity
---

# Phase 12 Canvas Productivity Requirements

## Summary

Phase 12 makes the MVP canvas usable once storyboard import, generation, and editor export have created many nodes. A creator should be able to batch-create keyframe jobs from selected Shots, search and jump to relevant nodes, collapse SceneFrame cards into compact summaries, choose the preferred Image/Video result for a Shot, duplicate a node as a traceable variant, and use a few keyboard shortcuts without breaking native tldraw interactions.

## Problem Frame

Phases 0-11 complete the core novel-to-package loop, but large projects become hard to operate because the only navigation path is manual pan/zoom and one-node Inspector actions. The PRD calls out batch generation, search, MiniMap/Outline, SceneFrame collapse, NodeVersion/variant selection, canvas export, and shortcuts as the next productivity layer.

For this MVP completion pass, the priority is production flow over decorative UI. The module should add dense, workbench-native controls that improve repeated work and keep all durable choices in normalized canvas records.

## Actors

- A1. Creator: navigates a large canvas, batch queues jobs, chooses preferred generated media, and creates variants.
- A2. Backend: creates batch jobs, validates version-selection edges or data, and preserves append-only variant traceability.
- A3. Frontend workbench: exposes search/outline, collapse, selection, duplicate, and shortcut affordances without replacing tldraw.

## Key Flows

- F1. Batch Shot keyframe generation
  - Trigger: creator multi-selects Shot nodes and starts batch image generation.
  - Outcome: one `shot_to_image` job is queued per eligible Shot, skipped nodes are visible, and queue polling continues to refresh generated ImageNodes.

- F2. Search and outline navigation
  - Trigger: creator searches a title, character name, shot number, or node metadata.
  - Outcome: matching nodes are listed by type; choosing one selects/focuses it on the canvas.

- F3. SceneFrame collapse
  - Trigger: creator toggles collapse on a SceneFrame.
  - Outcome: `CanvasNode.dataJson.collapsed` persists, the SceneFrame card renders as a compact summary, and child nodes/edges are not deleted.

- F4. Preferred media selection
  - Trigger: creator selects a Shot that has generated ImageNode/VideoNode candidates.
  - Outcome: Inspector shows candidates and persists `selectedImageNodeId` / `selectedVideoNodeId` on the Shot.

- F5. Duplicate as variant
  - Trigger: creator duplicates a node from the Inspector.
  - Outcome: a new nearby node is created with copied data and a `derived_from` edge to the source.

- F6. Shortcuts and export affordance
  - Trigger: creator uses keyboard shortcuts or export controls.
  - Outcome: common actions such as search focus and fit-to-content are reachable from the keyboard; PNG export is added only if the installed tldraw API can be verified cheaply.

## Requirements

- R1. Multi-selected Shot nodes must be batch-queueable into `shot_to_image` jobs.
- R2. Batch image generation must report queued and skipped counts without creating invalid jobs.
- R3. Existing batch ImageNode to VideoNode generation must remain available and compatible with the new multi-selection UI.
- R4. Search must match node title, type, key business fields, and common media identifiers.
- R5. Search/outline selection must update the workbench selection and focus the canvas without mutating business data.
- R6. The outline/MiniMap substitute must expose SceneFrame, Shot, Character, Location, Image, Video, and Editor Package entries in a scannable sidebar panel.
- R7. SceneFrame collapse must persist in `CanvasNode.dataJson.collapsed`.
- R8. Collapsing a SceneFrame must not delete, detach, or hide normalized child nodes/edges from backend state.
- R9. Shot preferred Image/Video selection must persist on the Shot node and be visible in the Inspector.
- R10. Duplicate-as-variant must create a new node without deleting or overwriting the source.
- R11. Variant duplication must create a durable `derived_from` edge when supported by the canvas API.
- R12. Keyboard shortcuts must not intercept text-entry fields or break native tldraw shortcuts.
- R13. Canvas export PNG is desirable but may be deferred if the installed tldraw API cannot be verified within this module without unstable browser-only hacks.

## Acceptance Examples

- AE1. Covers R1-R3. Given six Shot nodes are selected, batch image generation creates six queued jobs; invalid non-Shot selections are skipped with reasons.
- AE2. Covers R4-R6. Searching a character name or shot number lists matching nodes, and choosing a result focuses/selects the node on the canvas.
- AE3. Covers R7-R8. Collapsing a SceneFrame persists after refresh and does not remove its Shots or semantic edges.
- AE4. Covers R9. A Shot with multiple generated Image/Video candidates can store and display selected Image/Video choices.
- AE5. Covers R10-R11. Duplicating a node as a variant creates a nearby copy and a `derived_from` edge.
- AE6. Covers R12. Pressing search/fit shortcuts works outside form fields and leaves normal typing alone.

## Success Criteria

- A 6-shot imported storyboard can batch queue keyframe generation from multi-selection.
- A creator can find and focus nodes by title or business metadata without manually panning.
- SceneFrame collapsed state and selected media choices survive refresh.
- Variant copies are traceable and do not overwrite source nodes.
- Existing Phase 8-11 generation/export controls still render and pass tests.

## Scope Boundaries

- In scope: batch Shot image jobs, search/outline panel, focus/select plumbing, SceneFrame collapsed state, preferred media selection, duplicate-as-variant, shortcut handling, docs, and tests.
- Out of scope: node virtualization, multiplayer, full timeline reorder UI, graphical minimap rendering if tldraw lacks a stable API path, full NodeVersion browser history, and destructive overwrite/import behaviors.

## Assumptions

- The existing `GenerationJob` queue can represent batch Shot image work as one child `shot_to_image` job per Shot.
- The existing `CanvasNode.dataJson` is acceptable for storing collapsed state and selected media ids for MVP.
- The Prisma `NodeVersion` table remains available for later richer history, but this module can satisfy preferred media selection through Shot data and graph edges.
- Existing tldraw `zoomToFit` and selection APIs are sufficient for search focus.
