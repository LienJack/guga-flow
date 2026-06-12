---
title: "Keep Real Image Provider Selection Secret-Safe and Backend-Persistent"
date: 2026-06-12
category: architecture-patterns
module: phase-9-real-image-provider-generation
problem_type: architecture_pattern
component: image_generation
severity: medium
applies_when:
  - "Adding real image provider adapters to a browser-facing generation workflow"
  - "Exposing provider/model/parameter selection in frontend UI"
  - "Persisting provider remote URLs or inline bytes as project assets"
  - "Supporting multi-output image generation from one user action"
related_components:
  - provider_catalog
  - backend_generation_api
  - worker_provider_registry
  - asset_lifecycle
  - normalized_canvas_graph
tags:
  - provider-secrets
  - image-generation
  - generated-media
  - asset-persistence
  - multi-output
---

# Keep Real Image Provider Selection Secret-Safe and Backend-Persistent

## Context

Phase 9 adds real image provider seams to the durable Shot -> ImageNode workflow. The browser needs enough metadata to choose a provider, model, aspect ratio, count, and provider parameters, but it must not see provider credentials or call provider APIs directly.

Provider outputs are also not durable by default. A real adapter may return inline base64 bytes or a temporary remote URL. Both must become backend-owned project assets before the canvas graph points at them.

## Guidance

Expose provider availability through a static safe catalog plus server-side key presence checks.

The catalog can include:

- provider id and display name;
- enabled state and non-secret disabled reason;
- safe model ids and labels;
- supported modes, reference limits, output limits, and aspect ratios;
- parameter metadata such as select options and defaults.

The catalog must not include raw env var names with values, API keys, request headers, or browser-entered secret fields. When a real provider is disabled, reject job creation before mutating job or node state. Keep `mock-image` enabled so no-key development and CI continue to exercise the full generation lifecycle.

Let the worker normalize provider responses, but let the backend materialize outputs.

Worker outputs should use a provider-neutral shape:

- `bytesBase64` for inline image bytes;
- `remoteUrl` for provider-hosted media;
- bounded `storageKey`;
- provider, model, prompt, reference ids, dimensions, provider task id, and small non-secret raw trace fields.

Backend completion should decode `bytesBase64` or download `remoteUrl` server-side, write bytes through the storage service, create an `Asset`, then create generated ImageNodes and `generated_image` edges. Do not let the browser persist provider URLs or storage keys.

For multi-output image jobs, keep one `GenerationJob` as the user action and audit record. Preserve first-target fields for older consumers, and add a `targets` trace containing every generated node, asset, edge, and provider output.

## Why This Matters

This boundary keeps provider secrets out of browser state while still giving creators useful model controls. It also prevents generated images from becoming dangling provider URLs that may expire, leak access patterns, or bypass project-scoped asset permissions.

The multi-output trace prevents a subtle compatibility trap: old UI paths can keep reading `targetNodeId` and `assetId`, while newer flows can inspect all generated outputs without re-querying the canvas graph.

## When to Apply

- Adding another image provider adapter.
- Adding provider-specific parameters to the Inspector generation panel.
- Supporting image-to-image or multi-reference generation with uploaded reference assets.
- Adding generated media remote download, polling, or provider task ids.
- Reviewing any change where worker output becomes an Asset or CanvasNode.

## Related

- [Keep Generation Worker Side Effects Behind the Backend Boundary](./generation-worker-backend-side-effects-2026-06-12.md)
- [Project-scoped asset lifecycle boundary](./project-scoped-asset-lifecycle-boundary-2026-06-12.md)
- [Compose prompts from canvas graph records with debug parts](./prompt-composer-graph-derived-debug-parts-2026-06-12.md)
