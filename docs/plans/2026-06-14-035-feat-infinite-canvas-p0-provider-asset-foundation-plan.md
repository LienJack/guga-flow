---
title: feat: Complete Infinite-Canvas P0 provider and asset foundation
type: feat
status: completed
date: 2026-06-14
origin: docs/brainstorms/2026-06-14-035-infinite-canvas-p0-provider-asset-foundation-requirements.md
---

# feat: Complete Infinite-Canvas P0 Provider And Asset Foundation

## Summary

Finish IC-00, IC-01, IC-02, and IC-03 from the Infinite-Canvas reference PRD by adding research traceability, generic provider protocol/model discovery, and project asset library taxonomy/batch management.

## Requirements

- R1. Research ledger and source contract.
- R2. Infinite-Canvas context pack with evidence strength labels.
- R3. Shared provider protocol, request mode, safe params, and discovery DTOs.
- R4. Generic image/video provider metadata and provider-contract registry support.
- R5. Backend model discovery with safe temporary credentials and friendly failure mapping.
- R6. Frontend provider settings controls for protocol, base URL, and discovery.
- R7. Worker runtime params handoff to provider registries.
- R8. Prisma-backed asset collections, tags, and assignments.
- R9. Asset listing filters for query/type/purpose/collection/tags.
- R10. Asset library UI for create/filter/select/batch operations.
- R11. Reference-aware single and batch delete protection.
- R12. Targeted shared/backend/provider/frontend/worker tests plus lint/build verification.

## Implementation Units

- U1. **Research assets**
  - **Files:** `docs/research/video-ref/source-contract.md`, `docs/research/video-ref/index.md`, Infinite-Canvas context pack.
  - **Approach:** Record source path, commit, license boundary, and evidence map.
  - **Verification:** Research docs link the source contract and context pack.

- U2. **Provider protocol and discovery**
  - **Files:** shared generation types, backend provider service/controller/DTO, frontend API/settings panel, worker runtime config, provider-contract registries.
  - **Approach:** Store safe provider params, discover models server-side, support generic image/video execution through protocol/base URL params.
  - **Verification:** Shared tests, backend provider tests, frontend API/settings tests, provider-contract tests, worker tests.

- U3. **Asset library taxonomy**
  - **Files:** Prisma schema/migration, shared asset types, backend asset service/controller/DTO, frontend API/library panel.
  - **Approach:** Add collection/tag schema, filters, create APIs, batch operations, and reference protection.
  - **Verification:** Backend asset tests, frontend API/library tests, Prisma generate, backend/frontend build.

- U4. **P1/P2 split decision**
  - **Files:** `docs/solutions/tooling-decisions/infinite-canvas-p1-p2-split-decision-2026-06-14.md`.
  - **Approach:** Record which P1 modules are deferred pending product confirmation and how P2 platform work splits after Web MVP stability.
  - **Verification:** Completion rule trace exists for non-P0 scope.

## Completion Log

- U1 added the Infinite-Canvas source contract entry, research index update, coverage note, and context pack.
- U2 added generic provider shared contracts, model discovery DTO/API, safe params persistence, settings UI discovery controls, worker runtime handoff, and generic provider-contract adapters.
- U3 added asset collection/tag tables and migration, backend taxonomy/filter/batch/reference protection APIs, frontend API methods, and asset library controls.
- U4 added P1/P2 defer and split decision documentation.

## Verification Log

- `pnpm db:generate`
- `pnpm --filter @guga-flow/shared-types build`
- `pnpm --filter @guga-flow/shared-types test`
- `pnpm --filter @guga-flow/shared-types lint`
- `pnpm --filter @guga-flow/provider-contracts test`
- `pnpm --filter @guga-flow/provider-contracts build`
- `pnpm --filter @guga-flow/backend test -- src/providers/providers.service.spec.ts src/assets/assets.service.spec.ts`
- `pnpm --filter @guga-flow/backend lint`
- `pnpm --filter @guga-flow/backend build`
- `pnpm --filter @guga-flow/frontend test -- src/lib/api.test.ts src/components/projects/provider-settings-panel.test.tsx src/components/projects/asset-library.test.tsx`
- `pnpm --filter @guga-flow/frontend lint`
- `pnpm --filter @guga-flow/frontend build`
- `pnpm --filter @guga-flow/worker test`
- `pnpm --filter @guga-flow/worker lint`
- `pnpm --filter @guga-flow/worker build`

## Environment Note

All commands completed with the repository's existing Node engine warning: package metadata wants Node `>=26.3.0`, while this run used Node `v22.22.2` with pnpm `10.33.2`.
