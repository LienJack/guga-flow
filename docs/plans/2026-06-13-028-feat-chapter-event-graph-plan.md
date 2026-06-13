---
title: feat: Add chapter event graph extraction
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-028-tf-14-chapter-event-graph-requirements.md
---

# feat: Add chapter event graph extraction

## Summary

Implement TF-14 with deterministic chapter splitting, persisted event graphs, novel panel controls, and storyboard generation/import trace integration.

## Requirements

- R1. Split novel content into chapters.
- R2. Derive bounded timeline events per chapter.
- R3. Persist graph records per NovelDocument.
- R4. Expose extract/fetch APIs.
- R5. Use latest event graph in storyboard generation.
- R6. Preserve event-to-Shot trace through import.
- R7. Add frontend API/UI controls.
- R8. Keep v1 deterministic and local.

## Scope Boundaries

- No LLM event extraction.
- No graph visualization canvas.
- No cross-novel memory.
- No rewrite of existing storyboard schema.

## Implementation Units

- U1. **Shared contracts and schema**
  - Files: `packages/shared-types/src/domain/novel-events.ts`, `packages/shared-types/src/index.ts`, Prisma schema/migration, shared tests.
  - Verification: shared-types build/test.

- U2. **Backend extraction and generation integration**
  - Files: `apps/backend/src/novels/*`, backend tests/e2e mock.
  - Verification: backend novel tests and full backend test suite.

- U3. **Frontend Novel panel**
  - Files: `apps/frontend/src/lib/api.ts`, `api.test.ts`, `apps/frontend/src/components/novels/novel-storyboard-panel.tsx`, tests/CSS.
  - Verification: frontend focused tests/lint.

- U4. **Docs and final verification**
  - Files: `docs/development.md`, architecture pattern note, this plan.
  - Verification: root build, test, format check, mock workflow, browser smoke.

## Implementation Outcome

- Added shared `NovelEventGraphRecord`, `NovelChapterSummary`, and extraction result contracts.
- Added Prisma-backed `NovelEventGraph` snapshots tied to `NovelDocument`.
- Added deterministic chapter splitting and event extraction in `NovelsService`.
- Added APIs to extract events and fetch the latest event graph.
- Updated storyboard generation to apply the latest extracted graph to storyboard `storyBlueprint.timelineEvents`, scene event ids, and shot event ids/source excerpts.
- Added Novel panel event extraction controls and a compact event/chapter summary.
- Documented the event graph to storyboard trace boundary.

## Verification Log

- `pnpm db:generate`
- `pnpm --filter @guga-flow/shared-types build`
- `pnpm --filter @guga-flow/shared-types test -- src/domain/domain.test.ts`
- `pnpm --filter @guga-flow/backend exec vitest run src/novels/novels.service.spec.ts`
- `pnpm --filter @guga-flow/frontend test -- src/lib/api.test.ts src/components/novels/novel-storyboard-panel.test.tsx`
- `pnpm --filter @guga-flow/shared-types lint`
- `pnpm --filter @guga-flow/backend lint`
- `pnpm --filter @guga-flow/frontend lint`
- `pnpm --filter @guga-flow/backend test`
- `pnpm run build`
- `pnpm run test`
- `pnpm run format:check`
- `pnpm run mock:workflow`
- `git diff --check`
- Browser smoke at `http://localhost:3001/projects/project_1/canvas`: Novel panel rendered. Backend was not running, so saved-novel event controls were not reachable in browser; component/API tests verified the selected-novel Extract events UI.

All `pnpm` commands completed with the existing repository warning that the current shell uses Node `v22.22.2` while `package.json` requests `>=26.3.0`.
