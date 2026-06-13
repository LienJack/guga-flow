---
title: feat: Add visible agent memory system
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-026-tf-12-agent-memory-system-requirements.md
---

# feat: Add visible agent memory system

## Summary

Implement TF-12 with project-scoped memory records, deterministic recall, sidebar controls, and `agent_canvas_action` job input traceability.

## Requirements

- R1. Persist memory records backend-side.
- R2. Include scope, title, content, summary, tags, source, enabled state, and timestamps.
- R3. Return memory content for review.
- R4. Recall enabled memories during agent canvas actions and store recalled ids in the job input.
- R5. Keep recall deterministic and bounded.
- R6. Disable individual memories.
- R7. Clear project memories.
- R8. Exclude disabled memories from recall.

## Scope Boundaries

- No embeddings, vector search, or cross-project memory.
- No automatic memory extraction.
- No hidden prompt-only memory.
- No full agent identity registry.

## Context & Research

- `apps/backend/src/agents/agents.service.ts` already creates auditable `agent_canvas_action` jobs.
- `packages/shared-types/src/domain/generation.ts` owns the action job input contract that can carry recalled memory ids.
- Project-scoped tables and service patterns exist across `NovelDocument`, `ProviderConfig`, and `ProgrammableProvider`.
- The canvas sidebar already hosts `AgentCanvasActionsPanel`, which is the natural place to expose memory review and controls.

## Key Technical Decisions

- Add a new shared `domain/agent.ts` file for memory contracts and export it from `packages/shared-types/src/index.ts`.
- Add a Prisma `AgentMemory` model with string scope/source fields constrained by service validation rather than enum churn for small taxonomy changes.
- Add memory CRUD/recall methods to `AgentsService` and routes under `/projects/:projectId/agents/memories`.
- Recall up to five enabled memories by matching lowercased query words against title, content, summary, and tags.
- Extend `AgentCanvasActionJobInput` with `memoryIds` and `memorySummary` so recalled context is visible in generation history.
- Add a compact memory manager inside `AgentCanvasActionsPanel`.

## Implementation Units

- U1. **Shared contracts and schema**
  - Files: `packages/shared-types/src/domain/agent.ts`, `packages/shared-types/src/index.ts`, `packages/shared-types/src/domain/generation.ts`, `packages/shared-types/src/domain/domain.test.ts`, `apps/backend/prisma/schema.prisma`, migration.
  - Verification: shared-types build/test.

- U2. **Backend memory service**
  - Files: `apps/backend/src/agents/agents.service.ts`, `apps/backend/src/agents/agents.controller.ts`, `apps/backend/src/agents/dto.ts`, `apps/backend/src/agents/agents.service.spec.ts`.
  - Verification: backend agent tests cover create/list/disable/clear/recall and action job memory ids.

- U3. **Frontend memory controls**
  - Files: `apps/frontend/src/lib/api.ts`, `apps/frontend/src/lib/api.test.ts`, `apps/frontend/src/components/canvas/agent-canvas-actions-panel.tsx`, test, CSS.
  - Verification: frontend API/component tests.

- U4. **Docs and verification**
  - Files: `docs/development.md`, `docs/solutions/architecture-patterns/agent-memory-visible-recall-boundary-2026-06-13.md`.
  - Verification: root build, test, format check, mock workflow, browser smoke.

## Implementation Outcome

- Added project-scoped `AgentMemory` persistence with visible scope, title, content, summary, tags, source, enabled state, and timestamps.
- Added memory create/list/update/disable/clear/recall API routes under `/projects/:projectId/agents/memories`.
- Integrated deterministic bounded memory recall into `agent_canvas_action` jobs and stored `memoryIds` plus `memorySummary` in job input JSON.
- Added a compact memory manager to the canvas Agent panel so memory is reviewable and controllable from the production workspace.
- Documented the visible recall boundary in `docs/development.md` and the architecture pattern note.

## Verification Log

- `pnpm db:generate`
- `pnpm --filter @guga-flow/shared-types test -- src/domain/domain.test.ts`
- `pnpm --filter @guga-flow/shared-types build`
- `pnpm --filter @guga-flow/backend test -- src/agents/agents.service.spec.ts`
- `pnpm --filter @guga-flow/backend lint`
- `pnpm --filter @guga-flow/frontend test -- src/lib/api.test.ts src/components/canvas/agent-canvas-actions-panel.test.tsx`
- `pnpm --filter @guga-flow/frontend lint`
- `pnpm --filter @guga-flow/shared-types lint`
- `pnpm run build`
- `pnpm run test`
- `git diff --check`
- `pnpm run format:check`
- `pnpm run mock:workflow`
- Browser smoke at `http://localhost:3001/projects/project_1/canvas`: Agent panel rendered Memory, Content, Tags, and Add controls.

All `pnpm` commands completed with the existing repository warning that the current shell uses Node `v22.22.2` while `package.json` requests `>=26.3.0`.
