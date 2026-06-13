---
title: "feat: Add image refinement backflow"
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-020-tf-06-image-refinement-backflow-requirements.md
---

# feat: Add image refinement backflow

## Summary

Implement TF-06 by adding a worker-owned `image_refinement` generation operation that starts from an ImageNode Asset, executes through the image provider path, and writes a new ImageNode plus `derived_from` lineage back to the canvas.

---

## Requirements

- R1. ImageNodes with Assets can queue a prompt-based refinement job.
- R2. Refinement jobs preserve source ImageNode/Asset provenance and image provider settings.
- R3. Worker execution passes the source Asset ID and prompt through the image provider contract.
- R4. Backend completion creates a new Asset/ImageNode and `derived_from` edge.
- R5. Shot-to-Image and Image-to-Video behavior remains unchanged.

---

## Scope Boundaries

- No mask editor, brush editor, layers, or region selection.
- No batch refinement.
- No browser-side provider calls or secret exposure.
- Real provider-specific binary edit APIs can be extended later; this plan keeps the shared contract ready and verifies with mock provider behavior.

---

## Context & Research

### Relevant Code and Patterns

- `packages/shared-types/src/domain/generation.ts` owns generation operation/input/output contracts.
- `apps/backend/src/generation/generation.service.ts` builds worker inputs and owns all generated Asset/CanvasNode/CanvasEdge side effects after worker completion.
- `apps/worker/src/generation-executors.ts` dispatches worker jobs to image/video providers and normalizes provider outputs.
- `packages/provider-contracts/src/contracts.ts` and `packages/provider-contracts/src/mock-providers.ts` define image-provider inputs and deterministic local outputs.
- `apps/frontend/src/components/canvas/generation-actions.tsx` renders the current Shot-to-Image and Image-to-Video controls.

### Institutional Learnings

- `docs/solutions/architecture-patterns/generation-worker-backend-side-effects-2026-06-12.md`: keep worker execution stateless and let backend completion create durable graph side effects.
- `docs/solutions/architecture-patterns/real-image-provider-secret-safe-persistence-2026-06-12.md`: provider credentials stay server-side; browser submits only provider IDs/settings.
- `docs/solutions/architecture-patterns/canvas-productivity-local-state-boundary-2026-06-13.md`: UI affordances should operate on normalized graph facts, not tldraw-only state.

---

## Key Technical Decisions

- Treat `image_refinement` as a direct worker operation alongside `shot_to_image` and `image_to_video`, because it needs queue/retry/cancel and provider execution rather than backend-only completion.
- Reuse the generated media completion path where possible, but specialize relation and validation so Image-to-Image completion produces an ImageNode and `derived_from` edge.
- Add source-image fields to the image provider input contract in a backward-compatible way so existing text-to-image providers continue to compile.
- Keep the frontend as a mode switch inside the existing generation panel for ImageNodes so TF-06 does not remove the existing Image-to-Video action.

---

## Implementation Units

- U1. **Shared and database contracts**

**Goal:** Add `image_refinement` to shared operations, worker inputs, node data typing, and Prisma enum support.

**Requirements:** R1, R2, R5

**Dependencies:** None

**Files:**
- Modify: `packages/shared-types/src/domain/generation.ts`
- Modify: `packages/shared-types/src/domain/canvas.ts`
- Modify: `packages/shared-types/src/domain/domain.test.ts`
- Modify: `apps/backend/prisma/schema.prisma`
- Create: `apps/backend/prisma/migrations/20260613110000_tf_06_image_refinement/migration.sql`
- Generated: `apps/backend/src/generated/prisma/*`

**Approach:**
- Extend the direct generation operation set to include refinement.
- Add a typed `ImageRefinementJobInput` carrying source ImageNode, source Asset, prompt, image provider settings, reference IDs, and generation settings.
- Widen generated-media output typing to cover the new operation.

**Test scenarios:**
- Happy path: shared constants include `image_refinement` in direct generation operations.
- Happy path: an `ImageRefinementJobInput` can be assigned with source image and provider fields.
- Regression: existing Shot-to-Image and Image-to-Video contracts remain assignable.

**Verification:**
- Type/lint and shared domain tests accept the new operation without weakening existing contracts.

- U2. **Backend job creation and completion**

**Goal:** Build refinement jobs from ImageNodes and complete them as new ImageNodes linked by `derived_from`.

**Requirements:** R1, R2, R4, R5

**Dependencies:** U1

**Files:**
- Modify: `apps/backend/src/generation/dto.ts`
- Modify: `apps/backend/src/generation/generation.service.ts`
- Modify: `apps/backend/src/generation/generation.service.spec.ts`

**Approach:**
- Validate refinement source nodes server-side as project-owned ImageNodes with image Assets.
- Reuse image provider setting resolution and project/parent-shot generation settings where available.
- On completion, require image MIME output, create an image Asset, create a refined ImageNode, and create a `derived_from` edge.

**Test scenarios:**
- Happy path: creating refinement from an ImageNode stores provider/model/source Asset/prompt on the queued job.
- Error path: missing ImageNode Asset rejects before job creation.
- Happy path: successful completion creates image Asset, ImageNode, `derived_from` edge, and output trace.
- Regression: shot/image/video completions still use generated_image/generated_video relations.

**Verification:**
- Backend generation tests prove source validation and completion side effects.

- U3. **Worker and provider execution**

**Goal:** Execute refinement jobs through the image provider contract and deterministic mock provider.

**Requirements:** R3, R5

**Dependencies:** U1

**Files:**
- Modify: `packages/provider-contracts/src/contracts.ts`
- Modify: `packages/provider-contracts/src/mock-providers.ts`
- Modify: `packages/provider-contracts/src/mock-providers.test.ts`
- Modify: `apps/worker/src/generation-executors.ts`
- Modify: `apps/worker/src/generation-runner.test.ts`

**Approach:**
- Add optional source-image/edit-mode fields to image provider input.
- Make mock image output deterministic across project, prompt, and source Asset ID.
- Dispatch `image_refinement` through the image provider and report a single image output to backend completion.

**Test scenarios:**
- Happy path: mock provider output changes when the source Asset ID changes and records that source in raw/reference data.
- Happy path: worker calls image provider with source Asset ID, prompt, model, provider params, and force-failure flag.
- Error path: unsupported worker operation handling still rejects unknown inputs.

**Verification:**
- Provider and worker tests prove execution without real credentials.

- U4. **Frontend canvas action**

**Goal:** Add ImageNode refinement as an alternate generation action while keeping Image-to-Video available.

**Requirements:** R1, R2, R3, R5

**Dependencies:** U1, U2

**Files:**
- Modify: `apps/frontend/src/components/canvas/generation-actions.tsx`
- Modify: `apps/frontend/src/components/canvas/generation-actions.test.tsx`

**Approach:**
- Render ImageNode generation modes for video and refine when an Asset is present.
- Reuse image provider settings for refinement and add a concise refinement prompt input.
- Submit `image_refinement` jobs through the existing generation job API.

**Test scenarios:**
- Happy path: ImageNode panel includes both Generate Video and Refine Image actions.
- Happy path: refinement job input includes source node, provider settings, and refinement prompt.
- Regression: ImageNodes without Assets still render no generation actions.

**Verification:**
- Frontend component tests and type checks prove the action is available without breaking existing Image-to-Video behavior.

- U5. **Documentation and workflow notes**

**Goal:** Record the TF-06 implementation boundary and mark development progress.

**Requirements:** R1, R2, R3, R4, R5

**Dependencies:** U1, U2, U3, U4

**Files:**
- Modify: `docs/development.md`
- Create: `docs/solutions/architecture-patterns/image-refinement-backflow-lineage-2026-06-13.md`

**Approach:**
- Document the operation boundary, lineage relation, and mock-provider verification pattern.
- Link the learning to existing generation-worker and real-image-provider solution docs.

**Test scenarios:**
- Test expectation: none -- documentation-only unit.

**Verification:**
- Development docs mention TF-06 status and solution notes capture the reusable pattern.

---

## System-Wide Impact

- **Interaction graph:** ImageNode now has two direct generation children: VideoNode through `generated_video` and ImageNode variant through `derived_from`.
- **Error propagation:** Source validation errors remain synchronous API errors; provider failures flow through existing worker failure reporting.
- **State lifecycle risks:** Source node status should return to `succeeded` after completion/cancellation/failure and must not be overwritten by the refined node.
- **API surface parity:** Shared TypeScript, backend DTO validation, Prisma enum, frontend API helper, worker client, and mock provider all need the new operation.
- **Unchanged invariants:** Worker still does not create canvas records; backend completion remains the only place generated media nodes/edges are persisted.

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Refinement accidentally replaces the source image | Always create a new ImageNode and use `derived_from` lineage. |
| Existing Image-to-Video action disappears for ImageNodes | Render refinement as an alternate mode inside the same panel, not as a replacement. |
| Real providers differ in image-edit APIs | Keep provider input backward-compatible and verify the local path with mock provider behavior. |
| Prisma enum drift | Add a migration and regenerate checked-in Prisma client files. |

---

## Sources & References

- **Origin document:** `docs/brainstorms/2026-06-13-020-tf-06-image-refinement-backflow-requirements.md`
- **Task source:** `docs/infinite-canvas-video-long-task-development-flow.md` TF-06
- Related solution: `docs/solutions/architecture-patterns/generation-worker-backend-side-effects-2026-06-12.md`
- Related solution: `docs/solutions/architecture-patterns/real-image-provider-secret-safe-persistence-2026-06-12.md`
