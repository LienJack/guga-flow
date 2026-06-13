---
date: 2026-06-13
topic: phase-15-generation-settings-export-packaging
---

# Phase 15 Generation Settings and Export Packaging Requirements

## Summary

Phase 15 adds durable project-level defaults and shot-level overrides for generation style, format, narration, voice, and visual packaging, then carries the resolved settings into prompt preview, generation jobs, generated media trace, and editor export manifests. The package handoff must expose subtitle, BGM, transition, and style-pack references without turning this phase into a full editing suite.

---

## Problem Frame

Earlier phases can turn source material into storyboard/canvas nodes, compose prompts with story and character context, generate media, and package selected videos for an editor. The remaining gap is the creator's pre-generation control over the finished video's creative parameters: the current flow mostly lets providers choose from per-request model settings, while short-video tools expect users to set style, aspect, narration language, accent, and packaging intent before media is created.

The export package also currently proves clip handoff, not finished-video intent. Without carrying subtitles, BGM, transitions, and visual packaging references through the manifest, downstream editors cannot distinguish "not requested" from "requested but unresolved", and the canvas loses part of the creative contract that led to the generated result.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input - un-validated bets that should be reviewed before planning proceeds.*

- Phase 15 should be a Standard/Deep feature slice because it crosses UI, prompt composition, generation job input, generated node trace, and editor export packaging.
- The first version should store packaging intent and references as durable metadata; it should not synthesize final subtitles, BGM, voiceover, or edited transitions.
- Project defaults plus shot overrides are enough for the MVP; scene-level or timeline-level parameter inheritance can wait.
- Missing optional subtitle/BGM/transition/style-pack assets should be visible in the manifest or UI, but should not block a clip-only export when selected VideoNodes are valid.

---

## Actors

- A1. Creator: sets project defaults, overrides individual shots when needed, generates media, and exports an editor package.
- A2. Canvas workspace: persists generation and packaging intent on durable project/shot state and exposes inherited versus overridden settings.
- A3. Prompt and generation services: resolve effective settings, compose prompts, create generation jobs, and preserve trace data on outputs.
- A4. Export worker and backend: build editor packages from selected VideoNodes and package metadata references.
- A5. Downstream editor or local editor bridge: consumes the package manifest and referenced sidecar metadata.

---

## Key Flows

- F1. Project defaults setup
  - **Trigger:** A creator prepares a project before generating shots.
  - **Actors:** A1, A2
  - **Steps:** The creator sets defaults for visual style, aspect ratio, narration language, narration accent or voice description, subtitle preference, BGM reference, transition style, and visual packaging/style pack. The workspace saves those defaults durably and shows that shots inherit them until overridden.
  - **Outcome:** New and existing shots have a clear effective generation profile before generation starts.
  - **Covered by:** R1, R2, R3, R4, R13

- F2. Shot override and generation
  - **Trigger:** A creator selects a Shot and changes one or more generation settings for that shot.
  - **Actors:** A1, A2, A3
  - **Steps:** The workspace shows which settings are overridden; prompt preview reflects the effective style, aspect, narration, voice, and packaging context; generation jobs are created with the same resolved settings; generated Image/Video nodes retain the settings used to create them.
  - **Outcome:** A shot can intentionally diverge from project defaults without losing traceability or requiring provider secrets in the browser.
  - **Covered by:** R5, R6, R7, R8, R9, R13

- F3. Editor package with finished-video intent
  - **Trigger:** A creator exports selected VideoNodes.
  - **Actors:** A1, A3, A4, A5
  - **Steps:** The export flow gathers selected clips and their source shot context, resolves project and shot packaging settings, adds subtitle/BGM/transition/style-pack references to the timeline manifest, records unresolved optional references as visible metadata, and packages the same core clip artifacts as Phase 11.
  - **Outcome:** The package remains editor-ready and now carries the creative packaging contract needed to finish the video outside guga-flow.
  - **Covered by:** R10, R11, R12, R13, R14

---

## Requirements

**Project and shot settings**

- R1. The creator must be able to set project-level defaults for visual style, aspect ratio, narration language, narration accent or voice description, subtitle preference, BGM reference, transition style, and visual packaging/style pack.
- R2. The creator must be able to override relevant generation settings on an individual Shot before starting image or video generation.
- R3. The UI must make inherited settings and shot overrides distinguishable so the creator can tell whether a value comes from the project default or the selected Shot.
- R4. Provider-specific settings such as provider, model, output count, duration, resolution, and provider parameters must remain available without exposing provider keys or turning this feature into a provider-admin console.

**Prompt and generation trace**

- R5. Prompt preview must include the resolved style, aspect, narration, voice, and packaging context when those settings are present.
- R6. Image and video generation job inputs must include the resolved settings used for the request, including any shot override values.
- R7. Generated Image and Video nodes must retain trace metadata for the generation settings used to create them.
- R8. Settings must be optional and backward-compatible: projects, shots, jobs, and generated nodes without Phase 15 metadata must still compose prompts, generate media, and export packages using safe defaults.
- R9. Changing settings before generation must affect subsequent prompt composition and generation jobs without mutating already completed generated media records.

**Export package metadata**

- R10. Editor export manifests must carry project-level and per-shot packaging references for subtitles, BGM, transitions, and visual style packs when requested or available.
- R11. Timeline clip items must retain per-shot transition, subtitle, narration, and packaging metadata enough for a downstream editor to reconstruct intent alongside source VideoNode and Asset lineage.
- R12. Export packages must distinguish absent, requested-but-unresolved, and available subtitle/BGM/transition/style-pack references instead of silently dropping requested packaging intent.
- R13. Exporting valid selected VideoNodes must still succeed when optional subtitle, BGM, transition, or style-pack references are unresolved, as long as the package clearly records the unresolved state.
- R14. Existing Phase 11 package behavior must continue to produce a downloadable zip with timeline, storyboard, and clips for selected VideoNodes.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3, R5, R6.** Given a project default for vertical cinematic style, Chinese narration, and a BGM reference, when a creator selects a Shot with no overrides and opens prompt preview, the preview and next generation job include the inherited settings.
- AE2. **Covers R2, R3, R6, R7, R9.** Given a Shot overrides aspect ratio and narration accent, when the creator generates an image or video, the job input and resulting generated node show the override values while previously generated media keeps its original trace.
- AE3. **Covers R10, R11, R12, R14.** Given three valid VideoNodes and available subtitle, BGM, transition, and style-pack references, when the creator exports them, the zip still includes the core Phase 11 package artifacts and the manifest includes those packaging references.
- AE4. **Covers R12, R13.** Given a project requests BGM and subtitles but no BGM asset exists, when the creator exports valid VideoNodes, the package succeeds and marks the BGM reference as unresolved rather than pretending it exists.
- AE5. **Covers R4, R8, R14.** Given an older project with no generation settings metadata, when a creator previews prompts, generates media, or exports selected VideoNodes, the existing flows still work with defaults and no browser-side secrets.

---

## Success Criteria

- A creator can set project-level generation and packaging defaults before media generation.
- A creator can override generation settings for a single Shot and see those values reflected in prompt preview and new generation jobs.
- Generated media and export packages preserve the settings and packaging references that influenced them.
- A Phase 15 export package remains compatible with the Phase 11 editor handoff while adding subtitle, BGM, transition, and style-pack intent.
- `ce-plan` can proceed without inventing the project/shot inheritance model, export success semantics for missing optional references, or finished-video scope boundaries.

---

## Scope Boundaries

- Do not build a full NLE, timeline editor, subtitle timing editor, DAW, or transition preview system in this phase.
- Do not implement automatic subtitle transcription, voiceover synthesis, BGM generation, beat matching, sticker marketplace, or style-pack marketplace.
- Do not require real provider keys or real media providers; mock-first generation and export must remain sufficient for verification.
- Do not expose provider secrets, local editor URLs, or server-only integration settings to the browser.
- Do not change the Phase 11 principle that selected VideoNodes are the export source for this package flow.
- Scene-level, sequence-level, collaboration-level, and multi-platform export presets belong to later roadmap phases unless planning finds a near-zero-cost compatibility hook.

---

## Key Decisions

- Use project defaults plus shot overrides as the first inheritance model: it covers the stated XQ-04 workflow without introducing a full timeline parameter hierarchy.
- Treat subtitles, BGM, transitions, and visual packaging as manifest references first: this satisfies the one-click finished-video packaging contract while keeping full editing/generation tools out of scope.
- Preserve resolved settings at generation/export time: completed media and packages should remain auditable even after project defaults change.
- Keep provider settings and creative packaging settings adjacent but conceptually separate: provider controls execute a request, while Phase 15 settings describe the intended finished-video style and packaging.

---

## Dependencies / Assumptions

- Existing prompt composer, generation job, generated node trace, and editor export package flows from earlier phases are available.
- Existing Asset records can serve as references for BGM, subtitle, image, or style-pack-like artifacts when those assets exist.
- Earlier mock providers and worker packaging can be extended without requiring real audio/subtitle generation.
- Planning must decide the exact persistence location for project defaults and shot overrides while preserving reload behavior.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R1, R2, R8][Technical] Decide the exact persistence boundary for project defaults and shot overrides.
- [Affects R5, R6, R7][Technical] Decide the exact shared type names for resolved generation settings and generated media trace metadata.
- [Affects R10-R13][Technical] Decide the exact manifest structure for subtitle, BGM, transition, and style-pack references.
- [Affects R1, R10][Technical] Decide whether placeholder subtitle sidecar files are useful in mock mode or whether manifest metadata is enough for this phase.
