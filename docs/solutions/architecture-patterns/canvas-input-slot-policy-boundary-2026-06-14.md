---
title: "Validate Canvas Input Slots Before Writing Semantic Edges"
date: 2026-06-14
category: architecture-patterns
module: cex-06-node-input-slots
problem_type: architecture_pattern
component: canvas_semantic_edges
severity: high
applies_when:
  - "Connecting source media nodes to generation, shot, or asset nodes"
  - "Recording multimodal input context on canvas semantic edges"
  - "Explaining why an upstream reference can or cannot feed a node"
  - "Preparing canvas edges for generation job input assembly"
related_components:
  - shared_canvas_types
  - frontend_semantic_binding
  - backend_canvas_service
  - source_media_nodes
  - generation_inputs
tags:
  - canvas-edges
  - input-slots
  - multimodal
  - validation
  - provenance
---

# Validate Canvas Input Slots Before Writing Semantic Edges

## Context

CEX-05 let source text, image, video, and audio nodes connect upstream of AI and
story nodes with `derived_from` edges. That was enough to show provenance, but
it did not say which target input slot the edge occupied, what kind of media it
carried, or whether the target already had too many references.

CEX-06 keeps `CanvasEdgeRelation` intact and adds slot metadata to
`CanvasEdge.dataJson` for source-media `derived_from` edges. The edge remains a
semantic canvas edge, while `dataJson` records generation-ready facts:

```ts
{
  slotId: "reference_image",
  inputKind: "image",
  inputRole: "reference_image",
  order: 0
}
```

## Guidance

Keep the input policy in shared types. The policy should define, per target node
type, which slots exist, which input kind each slot accepts, which role it plays,
whether it is required, and how many connections it can hold.

Use the shared policy in three places:

1. Shared tests assert slot resolution and validation for valid, mismatched, and
   over-capacity connections.
2. The frontend semantic binding flow filters candidate targets with the shared
   validator and includes the resolved slot metadata when creating an edge.
3. The backend `CanvasService` performs the same validation immediately before
   writing the edge, using already-written target edges to enforce counts.

Do not encode source-media compatibility separately in React components,
controllers, or Prisma migrations. Those layers should call the shared helper
and then persist the returned slot edge data.

## Backend Boundary

`derived_from` still supports same-type variant edges without slot metadata.
Only cross-type `derived_from` edges from source media enter the input-slot
policy path. This preserves existing variant behavior while making upstream
media references explicit.

The backend must validate before write:

- cross-canvas source and target nodes are rejected before slot validation;
- type mismatches fail with a readable policy message;
- slot count overflow fails before `canvasEdge.create`;
- accepted edges merge normalized user `dataJson` with canonical slot metadata.

Apply the same helper to import paths that write edges in batches. The existing
batch result edges provide enough context for count checks inside the current
import.

## Why It Works

The pattern separates relation meaning from input occupancy. `CanvasEdgeRelation`
continues to answer "what semantic relationship is this?", while slot data
answers "how will this target consume the upstream node?" That keeps the graph
compatible with existing semantic edges and makes later generation job assembly
straightforward: gather upstream edges by target, sort by slot/order, and map
`inputKind` plus `inputRole` into provider request inputs.

Because frontend and backend share the validator, users get immediate feedback
in the canvas, and the server still protects persistence if a client is stale or
custom crafted.

## Reuse Guidance

Use this pattern when adding a new input-consuming node:

- add target slots to `CANVAS_NODE_INPUT_SLOTS`;
- add output kinds for any new source or generated node type;
- write shared validation tests for compatible and incompatible source/target
  pairs;
- make frontend binding flows pass through the shared validator;
- keep provider-specific limits out of this policy unless the limit is truly a
  graph-level contract.

Provider model constraints should be layered after this policy. For example, a
model that does not support audio can reject a generation job while the graph
still records a valid audio reference edge for models that do.

## Verification

CEX-06 verified the pattern with:

- shared type lint, tests, and build;
- frontend type checks and semantic binding tests for slot data, type mismatch,
  and count overflow;
- backend CanvasService tests for successful source-media slot writes, type
  mismatch rejection, slot overflow rejection, and cross-canvas rejection;
- repository-wide lint/tests and production frontend build.

## Related

- [Import Source Media Through Assets Before Canvas Nodes](./source-media-drag-drop-asset-boundary-2026-06-14.md)
- [Keep Canvas Node Taxonomy in a Shared Registry](./canvas-node-taxonomy-registry-2026-06-14.md)
- [Project Semantic Canvas Edges Into Durable Node State](./semantic-canvas-edge-projection-lifecycle-2026-06-12.md)
- [CEX-06 plan](../../plans/2026-06-14-043-feat-cex-06-node-input-slots-plan.md)
