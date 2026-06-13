---
title: feat: Add audio and voice asset binding
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-030-tf-16-audio-voice-asset-binding-requirements.md
---

# feat: Add audio and voice asset binding

## Summary

Implement TF-16 by extending the existing Asset upload path, canvas node data contracts, inspector binding controls, and editor export manifest builder to carry project-scoped audio references.

---

## Problem Frame

The roadmap requires audio and voice bindings without a full DAW. Existing generation settings can mention BGM/audio intent, but real uploaded audio files cannot yet be treated as first-class project Assets or attached to production nodes.

---

## Assumptions

*This plan was authored without synchronous user confirmation. The items below are un-validated agent inferences that should be reviewed before implementation proceeds.*

- The first slice should bind existing audio files; it should not generate, trim, or mix audio.
- Audio references can be represented as node data and timeline manifest metadata without a new CanvasNode type.
- Existing Asset Library and Inspector patterns are the right UI surfaces for this P2 slice.

---

## Requirements

- R1. Accept common audio uploads and classify them as audio project Assets.
- R2. Render audio assets distinctly in the Asset Library and preview them with audio controls.
- R3. Persist Character voice audio references on Character nodes.
- R4. Persist Shot and Video audio references on Shot/Video nodes.
- R5. Resolve audio references into editor export job input per selected Video clip.
- R6. Write resolved audio references into the generated timeline manifest.

**Origin actors:** A1 Producer, A2 Editor/export pipeline
**Origin flows:** F1 Audio upload and preview, F2 Node audio binding, F3 Export manifest handoff
**Origin acceptance examples:** AE1, AE2, AE3, AE4

---

## Scope Boundaries

- No waveform editor, trimming UI, mixing, or volume automation.
- No text-to-speech, voice cloning, or audio generation provider.
- No new AudioNode custom shape.
- No requirement to embed uploaded audio bytes into the editor ZIP; the manifest trace is the delivery target for this slice.

---

## Implementation Units

- U1. **Shared audio contracts**
  - **Goal:** Add audio asset classification and node/export reference types in shared contracts.
  - **Requirements:** R1, R3, R4, R5, R6
  - **Dependencies:** None
  - **Files:** `packages/shared-types/src/domain/assets.ts`, `packages/shared-types/src/domain/canvas.ts`, `packages/shared-types/src/domain/generation.ts`, `packages/shared-types/src/domain/domain.test.ts`
  - **Approach:** Extend existing asset type/purpose/uploadable MIME constants with audio support. Add simple audio-reference data shapes to Character, Shot, Video, clip source/output, and timeline manifest structures while preserving existing optional-field compatibility.
  - **Patterns to follow:** Existing `referenceAssetIds`, `packagingReferences`, and `TimelineAsset` optional metadata patterns.
  - **Test scenarios:** Constants include audio type/purposes/MIME support; a Character/Shot/Video fixture can hold audio reference IDs; editor export type fixtures can carry audio references.
  - **Verification:** Shared type build and domain tests pass.

- U2. **Backend audio asset support**
  - **Goal:** Allow audio uploads through the current backend asset service and return audio preview metadata.
  - **Requirements:** R1, R2
  - **Dependencies:** U1
  - **Files:** `apps/backend/src/assets/assets.service.ts`, `apps/backend/src/assets/assets.service.spec.ts`, `apps/backend/test/app.e2e-spec.ts`
  - **Approach:** Extend MIME-to-asset-type and preview-kind classification to audio while retaining existing size/storage/preview routes. Ensure upload validation and project scoping stay unchanged.
  - **Patterns to follow:** Existing image/video/text upload tests and preview-kind mapping.
  - **Test scenarios:** `.mp3` or `audio/mpeg` upload creates an audio Asset; audio previews return stored bytes and audio MIME; non-audio behavior is unchanged.
  - **Verification:** Backend asset tests and e2e mock compile/pass.

- U3. **Inspector audio binding UI**
  - **Goal:** Let users attach and remove audio Assets from Character, Shot, and Video nodes.
  - **Requirements:** R2, R3, R4, AE1, AE2, AE3
  - **Dependencies:** U1, U2
  - **Files:** `apps/frontend/src/components/canvas/node-audio-assets.tsx`, `apps/frontend/src/components/canvas/node-audio-assets.test.tsx`, `apps/frontend/src/components/canvas/canvas-inspector.tsx`, `apps/frontend/src/components/projects/asset-library.tsx`, `apps/frontend/src/components/projects/asset-library.test.tsx`, `apps/frontend/src/app/globals.css`
  - **Approach:** Mirror the existing reference-image binding component, but filter for audio assets and write to `voiceAssetIds` for Character nodes and `audioAssetIds` for Shot/Video nodes. Add an audio icon and `<audio controls>` preview in the Asset Library.
  - **Patterns to follow:** `apps/frontend/src/components/canvas/node-reference-assets.tsx` and `apps/frontend/src/components/projects/asset-library.tsx`.
  - **Test scenarios:** Component renders only for supported node types; audio assets are bindable while image/video/text are not; updates dedupe IDs; Asset Library renders audio rows and preview controls.
  - **Verification:** Frontend component tests and lint pass.

- U4. **Editor export audio manifest trace**
  - **Goal:** Carry node-bound audio references into export job input and generated timeline manifests.
  - **Requirements:** R5, R6, AE4
  - **Dependencies:** U1
  - **Files:** `apps/backend/src/editor-exports/editor-exports.service.ts`, `apps/backend/src/editor-exports/editor-exports.service.spec.ts`, `apps/worker/src/editor-export-package.ts`, `apps/worker/src/editor-export-package.test.ts`, `apps/worker/src/generation-runner.test.ts`
  - **Approach:** Resolve audio asset IDs from selected Video node data and parent Shot node data, validate project-owned audio Assets, attach references to clip sources, and have the package builder emit audio timeline assets/items on an audio track. Keep missing or non-audio references out of the clip trace rather than blocking the whole export.
  - **Patterns to follow:** Existing video asset validation, `packagingReferences` asset availability resolution, and timeline asset/track construction.
  - **Test scenarios:** Export job input contains per-clip audio references from Shot and Video nodes; non-audio asset IDs are ignored or marked unresolved according to the local helper; package timeline has audio assets and audio track items aligned to clip durations.
  - **Verification:** Backend editor export tests and worker export package tests pass.

- U5. **Docs and final verification**
  - **Goal:** Document the audio binding workflow and record the architecture decision.
  - **Requirements:** R1-R6
  - **Dependencies:** U1-U4
  - **Files:** `docs/development.md`, `docs/solutions/architecture-patterns/audio-asset-binding-export-manifest-2026-06-13.md`, this plan, origin requirements doc
  - **Approach:** Add developer workflow notes, current-boundary bullets, and completion/verification logs after implementation.
  - **Patterns to follow:** Recent TF-14 and TF-15 architecture notes.
  - **Test scenarios:** Documentation-only; no behavioral tests.
  - **Verification:** Root build/test, format check, mock workflow, `git diff --check`, and browser smoke where reachable.

---

## Deferred Implementation Notes

- Exact audio MIME list should be conservative and based on browser-upload/common editor formats already easy to preview locally.
- If ZIP-sidecar audio inclusion becomes necessary later, extend the package builder with an explicit audio-byte read callback rather than overloading the current video clip reader.

---

## Completion Log

- U1 completed by extending shared asset, canvas-node, and editor-export contracts with audio types and references.
- U2 completed by classifying `audio/*` uploads as audio Assets with audio previews.
- U3 completed with the Asset Library audio preview path and Inspector audio binding panel for Character, Shot, and Video nodes.
- U4 completed by resolving Video, Shot, and Character voice audio references into editor export job input and worker timeline audio tracks.
- U5 completed with development and architecture documentation.

## Verification Log

- `pnpm --filter @guga-flow/shared-types build`
- `pnpm --filter @guga-flow/shared-types test -- src/domain/domain.test.ts`
- `pnpm --filter @guga-flow/backend exec vitest run src/assets/assets.service.spec.ts`
- `pnpm --filter @guga-flow/backend exec vitest run test/app.e2e-spec.ts --testNamePattern "uploads, previews, lists, and deletes project assets"`
- `pnpm --filter @guga-flow/frontend test -- src/components/projects/asset-library.test.tsx src/components/canvas/node-audio-assets.test.tsx`
- `pnpm --filter @guga-flow/backend exec vitest run src/editor-exports/editor-exports.service.spec.ts`
- `pnpm --filter @guga-flow/worker exec vitest run src/editor-export-package.test.ts`
- `pnpm --filter @guga-flow/frontend lint`
- `pnpm --filter @guga-flow/backend lint`
- `pnpm --filter @guga-flow/worker lint`
- `pnpm run build`
- `pnpm run test`
- `pnpm run format:check`
- `pnpm run mock:workflow`
- `git diff --check`
- Browser smoke at `http://localhost:3001/projects/project_1/canvas`: frontend rendered the canvas shell and Asset Library audio purpose controls; backend was not running, so fetch failures were expected.
