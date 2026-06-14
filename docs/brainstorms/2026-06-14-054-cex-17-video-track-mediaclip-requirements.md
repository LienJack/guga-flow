# CEX-17 Video Track And MediaClip Requirements

Date: 2026-06-14
Status: completed

## Source

- Checklist item: CEX-17
- Reference modules: TFR-22, ACP-10
- Dependencies: CEX-10, CEX-16

## Product Need

Creators need a lightweight production timeline after storyboard management.
Each Shot should expose generated video candidates, a selected primary video,
duration and prompt controls, and a path into editor export. The canvas also
needs a MediaClip-like node for organizing one or more media segments without
turning guga-flow into a full nonlinear editor.

## Required Outcomes

- Production workspace exposes video tracks for storyboard shots.
- Each track lists candidate Video nodes with asset id, duration, status, and
  source node references.
- Users can select a primary video for a Shot.
- Editor export defaults can use selected primary videos from the production
  workspace.
- Users can create a lightweight MediaClip node from selected tracks.
- MediaClip data records segment order, trim metadata, audio references,
  selected export candidates, and source Shot/Video node ids.

## Non-Goals

- No full NLE, transition editor, subtitle editor, or multi-track timeline UI.
- No destructive trim/render job in this module; trim metadata is declarative.
- No new Prisma node enum for MVP MediaClip; use `editor_package` node data with
  a `mediaClip` payload.

## Acceptance Gates

- A Shot track can show multiple candidate videos.
- Selecting a primary video updates the Shot node and production workspace.
- Creating a MediaClip returns a canvas node that can be focused.
- Editor export action can queue an export using selected primary videos.
