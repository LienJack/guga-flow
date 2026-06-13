---
title: "feat: Add viral reference, continuity, and marketing settings"
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-018-phase-17-viral-continuity-marketing-requirements.md
---

# feat: Add viral reference, continuity, and marketing settings

## Summary

Implement Phase 17 as compliance-safe creative settings for manual viral references, continuity strategies, talking-photo briefs, and marketing material references. The settings resolve through project/Shot inheritance, appear in prompt debug output, and carry marketing packaging references into editor export manifests.

## Implementation Units

- U1. Shared contracts
  - Add viral reference, continuity, talking-photo, and marketing setting types.
  - Add continuity mode constants.
  - Normalize new settings and include them in project/Shot resolution.

- U2. Prompt and export propagation
  - Include the new settings in Generation settings prompt debug text.
  - Add marketing cover/poster/promo references to editor export packaging references.
  - Preserve existing export behavior when marketing references are missing or unresolved.

- U3. Frontend settings UI
  - Extend Project defaults and Shot overrides forms with the new settings.
  - Support nested cover/poster/promo packaging references.
  - Keep form saves routed through `normalizeGenerationCreativeSettings`.

- U4. Verification and docs
  - Cover shared normalization/resolution, prompt output, editor export packaging, worker manifest metadata, and inspector rendering.
  - Record Phase 17 in development notes.

## Verification

- `pnpm --filter @guga-flow/shared-types test -- --runInBand`
- `pnpm --filter @guga-flow/shared-types build`
- `pnpm --filter @guga-flow/backend test -- src/editor-exports/editor-exports.service.spec.ts --runInBand`
- `pnpm --filter @guga-flow/worker test -- src/editor-export-package.test.ts --runInBand`
- `pnpm --filter @guga-flow/frontend test -- src/components/canvas/canvas-inspector.test.tsx --runInBand`
- `pnpm --filter @guga-flow/frontend lint`
