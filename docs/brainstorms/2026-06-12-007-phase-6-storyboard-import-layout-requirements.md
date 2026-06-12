---
date: 2026-06-12
topic: phase-6-storyboard-import-layout
---

# Phase 6 Storyboard Import and Auto Layout Requirements

## Summary

Phase 6 will let creators import a validated, ready storyboard draft into the infinite canvas as durable Novel, SceneFrame, Scene, Shot, Character, Location, and semantic edge records, with deterministic non-overlapping layout and a mock-first one-click workflow.

---

## Problem Frame

Phase 5 now produces a reloadable, validated storyboard draft, but the canvas still has to be assembled by hand. That leaves the product short of the PRD's first end-to-end story path: source text becomes an editable storyboard, then becomes a structured visual production board.

The immediate pain is not prompt composition or media generation. It is converting the ready storyboard artifact into durable canvas graph state without losing project scoping, validation guarantees, or the business-node/semantic-edge architecture already established in earlier modules.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input — un-validated bets that should be reviewed before planning proceeds.*

- Phase 6 should remain one Deep module because it crosses shared contracts, backend batch graph mutation, deterministic layout, frontend workflow, and browser/API smoke verification.
- The import action should consume the latest selected ready draft rather than accepting arbitrary storyboard JSON from the browser.
- MVP duplicate handling should default to creating a new imported version and never overwrite existing storyboard-derived nodes.
- Character and Location deduplication should happen within a single import batch and can also reuse matching existing asset nodes when the same project already has the same named asset semantics.
- Imported semantic edges should update Shot reference data the same way manual Character/Location binding does.
- The frontend should fit the canvas to imported content after successful import, but exact camera persistence can remain owned by the existing tldraw snapshot autosave loop.

---

## Actors

- A1. Creator: Reviews a ready storyboard draft, imports it into the canvas, and confirms intentional new-version imports when prior storyboard content exists.
- A2. Storyboard import system: Validates readiness, maps temporary storyboard ids to canvas node ids, creates graph records, applies layout, and reports import results.
- A3. Canvas graph system: Persists business nodes and semantic edges independently from tldraw visual projections.
- A4. Future prompt/generation modules: Consume imported Shot prompt fields and Character/Location semantic references in later phases.

---

## Key Flows

- F1. Import a ready storyboard draft
  - **Trigger:** A creator clicks import after a draft is marked ready.
  - **Actors:** A1, A2, A3
  - **Steps:** The system confirms the selected draft is still valid and ready, creates the storyboard-derived business nodes, creates required semantic edges, lays out the imported board, and refreshes the canvas view.
  - **Outcome:** The canvas contains a structured production board that can be inspected, moved, refreshed, and saved.
  - **Covered by:** R1, R2, R3, R4, R5, R6, R7

- F2. Handle repeated imports
  - **Trigger:** A creator imports when storyboard-derived canvas nodes already exist in the project.
  - **Actors:** A1, A2, A3
  - **Steps:** The UI makes the repeated-import state visible; the creator can continue with the MVP default new-version import or cancel; the system appends a new import batch without deleting or overwriting earlier nodes.
  - **Outcome:** Existing canvas work is preserved and the new import is distinguishable.
  - **Covered by:** R8, R9, R10, R14

- F3. Reject unsafe imports
  - **Trigger:** A creator tries to import a missing, invalid, non-ready, or cross-project draft.
  - **Actors:** A1, A2
  - **Steps:** The system refuses the import, explains the issue, and leaves existing canvas nodes, edges, and draft state unchanged.
  - **Outcome:** Invalid storyboard state cannot become canvas graph state.
  - **Covered by:** R1, R11, R12, R14

- F4. Reload imported graph state
  - **Trigger:** A creator refreshes the project after import.
  - **Actors:** A1, A3
  - **Steps:** The canvas loads persisted nodes and edges, restores business node shapes, restores semantic arrow projections, and keeps imported Shot references available to the Inspector.
  - **Outcome:** Imported graph data remains durable across browser refresh.
  - **Covered by:** R6, R7, R13, R14

---

## Requirements

**Import gating and lifecycle**
- R1. Only a project-scoped, valid, ready storyboard draft may be imported.
- R2. A creator must be able to import the selected ready storyboard draft into the canvas with one primary action from the storyboard workflow.
- R3. Import must create at least one Novel node, one SceneFrame per scene, one Scene node per scene, one Shot node per shot, Character asset nodes, and Location asset nodes.
- R4. Imported node data must preserve the downstream fields from the storyboard: Shot image prompt, video prompt, duration, character references, location reference, visual/action/camera fields, and scene/story metadata.
- R5. The import result must expose enough summary information for the UI to confirm how many nodes, edges, scenes, shots, characters, and locations were imported.

**Layout and graph semantics**
- R6. Imported nodes must use deterministic non-overlapping layout for at least two scenes and six shots, with the Novel source, assets, scene frames, scene cards, and shot cards arranged as readable canvas regions.
- R7. Import must create semantic edges connecting Shots to referenced Characters and Locations, and connecting Shots to their Scene membership.
- R8. Character and Location assets must not be duplicated unnecessarily within an import batch; repeated references to the same temporary asset must resolve to the same canvas node.
- R9. Reusing existing project Character/Location asset nodes is allowed when name and role/type semantics match; if a match is reused, semantic edges must target the reused node.

**Repeated import policy**
- R10. If no storyboard-derived canvas content exists, import proceeds directly.
- R11. If storyboard-derived content already exists, the UI must make that state visible and allow the creator to continue with a new version or cancel.
- R12. MVP repeated import must default to a new version and must not overwrite, delete, or move existing imported nodes.
- R13. Imported nodes and edges must carry import provenance that distinguishes one import batch from another.

**Safety, persistence, and UX**
- R14. Invalid, missing, non-ready, or cross-project drafts must be rejected without partial canvas mutation.
- R15. After successful import, the frontend must refresh the canvas graph, restore tldraw projections, and fit the view to the imported content.
- R16. Refreshing the project after import must preserve node positions, node data, and semantic edges.
- R17. Existing manual node creation, manual semantic binding, Inspector editing, asset library, and Phase 5 draft editing behavior must remain available.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R5.** Given a project has a ready storyboard draft with two scenes and six shots, when the creator imports it, the result reports a successful import with the expected Novel, SceneFrame, Scene, Shot, Character, Location, and edge counts.
- AE2. **Covers R4, R7, R8, R9.** Given several shots reference the same character and location temp ids, when the storyboard is imported, those shots reference the same Character/Location canvas nodes and semantic edges connect the imported graph without duplicate asset nodes for the same temp ids.
- AE3. **Covers R6, R15.** Given a storyboard with two scenes and six shots, when import completes, the visible canvas lays out the imported regions without overlapping node rectangles and fits the viewport to the imported content.
- AE4. **Covers R10, R11, R12, R13.** Given storyboard-derived nodes already exist, when the creator starts another import, the UI exposes the repeated-import state; continuing creates a new import batch and leaves earlier nodes and edges intact.
- AE5. **Covers R14, R17.** Given a draft is invalid, not ready, missing, or belongs to another project, when import is attempted, the system rejects the action and existing canvas graph state remains unchanged.
- AE6. **Covers R13, R16.** Given a storyboard has been imported, when the project canvas is reloaded, all imported nodes, positions, node data, provenance, and semantic edges remain available.

---

## Success Criteria

- A creator can complete the PRD's novel-to-storyboard-to-canvas path without real provider keys.
- A two-scene, six-shot storyboard imports into a readable, non-overlapping canvas board with semantic relationships intact.
- Repeated import is safe by default: it creates a distinguishable new version and does not destroy prior canvas work.
- Phase 7 and later modules can consume imported Shot prompt data and Character/Location relationships without re-parsing the original storyboard draft.

---

## Scope Boundaries

- Do not implement overwrite or in-place update import behavior in Phase 6; cancellation and new-version import are sufficient.
- Do not implement Prompt Composer, prompt debugging, reference-image enrichment, or asset reference uploads.
- Do not create GenerationJob queue execution, image nodes, video nodes, or media generation from imported shots.
- Do not implement SceneFrame collapse, MiniMap, search, bulk generation, or other Phase 12 canvas efficiency features.
- Do not implement a general-purpose auto-layout engine beyond the deterministic storyboard import layout needed for this module.
- Do not downgrade Node, Next, React, Prisma, tldraw, or the monorepo architecture to avoid local runtime warnings.

---

## Key Decisions

- Treat storyboard import as a server-owned graph mutation, not a frontend-only tldraw shape operation.
- Preserve the validated draft boundary from Phase 5: import revalidates and consumes a ready draft before creating graph state.
- Use MVP new-version duplicate policy so existing canvas work is protected while still allowing repeated mock demonstrations.
- Continue the normalized graph pattern: business facts live in CanvasNode and CanvasEdge records; tldraw shapes and arrows are projections of those records.
- Make provenance explicit on imported nodes and edges so later phases can group, inspect, or migrate imported batches.

---

## Dependencies / Assumptions

- Phase 5 provides `NovelDocument`, `StoryboardDraft`, shared storyboard validation, and a ready-for-import state.
- Phase 3 provides durable project-scoped CanvasNode records and business custom shapes.
- Phase 4 provides CanvasEdge records and Character/Location semantic binding behavior that updates Shot node data.
- The existing workbench can refresh canvas graph state and fit the tldraw viewport after a successful import.

---

## Outstanding Questions

### Resolve Before Planning

- None.

### Deferred to Planning

- [Affects R3, R4, R13][Technical] Which import provenance fields should be stored on node and edge data so repeated batches are distinguishable without adding a new persistent import table yet?
- [Affects R6][Technical] Should layout run entirely in the backend import service, or should shared layout helpers be reusable by frontend tests for overlap verification?
- [Affects R7][Technical] Should Scene membership use Shot-to-Scene edges, Shot-to-SceneFrame edges, or both, given existing semantic edge validation currently focuses on Character/Location bindings?
