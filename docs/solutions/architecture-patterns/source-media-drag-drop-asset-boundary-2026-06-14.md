---
title: "Import Source Media Through Assets Before Canvas Nodes"
date: 2026-06-14
category: architecture-patterns
module: cex-05-source-media-drag-drop
problem_type: architecture_pattern
component: frontend_canvas
severity: high
applies_when:
  - "Letting users drop local text, image, video, or audio files onto a canvas"
  - "Creating canvas nodes that reference uploaded media"
  - "Keeping local file bytes and paths out of browser-only canvas state"
  - "Preparing source media for later AI node input slots"
related_components:
  - asset_library
  - canvas_nodes
  - tldraw_shapes
  - semantic_edges
  - source_media_nodes
tags:
  - source-media
  - drag-drop
  - asset-boundary
  - canvas-nodes
  - upload-storage
---

# Import Source Media Through Assets Before Canvas Nodes

## Context

CEX-05 added source text, image, video, and audio nodes after the CEX-04 node
taxonomy. The risk was letting a convenient drag/drop UI bypass project Asset
storage by keeping file bytes, browser blob URLs, or local file paths in tldraw
state. That would make source media disappear on refresh and could leak local
machine details into browser DTOs.

## Guidance

Treat a dropped file as an Asset upload first and a CanvasNode creation second:

1. Classify the file as `source_text`, `source_image`, `source_video`, or
   `source_audio`.
2. Reject unsupported, oversized, or duplicate-in-batch files with readable UI
   errors.
3. Upload the file through the backend Asset API using the normal project
   storage boundary.
4. Create a source-media CanvasNode whose `dataJson` stores only safe Asset
   metadata: `assetId`, MIME type, original filename, size, optional dimensions
   or duration, preview kind/URL, and import method.
5. Render the node through the same normalized node -> custom tldraw shape
   projection used by other canvas nodes.

The node data should look like:

```ts
{
  assetId: "asset_image_1",
  mimeType: "image/png",
  originalFilename: "reference.png",
  sizeBytes: 2048,
  width: 1080,
  height: 1920,
  source: "asset",
  importMethod: "drag_drop",
  previewKind: "image",
  previewUrl: "/api/v1/projects/project_1/assets/asset_image_1/preview"
}
```

Do not store `File` objects, blob URLs, absolute local paths, or raw bytes in
CanvasNode data or tldraw snapshots.

## Backend Boundary

Source media node types must exist in the shared taxonomy and the Prisma
`CanvasNodeType` enum. This keeps backend create validation honest: the browser
cannot invent arbitrary node types, but source nodes can still use the existing
`CanvasNode.dataJson` JSON field without a table migration.

The Asset upload endpoint remains responsible for MIME allow-listing, upload
size limits, storage keys, and project scoping. Canvas node creation assumes the
Asset already exists and stores the reference metadata returned by that API.

For pre-CEX-06 upstream references, source media can create `derived_from` edges
to compatible business or AI nodes. The relation records provenance without
writing slot/cardinality facts yet.

## Why It Works

The pattern gives users the expected canvas drag/drop workflow while preserving
durability:

- refreshes can reload source nodes from normalized CanvasNode rows;
- Asset previews resolve through backend-controlled URLs;
- deleting or auditing media can still use Asset reference checks;
- future input-slot validation can reason over source node family and
  capability tags instead of parsing local browser state.

## Reuse Guidance

Use this pattern for any future local media import surface:

- screenshots,
- web previews,
- folder-authorized local imports,
- remote URL fetches that become project assets,
- generated derivatives that need a visible source node.

Only skip source-node creation when the file is uploaded as a library-only
asset. If the file is meant to drive generation, prompt context, or storyboard
reasoning, create an Asset-backed source node so the graph can explain where the
media came from.

## Verification

CEX-05 verified the pattern with:

- shared source node registry and data-contract tests;
- backend CanvasService tests for source node creation and source-media
  upstream edges;
- frontend tests for source node rendering, toolbar grouping, drop validation,
  and semantic binding rules;
- repository-wide lint and tests;
- production Next build;
- browser smoke test that dispatched a dropped image file, observed
  `POST /assets/upload`, `POST /canvas/nodes`, and snapshot save responses, and
  confirmed the Source Image card rendered with filename, MIME, dimensions, and
  Asset id without console warnings/errors.

## Related

- [Keep Canvas Node Taxonomy in a Shared Registry](./canvas-node-taxonomy-registry-2026-06-14.md)
- [Keep Project Asset Lifecycle Behind the Backend Boundary](./project-scoped-asset-lifecycle-boundary-2026-06-12.md)
- [Keep tldraw Business Shapes Synchronized With Normalized Canvas Nodes](./tldraw-business-shape-normalized-node-sync-2026-06-12.md)
- [CEX-05 plan](../../plans/2026-06-14-042-feat-cex-05-source-media-drag-drop-plan.md)
