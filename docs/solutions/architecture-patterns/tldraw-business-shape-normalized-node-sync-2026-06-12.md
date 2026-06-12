---
title: "Keep tldraw Business Shapes Synchronized With Normalized Canvas Nodes"
date: 2026-06-12
category: architecture-patterns
module: phase-3-business-canvas-nodes
problem_type: architecture_pattern
component: service_object
severity: medium
applies_when:
  - "Projecting domain records into custom tldraw shapes"
  - "Keeping a visual canvas snapshot alongside normalized backend nodes"
  - "Adding Inspector edits that update business data while the canvas can update geometry"
  - "Preparing canvas node data for later provider orchestration modules"
related_components:
  - frontend_canvas
  - backend_canvas_api
  - database
  - testing_framework
tags:
  - tldraw
  - canvas-nodes
  - normalized-state
  - inspector
  - backend-boundary
---

# Keep tldraw Business Shapes Synchronized With Normalized Canvas Nodes

## Context

Phase 3 added the first production-shaped canvas objects: Novel, Scene Frame,
Scene, Shot, Character Asset, Location Asset, Image, Video, and Editor Package
nodes. The app now stores both a full tldraw visual snapshot and normalized
`CanvasNode` rows with project-scoped business data, geometry, and status.

The important boundary is that tldraw shapes are projections of backend-owned
business nodes. Shapes make nodes visible and draggable; normalized records
remain the durable source for Inspector fields, provider-ready data, and API
contracts.

## Guidance

Keep custom tldraw shape types separate from domain node types. Prefix shape
types so they do not collide with built-in tldraw shapes such as `video`:

```ts
export const BUSINESS_NODE_SHAPE_TYPES = {
  video: "business_video",
  shot: "business_shot",
  image: "business_image",
  // ...
} as const;
```

Store only render-facing projection data in shape props: `nodeId`, the domain
type, card labels, summary text, dimensions, and status. The backend
`CanvasNode` keeps `dataJson`, title, geometry, z-index, and status as the
durable record.

Reconcile normalized nodes into the tldraw document after loading the snapshot
and after any parent `canvasNodes` state change:

```ts
const existingShape = editor.getShape(node.tldrawShapeId as TLShapeId);

if (!existingShape) {
  editor.createShape({
    id: node.tldrawShapeId as TLShapeId,
    type: getBusinessNodeShapeType(node.type),
    x: node.x,
    y: node.y,
    props: buildBusinessNodeShapeProps(node),
  });
} else if (isBusinessNodeShape(existingShape)) {
  editor.updateShape({
    id: node.tldrawShapeId as TLShapeId,
    type: existingShape.type,
    x: node.x,
    y: node.y,
    props: buildBusinessNodeShapeProps(node),
  });
}
```

Create nodes through the backend before creating the shape. That ensures the
shape carries a real `nodeId`, uses server defaults, and can be selected by the
Inspector immediately.

When users move or resize shapes, debounce geometry updates, but merge the
backend response back into frontend normalized state:

```ts
const scheduler = createBusinessNodeGeometryScheduler({
  projectId,
  patchGeometry: updateCanvasNodeGeometry,
  onGeometrySaved: (node) => {
    publishCanvasNodes(mergeCanvasNode(nodesRef.current, node));
  },
});
```

Without this merge, later Inspector edits can re-render the canvas from stale
`canvasNodes` and snap the shape back to its pre-drag geometry.

Inspector saves should also replace the updated node in parent state instead of
mutating shape props directly. The next reconcile pass refreshes the card
summary from the canonical record:

```ts
const result = await updateCanvasNode(projectId, nodeId, input);
onNodeUpdated(result.node);
```

When building `dataJson` from form fields, preserve unknown JSON object keys.
Later modules may add provider metadata, generation attempts, asset references,
or orchestration state. A Phase 3 form should update its known fields without
silently deleting newer extension data.

Deletion should treat the backend delete as the durable operation. If the user
removes a shape but the API delete fails, restore the shape from the still
existing normalized node and surface an error. That keeps the visual canvas from
pretending a backend-owned node was deleted.

## Why This Matters

A hybrid tldraw setup can drift in two directions:

- The visual snapshot can contain a shape that no longer maps to a real domain
  node.
- The normalized node table can contain business data or geometry that the
  canvas no longer reflects.

The projection pattern makes the boundary explicit. tldraw handles visual
interaction and snapshot persistence; the backend owns domain node identity,
business fields, project scoping, validation, and lifecycle. Future modules can
then attach provider workflows, generated assets, edges, and versions to
`CanvasNode` records without depending on tldraw internals.

## When to Apply

- Adding a new business canvas node type.
- Rendering domain objects as custom tldraw shapes.
- Letting users edit node business data in an Inspector while moving shapes on
  the canvas.
- Debugging position resets, stale cards, duplicate shapes, or nodes that remain
  after deletion.
- Preparing canvas records for asynchronous provider jobs or asset generation.

## Examples

For Phase 3, the implementation verified the full loop:

- Created all nine MVP business node types on a real canvas.
- Edited a Shot through the Inspector and confirmed the card summary updated.
- Refreshed the page and confirmed edited `dataJson` restored from the backend.
- Dragged the Shot and confirmed backend geometry changed.
- Deleted the Shot and confirmed uploaded project assets remained intact.
- Ran canvas unit tests, frontend type checks, repository format checks, and a
  browser smoke test with no console errors.

The regression tests to keep close to this pattern are:

- shape/card model tests for each supported business node type;
- geometry scheduler tests that assert successful PATCH responses update
  normalized node state;
- Inspector tests that render selection states and preserve the Asset Library;
- form-data tests that preserve extension keys while clearing known empty fields.

## Related

- [Persist tldraw Snapshots Through a Backend Autosave Boundary](./durable-tldraw-snapshot-autosave-boundary-2026-06-12.md)
- [Keep Project Asset Lifecycle Behind the Backend Boundary](./project-scoped-asset-lifecycle-boundary-2026-06-12.md)
- [Phase 3 implementation plan](../../plans/2026-06-12-004-feat-business-canvas-nodes-inspector-plan.md)
