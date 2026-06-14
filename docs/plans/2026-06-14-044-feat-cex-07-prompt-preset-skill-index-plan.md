---
title: feat: Complete CEX-07 prompt preset skill index
type: feat
status: completed
date: 2026-06-14
origin: docs/brainstorms/2026-06-14-044-cex-07-prompt-preset-skill-index-requirements.md
---

# feat: Complete CEX-07 Prompt Preset Skill Index

## Summary

Extend the existing `SkillTemplate` system into the prompt preset and skill
index surface by adding shared metadata, backend filtering/context selection,
and UI search/filter controls.

## Scope Boundaries

- No embedding/vector search.
- No arbitrary skill execution.
- No new prompt preset persistence table unless the existing `SkillTemplate`
  contract cannot carry the metadata.
- No copied reference prompts, thumbnails, or static assets.

## Requirements Trace

- R1/R2 -> U1 shared metadata contract.
- R3/R4 -> U2 backend filtering, selected template context, and Agent role
  summary injection.
- R5/R6 -> U3 frontend settings filters and canvas generation preset picker.
- AE1-AE5 -> U4 verification, solution doc, and commit.

## Implementation Units

- U1. **Shared preset metadata**
  - Add preset categories, trigger modes, index statuses, and filter contracts.
  - Extend `SkillTemplateSummary` and `SkillTemplatePromptContext`.
  - Add default metadata mapping and filter helpers with shared tests.

- U2. **Backend skill index and selected context**
  - Add ai-image/text/video/audio default seed templates.
  - Derive metadata in `SkillTemplatesService`.
  - Filter list/active contexts by query/category/role/trigger/template ids.
  - Make Agent actions request role-matching summaries.
  - Allow prompt composition/generation requests to pass selected template ids.

- U3. **Frontend preset UI**
  - Add settings search/category/role/trigger filters and diagnostics display.
  - Add generation preset picker for compatible direct generation actions.
  - Allow refinement prompts to insert selected preset text.
  - Add focused frontend tests.

- U4. **Validation and learning capture**
  - Run shared/backend/frontend checks plus workspace lint/test.
  - Run production frontend build.
  - Capture a solution doc for `SkillTemplate` as prompt preset index.
  - Commit the completed module.

## Verification Targets

- `pnpm --filter @guga-flow/shared-types run lint`
- `pnpm --filter @guga-flow/shared-types test`
- `pnpm --filter @guga-flow/shared-types run build`
- `pnpm --filter @guga-flow/backend run lint`
- `pnpm --filter @guga-flow/backend test`
- `pnpm --filter @guga-flow/frontend run lint`
- `pnpm --filter @guga-flow/frontend test`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3012/api/v1 pnpm --dir apps/frontend exec next build`
- `pnpm -r lint`
- `pnpm -r test`
