# CEX-17 Video Track And MediaClip Plan

Date: 2026-06-14
Status: completed

## Goal

Add a lightweight production timeline layer over existing Shot, Video, Asset,
and EditorExport facts.

## Implementation Units

### U1 Shared Contracts

- Add production video track and candidate types.
- Add select-primary-video and MediaClip creation inputs/results.
- Add MediaClip payload types under EditorPackage node data.

### U2 Backend

- Project video candidates from `generated_video` edges and Video node data.
- Add service endpoints to select a Shot primary video.
- Add service endpoint to create an `editor_package` MediaClip node.
- Ensure production workspace track projection reflects selected videos.

### U3 Frontend

- Extend ProductionWorkspacePanel with a compact video track section.
- Let users select primary video and create MediaClip nodes.
- Add an export-selected action that uses the selected primary videos.
- Merge returned nodes into canvas state.

### U4 Verification

- Add shared/backend/frontend tests for track projection, selection, MediaClip
  creation, and API calls.
- Run repository-wide lint/test/build checks.
- Commit the completed module.

## Scope Boundaries

- Do not add a parallel timeline table.
- Do not add a `media_clip` Prisma enum in this module.
- Do not stage unrelated `globals.css` or reference docs.
