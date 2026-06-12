---
title: "Project Semantic Canvas Edges Into tldraw Arrows"
date: 2026-06-12
category: architecture-patterns
module: phase-4-semantic-canvas-edges
problem_type: architecture_pattern
component: frontend_canvas
severity: medium
applies_when:
  - "Persisting semantic relationships on a tldraw canvas"
  - "Synchronizing normalized edge facts with visual arrow connectors"
  - "Updating denormalized node reference fields from edge create/delete"
  - "Batch-applying a Location or other source node to multiple target nodes"
related_components:
  - frontend_canvas
  - backend_canvas_api
  - database
  - inspector
tags:
  - canvas-edges
  - tldraw
  - arrow-bindings
  - normalized-state
  - backend-boundary
---

# Project Semantic Canvas Edges Into tldraw Arrows

## Context

Phase 4 added semantic relationships between business canvas nodes:
Character-to-Shot, Location-to-Shot, and Location-to-SceneFrame batch apply.
These relationships must be visible on the canvas, selectable in the Inspector,
durable after reload, and useful for later prompt composition and generation.

The implementation follows the same hybrid pattern established for business
nodes: backend records own domain facts; tldraw shapes are projections.

## Guidance

Keep `CanvasEdge` as the canonical relationship. It should store source and
target normalized node ids, source and target tldraw shape ids, relation type,
optional visual arrow id, and any batch metadata needed for delete cleanup.

Create and delete edges through backend transactions. The browser should not
coordinate partial graph writes as a normal success path:

```ts
const result = await createCanvasEdge(projectId, {
  sourceNodeId,
  targetNodeId,
  relation: "references_location",
  visualArrowShapeId,
  dataJson: { affectedShotNodeIds },
});

publishCanvasGraph({
  nodes: mergeCanvasNodes(nodes, result.updatedNodes),
  edges: mergeCanvasEdges(edges, result.edges),
});
```

For Character-to-Shot, the backend appends a unique character id to
`Shot.dataJson.characterAssetIds`. For Location-to-Shot, it sets
`Shot.dataJson.locationAssetId`. For Location-to-SceneFrame, it records the
affected Shot node ids and creates child Location-to-Shot edges with
`batchSourceEdgeId`, so deleting the batch can remove only references owned by
that batch.

Project visual arrows from normalized edges after business node shapes exist.
In `tldraw@5.1.0`, arrow shape props require numeric `start` and `end` points;
shape props must not contain binding objects. Use separate arrow binding records
to attach the arrow terminals to source and target business shapes:

```ts
editor.createShape({
  id: edge.visualArrowShapeId,
  type: "arrow",
  x: sourceCenter.x,
  y: sourceCenter.y,
  props: {
    start: { x: 0, y: 0 },
    end: {
      x: targetCenter.x - sourceCenter.x,
      y: targetCenter.y - sourceCenter.y,
    },
    color: "blue",
    dash: "solid",
    size: "m",
    arrowheadStart: "none",
    arrowheadEnd: "arrow",
  },
});

editor.createBindings([
  {
    id: `binding:${edge.id}-start`,
    type: "arrow",
    fromId: edge.visualArrowShapeId,
    toId: edge.sourceShapeId,
    props: {
      terminal: "start",
      normalizedAnchor: { x: 0.5, y: 0.5 },
      isExact: false,
      isPrecise: true,
    },
  },
  {
    id: `binding:${edge.id}-end`,
    type: "arrow",
    fromId: edge.visualArrowShapeId,
    toId: edge.targetShapeId,
    props: {
      terminal: "end",
      normalizedAnchor: { x: 0.5, y: 0.5 },
      isExact: false,
      isPrecise: true,
    },
  },
]);
```

Reconcile both the arrow shape and its bindings. If the normalized edge still
exists and the arrow is missing, recreate both. If the arrow exists but bindings
are stale, replace the bindings. If an arrow is selected, map it back to the
normalized edge by `visualArrowShapeId` before showing an edge Inspector.

When the Inspector deletes an edge, call the backend delete endpoint first,
merge returned nodes and edges, then remove the local arrow projection and clear
selection. If delete fails, keep or restore the visual edge and surface a retry
error.

## Why This Matters

Putting semantic facts in tldraw shape props would make later prompt composition
and generation depend on visual snapshot internals. Putting arrow binding state
in the backend would make durable business data depend on a tldraw-specific
representation.

The projection boundary keeps both sides useful:

- Backend `CanvasEdge` records are stable graph facts for prompts, storyboard
  import, generation jobs, export, and API tests.
- tldraw arrows remain visual/editor state that can be recreated when missing
  and rebound when stale.
- Backend transactions keep denormalized Shot reference fields aligned with the
  normalized edge lifecycle.

## When to Apply

- Adding a new semantic relationship between business canvas nodes.
- Restoring missing arrows after loading a tldraw snapshot.
- Debugging tldraw validation errors around arrow terminals or bindings.
- Implementing batch relation create/delete behavior.
- Building prompt or generation modules that consume `CanvasEdge` and Shot
  reference fields.

## Regression Tests

Keep tests near these boundaries:

- shared contract tests for edge create/delete result shapes;
- backend service/e2e tests for valid relations, idempotency, project scoping,
  batch metadata, and delete cleanup;
- frontend pure helper tests for relation validation and SceneFrame containment;
- arrow projection tests that assert numeric `props.start/end` and separate
  binding records;
- canvas sync tests that recreate missing arrows and stale bindings;
- Inspector tests that preserve Asset Library behavior while deleting an edge.

## Related

- [Keep tldraw Business Shapes Synchronized With Normalized Canvas Nodes](./tldraw-business-shape-normalized-node-sync-2026-06-12.md)
- [Persist tldraw Snapshots Through a Backend Autosave Boundary](./durable-tldraw-snapshot-autosave-boundary-2026-06-12.md)
- [Phase 4 implementation plan](../../plans/2026-06-12-005-feat-semantic-canvas-edges-plan.md)
