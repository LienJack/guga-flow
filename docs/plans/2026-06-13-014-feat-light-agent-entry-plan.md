---
title: feat: Add light agent creative entry
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-014-phase-13-light-agent-entry-requirements.md
---

# feat: Add light agent creative entry

## Summary

Implement Phase 13 by adding a project-scoped creative-brief API that persists a `novel_to_storyboard` generation job, generated source document, and ready storyboard draft, then expose it through a layered canvas-workspace entry that can optionally reuse the existing storyboard import API to create canvas nodes and edges.

---

## Problem Frame

The existing novel/storyboard workflow requires users to create or import source text before reaching the canvas. Phase 13 needs a faster idea-first path while preserving the established server-side validation, job history, and canvas import boundaries.

---

## Assumptions

*This plan was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the input -- un-validated bets that should be reviewed before implementation proceeds.*

- `novel_to_storyboard` can be a backend-completed `GenerationJob`; it does not need worker claiming, retry, or cancellation in this phase.
- A ready storyboard draft is acceptable output for the creative entry because the generated draft can still be edited before or after canvas import.
- Novice/advanced/professional layering can be implemented as a compact segmented entry embedded above the existing Novel/Storyboard controls.

---

## Requirements

- R1. Provide a one-sentence creative idea entry in the canvas workspace that creates a storyboard draft without a pre-existing uploaded or pasted source.
- R2. Return a persisted source document, validated ready storyboard draft, and durable `novel_to_storyboard` generation job for successful creative-entry actions.
- R3. Keep novice mode minimal while exposing limited advanced direction fields and leaving professional source/storyboard/canvas editing available.
- R4. Persist creative generation as `GenerationJob`; persist canvas import through existing `CanvasNode` and `CanvasEdge` creation.
- R5. Do not let frontend-only state create durable drafts, nodes, edges, or provider outputs.
- R6. Surface validation/provider/import failures near the creative entry and confirm new canvas versions when prior storyboard imports exist.

**Origin actors:** A1 novice creator, A2 advanced creator, A3 professional creator, A4 system auditor
**Origin flows:** F1 one-sentence idea to storyboard draft, F2 draft to canvas, F3 layered interaction
**Origin acceptance examples:** AE1, AE2, AE3, AE4, AE5

---

## Scope Boundaries

- No full chat agent, streaming actions, natural-language canvas edits, memory recall, or skill-management surface.
- No new AgentRun table or audit UI; job history is the audit primitive for this phase.
- No real LLM provider work; continue using existing mock LLM/provider registry behavior.
- No parallel canvas import service; canvas graph creation stays in `CanvasService.importStoryboard`.
- No redesign of the existing Novel/Storyboard professional editor.

### Deferred to Follow-Up Work

- Add retry/cancel semantics for `novel_to_storyboard` only if a later async LLM path requires it.
- Add richer prompt/skill configuration after TF-13/UI-TF-09 defines the setting model.

---

## Context & Research

### Relevant Code and Patterns

- `apps/backend/src/novels/novels.service.ts` already owns source document creation, mock LLM storyboard generation, shared storyboard validation, draft persistence, and ready marking.
- `apps/backend/src/canvas/canvas.service.ts` already owns storyboard draft import, duplicate versioning, `CanvasNode` creation, `CanvasEdge` creation, and semantic edge validation.
- `packages/shared-types/src/domain/project.ts` holds novel/source DTOs; `packages/shared-types/src/domain/storyboard.ts` holds draft result types; `packages/shared-types/src/domain/generation.ts` already includes `novel_to_storyboard` in the operation union.
- `apps/frontend/src/components/novels/novel-storyboard-panel.tsx` owns the local novel/draft/editor/import state and can integrate a creative entry without cross-component state plumbing.
- `apps/frontend/src/lib/api.ts` is the project-scoped frontend API wrapper pattern to extend.

### Institutional Learnings

- `docs/solutions/architecture-patterns/storyboard-draft-validation-import-boundary-2026-06-12.md` says storyboard drafts must be validated before persistence and ready-for-import must not itself create canvas nodes.
- `docs/solutions/architecture-patterns/generation-worker-backend-side-effects-2026-06-12.md` says durable generation side effects and job lifecycle belong behind backend boundaries, not in browser state.
- `docs/solutions/architecture-patterns/storyboard-import-layout-provenance-2026-06-12.md` establishes that canvas import should retain provenance and create graph records through the canonical import path.

### External References

- None used. The local roadmap already captured the Xiaoyunque comparison needed for this phase, and the implementation is governed by existing repo boundaries.

---

## Key Technical Decisions

- Keep orchestration in `NovelsService`: the creative brief creates a generated source, records a `novel_to_storyboard` job, calls the same mock LLM registry, validates the result, and stores a ready draft. This avoids a new service/table before TF-11 introduces broader agent orchestration.
- Use `GenerationJob.operation=novel_to_storyboard` as append-only audit for the creative action. The job stores the original brief input and generated draft/source output, and failure writes a failed job instead of pretending no action occurred.
- Let frontend auto-import be a composition of two server calls. The creative endpoint returns a ready draft; if the user requested canvas draft, the component calls the existing storyboard import API, preserving `CanvasService` as the only canvas graph writer.
- Implement layered interaction in a separate `CreativeAgentEntry` component embedded inside `NovelStoryboardPanel`. This keeps the entry testable while letting the parent update selected novel/draft/editor state after success.

---

## Open Questions

### Resolved During Planning

- Should creative-entry canvas creation happen inside the novels endpoint?: No. Canvas graph creation must stay in `CanvasService.importStoryboard` to preserve import provenance, duplicate policy, and edge validation.
- Should Phase 13 add an AgentRun model?: No. The roadmap completion signal allows `GenerationJob`, and full agent audit/undo belongs with TF-11/TF-12.

### Deferred to Implementation

- Exact brief-to-source wording: adjust while implementing so generated source remains readable and provider input includes optional advanced fields without becoming a schema contract.

---

## Implementation Units

- U1. **Shared creative-entry contract**

**Goal:** Add shared request/response types for the creative brief endpoint and make `novel_to_storyboard` usable as a typed generation input/output.

**Requirements:** R1, R2, R4

**Dependencies:** None

**Files:**
- Modify: `packages/shared-types/src/domain/project.ts`
- Modify: `packages/shared-types/src/domain/generation.ts`
- Test: `packages/shared-types/src/domain/domain.test.ts`

**Approach:**
- Add a small `CreativeAgentMode` union for novice, advanced, and professional layers.
- Add creative brief input/result interfaces carrying idea, optional direction fields, returned novel, draft, job, and validation result.
- Add a typed `NovelToStoryboardJobInput`/output to the generation domain and include it where `GenerationJobInput` is defined.

**Patterns to follow:**
- Existing DTO/result definitions in `project.ts`.
- Existing operation-specific input/output types in `generation.ts`.

**Test scenarios:**
- Happy path: domain type test can construct a creative brief input and result containing a `novel_to_storyboard` job.
- Edge case: default/optional fields remain optional in type-level fixtures so novice mode does not require advanced settings.

**Verification:**
- Shared-types build and domain tests pass with the new contract exported through `packages/shared-types/src/index.ts`.

---

- U2. **Backend creative brief endpoint and durable job lifecycle**

**Goal:** Add a project-scoped endpoint that turns a brief into a generated source, ready storyboard draft, and succeeded/failed `novel_to_storyboard` job.

**Requirements:** R1, R2, R4, R5, R6; Covers F1 / AE1 / AE5

**Dependencies:** U1

**Files:**
- Modify: `apps/backend/src/novels/dto.ts`
- Modify: `apps/backend/src/novels/novels.controller.ts`
- Modify: `apps/backend/src/novels/novels.service.ts`
- Test: `apps/backend/src/novels/novels.service.spec.ts`

**Approach:**
- Add `POST /projects/:projectId/novels/creative-brief`.
- Validate idea length and optional layer fields in DTO/service normalization.
- Create a `GenerationJob` in running state after project validation and before provider execution.
- Create the generated `NovelDocument`, invoke the mock LLM with composed source text, validate storyboard output, persist a ready `StoryboardDraft`, and update the job to succeeded with novel/draft ids and validation output.
- If provider execution or validation fails after job creation, update the job to failed with a readable error and avoid creating a misleading ready draft.

**Patterns to follow:**
- `generateStoryboard` validation and provider invocation in `apps/backend/src/novels/novels.service.ts`.
- Job persistence patterns in `apps/backend/src/generation/generation.service.ts`.

**Test scenarios:**
- Happy path: valid idea creates one novel, one ready draft, and a succeeded `novel_to_storyboard` job with input/output JSON.
- Edge case: blank or too-short ideas reject before creating a job.
- Error path: mock provider failure marks the created job failed and does not persist a storyboard draft.
- Integration: result carries the same project id across novel, draft, and job records.

**Verification:**
- Backend novel service tests prove success, validation rejection, and provider failure lifecycle.

---

- U3. **Frontend API and creative entry component**

**Goal:** Expose the creative endpoint in the frontend API layer and implement a reusable entry component with novice, advanced, and professional layers.

**Requirements:** R1, R2, R3, R5, R6; Covers F3 / AE3 / AE4 / AE5

**Dependencies:** U1, U2

**Files:**
- Modify: `apps/frontend/src/lib/api.ts`
- Modify: `apps/frontend/src/lib/api.test.ts`
- Create: `apps/frontend/src/components/novels/creative-agent-entry.tsx`
- Create: `apps/frontend/src/components/novels/creative-agent-entry.test.tsx`
- Modify: `apps/frontend/src/app/globals.css`

**Approach:**
- Add `createCreativeStoryboard(projectId, input)` to the API wrapper.
- Build `CreativeAgentEntry` with a segmented mode control, idea field, optional advanced/pro fields, and a canvas-draft checkbox.
- When canvas draft is enabled and prior storyboard imports exist, require an explicit confirmation before calling import.
- Keep error/notice state local to the entry; return created novel/draft/job to the parent through callbacks.

**Patterns to follow:**
- `NovelStoryboardPanel` action/error state shape.
- Existing compact button, field-label, form-error/form-success, and segmented sort-mode CSS patterns.

**Test scenarios:**
- Happy path: rendered entry includes idea input, mode controls, and submit button.
- Edge case: novice mode does not render advanced direction fields; advanced/pro mode does.
- Error path: prior imports with canvas draft enabled render a confirm state before import.
- API path: API test verifies request URL and body for the creative endpoint.

**Verification:**
- Frontend tests pass and static markup includes expected accessible labels without text overflow-prone controls.

---

- U4. **Integrate entry into storyboard/canvas workspace**

**Goal:** Wire the creative entry into the existing Novel/Storyboard panel so successful drafts become selected/editable and optional canvas import refreshes the canvas.

**Requirements:** R2, R3, R4, R5, R6; Covers F2 / AE2 / AE4

**Dependencies:** U2, U3

**Files:**
- Modify: `apps/frontend/src/components/novels/novel-storyboard-panel.tsx`
- Modify: `apps/frontend/src/components/novels/novel-storyboard-panel.test.tsx`

**Approach:**
- Render `CreativeAgentEntry` above manual source creation.
- On creative success, prepend/replace the returned novel, select it, apply the returned ready draft, and clear dirty state.
- If the entry imported to canvas, forward the import result through the existing `onStoryboardImported` callback so `ProjectCanvasWorkspace` merges imported nodes/edges.

**Patterns to follow:**
- Existing `applyDraft`, `replaceNovel`, `handleImportStoryboard`, and `hasExistingStoryboardImports` behavior in `NovelStoryboardPanel`.

**Test scenarios:**
- Happy path: panel static markup includes the creative entry and existing professional storyboard controls.
- Integration: callback wiring can accept a created draft and keep the storyboard editor visible through component props/static render.
- Regression: existing create/import/update/generate controls remain rendered.

**Verification:**
- Existing NovelStoryboardPanel tests pass with expanded markup assertions.

---

- U5. **Verification and browser smoke**

**Goal:** Prove the Phase 13 path works across type, backend, frontend, and browser surfaces.

**Requirements:** R1-R6; Covers AE1-AE5

**Dependencies:** U1-U4

**Files:**
- No production files expected.

**Approach:**
- Run focused shared-types, backend, and frontend tests first.
- Run workspace format/check/build if focused tests pass.
- Use the browser against the local frontend/backend if available to create a project, submit a creative idea, and confirm a storyboard/canvas draft appears without console errors.

**Patterns to follow:**
- Phase 12 browser smoke pattern: use existing dev servers when already running and clean up smoke projects after API-level creation.

**Test scenarios:**
- Integration: creative idea creates a job visible in queue/history.
- Integration: optional import creates canvas graph facts and refreshes the canvas.
- Error path: no browser console errors during submit/import.

**Verification:**
- Focused tests, root test/build/format checks, and browser smoke complete or any blocker is documented with concrete failure details.

---

## System-Wide Impact

- **Interaction graph:** New frontend entry -> new novels API endpoint -> mock LLM provider -> `NovelDocument`/`StoryboardDraft`/`GenerationJob`; optional frontend import -> existing canvas import service -> `CanvasNode`/`CanvasEdge`.
- **Error propagation:** Validation failures reject before job creation; provider/validation failures after job creation update the job to failed and surface the error to the frontend.
- **State lifecycle risks:** The creative action creates multiple persistent records; tests must prove failure does not leave a ready draft without a successful job.
- **API surface parity:** This phase adds a frontend-facing API but does not add worker claim/succeed/fail handling for `novel_to_storyboard`.
- **Integration coverage:** Backend service tests cover persistence lifecycle; frontend component tests cover layered UI and import confirmation; browser smoke covers the composed user path.
- **Unchanged invariants:** Canvas graph rows continue to be created only by the canvas import API, not by the new creative endpoint or browser-only state.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `GenerationJob` history includes an operation the worker never claims | Keep `novel_to_storyboard` out of worker operation lists and treat it as backend-completed history; tests should assert it reaches terminal state synchronously. |
| New entry duplicates existing NovelStoryboardPanel state | Embed a small component and pass callbacks to the panel rather than creating separate global state. |
| Auto-import surprises users by creating another canvas version | Require explicit confirmation when prior storyboard import provenance exists. |
| Failed provider calls leave partial records | Create job before provider execution, mark failed on provider error, and avoid draft persistence on failure. |

---

## Documentation / Operational Notes

- Update or create an architecture-pattern note only if implementation reveals a reusable lifecycle rule beyond the plan, likely around backend-completed generation jobs.
- No environment variables or deployment settings are expected.

---

## Sources & References

- **Origin document:** [docs/brainstorms/2026-06-13-014-phase-13-light-agent-entry-requirements.md](../brainstorms/2026-06-13-014-phase-13-light-agent-entry-requirements.md)
- Roadmap: [docs/infinite-canvas-video-long-task-development-flow.md](../infinite-canvas-video-long-task-development-flow.md)
- Related learning: [docs/solutions/architecture-patterns/storyboard-draft-validation-import-boundary-2026-06-12.md](../solutions/architecture-patterns/storyboard-draft-validation-import-boundary-2026-06-12.md)
- Related learning: [docs/solutions/architecture-patterns/generation-worker-backend-side-effects-2026-06-12.md](../solutions/architecture-patterns/generation-worker-backend-side-effects-2026-06-12.md)
