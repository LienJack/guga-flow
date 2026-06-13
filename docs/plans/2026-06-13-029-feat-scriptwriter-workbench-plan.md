---
title: feat: Add scriptwriter workbench
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-029-tf-15-scriptwriter-workbench-requirements.md
---

# feat: Add scriptwriter workbench

## Summary

Implement TF-15 with persisted script drafts, deterministic generation, export, storyboard conversion, and compact Novel panel controls.

## Implementation Units

- U1. **Shared contracts and schema**
  - Files: `packages/shared-types/src/domain/script.ts`, exports, tests, Prisma schema/migration.
  - Verification: shared-types build/test.

- U2. **Backend script draft workflow**
  - Files: `apps/backend/src/novels/*`, backend tests/e2e mock.
  - Verification: backend novel tests and full backend test suite.

- U3. **Frontend Novel panel**
  - Files: `apps/frontend/src/lib/api.ts`, `api.test.ts`, `novel-storyboard-panel.tsx`, tests/CSS.
  - Verification: frontend tests/lint and browser smoke.

- U4. **Docs and final verification**
  - Files: `docs/development.md`, architecture pattern note, this plan.
  - Verification: root build, test, format check, mock workflow, `git diff --check`.

## Outcome

Implemented TF-15 as a deterministic scriptwriter workbench:

- `ScriptDraft` persistence with per-novel versions, strategy, status, and JSON script content.
- Backend Novel routes for draft listing, creation, text export, and script-to-storyboard conversion.
- Event graph aware script beats that preserve event ids and source excerpts.
- Frontend Novel panel Script controls for strategy, create, export, and storyboard generation.
- Standard `StoryboardDraft` output so existing save, ready, and canvas import behavior remains unchanged.

## Verification

Passed on 2026-06-13:

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

Browser smoke:

- `/projects/project_1/canvas` renders the local Novel/Storyboard panel on the running frontend.
- The backend is not running in this smoke state, so the selected-novel Script controls are covered by `novel-storyboard-panel.test.tsx` rather than reachable through live data.
