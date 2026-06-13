---
title: "Bind Generated Reference Images Back to Source Nodes"
date: 2026-06-13
category: architecture-patterns
module: tf-07-character-location-reference-generation
problem_type: architecture_pattern
component: generation
severity: medium
applies_when:
  - "Generating Character or Location consistency images from canvas node fields"
  - "Binding provider output as a reusable reference Asset"
  - "Preserving user-authored and locked node data during generation completion"
related_components:
  - backend_generation_api
  - worker_provider_registry
  - asset_lifecycle
  - normalized_canvas_graph
  - prompt_composer
tags:
  - reference-images
  - character-consistency
  - location-consistency
  - generation-job
  - backend-boundary
---

# Bind Generated Reference Images Back to Source Nodes

## Context

Character and Location nodes already hold the fields that make a useful visual reference: identity prompts, consistency prompts, appearance, wardrobe, environment, mood, and style. They also already expose `referenceAssetIds` for prompt composition.

TF-07 adds generation of those reference images, but the output should strengthen the source node rather than become a separate production Shot image.

## Guidance

Model Character and Location reference generation as direct worker jobs:

- `character_to_image` starts from a `character_asset` node;
- `location_to_image` starts from a `location_asset` node;
- both dispatch as single-output `text_to_image` calls through the image provider registry.

Backend job creation should derive prompts from persisted node data and safe provider settings. It should not ask the browser to send raw prompt text for these source nodes, because the backend is the authority on the current node data.

Backend completion should create an image Asset and append the Asset ID to the source node `referenceAssetIds`. It should not create a generated ImageNode or semantic edge for this slice. The generated artifact is a reusable reference, not a storyboard frame.

Preserve source node data by copying existing `dataJson` and changing only `referenceAssetIds`. Locked fields and prompt fields remain exactly as the creator saved them.

## Why This Matters

Reference images are part of a Character or Location's reusable identity. Binding them back to the source node keeps later Shot prompt composition simple: it already reads Character/Location `referenceAssetIds`.

Keeping completion backend-owned preserves provider-secret safety, retry/failure behavior, project-scoped storage, and node status consistency without making the worker write graph data directly.

## When to Apply

- Adding expression sheets, pose sheets, or multi-angle reference packs.
- Adding batch Character/Location reference generation.
- Adding real provider-specific identity reference APIs.
- Reviewing changes that generate reusable reference Assets from source nodes.

## Related

- [Keep Generation Worker Side Effects Behind the Backend Boundary](./generation-worker-backend-side-effects-2026-06-12.md)
- [Compose prompts from canvas graph records with debug parts](./prompt-composer-graph-derived-debug-parts-2026-06-12.md)
- [Project-scoped asset lifecycle boundary](./project-scoped-asset-lifecycle-boundary-2026-06-12.md)
