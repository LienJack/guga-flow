# CEX-18 Media Processing And Derivatives Requirements

Date: 2026-06-14
Status: completed

## Source

- Checklist item: CEX-18
- Reference modules: TFR-20, ACP-09, ACP-15

## Product Need

guga-flow already has ImageNode refinement and Asset-backed media, but media
metadata and derivative handling are not explicit enough for production
workflows. Users need edited images and media processing results to remain
traceable, and video/audio assets need recoverable metadata/thumbnail state
without browser-side ffmpeg or unsafe filesystem access.

## Required Outcomes

- Image refinement remains the image edit return path and keeps `derived_from`
  lineage.
- Asset metadata has typed original/display/thumbnail/derivatives structure.
- A worker-first media metadata job can be queued for video/audio assets.
- Mock media processing updates Asset metadata and can create a thumbnail
  derivative placeholder.
- Failed, oversized, unsupported, or too-short media has explicit strategy.

## Non-Goals

- No browser ffmpeg.
- No real ffmpeg executor in this module.
- No arbitrary server path processing.
- No complete image editor or NLE.

## Acceptance Gates

- ImageNode edit/refinement path remains covered by tests.
- Video/Audio Asset can queue a media metadata job and complete through worker
  mocks.
- Completion writes stable derivative metadata to Asset records.
- Metadata does not expose absolute server paths.
