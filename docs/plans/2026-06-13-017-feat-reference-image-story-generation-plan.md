---
title: "feat: Add reference image story generation"
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-017-phase-16-reference-image-story-generation-requirements.md
---

# feat: Add reference image story generation

## Summary

Implement Phase 16 by extending creative storyboard generation with reference Asset/ImageNode seeds, storing seed metadata in Storyboard drafts, propagating references into imported canvas nodes, and creating a `story_seed` edge from source ImageNodes to imported Novel nodes.

## Implementation Units

- U1. Shared contracts
  - Add optional Storyboard seed references and reference Asset IDs on character, location, and shot drafts.
  - Add creative brief and job input fields for reference Asset IDs, ImageNode IDs, and seed note.
  - Add `story_seed` to canvas edge relations.

- U2. Provider and backend generation
  - Extend LLM provider input with reference seed data.
  - Resolve ImageNode seeds to project-owned image Assets before creating a GenerationJob.
  - Persist reference seed metadata in generated ready Storyboard drafts.
  - Reject invalid reference Assets/ImageNodes before creating jobs or novels.

- U3. Canvas import provenance
  - Preserve reference Asset IDs on imported Character/Location/Shot nodes.
  - Store seed references on the imported Novel node.
  - Create `story_seed` canvas edges from existing ImageNodes to imported Novel nodes.

- U4. Frontend creative entry
  - Show selected ImageNode as an available story seed.
  - Allow selecting existing image Assets and uploading a new image Asset.
  - Submit only reference IDs and seed note to the backend.

- U5. Verification and docs
  - Cover shared contracts, mock provider output, backend generation validation, canvas import provenance, and creative entry helpers with tests.
  - Record Phase 16 in development notes.

## Verification

- `pnpm --filter @guga-flow/shared-types test -- --runInBand`
- `pnpm --filter @guga-flow/shared-types build`
- `pnpm --filter @guga-flow/provider-contracts test -- --runInBand`
- `pnpm --filter @guga-flow/backend test -- src/novels/novels.service.spec.ts src/canvas/canvas.service.spec.ts --runInBand`
- `pnpm --filter @guga-flow/frontend test -- src/components/novels/creative-agent-entry.test.tsx src/components/canvas/canvas-edge-data.test.ts --runInBand`
