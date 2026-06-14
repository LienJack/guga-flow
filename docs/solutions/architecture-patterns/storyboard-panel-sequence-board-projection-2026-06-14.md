# Storyboard Panel Sequence Board Projection

Date: 2026-06-14
Status: accepted

## Context

CEX-16 needs storyboard CRUD, ordering, and a canvas storyboard board without
creating a second storyboard persistence model. Existing canvas facts already
represent production beats as `shot` nodes and media outputs as `image`/`video`
nodes.

## Decision

- Treat `shot` nodes as the durable storyboard item records.
- Store panel order on `ShotNodeData.storyboardOrder` and normalized
  `shotNumber`.
- Rebuild `sequence_next` edges after create, delete, and reorder mutations.
- Represent the MVP storyboard media board as a `scene_frame` node with
  `SceneFrameNodeData.storyboardBoard`.
- Board items keep source `shotNodeId`, optional `imageNodeId`, optional
  `videoNodeId`, and the resolved media `assetId`.

## Consequences

- Production workspace CRUD stays compatible with the canvas graph and can be
  merged into local frontend state using returned nodes/edges.
- Board nodes are visual projections; editing or deleting them does not fork
  Shot records.
- Reordering has one backend source of truth: resequenced Shot data plus the
  current `sequence_next` chain.

## Verification

- Canvas service tests cover add, delete, reorder, and board creation.
- Frontend API tests cover the new production workspace endpoints.
- Production workspace panel static render covers CRUD controls.
