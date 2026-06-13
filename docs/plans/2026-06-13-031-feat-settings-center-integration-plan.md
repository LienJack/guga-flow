---
title: feat: Integrate settings center modules
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-031-tf-17-settings-center-integration-requirements.md
---

# feat: Integrate settings center modules

## Summary

Implement TF-17 by adding shared settings-center DTOs, backend project settings summary/export/import-validation routes, and a frontend settings center shell that groups existing Provider and Skill panels with new Data, Files, Project Defaults, and Version modules.

## Requirements

- R1. Stable module anchors for Providers/Models, Prompts/Skills, Project Defaults, Data, Files, and Version.
- R2. Existing Provider and Skill panels remain usable and secret-safe.
- R3. Backend settings summary exposes project metadata, counts, file summary, capability status, and version metadata.
- R4. Safe export and import-validation endpoints exist without database mutation.
- R5. Files module shows asset counts, type breakdown, and storage bytes.
- R6. Version information is visible in the settings center.

## Implementation Units

- U1. **Shared settings-center contracts**
  - **Files:** `packages/shared-types/src/domain/settings.ts`, `packages/shared-types/src/domain/index.ts`, `packages/shared-types/src/index.ts`, `packages/shared-types/src/domain/domain.test.ts`
  - **Approach:** Add DTOs for summary, export payload, import validation, module status, resource counts, and file summary.
  - **Verification:** Shared build/test.

- U2. **Backend settings summary/export API**
  - **Files:** `apps/backend/src/project-settings/*`, `apps/backend/src/app.module.ts`, backend tests
  - **Approach:** Add project-scoped routes under `/projects/:projectId/settings`: summary, export, import validation. Query existing project, asset, canvas, provider, skill, novel, and export tables. Export safe metadata only.
  - **Verification:** Backend service/controller tests prove counts, safe export, and validation behavior.

- U3. **Frontend settings center shell**
  - **Files:** `apps/frontend/src/app/projects/[projectId]/settings/page.tsx`, new settings center component/tests, `apps/frontend/src/lib/api.ts`, API tests, CSS
  - **Approach:** Replace the flat stack with a module-aware settings center. Reuse ProviderSettingsPanel and SkillTemplateSettingsPanel. Add read-only panels for Project Defaults, Data, Files, and Version.
  - **Verification:** Frontend tests prove module nav, summary rendering, safe export/import validation UI, and existing panels still render.

- U4. **Docs and verification**
  - **Files:** `docs/development.md`, architecture note, this plan, requirements doc
  - **Approach:** Document settings center v1 boundary and validation-only import policy.
- **Verification:** Build/test/lint, mock workflow, browser smoke.

---

## Completion Log

- U1 added shared settings-center contracts and domain coverage.
- U2 added backend summary/export/import-validation routes with service tests.
- U3 replaced the flat settings stack with a settings center shell that reuses Provider and Skill panels and adds Project Defaults, Data, Files, and Version modules.
- U4 documented the v1 boundary and verification.

## Verification Log

- `pnpm --filter @guga-flow/shared-types build`
- `pnpm --filter @guga-flow/shared-types test -- src/domain/domain.test.ts`
- `pnpm --filter @guga-flow/backend exec vitest run src/project-settings/project-settings.service.spec.ts`
- `pnpm --filter @guga-flow/backend lint`
- `pnpm --filter @guga-flow/frontend test -- src/lib/api.test.ts src/components/projects/settings-center.test.tsx`
- `pnpm --filter @guga-flow/frontend lint`
- `pnpm run build`
- `pnpm run test`
- `pnpm run format:check`
- `pnpm run mock:workflow`
- `git diff --check`
- Browser smoke at `http://localhost:3001/projects/project_1/settings`: settings shell, provider/skill sections, and validation-only inspector state rendered; backend was not running, so fetch failures were expected.
