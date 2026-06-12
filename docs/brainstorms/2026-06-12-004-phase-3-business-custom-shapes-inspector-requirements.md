---
date: 2026-06-12
topic: phase-3-business-custom-shapes-inspector
---

# Phase 3 Business Custom Shapes and Inspector Requirements

## Summary

Phase 3 will turn the generic tldraw canvas into a video-production canvas with project-scoped business nodes, custom node cards, and an Inspector that can view and edit node data. The module proves Hybrid Snapshot + Normalized Business Data by keeping tldraw visual state and `CanvasNode` business facts in sync without pulling in semantic edge binding, storyboard import, or generation jobs.

---

## Problem Frame

Phase 2 made the canvas visually durable, but it still behaves like a generic whiteboard. The PRD requires the canvas to become the primary production surface where novels, scenes, shots, characters, locations, images, videos, and editor packages are editable objects rather than loose drawings.

The immediate pain is that later phases cannot safely import storyboards, bind assets, compose prompts, or enqueue generation work until the project can create, select, edit, delete, and restore typed business nodes with durable normalized data. Phase 3 should establish that foundation while leaving relationship semantics and generation behavior to the modules that own them.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input — un-validated bets that should be reviewed before planning proceeds.*

- Phase 3 should be implemented as one Deep module unless planning reveals that the shared node CRUD layer and the frontend shape/inspector layer need separate review slices.
- The MVP business node set for this phase is the PRD Phase 3 list: NovelNode, SceneFrame, SceneNode, ShotNode, CharacterAssetNode, LocationAssetNode, ImageNode, VideoNode, and EditorPackageNode.
- `style_asset`, `prop_asset`, and `note` remain supported shared enum concepts but are not required as manually creatable Phase 3 node cards unless planning finds a low-cost shared implementation.
- Inspector forms should prioritize core editable business fields and persistence over later action tabs such as prompt debug, generation, version history, and job logs.
- Existing Phase 2 generic tldraw drawing can remain available, but the Phase 3 acceptance path should focus on business nodes created through the product toolbar.

---

## Actors

- A1. Creator: Manually creates, selects, edits, moves, resizes, copies, deletes, and reloads business nodes on the project canvas.
- A2. Inspector system: Reads the current selection, loads full business data for selected nodes, validates edits, saves updates, and reflects changes back into canvas card summaries.
- A3. Canvas data system: Keeps `CanvasDocument.snapshotJson` and normalized `CanvasNode` records aligned enough for later semantic-edge, storyboard, prompt, generation, and export modules.
- A4. Future production modules: Later phases that depend on typed business node records and stable geometry to create edges, imports, prompts, jobs, and exports.

---

## Key Flows

- F1. Manual business node creation
  - **Trigger:** A creator chooses a business node type from the canvas toolbar or equivalent creation surface.
  - **Actors:** A1, A3
  - **Steps:** The creator selects a type, a new business node appears on the canvas with a readable card, normalized node data is created for the project, and the save state settles after persistence.
  - **Outcome:** The project has both a visible custom shape and a corresponding business node record.
  - **Covered by:** R1, R2, R3, R4, R8

- F2. Select and edit node details
  - **Trigger:** A creator selects one business node.
  - **Actors:** A1, A2, A3
  - **Steps:** The Inspector switches to the selected node type, loads the full node data, the creator edits supported fields, the system saves the business record, and the canvas card summary updates.
  - **Outcome:** The edited business fact persists and remains visible after reload.
  - **Covered by:** R5, R6, R7, R9, R10, R14

- F3. Move, resize, copy, and restore a business node
  - **Trigger:** A creator manipulates a business node through normal canvas interactions.
  - **Actors:** A1, A3
  - **Steps:** The visual shape changes, normalized geometry stays aligned with the business node, autosave runs, and a refresh restores both the card and geometry.
  - **Outcome:** Business nodes behave like durable canvas objects, not static database rows.
  - **Covered by:** R4, R8, R9, R13

- F4. Delete a business node
  - **Trigger:** A creator deletes a selected business node.
  - **Actors:** A1, A2, A3
  - **Steps:** The system removes the tldraw shape and normalized business node, clears or updates Inspector selection, preserves unrelated assets, and leaves later edge cleanup semantics ready for Phase 4.
  - **Outcome:** Reloading the project does not bring back the deleted node.
  - **Covered by:** R11, R12, R13

- F5. Multi-selection and non-business selection
  - **Trigger:** A creator selects multiple objects, a generic tldraw object, or no object.
  - **Actors:** A1, A2
  - **Steps:** The Inspector shows the appropriate empty, multi-selection, or unsupported-selection state rather than a stale node form.
  - **Outcome:** The creator can understand what is selected and is not shown editable business fields for the wrong object.
  - **Covered by:** R5, R15

---

## Requirements

**Business node creation and cards**
- R1. The canvas must provide a manual creation path for each Phase 3 MVP business node type: NovelNode, SceneFrame, SceneNode, ShotNode, CharacterAssetNode, LocationAssetNode, ImageNode, VideoNode, and EditorPackageNode.
- R2. Each created business node must have a corresponding normalized `CanvasNode` business record scoped to the current project and canvas document.
- R3. Each business node must render as a recognizable production card with a type signal, title or primary label, status, and a compact preview or summary appropriate to its type.
- R4. Business node cards must support baseline canvas interactions needed for MVP editing: select, drag, resize where supported by the card, duplicate or copy through normal canvas affordances, and delete.

**Inspector behavior**
- R5. The Inspector must switch by selection state: no selection, single business node, multiple selection, selected business edge when present, and unsupported generic tldraw object.
- R6. Selecting a single business node must show a type-appropriate form for its core fields rather than a generic raw JSON editor as the primary path.
- R7. The Inspector must support editing `title`, `status`, and core `dataJson` fields for business nodes where those fields are meaningful.
- R8. Inspector edits must persist to the normalized business node record and update the visible card summary so the creator sees the edit on the canvas.
- R9. Business field persistence must not depend only on the tldraw snapshot; refreshing the page must restore edited business data from normalized records.

**Hybrid synchronization**
- R10. The system must keep visual shape summaries and normalized node facts aligned after supported Inspector edits.
- R11. Deleting a business node must delete both the visible tldraw shape and the normalized `CanvasNode`; unrelated project assets and generated media records must not be deleted automatically.
- R12. Node deletion must be safe for later semantic edges by either removing already-known connected edge records or clearly preserving Phase 4 cleanup as a deferred behavior with no stale UI claim.
- R13. Node geometry changes from canvas movement or resize must be reflected in the normalized business node geometry closely enough that a reload can restore the node in the expected place.

**Node data coverage**
- R14. ShotNode must include editable production fields sufficient to prove the Phase 3 Inspector path, including visual description, action, camera movement, duration, and prompt-related text fields where already in scope.
- R15. CharacterAssetNode and LocationAssetNode must include editable consistency fields sufficient for later prompt and asset-binding phases, including name, description or appearance, prompt text, reference asset identifiers, and lock state where applicable.
- R16. NovelNode, SceneFrame, SceneNode, ImageNode, VideoNode, and EditorPackageNode must expose enough type-specific fields to prove their business identity, persistence, and card summary behavior.

**Failure and verification**
- R17. Business node creation, edit, geometry sync, and delete failures must surface as visible save or form errors and must not be reported as saved.
- R18. Verification must cover creating every MVP business node type, editing at least ShotNode visual description, refreshing without data loss, deleting a business node, and preserving the existing asset library alongside the Inspector.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R18.** Given a project canvas is open, when the creator manually creates each Phase 3 MVP business node type, each node appears with a recognizable custom card and a corresponding business node record.
- AE2. **Covers R5, R6, R7, R8.** Given a ShotNode is selected, when the creator edits its visual description in the Inspector, the change is saved and the ShotNode card reflects the updated summary.
- AE3. **Covers R9, R13, R14.** Given a ShotNode visual description and geometry have been changed, when the page refreshes, the ShotNode reappears in the expected place and the edited visual description remains available in the Inspector.
- AE4. **Covers R11, R12.** Given a business node is selected, when the creator deletes it, the visible shape and normalized node record are removed, and refreshing the page does not restore it.
- AE5. **Covers R5, R15.** Given multiple objects are selected, when the Inspector opens, it shows a multi-selection state rather than stale fields from the last selected node.
- AE6. **Covers R18.** Given the project has uploaded assets, when the creator uses the Phase 3 Inspector, the existing asset library remains available and asset preview behavior still works.

---

## Success Criteria

- A creator can manually create, inspect, edit, move, resize, duplicate, delete, and reload MVP business nodes without losing normalized business data.
- The canvas visually communicates node type and status well enough that later modules can build on it without replacing the card system.
- The Inspector gives a stable type-aware editing framework for later prompt, generation, version, and edge panels.
- Downstream planning can implement Phase 3 without inventing product behavior or pulling in Phase 4+ relationship and generation scope.

---

## Scope Boundaries

- Semantic CanvasEdge creation, tldraw arrows, bindings, and asset drag/drop binding belong to Phase 4.
- NovelDocument creation, upload, and storyboard JSON generation belong to Phase 5.
- Storyboard import, automatic layout, duplicate import policy, and bulk node creation belong to Phase 6.
- Prompt composer behavior, prompt debug parts, and provider parameter composition belong to Phase 7.
- GenerationJob creation, worker execution, image/video generation, retry, and job logs belong to Phase 8+.
- Real image/video provider adapters, provider configuration UI, remote media download, and provider polling are outside Phase 3.
- Editor package zip export and local editor handoff are outside Phase 3.
- Large-canvas 300-node and 1000-node performance targets are not hard acceptance gates for Phase 3, though card summaries and Inspector data loading should not obviously block them.

---

## Key Decisions

- Keep Phase 3 Canvas-first: business nodes must be visible, selectable canvas objects, not only records editable in a side form.
- Keep Hybrid Snapshot + Normalized Business Data: tldraw restores visual state, while `CanvasNode` records own business facts used by later phases.
- Prefer type-aware Inspector forms over raw JSON editing because creators need production concepts such as shot description, character appearance, and location prompt.
- Keep generation and semantic binding controls disabled, hidden, or read-only in this module so the node foundation can land before provider and edge behavior exists.
- Preserve Phase 1 asset library and Phase 2 canvas save-status behavior while replacing the old static Inspector content with selection-aware business editing.

---

## Dependencies / Assumptions

- Phase 2 canvas snapshot load/save, autosave, and save-status behavior exist and remain the visual persistence substrate.
- The repository already has shared canvas node types and Prisma `CanvasNode` persistence primitives, but Phase 3 must add the missing business-node creation, update, delete, selection, and Inspector behavior.
- Current tldraw custom shape APIs and selection APIs should be verified from installed package types or official docs during planning.
- The local shell may still warn about Node 22 versus the project Node 26.3.0 target; implementation should keep the current architecture and upgrade runtime rather than downgrading framework choices.

---

## Outstanding Questions

### Resolve Before Planning

- None.

### Deferred to Planning

- [Affects R1, R3][Needs research] Which current tldraw custom shape registration approach best fits React 19 and the installed tldraw version?
- [Affects R2, R8, R11][Technical] What API shape should the backend expose for business node create, update, geometry sync, and delete while preserving the existing canvas load envelope?
- [Affects R6, R14, R15, R16][Technical] What is the smallest set of per-node form fields that proves each node type without overbuilding future phase tabs?
- [Affects R13][Technical] Should geometry sync happen on every user move debounce, on explicit save checkpoints, or as part of snapshot autosave batching?
