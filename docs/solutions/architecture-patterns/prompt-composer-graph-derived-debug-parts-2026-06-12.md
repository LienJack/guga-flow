---
title: "Compose Prompts From Canvas Graph Records With Debug Parts"
date: 2026-06-12
category: architecture-patterns
module: phase-7-prompt-composer-assets
problem_type: architecture_pattern
component: development_workflow
severity: medium
applies_when:
  - "Composing generation prompts from imported storyboard canvas graphs"
  - "Preparing GenerationJob input without calling providers yet"
  - "Debugging why a Shot prompt is missing Character, Location, or reference image context"
  - "Binding project image assets to Character or Location nodes"
related_components:
  - shared_types
  - backend_prompt_api
  - frontend_inspector
  - asset_lifecycle
tags:
  - prompt-composer
  - canvas-graph
  - debug-parts
  - reference-assets
  - generation-input
---

# Compose Prompts From Canvas Graph Records With Debug Parts

## Context

Phase 7 needs creators to inspect the prompt that later generation jobs will use, but Phase 7 must not create jobs, call providers, or generate media nodes. The durable inputs already live in normalized `CanvasNode`, `CanvasEdge`, and `Asset` records after storyboard import.

The important boundary is that prompt preview is runtime output derived from the latest graph. It should not overwrite imported Shot prompt fields, and it should not trust browser-assembled prompt strings as canonical future job input.

## Guidance

Keep prompt composition in a shared pure function and call it from a backend-owned Shot compose route.

The shared composer should accept graph records:

```ts
composeShotPrompt({
  shotNodeId,
  nodes,
  edges,
  assets,
});
```

It should return image and video prompt outputs plus the metadata future jobs need:

- final prompt text per channel;
- negative prompt;
- `referenceAssetIds` after dedupe and image-asset validation;
- `sourceNodeIds` for Shot, Scene, Character, Location, and references;
- structured debug parts for Scene, Location, Character, Shot, global style, model suffix, and negative prompt;
- missing-context entries for absent Scene, Character, Location, prompt fields, or invalid reference assets.

The backend route should be read-only:

```text
POST /api/v1/projects/:projectId/prompts/shot/:shotNodeId/compose
```

It should resolve the project canvas through the backend boundary, reject missing/cross-project/non-Shot node ids, and call the shared composer with persisted records. This makes the backend response the canonical shape Phase 8 can store in `GenerationJob.input`.

Store MVP reference image bindings on Character and Location node `dataJson` as `referenceAssetIds`. This matches the creator's mental model, keeps Shot data clean, and avoids adding a separate relation table before reference lifecycle needs history, permissions, or independent deletion behavior.

In the Inspector, keep responsibilities separate:

- Character/Location forms edit prompt-ready fields such as `identityPrompt` and `locationPrompt`.
- The node Reference images panel binds or removes ids from `dataJson.referenceAssetIds` without deleting assets.
- The global Asset Library remains responsible for project asset preview and deletion.
- The Shot Prompt preview panel renders backend-composed output and debug parts; it does not create jobs or mutate Shot prompts.

## Why This Matters

This pattern prevents prompt drift across layers. Frontend UI helpers format backend output, but they do not reimplement canonical prompt assembly. Backend job creation can later reuse the same shared composer result and preserve the same debug shape users saw in the preview.

It also protects graph ownership:

- `CanvasNode` and `CanvasEdge` remain the business truth.
- tldraw remains a projection.
- Asset bytes and deletion remain backend-owned.
- Provider execution stays outside prompt preview.

Without this split, prompt preview can become a browser-only approximation, provider jobs can diverge from what users inspected, or node edits can accidentally drop import provenance and reference bindings.

## When to Apply

- Adding Phase 8 mock image/video job creation.
- Persisting composed prompt snapshots into `GenerationJob.input`.
- Adding provider-specific model parameters or style controls.
- Introducing Style or Prop node reference workflows.
- Debugging missing Character, Location, or reference image context in generated media.

## Examples

Prompt preview should be derived from the current graph, not stored over Shot fields:

```ts
const result = composeShotPrompt({
  shotNodeId: shotNode.id,
  nodes: canvas.nodes,
  edges: canvas.edges,
  assets: canvas.assets,
});

generationJobInput = {
  prompt: result.image.prompt,
  negativePrompt: result.negativePrompt,
  referenceAssetIds: result.referenceAssetIds,
  debugParts: result.debugParts,
  sourceNodeId: result.sourceNodeIds.shotNodeId,
};
```

Reference binding should update only the selected Character or Location node:

```ts
dataJson.referenceAssetIds = uniqueImageAssetIds;
await updateCanvasNode(projectId, node.id, { dataJson });
```

Deleting an asset should stay in the Asset Library flow. Removing a reference from a node should only remove the id from that node's `referenceAssetIds`.

## Related

- [Storyboard import layout provenance](./storyboard-import-layout-provenance-2026-06-12.md)
- [Project-scoped asset lifecycle boundary](./project-scoped-asset-lifecycle-boundary-2026-06-12.md)
- [Semantic canvas edge projection lifecycle](./semantic-canvas-edge-projection-lifecycle-2026-06-12.md)
- [tldraw business shape normalized node sync](./tldraw-business-shape-normalized-node-sync-2026-06-12.md)
