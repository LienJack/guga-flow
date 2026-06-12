---
date: 2026-06-12
topic: phase-2-tldraw-canvas-persistence
---

# Phase 2 tldraw Canvas Persistence Requirements

## Summary

Phase 2 will turn the project canvas page into a real tldraw workspace with project-scoped snapshot persistence, autosave, reload restore, and visible save states. The module proves that the canvas is now the primary persistent work surface while keeping business custom shapes and semantic production flows for later phases.

---

## Problem Frame

Phase 1 established projects and assets, but the central canvas surface is still a static placeholder. That blocks the PRD's Canvas-first product direction: users cannot yet draw, move, reload, or trust that the workbench remembers its visual state.

The immediate pain is not missing business node richness; it is the lack of a reliable infinite canvas substrate. Before importing storyboard data, binding assets, or generating media, the system needs to prove that a project can own a durable visual document and that users can see whether their changes are being saved.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input — un-validated bets that should be reviewed before planning proceeds.*

- Phase 2 should be implemented as one Deep feature module because tldraw frontend integration, backend persistence, autosave lifecycle, and browser verification are tightly coupled.
- The first persisted canvas should use built-in tldraw shapes and tools only; custom video-production shapes belong to Phase 3.
- The project canvas route should preserve the Phase 1 asset inspector/library experience while replacing only the placeholder canvas stage with the real editor.
- A project should have one active canvas document in MVP; multi-document canvases, branching, and CRDT collaboration are deferred.
- The browser verification can use small sample drawings rather than the later 300-node or 1000-node performance targets.

---

## Actors

- A1. Creator: Opens a project canvas, draws or edits visual content, reloads the page, and expects the canvas state to remain.
- A2. Canvas persistence system: Creates the project canvas document, loads snapshots, autosaves changes, reports save state, and retries failed saves.
- A3. Future canvas modules: Later phases that need a stable load contract for business nodes, edges, and assets without changing the Phase 2 foundation.

---

## Key Flows

- F1. First project canvas open
  - **Trigger:** A creator opens a project canvas that has no stored canvas document yet.
  - **Actors:** A1, A2
  - **Steps:** The page loads, the system creates or resolves an empty project-scoped canvas document, the editor initializes with an empty workspace, and the save state settles to a non-error state.
  - **Outcome:** The creator can immediately pan, zoom, select tools, and draw without manual setup.
  - **Covered by:** R1, R2, R3, R8

- F2. Draw, autosave, and restore
  - **Trigger:** A creator draws a built-in shape or text item and waits for autosave.
  - **Actors:** A1, A2
  - **Steps:** The editor records the change, debounce autosave runs, the save status moves through saving to saved, and a browser refresh reloads the same visual state.
  - **Outcome:** The created shape remains visible after reload.
  - **Covered by:** R3, R4, R5, R6, R7

- F3. Move, autosave, and restore position
  - **Trigger:** A creator moves an existing shape and waits for autosave.
  - **Actors:** A1, A2
  - **Steps:** The editor records the position change, autosave persists the new snapshot, and a browser refresh restores the shape at the moved position.
  - **Outcome:** The canvas proves persistence for editing, not only initial creation.
  - **Covered by:** R3, R4, R5, R7

- F4. Save failure and retry
  - **Trigger:** A snapshot save fails after a local canvas edit.
  - **Actors:** A1, A2
  - **Steps:** The local edit remains visible, the status changes to failed, the creator can retry, and a successful retry returns the status to saved.
  - **Outcome:** The creator is never misled into thinking a failed save succeeded, and recent local work is not silently discarded.
  - **Covered by:** R6, R7, R9

---

## Requirements

**Canvas workspace**
- R1. The project canvas page must embed an interactive tldraw canvas instead of the static placeholder stage.
- R2. Opening a project canvas with no existing canvas document must automatically create or resolve an empty project-scoped canvas document.
- R3. The canvas must support built-in pan, zoom, select, move, shape drawing, and text creation behaviors needed to verify the baseline infinite canvas workflow.
- R4. The editor must support restoring a previously saved visual snapshot before the creator begins editing after a page load.
- R5. The canvas should expose a fit-to-content path so saved content can be brought back into view during normal use or verification.

**Persistence and save state**
- R6. Canvas edits must trigger debounce autosave for the visual snapshot without requiring a manual save button for the happy path.
- R7. The UI must show clear save states for saving, saved, and failed save attempts.
- R8. Save failure must preserve the creator's current local canvas state and offer a retry path rather than silently discarding or hiding local edits.
- R9. The MVP persistence model for this phase is single-user and project-scoped; multiplayer, CRDT conflict handling, and multi-canvas branching are not part of Phase 2.

**Hybrid data boundary**
- R10. The canvas load contract must remain compatible with the PRD's Hybrid Snapshot + Normalized Business Data direction by returning the project canvas document and any already-known project-side canvas assets, nodes, or edges without requiring Phase 3 business editing.
- R11. Phase 2 must not store provider keys, browser secrets, or generation credentials in canvas snapshot data.
- R12. The implementation must preserve existing Phase 1 project and asset workflows on the canvas page.

**Verification**
- R13. Verification must cover first-open empty canvas creation, drawing a built-in shape or text item, refresh restore, moving a shape, refresh position restore, and visible save status changes.
- R14. Verification must cover a save-failure path where the creator sees the failed state and can retry without losing the visible local edit.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3.** Given a new project with no canvas document, when the creator opens the project canvas page, the page shows an interactive empty canvas and the creator can pan, zoom, select, and draw.
- AE2. **Covers R4, R6, R7, R13.** Given the creator draws a rectangle or text item, when autosave completes and the page refreshes, the item appears again and the save state returns to saved.
- AE3. **Covers R4, R6, R13.** Given a saved shape exists, when the creator moves it, waits for autosave, and refreshes, the shape appears at the moved position.
- AE4. **Covers R7, R8, R14.** Given the creator edits the canvas and the next snapshot save fails, when the failure occurs, the local edit remains visible, a failed state is shown, and retry can save the same visible edit.
- AE5. **Covers R10, R12.** Given a project already has Phase 1 assets, when the creator opens the canvas page, the asset library still works and the canvas load contract remains ready for later business node and edge data.

---

## Success Criteria

- A creator can use the project canvas as a durable visual workspace for generic tldraw shapes.
- The saved state is understandable enough that a creator can tell whether a change is safe to refresh.
- Downstream planning can implement Phase 2 without inventing product behavior or importing Phase 3+ business scope.
- Browser verification demonstrates persistence and failure handling in the running app.

---

## Scope Boundaries

- Business custom shapes, typed node forms, and inspector editing belong to Phase 3.
- Semantic arrows, bindings, and asset-to-shot references belong to Phase 4.
- Storyboard import, automatic layout, and duplicate import policy belong to Phase 6.
- AI provider calls, generation jobs, image/video creation, and media export are outside Phase 2.
- Multiplayer editing, CRDT conflict resolution, version history, and offline-first sync are outside Phase 2.
- Large-canvas performance guarantees for 300 or 1000 business nodes are not Phase 2 acceptance gates, though Phase 2 should avoid choices that obviously block them.

---

## Key Decisions

- Use tldraw as the MVP infinite canvas engine because the PRD and tech stack define it as the primary workbench surface.
- Persist visual state first, while preserving the normalized business data boundary, because later generation, export, and review phases need both reloadable visuals and queryable business facts.
- Make autosave visible instead of silent because failed persistence is a core user trust issue for a long-running creative workspace.
- Keep Phase 2 generic and single-user so the canvas substrate can land before custom production semantics multiply the state surface.

---

## Dependencies / Assumptions

- The repository already contains project-scoped canvas document, node, and edge persistence primitives from Phase 0.
- The current local runtime may warn about Node engine version; planning and implementation should upgrade the local Node runtime path rather than downgrading the project's Node target or dependency architecture.
- The exact current tldraw snapshot and persistence APIs must be verified from official documentation or package types during planning.
- Browser verification may require adding or extending frontend test tooling, but should stay aligned with the existing TypeScript monorepo.

---

## Outstanding Questions

### Resolve Before Planning

- None.

### Deferred to Planning

- [Affects R4, R6][Needs research] Which current tldraw APIs should be used for snapshot load, snapshot capture, and editor-store change subscriptions?
- [Affects R6][Technical] What debounce interval best matches PRD guidance while keeping tests deterministic?
- [Affects R8, R14][Technical] How should automated verification simulate a failed snapshot save without creating brittle production-only switches?
- [Affects R5][Technical] Should fit-to-content be exposed as a visible control, an initial-load behavior, or both for Phase 2?
