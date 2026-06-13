---
title: "Keep Canvas Productivity Controls on Normalized Graph Facts"
date: 2026-06-13
category: architecture-patterns
module: phase-12-canvas-productivity
problem_type: architecture_pattern
component: canvas_productivity
severity: medium
applies_when:
  - "Adding search, outline, shortcuts, or Inspector actions to a tldraw canvas"
  - "Persisting preferred generated media selections"
  - "Duplicating canvas nodes as variants"
  - "Adding UI-only navigation controls around normalized CanvasNode records"
related_components:
  - frontend_canvas_workspace
  - frontend_canvas_inspector
  - backend_canvas_edges
  - backend_generation_batch
tags:
  - canvas
  - productivity
  - normalized-graph
  - inspector-actions
  - tldraw
---

# Keep Canvas Productivity Controls on Normalized Graph Facts

## Context

Phase 12 adds controls that make a large project canvas usable: batch Shot image jobs, search/outline navigation, SceneFrame collapse, preferred media selection, duplicate-as-variant, and shortcuts.

These controls sit close to tldraw, but most of their durable meaning belongs in the normalized graph. Search and focus are temporary UI state. Collapse, selected media, and variants must survive reload and be visible to the backend.

## Guidance

Keep navigation local and business facts durable:

```text
Search / outline / keyboard shortcuts -> local React state + tldraw selection/focus only
SceneFrame collapsed state -> CanvasNode.dataJson.collapsed
Preferred Shot media -> CanvasNode.dataJson.selectedImageNodeId / selectedVideoNodeId
Duplicate variant -> new CanvasNode + derived_from CanvasEdge
Batch image/video actions -> ordinary child GenerationJob records
```

Do not persist search query, current outline group, or keyboard shortcut state. Those are workbench conveniences.

Do persist any choice that changes production intent. A collapsed SceneFrame, a preferred generated image, and a variant relationship are part of the project graph, not tldraw session state.

Prefer edge-derived discovery over ad hoc node scanning when media lineage matters. Phase 12 finds Shot image candidates through `generated_image` edges and video candidates through `generated_video` edges from those images.

When focusing canvas nodes from a sidebar, keep the contract narrow. The workspace records a focus request with `{ nodeId, key }`; the editor selects the matching business shape and calls the existing fit behavior. The sidebar does not call tldraw APIs directly.

## Why This Matters

Canvas productivity features can quietly create a second state system if every UI affordance stores its own view of the graph. That makes reload, worker completion, export, and review harder to reason about.

Using existing `CanvasNode`, `CanvasEdge`, and `GenerationJob` surfaces keeps Phase 12 features compatible with previous phases. Batch generation still produces normal media jobs, variants are ordinary edges, and preferred media choices remain inspectable from backend records.

## When to Apply

- Adding graphical minimaps, filters, saved views, or timeline selection controls.
- Adding richer NodeVersion history or version browsers.
- Adding bulk graph operations from the Inspector or sidebar.
- Reviewing tldraw integration changes that might persist UI-only state.

## Related

- [tldraw business shape normalized node sync](./tldraw-business-shape-normalized-node-sync-2026-06-12.md)
- [Semantic canvas edge projection lifecycle](./semantic-canvas-edge-projection-lifecycle-2026-06-12.md)
- [Keep Generation Worker Side Effects Behind the Backend Boundary](./generation-worker-backend-side-effects-2026-06-12.md)
