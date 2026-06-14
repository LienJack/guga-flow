# Video Track MediaClip Editor Package Projection

Date: 2026-06-14
Status: accepted

## Context

CEX-17 needs video tracks and MediaClip behavior without introducing a full
timeline editor or a second storyboard/video store. Existing graph facts already
have Shot nodes, Video nodes, generated media edges, and EditorExport package
nodes.

## Decision

- Treat each Shot node as the production video track id.
- Project track candidates from related Video nodes, `generated_video` edges,
  and generation metadata such as `parentShotNodeId`.
- Store the primary video on `ShotNodeData.selectedVideoNodeId`.
- Represent MVP MediaClip nodes as `editor_package` canvas nodes with
  `EditorPackageNodeData.mediaClip`.
- Connect selected Video nodes to MediaClip nodes with `sent_to_editor` edges.
- Let production workspace export queue use selected primary videos with
  deterministic fallback to the first candidate.

## Consequences

- EditorExport can keep using existing VideoNode inputs and package logic.
- Track selection is a simple Shot data update, so production workspace and
  canvas inspector stay consistent.
- MediaClip stays declarative; trim data is metadata until a later media
  processing module materializes render jobs.

## Verification

- Canvas service tests cover track projection, primary video selection, and
  MediaClip node creation.
- Frontend API tests cover selected-video and media-clips endpoints.
- Production workspace panel render covers video track/export controls.
