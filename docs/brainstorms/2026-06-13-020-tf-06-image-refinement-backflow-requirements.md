---
date: 2026-06-13
topic: tf-06-image-refinement-backflow
---

# TF-06 Image Refinement Backflow Requirements

## Summary

TF-06 adds an ImageNode refinement loop: a creator can start from an existing canvas image, submit a short edit prompt through the image provider controls, and receive a new ImageNode/Asset back on the canvas with durable lineage to the source image.

---

## Problem Frame

The canvas can already generate images from shots and videos from images, but a common short-form production loop is still missing: take a usable generated frame, ask for a narrower visual change, and keep both the original and refined result visible in the graph. Without this loop, creators must leave the canvas or overwrite context to compare refined alternatives.

---

## Assumptions

*This requirements doc was authored without synchronous user confirmation. The items below are agent inferences that fill gaps in the TF-06 row and should be reviewed downstream.*

- Image refinement is a whole-image prompt-based edit in this iteration, not mask painting or a Photoshop-style local editor.
- The refined result should create a new ImageNode rather than mutate the source ImageNode.
- The source relationship should use the existing same-type `derived_from` relation.
- Mock provider support is required for local verification; real provider behavior can pass the source Asset ID through the image provider contract without implementing provider-specific binary upload/edit APIs yet.

---

## Actors

- A1. Creator: Selects a canvas ImageNode, writes a refinement instruction, and compares the refined result with the original.
- A2. Generation worker: Executes image-provider work and reports normalized output to the backend.
- A3. Backend generation service: Validates source ownership, persists the generated Asset/ImageNode, and records graph lineage.

---

## Key Flows

- F1. Refine an existing ImageNode
  - **Trigger:** A creator selects an ImageNode that already has an image Asset.
  - **Actors:** A1, A2, A3
  - **Steps:** The creator chooses the refine action, enters a refinement prompt, submits with image provider settings, the worker produces an image output, and the backend adds a new ImageNode connected to the source image.
  - **Outcome:** The canvas contains both original and refined ImageNodes, linked by `derived_from`, and the job output records the source/refined Asset IDs.
  - **Covered by:** R1, R2, R3, R4

---

## Requirements

**Refinement entry**
- R1. An ImageNode with an attached image Asset can enter a refinement action from the existing generation panel.
- R2. The creator can provide a refinement prompt and image provider settings before queueing the job.
- R3. ImageNodes without an attached image Asset cannot queue refinement jobs.

**Generation contract**
- R4. Refinement jobs carry the source ImageNode ID, source Asset ID, prompt, image provider/model/settings, and source/reference context needed by the worker.
- R5. The worker calls the selected image provider with an image-to-image/source-image contract and reports a normalized image output.
- R6. Provider outputs for refinement must be image assets and must match the claimed job provider.

**Canvas backflow**
- R7. Successful refinement creates a new generated image Asset and a new ImageNode instead of modifying the source ImageNode.
- R8. The refined ImageNode stores prompt, provider/model, source node IDs, reference Asset IDs, generation settings, and input/output trace metadata.
- R9. Successful refinement creates a `derived_from` edge from the source ImageNode to the refined ImageNode.
- R10. Existing Shot-to-Image and Image-to-Video generation behavior remains unchanged.

---

## Acceptance Examples

- AE1. **Covers R1, R2, R7, R9.** Given an ImageNode with `asset_image_1`, when the creator submits "make the lighting warmer" as a refinement prompt, the completed job creates a second ImageNode with a new Asset and a `derived_from` edge from the original image.
- AE2. **Covers R3.** Given an ImageNode without an Asset, when the generation panel renders, refinement is unavailable and no job can be queued for that node.
- AE3. **Covers R4, R5, R6.** Given a queued refinement job, when the worker executes it, the image provider receives the source Asset ID and edit prompt, and non-image outputs are rejected by backend completion.
- AE4. **Covers R10.** Given existing shot image generation and image video generation jobs, when they are queued or completed, their current generated_image/generated_video edges and output traces are preserved.

---

## Success Criteria

- Creators can stay on the canvas to make prompt-based refinements and compare the original/refined image nodes.
- Downstream implementers can trace every refined image to its source job, source ImageNode, source Asset, provider output, and canvas edge.
- Local tests can prove the loop without real provider credentials.

---

## Scope Boundaries

- Do not build mask editing, layer editing, brush tools, or partial-region UI.
- Do not replace Image-to-Video as an ImageNode action.
- Do not add batch image refinement in this iteration.
- Do not expose provider secrets or direct browser-to-provider calls.
- Do not require real provider upload/edit support before the mock/local path works end to end.

---

## Key Decisions

- Add refinement as a first-class generation operation so queue, retry, cancel, worker execution, and output traces behave like other generation jobs.
- Model refinement output as a new ImageNode plus `derived_from` edge to preserve variants and comparison, rather than overwriting source node data.
- Reuse the image provider catalog/settings UI so model, aspect ratio, count, and provider params follow the same constraints as Shot-to-Image.
- Keep TF-06 focused on single ImageNode refinement; batch refinement and richer image editing can build on the same operation later.

---

## Dependencies / Assumptions

- Depends on the existing Phase 8/9 generation job, worker, mock provider, and backend completion architecture.
- Depends on the existing canvas `derived_from` relation accepting same-type ImageNode lineage.
- Assumes the source ImageNode's Asset ID is sufficient provenance for provider-side image-to-image adapters until real provider upload/edit support is expanded.
