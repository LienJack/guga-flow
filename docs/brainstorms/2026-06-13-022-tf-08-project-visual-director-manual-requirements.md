---
date: 2026-06-13
topic: tf-08-project-visual-director-manual
status: completed
---

# TF-08 Project Visual and Director Manual Requirements

## Summary

TF-08 adds a durable project visual manual and director manual to the existing generation settings workflow, then carries those manual notes into Shot prompt preview and future generation jobs. The first slice should make project-level art direction and shot-level overrides visible in prompt debug parts without copying Toonflow's data model or building a full settings center.

---

## Problem Frame

The current project defaults already cover compact generation settings such as visual style, aspect ratio, narration, packaging references, viral notes, continuity, talking photo, and marketing metadata. That covers parameter control, but it does not provide a structured place for longer creative direction such as palette, lens grammar, lighting rules, composition constraints, pacing guidance, or "do not do" style notes.

Creators need those project-level instructions to travel with every prompt preview and generation request. Without them, style consistency depends on ad hoc Shot fields or provider prompts, and reviewers cannot tell which project manual guidance influenced a generated image or video.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the TF-08 row and should be reviewed downstream.*

- TF-08 should extend the existing project/Shot generation settings contract instead of adding a separate manual service or database table.
- The first version should support text/manual sections and prompt debug visibility; rich template libraries, style-asset generation, and a dedicated settings route can follow later.
- Project manual fields should be optional and backward-compatible so existing projects and generated media keep working.
- Shot-level overrides should supplement or override project manual guidance only where the creator explicitly enters shot-specific manual notes.

---

## Actors

- A1. Creator: writes project art direction and director guidance, optionally adjusts a specific Shot, previews prompts, and generates media.
- A2. Canvas workspace: exposes project manual defaults and Shot overrides near existing generation controls.
- A3. Prompt and generation services: resolve manual guidance from persisted project and Shot state and preserve it in prompt debug and job trace.

---

## Key Flows

- F1. Project manual setup
  - **Trigger:** A creator prepares a project before generating or regenerating shots.
  - **Actors:** A1, A2
  - **Steps:** The creator enters visual manual guidance such as art style, palette, lighting, lens/composition, texture, consistency rules, and negative style constraints. The creator also enters director manual guidance such as pacing, camera language, performance notes, editing rhythm, and audio/narration intent.
  - **Outcome:** The project has durable creative manuals that future Shot prompt previews can inherit.
  - **Covered by:** R1, R2, R3, R8

- F2. Shot prompt with inherited manuals
  - **Trigger:** A creator opens prompt preview or queues generation for a Shot.
  - **Actors:** A1, A2, A3
  - **Steps:** The backend resolves project manual guidance plus any Shot manual overrides, includes the effective manual text in prompt debug parts, and stores the resolved snapshot on generation job trace when media is created.
  - **Outcome:** The creator can see which manual guidance influenced the Shot, and completed media remains auditable after later manual edits.
  - **Covered by:** R4, R5, R6, R7, R9

- F3. Shot-specific adjustment
  - **Trigger:** One Shot intentionally needs different direction from the project default.
  - **Actors:** A1, A2, A3
  - **Steps:** The creator adds shot-level visual or director manual notes. Prompt preview clearly shows both inherited project guidance and the Shot-specific source for overridden or supplemental guidance.
  - **Outcome:** A Shot can diverge from the project manual without rewriting the project defaults or losing traceability.
  - **Covered by:** R3, R4, R5, R7

---

## Requirements

**Manual content**

- R1. The creator can store a project visual manual with longer-form guidance for art style, palette/color, lighting, lens/composition, texture/material treatment, consistency rules, and visual negative constraints.
- R2. The creator can store a project director manual with longer-form guidance for pacing, camera language, performance/emotion, editing rhythm, audio/narration intent, and production constraints.
- R3. The creator can store Shot-level visual and director manual notes when a specific Shot should supplement or override project manual guidance.

**Prompt and generation trace**

- R4. Shot prompt preview includes effective visual manual and director manual guidance as distinct debug parts when present.
- R5. Prompt debug output makes the source level visible enough to distinguish project manual guidance from Shot-specific manual guidance.
- R6. Image and video generation job inputs include the resolved manual guidance used at queue time.
- R7. Generated Image and Video node trace preserves the resolved manual guidance used for that generation, so later manual edits do not rewrite historical outputs.

**Compatibility and scope control**

- R8. Existing projects, Shots, prompt previews, generation jobs, and exports continue to work when no manual guidance exists.
- R9. Manual guidance participates in prompt composition but does not expose provider keys, require real providers, or bypass backend-owned generation boundaries.
- R10. TF-08 does not require a full settings center, art-style marketplace, manual template library, style reference generation, or Toonflow-compatible table shape.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R4, R5.** Given a project visual manual with palette and lighting guidance plus a director manual with camera rhythm notes, when a creator opens a Shot prompt preview, the debug parts include those manuals with project-level source context.
- AE2. **Covers R3, R4, R5, R6.** Given a Shot adds a director note that differs from the project manual, when generation is queued, the job input includes the Shot-specific note and prompt debug indicates the Shot source.
- AE3. **Covers R6, R7.** Given media is generated while manuals contain "rainy noir palette", when the creator later changes the project manual, the existing generated Image/Video node still shows the original resolved manual snapshot.
- AE4. **Covers R8, R9.** Given an older project has no manual fields, when a creator previews prompts or generates media, existing prompt and generation flows still succeed using current defaults and no browser-side secrets.

---

## Success Criteria

- A creator can save project-level visual and director manual text without leaving the canvas workflow.
- Shot prompt debug parts show project and Shot manual guidance distinctly enough for review.
- New generation jobs and generated media trace record the manual guidance used at queue time.
- Downstream planning does not need to invent the manual scope, inheritance model, or non-goals for TF-08.

---

## Scope Boundaries

- Do not build a separate full settings center; UI-TF-09 can organize settings information architecture later.
- Do not copy Toonflow's manual tables or route structure; guga-flow should preserve its current project/Shot settings boundary.
- Do not generate style reference images, expression sheets, or scene reference packs in this module; TF-07 covers first reference image generation and richer style assets can be separate work.
- Do not add provider-admin behavior, provider key exposure, or arbitrary prompt/skill template execution.
- Do not retroactively rewrite completed generated media when manuals change.
- Do not require real provider credentials; mock-first verification is sufficient.

---

## Key Decisions

- Extend project and Shot generation settings with manual guidance: this keeps TF-08 aligned with existing prompt/generation trace behavior and avoids a parallel settings store.
- Use distinct visual manual and director manual concepts: visual guidance controls image style consistency, while director guidance controls camera, motion, pacing, performance, and audio/narration intent.
- Treat manual guidance as prompt/debug context first: CRUD and traceability are required, but template libraries and marketplace-like style management are deliberately deferred.
- Preserve source visibility in debug parts: reviewers need to see whether guidance came from the project manual or a Shot-specific adjustment.

---

## Dependencies / Assumptions

- Phase 15 project defaults, Shot overrides, prompt debug parts, and generation-setting trace are available.
- Existing prompt composer and generation services derive prompt context from persisted backend project/canvas state.
- Existing canvas Inspector can host compact project defaults and Shot override controls until a broader settings center exists.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1-R7][Technical] Decide the exact shared type names and normalization shape for visual manual and director manual fields.
- [Affects R4-R7][Technical] Decide whether manuals become new prompt debug part kinds or nested rows inside the existing generation settings debug part.
- [Affects R3, R5][Technical] Decide whether Shot-level manual text replaces project manual text per section or is always additive with source labels.
