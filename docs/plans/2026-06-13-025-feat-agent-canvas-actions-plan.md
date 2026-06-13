---
title: feat: Add auditable agent canvas actions
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-025-tf-11-agent-canvas-actions-requirements.md
---

# feat: Add auditable agent canvas actions

## Summary

Implement TF-11 as a constrained conversational canvas action path: a project-scoped backend endpoint interprets supported messages, records an `agent_canvas_action` generation job, mutates normal canvas nodes/edges through the same persistence boundary used by manual workflows, and exposes undo for supported succeeded actions.

## Problem Frame

The app already supports idea-to-storyboard generation and rich manual canvas editing. TF-11 should add direct chat-style canvas operations while preserving auditability and avoiding a hidden agent state model.

## Assumptions

- A deterministic command interpreter is acceptable for the first TF-11 slice; real LLM orchestration can wrap the same service later.
- `GenerationJob` is sufficient action history for this module because every action must become normal durable project state.
- Undo can be scoped to created nodes/edges and title/data updates captured in one job output.

## Requirements

- R1. Expose a compact chat-style agent action panel in the canvas workspace.
- R2. Support a small command set for creating canvas nodes, updating selected node titles/content, and linking supported node pairs.
- R3. Fail unsupported or ambiguous messages with readable errors and no graph mutation.
- R4. Create a durable `agent_canvas_action` generation job for every accepted message, including failures after validation.
- R5. Persist all graph changes as `CanvasNode` and `CanvasEdge` records; frontend-only graph writes are out of scope.
- R6. Return created/updated artifact ids for refresh/focus.
- R7. Undo supported succeeded jobs using captured output snapshots.
- R8. Store previous node snapshots for update rollback.
- R9. Reuse existing semantic edge validation.

**Origin actors:** A1 creator, A2 professional editor, A3 system auditor
**Origin flows:** F1 create node, F2 update selected node, F3 link nodes, F4 undo action
**Origin acceptance examples:** AE1-AE5

## Scope Boundaries

- No LLM provider, streaming UI, memory system, autonomous multi-step planner, or chat transcript table.
- No destructive bulk commands.
- No agent-specific graph semantics outside existing node and edge records.
- No replacement for storyboard import, inspector forms, or generation buttons.

## Context & Research

### Relevant Code and Patterns

- `packages/shared-types/src/domain/generation.ts` defines operation unions and job input/output contracts.
- `packages/shared-types/src/domain/canvas.ts` defines node/edge records and create/update input shapes.
- `apps/backend/src/canvas/canvas.service.ts` owns graph validation and persistence for nodes and edges.
- `apps/backend/src/generation/generation.service.ts` and `apps/backend/src/novels/novels.service.ts` show how synchronous operations can create and complete `GenerationJob` records.
- `apps/frontend/src/components/canvas/project-canvas-workspace.tsx` already refreshes canvas facts and generation history after mutations.
- `apps/frontend/src/lib/api.ts` is the shared client wrapper layer for project-scoped endpoints.

### Institutional Learnings

- `docs/solutions/architecture-patterns/generation-worker-backend-side-effects-2026-06-12.md` says durable side effects belong behind backend boundaries.
- `docs/solutions/architecture-patterns/light-agent-entry-generation-job-boundary-2026-06-13.md` establishes `GenerationJob` as the audit boundary for early agent-like flows.
- `docs/solutions/architecture-patterns/semantic-canvas-edge-projection-lifecycle-2026-06-12.md` says semantic edge changes must keep node projection data consistent.

## Key Technical Decisions

- Add a new backend `AgentsModule` rather than placing conversational logic inside `CanvasService`. The service composes `CanvasService` and `PrismaService`, keeping graph rules centralized while isolating command parsing.
- Add `agent_canvas_action` to shared types and the Prisma enum, with typed input/output contracts for action jobs.
- The parser supports explicit prefixes first: `create <type>: <title>`, `update title: <title>`, `link character`, `link location`, `link scene`, and `undo` is a separate endpoint. This keeps failure modes predictable.
- Agent-created nodes use deterministic metadata in `dataJson.agentAction` and shape ids prefixed with `shape:agent-...`, while still using normal node types.
- Undo checks the job belongs to the project, succeeded, is not already undone, and restores/deletes only the artifacts listed in that job output.

## Implementation Units

- U1. **Shared contracts and Prisma enum**

**Goal:** Add typed agent canvas action input/output records and make the operation valid across shared types and Prisma.

**Requirements:** R4, R6, R7, R8

**Files:**
- Modify: `packages/shared-types/src/domain/generation.ts`
- Modify: `packages/shared-types/src/domain/domain.test.ts`
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260613140000_tf_11_agent_canvas_actions/migration.sql`

**Approach:**
- Add `agent_canvas_action` to `GENERATION_OPERATIONS`, Prisma `GenerationOperation`, and `GenerationJobInput`.
- Add `AgentCanvasActionInput`, action kind unions, artifact output types, and undo result types.
- Add a domain test fixture that constructs a succeeded action job output with created nodes and previous snapshots.

**Test scenarios:**
- Happy path: shared type fixture can represent create/update/link outputs.
- Edge case: output can represent an undone action with `undoneAt` and restored artifact ids.

**Verification:** Shared-types build and domain tests pass.

---

- U2. **Backend agent action service and endpoints**

**Goal:** Implement project-scoped create-action and undo endpoints that compose the existing canvas service.

**Requirements:** R2-R9; Covers AE1-AE4

**Files:**
- Create: `apps/backend/src/agents/agents.module.ts`
- Create: `apps/backend/src/agents/agents.controller.ts`
- Create: `apps/backend/src/agents/agents.service.ts`
- Create: `apps/backend/src/agents/dto.ts`
- Modify: `apps/backend/src/app.module.ts`
- Test: `apps/backend/src/agents/agents.service.spec.ts`

**Approach:**
- Parse supported messages into one action plan. Reject ambiguous/unsupported commands before graph mutation, but after creating a failed audit job for accepted requests.
- Create a running `GenerationJob`, execute canvas mutation, then update the job to succeeded with artifact output.
- Use `CanvasService.createNode`, `CanvasService.updateNode`, and `CanvasService.createEdge` so existing validation remains authoritative.
- Undo by reading the original job output, deleting created edges before nodes, restoring previous node snapshots, and updating the original job output with undo metadata.

**Test scenarios:**
- Happy path: `create shot: ...` creates a node and succeeded audit job.
- Error path: unsupported message creates a failed job and no node.
- Integration: `link character` uses canvas edge service and returns edge ids.
- Undo: update action restores previous node title/data and marks the job output undone.

**Verification:** Backend agent tests pass with existing canvas/generation tests.

---

- U3. **Frontend API and agent panel**

**Goal:** Add API wrappers and a canvas sidebar panel for submitting agent messages, showing the result, focusing changed nodes, and undoing the last action.

**Requirements:** R1, R3, R5, R6, R7; Covers AE5

**Files:**
- Modify: `apps/frontend/src/lib/api.ts`
- Modify: `apps/frontend/src/lib/api.test.ts`
- Create: `apps/frontend/src/components/canvas/agent-canvas-actions-panel.tsx`
- Create: `apps/frontend/src/components/canvas/agent-canvas-actions-panel.test.tsx`
- Modify: `apps/frontend/src/components/canvas/project-canvas-workspace.tsx`
- Modify: `apps/frontend/src/app/globals.css`

**Approach:**
- Add `createAgentCanvasAction(projectId, input)` and `undoAgentCanvasAction(projectId, jobId)`.
- Render a compact panel in the workspace sidebar with a message textarea, selected-node context, selected source/target context, action status, and undo button for the latest undoable result.
- On success or undo, refresh canvas facts and generation jobs; focus the first created/updated node when available.

**Test scenarios:**
- Static render includes accessible message field, submit button, selected context, and no advanced hidden state.
- Result state can show created/updated artifacts and an undo affordance.
- API tests verify endpoint URLs and request bodies.

**Verification:** Frontend component/API tests pass.

---

- U4. **Verification, docs, and review**

**Goal:** Complete quality gates and document the reusable learning.

**Requirements:** R1-R9

**Files:**
- Modify: `docs/development.md`
- Create: `docs/solutions/architecture-patterns/agent-canvas-action-generation-job-audit-2026-06-13.md`

**Approach:**
- Run focused tests for shared types, backend agent service, frontend API/component.
- Run package lint/build plus repo build/mock workflow if focused tests pass.
- Update the plan status to completed after verification.
- Review for security/correctness issues around unsupported commands and undo safety.

**Verification:** Focused and broad checks pass or documented failures are routed.

## Implementation Outcome

TF-11 shipped as a constrained, auditable agent canvas action slice:

- Added `agent_canvas_action` to shared generation operation contracts and the Prisma enum.
- Added a Nest `AgentsModule` with project-scoped submit and undo endpoints.
- Supported deterministic messages for `create <type>: <title>`, `update title: <title>`, and supported semantic link commands.
- Persisted every non-empty action request as a `GenerationJob` using provider `local-agent`.
- Routed graph mutations through `CanvasService` where possible so node and edge behavior stays aligned with manual workflows.
- Added conservative undo from job output snapshots and artifact ids.
- Added a canvas sidebar Agent panel with message, source/target context, success result, and undo affordance.
- Documented the workflow in `docs/development.md`.
- Captured the reusable pattern in `docs/solutions/architecture-patterns/agent-canvas-action-generation-job-audit-2026-06-13.md`.

## Verification Log

- `pnpm db:generate`
- `pnpm --filter @guga-flow/shared-types test -- src/domain/domain.test.ts`
- `pnpm --filter @guga-flow/shared-types build`
- `pnpm --filter @guga-flow/backend test -- src/agents/agents.service.spec.ts`
- `pnpm --filter @guga-flow/backend build`
- `pnpm --filter @guga-flow/frontend test -- src/lib/api.test.ts src/components/canvas/agent-canvas-actions-panel.test.tsx`
- `pnpm --filter @guga-flow/frontend build`
- `pnpm --filter @guga-flow/backend test -- src/agents/agents.service.spec.ts src/canvas/canvas.service.spec.ts src/generation/generation.service.spec.ts`
- `pnpm --filter @guga-flow/frontend test -- src/lib/api.test.ts src/components/canvas/agent-canvas-actions-panel.test.tsx src/components/canvas/canvas-productivity-panel.test.tsx`
- `pnpm --filter @guga-flow/shared-types lint`
- `pnpm --filter @guga-flow/backend lint`
- `pnpm --filter @guga-flow/frontend lint`
- `pnpm run build`
- `pnpm run test`
- `pnpm run format:check`
- `pnpm run mock:workflow`
- `git diff --check`

Browser smoke:

- Opened `http://localhost:3001/projects/project_1/canvas` in Chrome through the running frontend dev server.
- Confirmed the workbench renders the Agent panel with Message, Source, Target, and Run controls in the sidebar.
- Backend was not running for live API mutation smoke, so the page showed expected `Failed to fetch` states for backend-backed panels.

Notes:

- The repo requests Node `>=26.3.0`; local verification ran on Node `v22.22.2`, and every `pnpm` command emitted the existing unsupported-engine warning.
- The `ce-compound` validator path `scripts/validate-frontmatter.py` is not present in this repo, so frontmatter validation could not be run with that script.
