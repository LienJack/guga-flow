# CEX-18 Media Processing And Derivatives Plan

Date: 2026-06-14
Status: completed

## Goal

Add typed derivative metadata and a minimal worker-first media metadata job for
video/audio assets while preserving existing ImageNode refinement behavior.

## Implementation Units

### U1 Shared Contracts

- Add `AssetDerivativeMetadata` and `AssetMediaMetadata` types.
- Add `media_metadata` job input/output types that are carried inside the
  existing worker job pipeline.
- Add API result types for queueing media metadata jobs.

### U2 Backend

- Add generation endpoint for media metadata jobs.
- Validate media assets are video/audio, size-limited, and project-scoped.
- Complete media metadata jobs by updating `Asset.metadataJson` and creating
  thumbnail derivative assets when requested.

### U3 Worker

- Add mock media metadata executor with deterministic metadata.
- Keep real ffmpeg as a documented future adapter boundary.

### U4 Frontend

- Add typed API helper and request tests.
- Keep UI minimal for this module; task center work follows in CEX-22.

### U5 Verification

- Add shared/backend/worker/frontend tests.
- Run repository-wide lint/test/build checks.
- Commit the completed module.

## Scope Boundaries

- Reuse existing `image_refinement` for ImageNode edit return path.
- Do not add a Prisma enum in this module; persist media metadata jobs under the
  existing worker-claimable `asset_classification` operation while using typed
  input/output `operation: "media_metadata"`.
- Do not stage unrelated `globals.css` or reference docs.
