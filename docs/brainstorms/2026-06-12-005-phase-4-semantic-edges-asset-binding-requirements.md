---
date: 2026-06-12
topic: phase-4-semantic-edges-asset-binding
---

# Phase 4 Semantic Edges and Asset Binding Requirements

## Summary

Phase 4 will make the canvas relationships real: creators can bind Character and Location business nodes to Shots and Scene Frames, see semantic connectors on the canvas, inspect/delete those relationships, and reload without losing edge state or synchronized node reference data.

---

## Problem Frame

Phase 3 made business nodes durable and editable, but the canvas still cannot express production relationships. A Shot can describe action and camera movement, and Character/Location nodes can hold consistency data, but there is no visible or normalized way to say which characters or locations a shot should use.

The next production pain is prompt composition and generation readiness. Later modules need reliable graph facts: which Shot references which Character, which Location applies to a Shot or Scene Frame, and whether deleting a relation cleans the dependent business data. Without Phase 4, later prompt, storyboard import, and generation modules would have to infer relationships from loose text or one-off form fields.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input — un-validated bets that should be reviewed before planning proceeds.*

- Phase 4 should be one Deep module unless planning shows that backend edge API and frontend arrow/drop behavior need separate review slices.
- The primary drag sources are CharacterAssetNode and LocationAssetNode business nodes already created on the canvas; raw uploaded file assets remain supporting media and are not converted into semantic Character/Location references in this module.
- `generated_image` and `generated_video` relation values should remain supported by shared/API contracts, but user-facing Shot-to-Image and Image-to-Video generation actions belong to Phase 8.
- Dropping a Location on a SceneFrame should apply to ShotNodes visually contained by or assigned to that frame; the exact containment rule is a planning concern, but the user-visible outcome must be deterministic.
- Duplicate drag/drop attempts for the same source, target, and relation should be idempotent rather than creating duplicate business references.
- Edge visuals can be implemented as tldraw arrows or an equivalent selectable connector, as long as creators can see, select, inspect, delete, and reload the relationship.

---

## Actors

- A1. Creator: Binds Character and Location nodes to production nodes, verifies the visible relationship, and deletes mistakes.
- A2. Canvas graph system: Persists semantic edges, visual connector identity, source/target node references, and synchronized node business data.
- A3. Inspector system: Shows selected edge details and exposes deletion without showing stale node forms.
- A4. Future prompt/generation modules: Consume semantic graph facts when composing prompts, importing storyboards, generating media, and exporting timelines.

---

## Key Flows

- F1. Character to Shot binding
  - **Trigger:** A creator drags a CharacterAssetNode onto a ShotNode, or uses an equivalent explicit bind action if drag/drop is unavailable.
  - **Actors:** A1, A2, A3
  - **Steps:** The Shot drop target gives a visible affordance, the creator releases the character, a semantic relationship is created, a visible connector appears, and the Shot's business reference list updates.
  - **Outcome:** The Shot now references that Character for later prompt composition and generation.
  - **Covered by:** R1, R2, R3, R4, R5, R8, R11

- F2. Location to Shot binding
  - **Trigger:** A creator drags a LocationAssetNode onto a ShotNode.
  - **Actors:** A1, A2, A3
  - **Steps:** The Shot accepts the Location, a semantic relationship is created, the Shot's location reference updates, and the connector remains visible after persistence.
  - **Outcome:** The Shot has a durable Location relationship.
  - **Covered by:** R1, R2, R3, R4, R6, R8, R11

- F3. Location to SceneFrame batch apply
  - **Trigger:** A creator drops a LocationAssetNode onto a SceneFrame.
  - **Actors:** A1, A2, A3
  - **Steps:** The system identifies the ShotNodes covered by that SceneFrame, asks for or applies the batch behavior defined by the UI, creates durable semantic relationships, updates affected Shot business data, and reports the number of affected Shots.
  - **Outcome:** The SceneFrame and its covered Shots consistently reflect the chosen Location.
  - **Covered by:** R1, R2, R3, R4, R6, R7, R8, R11, R12

- F4. Edge selection and deletion
  - **Trigger:** A creator selects an existing visible connector or edge row and chooses delete.
  - **Actors:** A1, A2, A3
  - **Steps:** The Inspector shows relation, source, and target details; deletion removes the visible connector and normalized edge; synchronized business references are removed from the target nodes.
  - **Outcome:** Reloading the canvas does not restore the deleted relation or stale target references.
  - **Covered by:** R9, R10, R11, R13, R14

- F5. Reload graph state
  - **Trigger:** A creator refreshes or reopens a project with semantic edges.
  - **Actors:** A1, A2, A3
  - **Steps:** The canvas loads business nodes, normalized edges, and visual connector state; missing or stale visuals are reconciled; Inspector selection starts in a safe state.
  - **Outcome:** Edge facts and visible connectors survive reloads.
  - **Covered by:** R2, R4, R8, R11, R14

---

## Requirements

**Semantic edge creation**
- R1. The canvas must support creating semantic relationships from CharacterAssetNode to ShotNode and from LocationAssetNode to ShotNode.
- R2. Each created semantic relationship must have a normalized `CanvasEdge` record scoped to the current project and canvas document.
- R3. Each created semantic relationship must have a visible connector that communicates source, target, and relation direction well enough for creators to understand the production graph.
- R4. Creating a semantic relationship must keep the visual connector, normalized edge, and target node business references synchronized.
- R5. Character-to-Shot binding must add the Character to the Shot's character references without removing existing character references.
- R6. Location-to-Shot binding must set or replace the Shot's active Location reference according to the product's single-location MVP behavior.
- R7. Location-to-SceneFrame binding must apply the Location to all eligible ShotNodes in that SceneFrame and make the batch outcome visible to the creator.
- R8. Duplicate source-target-relation binding attempts must be safe and idempotent: the target business data must not gain duplicate references, and the graph must not gain duplicate visible relationships.

**Selection, inspection, and deletion**
- R9. Selecting a visible semantic connector must show an edge-focused Inspector state rather than a stale business node form.
- R10. The edge Inspector must show at least relation type, source node identity, target node identity, and a delete action.
- R11. Deleting a semantic relationship must remove the normalized edge, remove or reconcile the visible connector, and update target business references that were created by that edge.
- R12. Deleting a Location-to-SceneFrame batch relationship must remove or reconcile the Location reference for affected Shots only when that reference came from the deleted relationship.
- R13. Edge creation and deletion failures must be visible, must not be reported as saved, and must leave the canvas recoverable by retry or reload.

**Reload and graph integrity**
- R14. Reloading the project must restore existing semantic relationships as visible connectors and normalized edge records.
- R15. Deleting a business node must not leave selectable orphan edge visuals; related normalized edges should be removed or reconciled consistently with backend cascade behavior.
- R16. The asset library and existing business node Inspector behavior must remain available while edge selection and edge deletion are added.
- R17. Shared/API edge contracts should remain broad enough for later `generated_image`, `generated_video`, `belongs_to_scene`, and export relations, but this module's user-facing acceptance focuses on Character/Location references.

**Canvas interaction quality**
- R18. Valid drop targets must give a visible affordance before the creator commits the bind.
- R19. Invalid drag/drop combinations must be ignored or rejected visibly without creating edges or corrupting node data.
- R20. A creator must be able to create, inspect, delete, and reload at least one Character-to-Shot edge and one Location-to-Shot or Location-to-SceneFrame edge in the same project.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R4, R5, R8, R20.** Given a CharacterAssetNode and ShotNode exist on the canvas, when the creator binds the Character to the Shot, a visible connector appears, a normalized edge exists, and the Shot lists that Character reference once.
- AE2. **Covers R1, R2, R3, R4, R6, R8, R20.** Given a LocationAssetNode and ShotNode exist on the canvas, when the creator binds the Location to the Shot, the Shot's active Location reference updates and the edge remains visible after refresh.
- AE3. **Covers R7, R12.** Given a SceneFrame contains multiple ShotNodes, when the creator applies a Location to the SceneFrame, all eligible Shots receive that Location; when the batch relationship is deleted, only references created by that batch are removed.
- AE4. **Covers R9, R10, R11, R13.** Given a semantic connector is selected, when the creator deletes it from the Inspector, the connector and normalized edge disappear, the target business references are synchronized, and refresh does not restore the deleted edge.
- AE5. **Covers R15, R16.** Given a project has semantic edges and uploaded assets, when a connected business node is deleted, related edge visuals do not remain selectable and the unrelated asset library still works.
- AE6. **Covers R18, R19.** Given the creator drags a Character node over a Location node or unsupported object, the UI does not create a semantic edge and gives a safe invalid-target response.

---

## Success Criteria

- A creator can bind characters and locations to production nodes directly on the canvas and understand the resulting graph visually.
- Semantic relationships survive refresh as both visible connectors and normalized `CanvasEdge` facts.
- Edge deletion reliably cleans the business data that future prompt/generation modules will read.
- Downstream planning can implement Phase 4 without inventing relationship semantics, deletion behavior, or SceneFrame batch expectations.

---

## Scope Boundaries

- Novel import, Storyboard JSON generation, and LLM extraction belong to Phase 5.
- Storyboard-to-canvas bulk import, auto layout, and duplicate import policy belong to Phase 6.
- Prompt composer UI, prompt debug panels, and prompt assembly from semantic edges belong to Phase 7.
- GenerationJob execution, Shot-to-Image, Image-to-Video, retry, and generated media nodes belong to Phase 8+.
- Real image/video provider adapters, provider key configuration, remote asset download, and provider polling are outside Phase 4.
- Editor package export and local editor handoff are outside Phase 4.
- Raw uploaded file assets should not become Character/Location semantic references unless they are represented by business nodes first.
- Large-canvas performance targets are not the hard acceptance gate for Phase 4, though the implementation should not obviously regress Phase 3 canvas interaction quality.

---

## Key Decisions

- Keep graph facts normalized: visible connectors are the canvas projection, while `CanvasEdge` owns durable semantic relationships.
- Use CharacterAssetNode and LocationAssetNode as the MVP reference sources because Phase 3 already established them as business nodes with editable consistency data.
- Treat Location as a single active Shot reference for MVP while allowing multiple Character references per Shot.
- Make deletion part of the module, not a follow-up, because stale references would poison Phase 7 prompt composition and Phase 8 generation.
- Keep generated-media relations contract-ready but defer generation behavior to the module that owns jobs and providers.

---

## Dependencies / Assumptions

- Phase 3 business node creation, Inspector editing, geometry sync, deletion recovery, and data-preserving forms are available.
- The existing Prisma schema and shared types already include `CanvasEdge` and relation enums, but the module must add the missing user-facing edge creation/deletion behavior.
- Existing `getProjectCanvas` already returns `edges`, so planning should preserve the canvas load envelope rather than inventing a separate graph bootstrap flow.
- Reference research from Toonflow shows storyboard rows can carry associated asset IDs through a durable join table and clean those associations on delete; guga-flow should use this only as supporting evidence for durable relations, not copy Toonflow's data model.
- The local shell may still warn about Node 22 versus the project Node 26.3.0 target; implementation should keep the Node 26 architecture target and avoid dependency downgrades.

---

## Outstanding Questions

### Resolve Before Planning

- None.

### Deferred to Planning

- [Affects R3, R14][Needs research] Which current tldraw arrow/binding or custom connector approach best fits durable visual edge reconciliation with the installed tldraw version?
- [Affects R7, R12][Technical] What exact containment rule should identify ShotNodes eligible for a SceneFrame batch apply in the current custom-shape layout?
- [Affects R4, R11, R13][Technical] Should edge creation/deletion update target business data inside one backend transaction, or should the frontend coordinate multiple calls with rollback/recovery behavior?
- [Affects R18, R19][Technical] What drop interaction is most reliable with tldraw and React 19: native drag/drop, tldraw pointer interactions, or an explicit bind mode fallback?
