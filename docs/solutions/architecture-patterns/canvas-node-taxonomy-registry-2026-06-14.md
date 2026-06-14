---
title: "Keep Canvas Node Taxonomy in a Shared Registry"
date: 2026-06-14
category: architecture-patterns
module: cex-04-multimodal-node-taxonomy
problem_type: architecture_pattern
component: frontend_canvas
severity: medium
applies_when:
  - "Classifying canvas node types before adding new source media or advanced visual nodes"
  - "Showing add-node affordances grouped by product family"
  - "Surfacing node capabilities in cards, inspectors, or agent planning UI"
  - "Preparing canvas nodes for later input-slot and provider orchestration work"
related_components:
  - shared_canvas_types
  - frontend_canvas_toolbar
  - business_node_cards
  - node_capability_model
tags:
  - canvas-nodes
  - taxonomy
  - capability-tags
  - multimodal
  - frontend-projection
---

# Keep Canvas Node Taxonomy in a Shared Registry

## Context

CEX-04 needed the product taxonomy from AI-CanvasPro without importing its node
classes, renderers, styles, or desktop assumptions. guga-flow already had durable
canvas node records and Phase 3 business nodes, but the UI treated add-node
actions as one flat list and card chrome did not explain whether a node was a
business artifact, generation node, media operation, or layout helper.

## Guidance

Keep taxonomy metadata in shared types, not in individual React components.
Define a registry entry for every `CanvasNodeType` with:

- a stable family enum;
- a family label;
- a user-facing node label and description;
- capability tags such as accepted media, produced output, preview availability,
  and whether the node is task-backed.

Frontend definitions should derive family and capabilities from the shared
registry while keeping existing node-specific defaults local:

```ts
function defineBusinessNode(type: Phase3CanvasNodeType, definition: BusinessNodeDefinitionInput) {
  const registry = getCanvasNodeRegistryItem(type);
  return {
    ...definition,
    family: registry.family,
    familyLabel: registry.familyLabel,
    capabilities: registry.capabilities,
  };
}
```

Use the same registry to group add-node controls. That prevents cards, toolbars,
inspectors, and future agent planning UI from developing competing definitions
of what an `image`, `video`, `editor_package`, or `scene_frame` node means.

## Boundaries

This registry is a product and type-system contract, not a persistence
migration. It should not change `CanvasNodeRecord`, tldraw shape props, provider
credentials, local file paths, or browser DTO secret boundaries.

Do not use CEX-04 to add every imagined node family at once. Families such as
`source_media` and `advanced_visual` can exist before first-class source media,
3D, or 360 nodes ship. They make future additions explicit while keeping the
current persisted type list stable.

Capability tags are intentionally coarse. They answer questions such as "can
this node accept image references?" and "does this node produce an asset?" They
are not a replacement for CEX-06 input-slot validation or provider-specific
schema checks.

## Why It Works

A shared registry makes the taxonomy testable. Shared tests can assert that
every current node type has exactly one registry item and that every capability
belongs to the known enum. Frontend tests can assert Phase 3 node definitions
mirror that metadata, and toolbar tests can verify creation actions stay grouped
by family.

This keeps the UI understandable without hard-coding family rules in multiple
places. It also gives later source-media ingestion, node input slots, and agent
planning work a stable vocabulary for filtering and reasoning about canvas
nodes.

## Reuse Guidance

Apply this pattern when adding a new canvas node type:

- add the domain type and data contract first;
- add exactly one registry item with family, label, description, and
  capabilities;
- add shared registry coverage tests;
- project the metadata into any local UI definition instead of duplicating it;
- group creation or discovery affordances by registry family.

Only introduce a new capability tag when multiple features need to branch on it.
If one component needs a one-off label or visual style, keep that in the local
component definition and leave the shared registry focused on cross-layer
meaning.

## Verification

CEX-04 verified the pattern with:

- shared type lint, tests, and build;
- frontend type checks and test suite;
- a production Next build;
- a browser smoke test of `/projects/project_1/canvas` with grouped toolbar
  sections and node-card taxonomy metadata visible, no console warnings/errors,
  and mock API requests returning 200.

## Related

- [Keep tldraw Business Shapes Synchronized With Normalized Canvas Nodes](./tldraw-business-shape-normalized-node-sync-2026-06-12.md)
- [Persist tldraw Snapshots Through a Backend Autosave Boundary](./durable-tldraw-snapshot-autosave-boundary-2026-06-12.md)
- [CEX-04 plan](../../plans/2026-06-14-041-feat-cex-04-node-taxonomy-plan.md)
