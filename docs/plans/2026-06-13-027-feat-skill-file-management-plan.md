---
title: feat: Add skill file management
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-027-tf-13-skill-file-management-requirements.md
---

# feat: Add skill file management

## Summary

Implement TF-13 with file-seeded skill templates, project-scoped version history, settings UI editing/rollback, and prompt/agent generation integration.

## Requirements

- R1. Seed default templates from `data/skills/*`.
- R2. Persist project-scoped templates and versions.
- R3. Save edits as new versions.
- R4. Reject activation of invalid/executable-looking versions.
- R5. Roll back by activating earlier valid versions.
- R6. Include active story/art/production templates in Shot prompt composition.
- R7. Include active skill template ids/summaries in agent canvas action job input.
- R8. Add compact settings UI and API wrappers.

## Scope Boundaries

- No skill code execution.
- No automatic skill generation.
- No cross-project template sharing.
- No advanced diff/merge workflow.

## Implementation Units

- U1. **Shared contracts and prompt composer**
  - Files: `packages/shared-types/src/domain/skills.ts`, `packages/shared-types/src/index.ts`, `packages/shared-types/src/domain/prompt-composer.ts`, `packages/shared-types/src/domain/generation.ts`, tests.
  - Verification: shared-types test/build.

- U2. **Backend skill template module**
  - Files: `data/skills/*`, Prisma schema/migration, `apps/backend/src/skill-templates/*`, app/prompt/agent module integration, tests.
  - Verification: backend focused tests/build/lint.

- U3. **Settings UI and API**
  - Files: `apps/frontend/src/lib/api.ts`, `api.test.ts`, `apps/frontend/src/components/projects/skill-template-settings-panel.tsx`, test, settings page, CSS.
  - Verification: frontend focused tests/build/lint and browser smoke.

- U4. **Docs and final verification**
  - Files: `docs/development.md`, architecture pattern note, this plan.
  - Verification: root build, test, format check, mock workflow, `git diff --check`.

## Implementation Outcome

- Added default plain-text skill seed files under `data/skills/` for story, art, production, and agent behavior.
- Added shared skill-template contracts and prompt composer `skill_template` debug parts.
- Added Prisma-backed `SkillTemplate` and `SkillTemplateVersion` models with project-scoped version history.
- Added backend skill-template APIs for list, save-source-as-version, and activate-version rollback.
- Integrated active story/art/production templates into Shot prompt composition.
- Integrated active templates into `agent_canvas_action` job input as `skillTemplateIds` and `skillTemplateSummary`.
- Added the Skill Templates settings panel under `/projects/:projectId/settings` with source editing and version activation.
- Documented the plain-text, non-executable skill boundary.

## Verification Log

- `pnpm db:generate`
- `pnpm --filter @guga-flow/shared-types test -- src/domain/domain.test.ts`
- `pnpm --filter @guga-flow/shared-types build`
- `pnpm --filter @guga-flow/backend exec vitest run src/skill-templates/skill-templates.service.spec.ts src/prompt/prompt.service.spec.ts src/agents/agents.service.spec.ts`
- `pnpm --filter @guga-flow/frontend test -- src/lib/api.test.ts src/components/projects/skill-template-settings-panel.test.tsx`
- `pnpm --filter @guga-flow/shared-types lint`
- `pnpm --filter @guga-flow/backend lint`
- `pnpm --filter @guga-flow/frontend lint`
- `pnpm --filter @guga-flow/backend test`
- `pnpm run build`
- `pnpm run test`
- `pnpm run format:check`
- `pnpm run mock:workflow`
- `git diff --check`
- Browser smoke at `http://localhost:3001/projects/project_1/settings`: Project settings shell, Skill Templates panel, and Prompt and Agent Skills section rendered. Backend was not running, so backend-backed panels showed expected `Failed to fetch`.

All `pnpm` commands completed with the existing repository warning that the current shell uses Node `v22.22.2` while `package.json` requests `>=26.3.0`.
