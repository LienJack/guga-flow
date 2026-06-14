---
title: feat: Complete CEX-10 AI video mode matrix and prompt check
type: feat
status: completed
date: 2026-06-14
origin: docs/brainstorms/2026-06-14-047-cex-10-ai-video-mode-prompt-check-requirements.md
---

# feat: Complete CEX-10 AI Video Mode Matrix and Prompt Check

## Summary

Tighten the existing image-to-video generation flow so provider/model video
modes are visible, backend checks are explicit, and queued `GenerationJob`
inputs include a safe prompt debug summary.

## Assumptions

- CEX-10 should not introduce a fake text-to-video workflow before there is a
  canvas source path for it.
- The existing `image_to_video` job is the durable MVP path for video generation
  and already supports typed reference media.
- Provider/model catalogs are the right place to carry mode metadata to both UI
  and backend.

## Requirements Trace

- R1/R2 -> U1 shared/catalog contracts and U3 frontend matrix display.
- R3/R4 -> U2 backend job input checks and prompt debug summary.
- R5 -> U4 solution note and tests proving prompts come from current composer
  inputs instead of provider-specific hardcoded text.

## Implementation Units

- U1. **Shared contracts**
  - Add video prompt mode/check/debug summary contracts.
  - Extend `ImageToVideoJobInput` with `videoPromptMode` and
    `videoPromptDebugSummary`.
  - Add tests for mode constants and job input shape.

- U2. **Backend generation checks**
  - Respect model-specific `modes` before queueing video jobs.
  - Build a prompt debug summary from `ShotPromptCompositionResult`, provider
    capabilities, model modes, and typed reference media roles.
  - Keep existing duration/aspect/resolution/reference-role guards readable and
    covered by tests.

- U3. **Frontend video mode matrix**
  - Render selected provider/model modes and supported reference input roles in
    `GenerationActions`.
  - Show different availability when the selected model narrows modes.
  - Add focused render tests.

- U4. **Validation and learning capture**
  - Run shared/provider/backend/worker/frontend checks plus root lint/test.
  - Capture a solution doc for capability-driven video prompt checks.
  - Mark this plan complete and commit the CEX-10 module.

## Verification Targets

- `pnpm --filter @guga-flow/shared-types run lint`
- `pnpm --filter @guga-flow/shared-types test`
- `pnpm --filter @guga-flow/shared-types run build`
- `pnpm --filter @guga-flow/provider-contracts run lint`
- `pnpm --filter @guga-flow/provider-contracts test`
- `pnpm --filter @guga-flow/backend run lint`
- `pnpm --filter @guga-flow/backend test`
- `pnpm --filter @guga-flow/worker run lint`
- `pnpm --filter @guga-flow/worker test`
- `pnpm --filter @guga-flow/frontend run lint`
- `pnpm --filter @guga-flow/frontend test`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3012/api/v1 pnpm --dir apps/frontend exec next build`
- `pnpm -r lint`
- `pnpm -r test`

## Completion Notes

- Added shared video prompt mode/check/debug summary contracts and attached
  them to `ImageToVideoJobInput`.
- Added provider/model mode metadata and backend model-specific mode rejection.
- Added safe video prompt debug summaries with reference roles and warning
  checks for missing dialogue/video prompt.
- Updated worker video execution to pass resolved provider mode through to the
  provider boundary.
- Added frontend provider/model mode and reference input summaries.
- Captured the architecture pattern in
  `docs/solutions/architecture-patterns/capability-driven-video-prompt-checks-2026-06-14.md`.

## Sources & References

- Origin checklist: `docs/codex-reference-long-task-execution-checklist.md`
- Source modules: `ACP-06`, `TFR-21`
- Existing typed reference media work: `docs/plans/2026-06-14-036-feat-infinite-canvas-full-p1-p2-plan.md`
