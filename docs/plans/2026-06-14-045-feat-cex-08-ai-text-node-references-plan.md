---
title: feat: Complete CEX-08 AI text node references
type: feat
status: completed
date: 2026-06-14
origin: docs/brainstorms/2026-06-14-045-cex-08-ai-text-node-references-requirements.md
---

# feat: Complete CEX-08 AI Text Node References

## Summary

Add a task-backed AI Text canvas node that gathers upstream text context through
semantic edges, queues a generation job, and persists worker output back onto the
node.

## Scope Boundaries

- No chat-only product surface.
- No browser-to-LLM provider calls.
- No ScriptDraft or document Asset projection yet.
- No streaming channel in this slice.

## Requirements Trace

- R1/R2 -> U1 shared node and generation contracts.
- R3/R4 -> U2 backend/worker job creation, execution, and node update.
- R5 -> U3 frontend node rendering and generation action.
- AE1-AE5 -> U4 verification, solution doc, and commit.

## Implementation Units

- U1. **Shared contracts**
  - Add `ai_text` to canvas node registry, data contracts, input/output policy,
    and Prisma enum.
  - Add text-generation operation/input/output types and tests.

- U2. **Backend and worker**
  - Build AI Text generation job input from upstream `derived_from` context.
  - Resolve LLM provider/model with safe defaults and existing provider runtime
    boundaries.
  - Add worker executor result and generated text persistence to node data.
  - Add backend/worker tests.

- U3. **Frontend canvas UI**
  - Add AI Text node defaults/card details/toolbar entry.
  - Add text generation action to `GenerationActions`.
  - Show generated text and source trace in node card/inspector.
  - Add focused frontend tests.

- U4. **Validation and learning capture**
  - Run shared/backend/frontend/worker checks plus workspace lint/test.
  - Run production frontend build.
  - Capture a solution doc for task-backed AI Text nodes.
  - Commit the completed module.

## Verification Targets

- `pnpm --filter @guga-flow/shared-types run lint`
- `pnpm --filter @guga-flow/shared-types test`
- `pnpm --filter @guga-flow/shared-types run build`
- `pnpm --filter @guga-flow/backend run lint`
- `pnpm --filter @guga-flow/backend test`
- `pnpm --filter @guga-flow/worker run lint`
- `pnpm --filter @guga-flow/worker test`
- `pnpm --filter @guga-flow/frontend run lint`
- `pnpm --filter @guga-flow/frontend test`
- `NEXT_PUBLIC_API_BASE_URL=http://localhost:3012/api/v1 pnpm --dir apps/frontend exec next build`
- `pnpm -r lint`
- `pnpm -r test`
