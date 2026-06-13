---
title: "Model Image Refinement as Backend-Owned Derivation"
date: 2026-06-13
category: architecture-patterns
module: tf-06-image-refinement-backflow
problem_type: architecture_pattern
component: generation
severity: medium
applies_when:
  - "Adding image-to-image refinement from an existing canvas ImageNode"
  - "Preserving original generated media while adding editable variants"
  - "Completing provider work into same-type canvas graph records"
related_components:
  - backend_generation_api
  - worker_provider_registry
  - asset_lifecycle
  - normalized_canvas_graph
  - frontend_generation_panel
tags:
  - image-refinement
  - image-to-image
  - derived-from
  - generation-job
  - backend-boundary
---

# Model Image Refinement as Backend-Owned Derivation

## Context

Image refinement starts from an ImageNode that already has a project Asset. The creator supplies a refinement prompt, the worker calls an image provider, and the result should appear as another ImageNode on the same canvas without replacing the source image.

The main risk is treating refinement like an in-place edit. In-place mutation would erase prompt history, break later Image -> Video choices, and make it hard to explain which image variant came from which source.

## Guidance

Represent refinement as a durable `image_refinement` generation operation.

Backend job creation should validate the source node before queueing:

- the node belongs to the project;
- the node is an `image` node;
- the node has an image Asset;
- the chosen image provider is enabled and supports `image_to_image`.

Persist canonical input on the job:

- source ImageNode ID;
- source Asset ID;
- refinement prompt;
- image provider, model, aspect ratio, and provider params;
- parent Shot context and resolved generation settings when available.

The worker should call the image provider with `mode: "image_to_image"` and pass source image metadata through the provider-neutral contract. The worker still reports provider outputs only; it should not create assets, nodes, or edges.

Backend completion should materialize the result as new graph facts:

- create a new image Asset from inline bytes or a remote URL;
- create a new ImageNode near the source;
- connect the source ImageNode to the refined ImageNode with a `derived_from` edge;
- mark the job succeeded and preserve a target trace in output JSON.

Use `derived_from` for same-type image variants. Keep `generated_image` reserved for Shot -> ImageNode output and `generated_video` reserved for ImageNode -> VideoNode output.

## Why This Matters

Creators need to compare and branch media variants. A refined image is not a replacement for the original; it is a child artifact with provenance.

Keeping refinement behind the existing generation worker boundary also preserves provider-secret safety, retry behavior, durable asset storage, and canvas reload consistency. The browser submits intent and safe provider settings; the backend owns validation and graph side effects.

## When to Apply

- Adding mask, region, or brush-based image edits.
- Adding batch image refinement.
- Adding provider-specific image edit APIs.
- Building variant selection or lineage inspection UI.
- Reviewing any change that writes a new media node from an existing media node.

## Related

- [Keep Generation Worker Side Effects Behind the Backend Boundary](./generation-worker-backend-side-effects-2026-06-12.md)
- [Keep Real Image Provider Selection Secret-Safe and Backend-Persistent](./real-image-provider-secret-safe-persistence-2026-06-12.md)
- [Semantic canvas edge projection lifecycle](./semantic-canvas-edge-projection-lifecycle-2026-06-12.md)
- [Keep canvas productivity state local until it becomes graph fact](./canvas-productivity-local-state-boundary-2026-06-13.md)
