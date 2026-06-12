---
date: 2026-06-12
topic: phase-5-novel-storyboard-json
---

# Phase 5 Novel Import and Storyboard JSON Requirements

## Summary

Phase 5 will let creators paste or upload novel text, generate a mock-provider storyboard draft, validate it against a shared runtime schema, preview/edit the structured result, and leave it ready for the next module's canvas import.

---

## Problem Frame

The canvas now supports durable business nodes and semantic Character/Location relationships, but there is still no upstream story source. Later import, prompt, and generation modules need a structured storyboard artifact rather than ad hoc text copied into individual cards.

The immediate pain is not media generation. It is turning source prose into an inspectable, correctable set of scenes, shots, characters, and locations while the system can still run end-to-end with mock providers and no real model keys.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input — un-validated bets that should be reviewed before planning proceeds.*

- Phase 5 should remain one Deep module because it crosses shared contracts, backend persistence, provider orchestration, and a new frontend preview workflow.
- Storyboard generation should be synchronous for the mock-first MVP, while the data shape remains compatible with later `GenerationJob` orchestration.
- The primary creator input should support pasted text and uploaded `.txt` / `.md` content; uploaded document assets can be reused as source material but should not replace `NovelDocument` as the editable project record.
- Editing the storyboard draft before import should cover scene, shot, character, location, prompt, and duration fields needed by Phase 6 and Phase 7, but it does not need a full spreadsheet editor.
- "Import" in this module means marking or exposing a validated storyboard draft as ready for canvas import. Creating canvas nodes from that draft belongs to Phase 6.

---

## Actors

- A1. Creator: Provides novel text, reviews generated storyboard structure, edits mistakes, and decides when the draft is ready for canvas import.
- A2. Storyboard system: Stores source text, calls the mock LLM provider, validates draft structure, preserves editable drafts, and reports failures.
- A3. Future canvas import system: Consumes a validated storyboard draft to create Scene, Shot, Character, Location, and semantic edge records in Phase 6.
- A4. Future prompt/generation modules: Consume scene/shot prompt fields and reference temp ids after import.

---

## Key Flows

- F1. Create or update a novel source
  - **Trigger:** A creator pastes novel text or uploads a `.txt` / `.md` source.
  - **Actors:** A1, A2
  - **Steps:** The system stores the source as a project-scoped novel record, calculates readable metadata such as word count and language, and makes the source available for generation.
  - **Outcome:** The project has an editable novel source that can be regenerated without re-uploading.
  - **Covered by:** R1, R2, R3, R4

- F2. Generate a mock storyboard draft
  - **Trigger:** A creator asks to generate a storyboard from a selected novel source.
  - **Actors:** A1, A2
  - **Steps:** The system sends the novel text to the mock LLM provider, validates the returned storyboard structure, stores the draft and validation state, and shows the result.
  - **Outcome:** The creator can review a structured storyboard without any real provider key.
  - **Covered by:** R5, R6, R7, R8, R9

- F3. Preview and edit the storyboard
  - **Trigger:** A creator opens a generated storyboard draft.
  - **Actors:** A1, A2
  - **Steps:** The UI presents scenes, shots, characters, and locations in a scannable editor; the creator edits titles, summaries, prompts, references, and durations; the system validates and persists the edited draft.
  - **Outcome:** The draft can be corrected before it becomes canvas nodes.
  - **Covered by:** R10, R11, R12, R13, R14

- F4. Recover from invalid output or provider failure
  - **Trigger:** The provider fails, returns invalid structure, or the creator edits the draft into an invalid state.
  - **Actors:** A1, A2
  - **Steps:** The system shows the failure, keeps the novel source intact, preserves the last valid draft when available, and allows retry or correction.
  - **Outcome:** A failed generation does not corrupt the project or block future retry.
  - **Covered by:** R8, R9, R12, R15, R16

---

## Requirements

**Novel source management**
- R1. A project must support creating and listing novel source records.
- R2. A novel source must support pasted text and uploaded text/markdown content as creator inputs.
- R3. A novel source must retain title, source type, content, word count, language, and updated timestamp.
- R4. Updating or deleting a novel source must stay project-scoped and must not delete unrelated canvas nodes, semantic edges, or uploaded media assets.

**Storyboard generation and validation**
- R5. A creator must be able to generate a storyboard draft from a selected novel source using the mock LLM provider without real API keys.
- R6. Generated storyboard output must include title, logline, characters, locations, scenes, and shots with stable temporary ids for cross-reference.
- R7. Storyboard output must be validated by a shared runtime schema before being treated as usable.
- R8. Invalid provider output must be rejected visibly and must not replace the last valid storyboard draft.
- R9. Provider failures must show a retryable error state and preserve the novel source.

**Preview, edit, and readiness**
- R10. The frontend must show a storyboard preview/editor that is useful for scanning scenes, shots, characters, and locations before canvas import.
- R11. A creator must be able to edit core storyboard fields needed downstream: scene titles/summaries, shot visual/action/camera/prompt/duration fields, character identity fields, location prompt fields, and scene/shot reference temp ids.
- R12. Saving edited storyboard data must revalidate the complete draft and surface validation failures without persisting invalid state as import-ready.
- R13. A validated draft must be reloadable after refreshing the project.
- R14. The draft must expose a clear ready-for-canvas-import state or action for Phase 6 to consume.
- R15. Empty novel text, unsupported uploads, missing scenes, missing shots, duplicate temp ids, and references to missing characters or locations must be handled safely.
- R16. Existing project dashboard, asset library, canvas, and semantic edge behavior must remain available.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R3.** Given a project exists, when the creator pastes a titled novel excerpt and saves it, the source appears in the project's novel list with word count, source type, language, and content available for editing.
- AE2. **Covers R2, R3, R15.** Given a `.txt` or `.md` file is selected as source, when the creator imports it, a novel source is created from the text; unsupported file types are rejected without creating a partial source.
- AE3. **Covers R5, R6, R7, R13.** Given a saved novel source exists, when the creator generates a mock storyboard, a validated draft with characters, locations, scenes, and shots appears and remains after refresh.
- AE4. **Covers R10, R11, R12.** Given a generated draft exists, when the creator edits a Shot duration and prompt fields and saves, the edited draft validates and reloads with those changes.
- AE5. **Covers R8, R9, R15.** Given a provider failure or invalid draft, when generation or save fails, the UI shows the failure, keeps the novel source, and does not replace the last valid draft.
- AE6. **Covers R14, R16.** Given a validated storyboard draft exists, when the creator marks it ready for import, the canvas remains available and Phase 6 has a validated draft to consume without creating nodes yet.

---

## Success Criteria

- A creator can go from pasted or uploaded source text to a validated, editable storyboard draft without real model keys.
- The storyboard draft is structured enough that Phase 6 can import scenes, shots, characters, locations, and semantic references without inventing missing product semantics.
- Validation catches malformed generated or edited data before it can become an import-ready draft.
- Existing canvas-first workflows remain intact while the new novel/storyboard workflow is added.

---

## Scope Boundaries

- Do not import storyboard drafts into canvas nodes, shapes, or semantic edges in Phase 5.
- Do not implement auto layout, duplicate import policy, or fit-to-content behavior for storyboard import.
- Do not implement Prompt Composer, prompt debug panels, or reference-image enrichment.
- Do not create GenerationJob-backed queue execution for novel-to-storyboard yet; the mock-first synchronous path is acceptable for this module.
- Do not implement real LLM provider configuration, remote provider calls, or provider key UI.
- Do not generate images, videos, or editor packages from storyboard output.
- Do not downgrade Node, Next, React, Prisma, tldraw, or the monorepo architecture to avoid local runtime warnings.

---

## Key Decisions

- Keep `NovelDocument` as the durable editable source record rather than treating uploads alone as the story source.
- Treat `StoryboardResult` as a first-class validated draft artifact before it becomes canvas nodes.
- Preserve mock-first behavior: a user must be able to demonstrate the entire Phase 5 loop without real provider keys.
- Keep Phase 5 import-ready but not canvas-mutating so Phase 6 can own batch node/edge creation and layout as one coherent module.

---

## Dependencies / Assumptions

- Phase 0 provider contracts already include a mock LLM provider that can return a deterministic storyboard result.
- Phase 3 Novel business nodes exist on the canvas, but Phase 5 does not need to couple the novel source editor to a selected Novel node.
- Phase 4 semantic Character/Location references are available for later imported Shot relationships, but Phase 5 only preserves temp ids and references.
- The existing project workbench can host a compact novel/storyboard panel without replacing the canvas-first workspace.

---

## Outstanding Questions

### Resolve Before Planning

- None.

### Deferred to Planning

- [Affects R7, R12][Technical] Should the runtime storyboard schema live beside the existing shared TypeScript interfaces, or in a dedicated validation module that exports both schema and inferred types?
- [Affects R5, R8, R9][Technical] Should mock storyboard generation write through `GenerationJob` now or use a direct provider call while preserving future-compatible result metadata?
- [Affects R10, R11][Technical] What frontend editing surface best fits the existing workbench without turning Phase 5 into a full spreadsheet editor?
