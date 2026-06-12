---
date: 2026-06-12
topic: phase-7-prompt-composer-assets
---

# Phase 7 Prompt Composer And Asset References

## Summary

Phase 7 should make imported or manually bound Shot nodes production-ready for the next mock generation module by composing image/video prompts from Shot, Scene, Character, Location, and reference asset data, while exposing the result and debug parts in the Inspector.

---

## Problem Frame

Phase 6 imports a valid storyboard into normalized CanvasNode and CanvasEdge records. Those records already preserve Shot prompt fields and Character/Location references, but the user still cannot see the final prompt that later generation jobs will use. Character and Location nodes also carry consistency fields from storyboard import, but the Inspector does not yet expose the most important identity/location prompt fields or attach project image assets as reference images for downstream generation.

The next module exists to close that preparation gap before GenerationJob work begins. A creator should be able to select a Shot, inspect the composed image/video prompt, see which node contributed each section, edit Character/Location descriptions, attach reference images, and confirm the prompt updates without starting a generation job.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input — un-validated bets that should be reviewed before planning proceeds.*

- Phase 7 should stop at prompt composition and reference binding; actual ImageNode/VideoNode generation remains Phase 8.
- Reference image binding should attach existing or newly uploaded project assets to Character/Location canvas nodes, not create a separate asset graph table yet.
- Prompt composition should be available through a server-owned canonical path for future GenerationJob use, while the frontend may use it for preview/debug.
- Style and Prop asset nodes remain deferred because the current MVP business node set and toolbar do not expose them.
- Global style can be represented as an optional or empty prompt part for now; it should not block Character/Location/Shot composition.

---

## Actors

- A1. Creator: edits story assets, reviews composed prompts, and prepares shots for generation.
- A2. Prompt composer: combines normalized canvas graph data into image/video prompt outputs with debug parts and reference asset ids.
- A3. Canvas graph system: owns Shot, Scene, Character, Location, Asset references, and semantic edges.
- A4. Future generation worker: will consume the same composed prompt contract in Phase 8.

---

## Key Flows

- F1. Review a composed Shot prompt
  - **Trigger:** Creator selects a Shot node that references Character and Location nodes.
  - **Actors:** A1, A2, A3
  - **Steps:** The system resolves the Shot, its Scene context, linked Character nodes, linked Location node, and bound reference assets; it composes image/video prompts; the Inspector shows the final prompts plus debug parts.
  - **Outcome:** The creator can see exactly why the prompt contains each section before generation exists.
  - **Covered by:** R1, R2, R3, R6, R7

- F2. Update Character or Location prompt inputs
  - **Trigger:** Creator edits a Character or Location node and saves it.
  - **Actors:** A1, A2, A3
  - **Steps:** The canvas node data updates; a linked Shot prompt preview is recomposed from the latest node data; the debug parts show the updated source section.
  - **Outcome:** Prompt preview stays derived from current normalized graph state rather than stale storyboard text.
  - **Covered by:** R2, R3, R6, R8, R11

- F3. Bind reference images to production assets
  - **Trigger:** Creator uploads or selects a project image asset as a Character or Location reference.
  - **Actors:** A1, A2, A3, A4
  - **Steps:** The asset stays project-scoped; the Character/Location node stores the reference asset id; any linked Shot composition includes that asset id in its reference list.
  - **Outcome:** Future image generation can receive the same references that the creator attached to the source asset node.
  - **Covered by:** R4, R5, R7, R9, R10

---

## Requirements

**Prompt composition**

- R1. The system must compose both image and video prompt outputs for a Shot using available Shot visual/action/camera fields, duration, prompt notes, negative prompt notes, and linked graph context.
- R2. Composition must include linked Character identity/consistency information when the Shot references Character asset nodes.
- R3. Composition must include linked Location prompt/consistency information when the Shot references a Location asset node.
- R4. Composition must return reference asset ids from linked Character and Location nodes when those nodes have image references bound.
- R5. Composition must tolerate missing optional context. A Shot without linked Character, Location, Scene, or reference assets still produces a usable prompt from its own fields and reports what context is absent.
- R6. Composition must return debug parts that label each meaningful source section, such as Shot, Scene, Characters, Location, References, Negative Prompt, and Video Motion.
- R7. The composed output must be suitable for later GenerationJob input by carrying final prompt text, negative prompt text, reference asset ids, debug parts, and source node ids.

**Asset node enrichment**

- R8. Character asset editing must expose and preserve identity prompt fields in addition to existing name, role, appearance, personality, wardrobe, and consistency fields.
- R9. Location asset editing must expose and preserve location prompt fields in addition to existing name, environment, mood, visual style, and consistency fields.
- R10. Character and Location nodes must support binding, displaying, and removing one or more project image assets as reference images without deleting the underlying Asset records.
- R11. Editing Character or Location fields must update later Shot prompt composition without requiring storyboard re-import.

**Inspector and workbench behavior**

- R12. Selecting a Shot node must expose a prompt preview/debug panel in the Inspector without hiding the existing Shot form or Asset Library.
- R13. The prompt preview must distinguish image prompt and video prompt outputs.
- R14. The Inspector must show a loading, empty, success, and error state for prompt composition.
- R15. Reference image binding must be discoverable from the Character/Location Inspector context and must reuse the project Asset Library upload/list behavior where practical.
- R16. Existing manual node editing, semantic edge binding/deletion, storyboard import, canvas autosave, and asset preview behavior must continue to work.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R6, R12, R13.** Given an imported storyboard Shot linked to Hero and City Rooftop nodes, when the creator selects the Shot, the Inspector shows image and video prompts whose debug parts include Shot, Character, and Location sections.
- AE2. **Covers R8, R11.** Given a Shot linked to a Character node, when the creator edits that Character identity prompt and saves it, recomposing the Shot prompt includes the edited identity text without re-importing the storyboard.
- AE3. **Covers R9, R11.** Given a Shot linked to a Location node, when the creator edits that Location prompt and saves it, recomposing the Shot prompt includes the edited location text.
- AE4. **Covers R4, R10, R15.** Given an uploaded image asset bound to a Character node, when a linked Shot prompt is composed, the output reference asset id list includes the bound asset id.
- AE5. **Covers R5, R14.** Given a manually created Shot with no linked Character or Location, when the prompt preview loads, it still shows a Shot-derived prompt and an empty-context notice rather than failing.
- AE6. **Covers R16.** Given a project with imported storyboard nodes and semantic edges, after using prompt preview and reference binding, refreshing the canvas preserves nodes, edges, prompt fields, reference asset ids, and asset library previews.

---

## Success Criteria

- Creators can inspect a Shot and understand exactly which Character/Location/Shot data will feed generation before starting generation.
- Prompt composition is derived from current normalized CanvasNode and CanvasEdge state, not stale storyboard JSON or tldraw-only shape state.
- Reference image assets attached to Character/Location nodes flow into composed prompt outputs for linked Shots.
- Downstream Phase 8 planning can consume a stable prompt composition behavior without inventing prompt parts, reference asset semantics, or Inspector UX.

---

## Scope Boundaries

- Do not create GenerationJob records or run image/video providers in this module.
- Do not create ImageNode, VideoNode, generated media assets, retry behavior, or queue UI.
- Do not add real provider configuration, provider model selection, polling, cancellation, or remote asset download.
- Do not add StyleAsset or PropAsset node creation/binding beyond optional empty prompt parts.
- Do not add a separate asset-reference table unless planning proves node data cannot safely hold MVP reference ids.
- Do not overwrite imported storyboard prompts; composition may use them as inputs but should remain preview/runtime output.
- Do not downgrade Node, Next, React, Prisma, tldraw, or workspace architecture to avoid local Node runtime warnings.

---

## Key Decisions

- Compose from normalized graph state: this preserves the Phase 3-6 architecture where CanvasNode/CanvasEdge records are business truth and tldraw is projection.
- Keep reference images attached to Character/Location nodes for MVP: this matches the creator mental model and keeps Shot composition clean because Shots already reference those source asset nodes.
- Include a server-owned composer path before jobs exist: Phase 8 can reuse the same composition behavior for mock image/video jobs and persist it into GenerationJob input.
- Preserve debug parts as first-class output: creators need to understand and troubleshoot prompt sections, and future jobs need reproducible generation input.

---

## Dependencies / Assumptions

- Phase 6 import provides Shot, Scene, Character, Location nodes and semantic edges with prompt-ready data.
- Project asset upload and preview routes already support image uploads and Character/Location reference purposes.
- Manual semantic binding already syncs Shot `characterAssetIds` and `locationAssetId` when Character/Location edges are created or deleted.
- Current Inspector and Asset Library can be extended without changing the canvas source-of-truth model.

---

## Research Notes

- Fact: `infinite_canvas_video_prd_roadmap_v2_detailed.md` defines prompt composition as Global Style + Scene mood/time + Location prompt + Character identity prompt + Shot description/action/camera + model suffix + negative prompt.
- Fact: `docs/tech-stack-text2sql-reference.md` requires final generation input to preserve prompt, negative prompt, reference asset ids, provider params, debug parts, and source/target node ids.
- Fact: `docs/research/video-ref/repomix/toonflow-app-focused-assets.xml` shows Toonflow assets preserving prompts and image records, generating role/scene/tool images from asset prompts, and passing optional base64 references into image generation.
- Inference: For guga-flow Phase 7, Toonflow supports the product need for durable asset prompt/reference data, but guga-flow should keep the simpler normalized CanvasNode/Asset boundary rather than copying Toonflow's route or table structure.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1, R7][Technical] Decide whether the shared prompt composer should live in shared types, backend only, or both with a shared pure core and server wrapper.
- [Affects R10, R15][Technical] Decide whether reference binding is best presented as an Asset Library action, a Character/Location Inspector subsection, or both.
- [Affects R14][Technical] Decide whether prompt preview should compose synchronously from loaded graph state or call the server on each selected Shot.
