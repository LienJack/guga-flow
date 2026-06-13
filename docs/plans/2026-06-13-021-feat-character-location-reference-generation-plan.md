---
title: "feat: Generate Character and Location reference images"
type: feat
status: completed
date: 2026-06-13
origin: docs/brainstorms/2026-06-13-021-tf-07-character-location-reference-generation-requirements.md
---

# feat: Generate Character and Location reference images

## Summary

Implement TF-07 by adding direct `character_to_image` and `location_to_image` generation jobs that run through the image provider worker path and bind the generated Asset back to the source Character/Location node as a reference image.

---

## Requirements

- R1. Character nodes can queue reference image generation.
- R2. Location nodes can queue reference image generation.
- R3. Backend builds prompts from persisted node data and provider settings.
- R4. Worker calls the image provider and reports one image output.
- R5. Backend completion creates a reference Asset and appends it to source node `referenceAssetIds`.
- R6. Locked/user-authored fields are not overwritten.
- R7. Existing generation operations keep their behavior.

---

## Implementation Units

- U1. **Shared contracts**

**Goal:** Add typed worker inputs for Character/Location image jobs and include them in direct generation creation.

**Requirements:** R1, R2, R3, R7

**Files:**
- Modify: `packages/shared-types/src/domain/generation.ts`
- Modify: `packages/shared-types/src/domain/domain.test.ts`

**Approach:**
- Extend the direct generation operation set with `character_to_image` and `location_to_image`.
- Add `CharacterToImageJobInput` and `LocationToImageJobInput` carrying prompt, provider settings, source node id, existing reference ids, and generated asset purpose.

- U2. **Backend creation and completion**

**Goal:** Validate source nodes, compose prompts, and bind completed generated Assets back onto source nodes.

**Requirements:** R1, R2, R3, R5, R6, R7

**Files:**
- Modify: `apps/backend/src/generation/generation.service.ts`
- Modify: `apps/backend/src/generation/generation.service.spec.ts`

**Approach:**
- Build prompts from Character fields (`identityPrompt`, `consistencyPrompt`, `appearance`, `wardrobe`, role/personality, lifecycle hints) and Location fields (`locationPrompt`, `consistencyPrompt`, `environment`, `visualStyle`, mood/type).
- Reject wrong source node types before job creation.
- Add a reference-image completion branch that creates `character_reference` or `location_reference` Assets and appends the Asset ID to `referenceAssetIds`.
- Preserve every other source node data field.

- U3. **Worker execution**

**Goal:** Dispatch Character/Location jobs through the image provider contract.

**Requirements:** R4, R7

**Files:**
- Modify: `apps/worker/src/generation-executors.ts`
- Modify: `apps/worker/src/generation-runner.test.ts`

**Approach:**
- Treat both operations as single-output text-to-image calls.
- Pass existing node reference assets through provider references when supported by the backend-selected provider.

- U4. **Frontend Inspector action**

**Goal:** Make Character/Location reference generation discoverable where node reference images are already managed.

**Requirements:** R1, R2, R7

**Files:**
- Modify: `apps/frontend/src/components/canvas/generation-actions.tsx`
- Modify: `apps/frontend/src/components/canvas/generation-actions.test.tsx`

**Approach:**
- Show Generate Reference on Character and Location nodes.
- Reuse the image provider settings panel and existing generation job API.
- Keep uploaded reference binding in `NodeReferenceAssets` unchanged.

- U5. **Documentation and learning**

**Goal:** Document the reference generation backflow boundary.

**Requirements:** R1-R7

**Files:**
- Modify: `docs/development.md`
- Create: `docs/solutions/architecture-patterns/character-location-reference-generation-backflow-2026-06-13.md`

---

## Risks

| Risk | Mitigation |
|------|------------|
| Generation overwrites locked Character fields | Completion appends only `referenceAssetIds`; prompt fields remain untouched. |
| Reference generation gets confused with Shot generated ImageNodes | Completion creates an Asset only and binds it to the source node; no generated ImageNode is created in this slice. |
| Provider count/multi-output creates ambiguous bindings | Force one output for Character/Location reference jobs. |
| Existing worker media completion regresses | Keep reference asset completion in a separate branch from generated media node completion. |

## Sources

- **Origin document:** `docs/brainstorms/2026-06-13-021-tf-07-character-location-reference-generation-requirements.md`
- **Task source:** `docs/infinite-canvas-video-long-task-development-flow.md` TF-07
- Related solution: `docs/solutions/architecture-patterns/generation-worker-backend-side-effects-2026-06-12.md`
- Related solution: `docs/solutions/architecture-patterns/prompt-composer-graph-derived-debug-parts-2026-06-12.md`
