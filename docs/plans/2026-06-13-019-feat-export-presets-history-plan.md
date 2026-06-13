---
title: "feat: Add export presets and revision history metadata"
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-019-phase-18-collaboration-export-history-requirements.md
---

# feat: Add export presets and revision history metadata

## Summary

Implement Phase 18 by adding editor export presets, writing presets into job and manifest metadata, supporting revision queueing from a historical export, and documenting the single-user to collaboration evolution path.

## Implementation Units

- U1. Shared export contracts
  - Add export preset constants and types.
  - Add `exportPreset` and `sourceEditorExportId` to editor export inputs, outputs, manifests, and EditorPackageNode data.
  - Preserve `standard_zip` as the default for older payloads.

- U2. Backend and worker propagation
  - Validate DTO presets.
  - Store preset and revision source in created editor export timeline JSON and job input.
  - Write preset/source metadata to package assets and EditorPackageNode data.
  - Reject worker package completion when the timeline preset differs from the job preset.

- U3. Frontend export workflow
  - Add export preset controls to the editor export panel.
  - Include preset in completed export and active job matching.
  - Add a revision queue action for matched historical exports.

- U4. Documentation and verification
  - Document collaboration evolution decisions.
  - Record Phase 18 in development notes.
  - Cover shared contracts, backend export creation/completion, worker manifest output, frontend API payloads, and export UI matching.

## Verification

- `pnpm --filter @guga-flow/shared-types test -- --runInBand`
- `pnpm --filter @guga-flow/shared-types build`
- `pnpm --filter @guga-flow/backend test -- src/editor-exports/editor-exports.service.spec.ts src/generation/generation.service.spec.ts src/assets/assets.service.spec.ts --runInBand`
- `pnpm --filter @guga-flow/worker test -- src/editor-export-package.test.ts src/generation-runner.test.ts src/generation-client.test.ts --runInBand`
- `pnpm --filter @guga-flow/frontend test -- src/components/canvas/editor-export-actions.test.tsx src/components/canvas/canvas-inspector.test.tsx src/lib/api.test.ts --runInBand`
- `pnpm --filter @guga-flow/frontend lint`
