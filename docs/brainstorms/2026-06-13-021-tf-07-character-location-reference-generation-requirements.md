---
title: "TF-07 Character and Location Reference Image Generation Requirements"
type: requirements
status: completed
date: 2026-06-13
task_source: docs/infinite-canvas-video-long-task-development-flow.md#tf-07
---

# TF-07 Character and Location Reference Image Generation Requirements

## Problem

Character and Location nodes already carry prompt fields and `referenceAssetIds`, and uploaded reference images can be bound manually. The missing production loop is generating a first consistency/reference image directly from those nodes and binding the result back to the source node.

## Outcomes

- R1. A Character node can queue a `character_to_image` job from the Inspector.
- R2. A Location node can queue a `location_to_image` job from the Inspector.
- R3. Backend job creation derives the image prompt from existing node fields and preserves provider settings.
- R4. Worker execution uses the existing image provider contract and produces one image output.
- R5. Backend completion creates a generated image Asset with `character_reference` or `location_reference` purpose and appends the Asset ID to the source node `referenceAssetIds`.
- R6. Existing locked fields and user-authored node data are never overwritten by generation completion.
- R7. Existing Shot-to-Image, Image Refinement, and Image-to-Video behavior remains unchanged.

## Scope

In scope:

- Single reference image generation from one Character or Location node.
- Reuse safe image provider catalog, model, aspect ratio, and provider params.
- Reuse existing worker claim/succeed/fail/retry lifecycle.
- Append-only reference binding on successful completion.

Out of scope:

- Expression sheets, pose sheets, multi-angle packs, or batch Character/Location generation.
- New provider-specific character consistency APIs.
- Browser-side provider calls or browser-visible provider secrets.
- Automatic rewriting of locked fields, appearance, environment, or prompt fields from generated outputs.
- Creating separate ImageNodes for reference assets in this slice.

## Acceptance

- A Character node with `identityPrompt`, `consistencyPrompt`, `appearance`, or other descriptive fields can queue and complete a reference image job.
- A Location node with `locationPrompt`, `consistencyPrompt`, `environment`, or other descriptive fields can queue and complete a reference image job.
- Completion updates only generation status and `referenceAssetIds` on the source node data.
- Provider failures still use the existing failed job and retry path.
- Tests prove source validation, prompt building, worker dispatch, asset purpose, and reference binding.

## Evidence And Existing Boundaries

- `packages/shared-types/src/domain/generation.ts` already lists `character_to_image` and `location_to_image` in the broad generation operation enum.
- `packages/shared-types/src/domain/canvas.ts` already stores `referenceAssetIds` on `CharacterAssetNodeData` and `LocationAssetNodeData`.
- `apps/frontend/src/components/canvas/node-reference-assets.tsx` already binds uploaded image Assets to those nodes.
- `apps/backend/src/generation/generation.service.ts` owns generation job creation and completion side effects.
- `apps/worker/src/generation-executors.ts` already dispatches image-provider jobs for Shot and image refinement operations.

