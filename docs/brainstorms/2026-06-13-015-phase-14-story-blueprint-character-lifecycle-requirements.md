---
date: 2026-06-13
topic: phase-14-story-blueprint-character-lifecycle
---

# Phase 14 Story Blueprint and Character Lifecycle Requirements

## Summary

Phase 14 adds a story-blueprint layer to generated storyboard drafts so long-form sources can carry world context, timeline events, relationship facts, and character lifecycle stages into the canvas and prompt composer. The module must make shots traceable back to story events and prevent generation from casually overwriting locked character identity fields.

---

## Problem Frame

The current MVP can generate a storyboard, import scenes and shots into the canvas, and compose prompts from linked character and location nodes. That proves the short-form novel-to-video loop, but it still treats each character as mostly static and each shot as only loosely tied to its source excerpt.

Longer scripts and short-drama workflows need a higher-level planning view: what world rules apply, which event a shot adapts, how characters relate, and which stage of a character's age, costume, face, or emotional state should be used. Without that trace, later prompt generation can drift away from story context, and re-imported AI output can overwrite carefully edited character identity.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input - un-validated bets that should be reviewed before planning proceeds.*

- Phase 14 should be a Standard/Deep feature slice, not a full V2 long-novel automation platform.
- The first implementation can keep blueprint data attached to storyboard drafts and imported canvas nodes rather than introducing a dedicated EventGraph table.
- Mock-first behavior is sufficient: deterministic blueprint/event/lifecycle data from the mock LLM is acceptable for this phase.
- Script versioning and full screenplay export from TF-15 are deferred; this phase only preserves the blueprint data needed by storyboard, canvas, and prompts.

---

## Actors

- A1. Creator: imports or generates story material, edits storyboard and character data, and inspects canvas traceability.
- A2. Mock LLM/generation service: produces storyboard drafts with blueprint metadata in mock mode.
- A3. Canvas workspace: imports the storyboard draft into durable nodes and semantic edges.
- A4. Prompt composer: builds image/video prompts from the latest graph and character lifecycle context.

---

## Key Flows

- F1. Generate blueprint-backed storyboard
  - **Trigger:** A creator generates a storyboard from a saved novel source or one-sentence creative entry.
  - **Actors:** A1, A2
  - **Steps:** Source text is analyzed into a storyboard plus story blueprint metadata; the creator can preview world context, events, relationships, and character stages before import; validation catches broken event or character-stage references.
  - **Outcome:** The draft remains editable and ready for canvas import with traceable story context.
  - **Covered by:** R1, R2, R3, R7
- F2. Import blueprint trace to canvas
  - **Trigger:** A creator imports a ready storyboard draft into the canvas.
  - **Actors:** A1, A3
  - **Steps:** Scene and shot nodes keep event/source trace fields; character nodes keep lifecycle stages and lock state; semantic edges still represent ordinary scene, character, and location relationships.
  - **Outcome:** Selecting a shot or character on the canvas exposes the story event and lifecycle context used for generation.
  - **Covered by:** R4, R5, R6, R8
- F3. Compose prompts with lifecycle context
  - **Trigger:** A creator previews or starts image/video generation from a Shot node.
  - **Actors:** A1, A4
  - **Steps:** The composer resolves linked character nodes, picks the character stage referenced by the shot when present, includes blueprint/event context in debug parts, and respects locked character fields.
  - **Outcome:** The prompt reflects the correct story event and character lifecycle stage without losing user-edited identity data.
  - **Covered by:** R5, R6, R8, R9

---

## Requirements

**Story blueprint and event trace**
- R1. Storyboard drafts may include a story blueprint with a concise world summary, timeline events, and character relationship facts.
- R2. Timeline events must be stable enough for scenes and shots to reference by id within the same storyboard draft.
- R3. Validation must fail when a scene or shot references an unknown timeline event, unknown character lifecycle stage, or unknown relationship participant.
- R4. Imported Scene and Shot nodes must preserve story-event trace information so a creator can inspect the event summary/source context after import.

**Character lifecycle and lock policy**
- R5. Character drafts and imported Character nodes must support lifecycle stages for age, appearance, wardrobe/costume, emotional state, and stage-specific identity prompt text.
- R6. Character identity fields that a creator locks must not be overwritten by later generated/imported storyboard data for the same reusable character.
- R7. Storyboard editing must expose lifecycle and lock-relevant fields at least enough for a creator to inspect and adjust generated character stage data before import.

**Canvas and prompt continuity**
- R8. Imported Shot nodes must record which event and character stage ids they depend on, while existing character/location/scene edges remain the durable relationship graph.
- R9. Prompt preview and generation job inputs must include story event and character lifecycle context in debug/source parts when those fields are present.
- R10. Existing short-story storyboard generation and import flows must continue working when no blueprint metadata is present.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3.** Given a generated storyboard draft with two timeline events, when a shot references one event id, validation succeeds; when it references a missing event id, validation reports the broken reference.
- AE2. **Covers R4, R8.** Given a ready storyboard with event trace metadata, when it is imported into the canvas, the imported Shot node contains readable event summary/source information and the normal `belongs_to_scene`, `references_character`, and `references_location` relationships still exist.
- AE3. **Covers R5, R7, R9.** Given a character with a "younger" and "older" stage and a shot assigned to the older stage, when prompt preview opens for that shot, the prompt/debug output includes the older-stage age/wardrobe/identity context.
- AE4. **Covers R6, R10.** Given an existing reusable Character node with locked identity fields, when a later storyboard import reuses that character, the locked identity values remain intact while non-locked trace metadata may be added.

---

## Success Criteria

- A downstream planner can implement Phase 14 without inventing product scope around blueprints, events, lifecycle stages, or lock behavior.
- The feature can be demonstrated with mock generation, storyboard preview, canvas import, and prompt preview.
- Existing Phase 5 through Phase 13 storyboard, import, generation, and export tests continue to pass.
- The implementation preserves the canvas-first and mock-first architecture rules.

---

## Scope Boundaries

- Do not build a full screenplay/version management workbench in this phase.
- Do not add a chat-based Agent runtime, memory system, or skill editor.
- Do not attempt full automatic 100k-word novel-to-finished-video production.
- Do not introduce real LLM-specific parsing behavior as a requirement; provider adapters can follow later.
- Do not replace existing storyboard import layout, semantic edges, or prompt composer ownership boundaries.

---

## Key Decisions

- Extend the storyboard-to-canvas flow rather than creating a separate planning product surface: this keeps Phase 14 tied to the proven novel/storyboard/import workflow.
- Treat lifecycle stage selection as generation context, not cosmetic UI state: it must survive reload and be visible to prompt composition.
- Preserve locked character identity over generated updates: creator edits are higher authority than future AI re-parsing for the same reusable character.

---

## Dependencies / Assumptions

- Existing storyboard draft validation, canvas import provenance, and prompt composer debug parts are available from earlier phases.
- Existing asset-node reuse behavior can serve as the first reuse boundary for character lock behavior.
- The mock provider can produce deterministic blueprint and lifecycle data suitable for tests and browser smoke.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1-R4][Technical] Decide the exact shared type names and optional fields for blueprint events, relationships, and event references.
- [Affects R6][Technical] Decide how lock metadata is represented so it is simple to edit and safe during reusable character import.
- [Affects R9][Technical] Decide whether story blueprint context should be a new prompt debug part kind or folded into existing scene/character/shot parts.
