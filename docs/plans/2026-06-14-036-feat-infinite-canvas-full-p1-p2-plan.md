---
title: feat: Complete Infinite-Canvas full P1/P2 scope
type: feat
status: completed
date: 2026-06-14
origin: docs/brainstorms/2026-06-14-036-infinite-canvas-full-p1-p2-requirements.md
---

# feat: Complete Infinite-Canvas Full P1/P2 Scope

## Summary

Finish the product-confirmed P1 modules from IC-04 through IC-11 as guga-flow-native Web MVP capabilities, and close IC-12 through IC-15 with decision documents and follow-up split plans.

## Implementation Units

- U1. **Asset analysis jobs**
  - **Covers:** IC-04.
  - **Files:** shared generation types, backend generation DTO/controller/service, worker executor/client/runner, asset service, asset library UI.
  - **Approach:** Add `asset_caption` and `asset_classification` job operations with mock worker output. Store captions/classifications in `Asset.metadataJson`.
  - **Verification:** Backend generation tests, worker tests, frontend API/asset library tests.

- U2. **Typed video reference media**
  - **Covers:** IC-05.
  - **Files:** shared generation/provider types, provider contracts, backend generation service, worker executor.
  - **Approach:** Add `VideoReferenceMediaInput` roles and provider capability guards. Forward first/last frame and reference media into video providers.
  - **Verification:** Backend image-to-video tests, worker image-to-video tests, provider-contract lint/tests.

- U3. **Workflow definitions and workflow run jobs**
  - **Covers:** IC-06, IC-07.
  - **Files:** Prisma schema/migration, shared workflow types, backend workflows module/service/controller, worker mock workflow executor, frontend API.
  - **Approach:** Store project-scoped workflow definitions and versions, activate versions, validate mappings, and queue `workflow_run` jobs for ComfyUI/RunningHub-style providers.
  - **Verification:** Backend lint, frontend API tests, worker tests.

- U4. **Canvas fragment import/export**
  - **Covers:** IC-08.
  - **Files:** Prisma schema/migration, shared canvas fragment types, backend canvas service/controller/DTO/module, frontend API.
  - **Approach:** Export selected nodes/edges into a versioned manifest package asset. Import manifests by rewriting ids, validating resources, and recording `CanvasFragmentImport`.
  - **Verification:** Backend lint, Prisma generate, frontend API tests.

- U5. **Prompt library and skill template alignment**
  - **Covers:** IC-09.
  - **Files:** existing skill template subsystem and full-scope requirement/plan docs.
  - **Approach:** Keep `SkillTemplate` as the canonical prompt-library/versioning primitive instead of adding a parallel prompt table.
  - **Verification:** Existing skill template tests remain in the suite.

- U6. **Image editing backflow primitives**
  - **Covers:** IC-10.
  - **Files:** shared asset edit types, backend assets service/controller/DTO.
  - **Approach:** Add crop and grid-split APIs that produce new image assets with source lineage metadata. Use byte-preserving MVP output until a real image processor is chosen.
  - **Verification:** Backend asset tests and backend lint.

- U7. **Realtime generation events**
  - **Covers:** IC-11.
  - **Files:** backend generation events controller/module, frontend API helper.
  - **Approach:** Expose a project-scoped SSE stream that emits `job.updated` snapshots from the authoritative `GenerationJob` store.
  - **Verification:** Backend lint and frontend API tests.

- U8. **P2 decision and split plan**
  - **Covers:** IC-12, IC-13, IC-14, IC-15.
  - **Files:** `docs/solutions/tooling-decisions/infinite-canvas-local-platform-decisions-2026-06-14.md`.
  - **Approach:** Keep platform-local work decision-only in this slice and document safe implementation splits.
  - **Verification:** Decision doc exists and is linked from the requirements trace.

## Completion Log

- U1 added asset analysis shared contracts, backend creation/completion routes, worker mock execution, asset metadata application, and asset library controls.
- U2 added typed video reference media, provider capability metadata, backend validation, and worker forwarding.
- U3 added workflow Prisma models/migration, workflow API surface, and mock workflow execution through `workflow_run`.
- U4 added fragment shared contracts, export/import routes, package asset creation, id rewriting, and import audit records.
- U5 documented `SkillTemplate` as the prompt-library base instead of forking prompt storage.
- U6 added image crop/grid-split asset edit primitives with lineage metadata.
- U7 added generation event streaming and API URL helper.
- U8 added local platform, backup, CLI, and material-capture decision/split documentation.

## Verification Log

- `pnpm db:generate`
- `pnpm --filter @guga-flow/shared-types build`
- `pnpm --filter @guga-flow/shared-types lint`
- `pnpm --filter @guga-flow/shared-types test`
- `pnpm --filter @guga-flow/provider-contracts build`
- `pnpm --filter @guga-flow/provider-contracts lint`
- `pnpm --filter @guga-flow/provider-contracts test`
- `pnpm --filter @guga-flow/backend lint`
- `pnpm --filter @guga-flow/backend test -- src/generation/generation.service.spec.ts src/assets/assets.service.spec.ts`
- `pnpm --filter @guga-flow/backend build`
- `pnpm --filter @guga-flow/worker lint`
- `pnpm --filter @guga-flow/worker test`
- `pnpm --filter @guga-flow/worker build`
- `pnpm --filter @guga-flow/frontend lint`
- `pnpm --filter @guga-flow/frontend test -- src/lib/api.test.ts src/components/projects/asset-library.test.tsx`
- `pnpm --filter @guga-flow/frontend build`
- `pnpm -r test`
- `pnpm -r lint`

## Environment Note

All verification commands completed with the repository's existing Node engine warning: package metadata wants Node `>=26.3.0`, while this run used Node `v22.22.2` with pnpm `10.33.2`.
