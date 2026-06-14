# CEX-16 Storyboard Panel And Media Board Requirements

Date: 2026-06-14
Status: completed

## Source

- Checklist item: CEX-16
- Reference modules: TFR-19, ACP-11
- Dependencies: CEX-12, CEX-15

## Product Need

Creators need a storyboard management surface after script/production workspace
projection. The panel should support creating, editing, deleting, batch adding,
batch deleting, reordering, and locating shots without bypassing Shot nodes.
The canvas also needs a visual storyboard board that organizes Shot/Image/Video
references without replacing Shot nodes as the source of truth.

## Required Outcomes

- Production workspace panel supports add, edit, delete, batch add, batch delete,
  and reorder for storyboard items.
- Storyboard items sync to Shot `CanvasNode` records.
- Reorder and deletion rebuild `sequence_next` edges and storyboard order data.
- A storyboard media board can be created on the canvas and stores grid items
  with Shot/Image/Video node references.
- Board rows can locate their source Shot/Image/Video nodes.

## Non-Goals

- No full nonlinear timeline editor.
- No standalone storyboard table persistence layer.
- No new Prisma node enum for the board; use `scene_frame` board metadata for
  the MVP.
- No image generation or polling workflow; CEX-18 owns richer frame generation.

## Acceptance Gates

- Users can manage storyboard rows from the panel.
- Shot nodes remain the durable storyboard item records.
- `sequence_next` edges match current storyboard order after create, delete, or
  reorder.
- Storyboard board data references source Shot/Image/Video node IDs.
