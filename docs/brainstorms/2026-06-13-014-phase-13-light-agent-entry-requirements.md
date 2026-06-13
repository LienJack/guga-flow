---
date: 2026-06-13
topic: phase-13-light-agent-entry
---

# Phase 13 Light Agent Entry Requirements

## Summary

Add a lightweight creative-agent entry that turns a one-sentence idea into an editable storyboard draft and, when requested, a canvas draft through the existing storyboard import pipeline. The entry must expose layered interaction for novice, advanced, and professional users without pulling full conversational agent, memory, or skill management work into this phase.

---

## Problem Frame

The current MVP can import or paste source text, generate a mock storyboard draft, edit it, and import it to the canvas. That flow works for structured source material, but it does not satisfy the Phase 13 roadmap item for a Xiaoyunque-style "one sentence idea" entry. Users must still understand the novel/source workflow before they can test a simple creative concept on the canvas.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input -- un-validated bets that should be reviewed before planning proceeds.*

- The Phase 13 entry can be synchronous and mock-provider backed; real conversational streaming is part of later TF-11/TF-12 work.
- The durable audit primitive for this phase can be `GenerationJob.operation=novel_to_storyboard`, with canvas import continuing to create `CanvasNode` and `CanvasEdge` records through the existing import service.
- Professional editing can reuse the existing source/storyboard editor and canvas inspector rather than adding a separate pro workspace.

---

## Actors

- A1. Novice creator: starts from a short idea and expects a canvas-ready draft with minimal settings.
- A2. Advanced creator: starts from a short idea but wants a few optional direction fields before draft creation.
- A3. Professional creator: needs the generated source/storyboard/canvas artifacts to remain editable through existing detailed controls.
- A4. System auditor: verifies that agent-like actions are persisted as durable jobs, nodes, or edges.

---

## Key Flows

- F1. One-sentence idea to storyboard draft
  - **Trigger:** A creator submits a non-empty creative idea from the canvas workspace.
  - **Actors:** A1, A2, A3, A4
  - **Steps:** The system validates the idea, persists a generated source document, records a `novel_to_storyboard` generation job, generates and validates a storyboard draft, marks it ready for import, and returns both the draft and job.
  - **Outcome:** A reloadable `NovelDocument`, ready `StoryboardDraft`, and auditable `GenerationJob` exist for the project.
  - **Covered by:** R1, R2, R5, R6

- F2. Draft to canvas
  - **Trigger:** A creator asks the lightweight entry to create a canvas draft, or imports the returned draft through the existing storyboard controls.
  - **Actors:** A1, A3, A4
  - **Steps:** The frontend uses the ready draft with the existing storyboard import API; the import service creates normalized canvas nodes and semantic edges; the canvas refreshes to show the draft.
  - **Outcome:** The creative idea is represented by editable `CanvasNode` and `CanvasEdge` records without duplicating import logic in the agent entry.
  - **Covered by:** R2, R6, R7

- F3. Layered interaction
  - **Trigger:** A creator chooses novice, advanced, or professional mode.
  - **Actors:** A1, A2, A3
  - **Steps:** Novice mode keeps the visible entry to the idea and canvas-draft choice; advanced mode exposes a small set of direction fields; professional mode keeps the generated source, storyboard editor, and canvas controls available for detailed revision.
  - **Outcome:** New users are not forced through professional settings, while advanced and pro users can still shape or edit the result.
  - **Covered by:** R3, R4, R8

---

## Requirements

**Creative entry**
- R1. The canvas workspace must provide a one-sentence creative idea entry that can create a storyboard draft without requiring an uploaded or pasted long-form source first.
- R2. A successful creative entry action must return a persisted source document, a validated storyboard draft, and a generation job record for the same project.
- R3. The default novice path must keep optional parameters hidden or minimized so the user can submit an idea without understanding provider settings, JSON, or storyboard schema.
- R4. Advanced and professional paths must not remove existing source editing, storyboard editing, or canvas node editing controls.

**Durability and audit**
- R5. The creative-entry generation action must be durable as a `GenerationJob` so it appears in queue/history with provider, model, input, output, status, and error state.
- R6. Canvas creation from the generated draft must continue to use the existing storyboard import behavior so graph state is durable as `CanvasNode` and `CanvasEdge` rows.
- R7. The frontend must not create canvas nodes, canvas edges, storyboard drafts, or provider outputs directly in browser-only state.

**Layered UX**
- R8. The entry must distinguish novice, advanced, and professional layers in the UI without turning the phase into a full chat agent or settings center.
- R9. If canvas import would create another storyboard import version, the UI must make that explicit before doing the import.
- R10. Errors from validation, provider generation, and canvas import must be visible near the creative entry and must not leave the UI implying that a draft was created when it was not.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R5.** Given an empty canvas project, when a user submits "一个女孩在雨夜发现会发光的地铁入口", the backend persists a source document, a ready storyboard draft, and a succeeded `novel_to_storyboard` job.
- AE2. **Covers R2, R6, R7.** Given a successful creative entry with canvas draft enabled, when import completes, the canvas contains imported novel, scene, shot, character, and location nodes plus semantic edges created by the import API.
- AE3. **Covers R3, R4, R8.** Given the entry is in novice mode, advanced fields are not shown; when the user switches to advanced mode, direction fields become available; when the draft is created, the professional storyboard editor remains available below.
- AE4. **Covers R9.** Given the canvas already has a storyboard import, when the user asks the creative entry to send a new draft to canvas, the UI requires an explicit new-version confirmation before import.
- AE5. **Covers R10.** Given the provider fails or validation rejects the generated storyboard, when the user submits a brief, the UI shows the failure and no successful draft/canvas notice is shown.

---

## Success Criteria

- A first-time user can type one idea in the canvas workspace and receive a draft that can be edited as storyboard data and/or canvas nodes.
- Phase 13 does not bypass existing server-side storyboard validation, generation job history, or canvas import graph rules.
- The plan and implementation leave TF-11 conversational canvas operations, TF-12 memory, TF-13 skill management, and later Xiaoyunque gaps clearly out of scope.

---

## Scope Boundaries

- Full chat-style agent conversation, streaming partial actions, natural-language canvas edits, undo/audit UI, and memory recall are deferred to TF-11/TF-12.
- Skill template management, online skill editing, and prompt library settings are deferred to TF-13/UI-TF-09.
- Story blueprint, role lifecycle, generation packaging parameters, reference-image story seeding, viral remake, digital human, collaboration, and multi-format export are later roadmap phases.
- Real LLM provider integration is not required for Phase 13; the existing mock LLM/provider pattern is acceptable for the MVP path.
- The creative entry should not introduce a parallel canvas import implementation.

---

## Key Decisions

- Use the existing storyboard pipeline as the product backbone: it already creates validated drafts and imports durable canvas graph records.
- Make `GenerationJob` the lightweight action audit record for the creative-entry generation step instead of adding a new AgentRun table in this phase.
- Treat "professional flow" as continued access to the existing source/storyboard/canvas controls, not as a new professional editor.

---

## Dependencies / Assumptions

- Phase 5 and Phase 6 storyboard generation/import behavior is available and remains the canonical path for draft validation and canvas graph creation.
- Phase 8+ generation queue history can show `novel_to_storyboard` jobs even though those jobs are executed synchronously by the backend rather than claimed by the worker.
- Existing canvas productivity/navigation controls are sufficient to inspect the resulting draft nodes after import.

---

## Outstanding Questions

### Deferred to Planning

- [Affects R5][Technical] Should the `novel_to_storyboard` job be created and completed inside the novels service or a generation-specific orchestration service?
- [Affects R8][Technical] Should the lightweight entry be a separate component embedded in the storyboard panel or be owned directly by the panel state?
