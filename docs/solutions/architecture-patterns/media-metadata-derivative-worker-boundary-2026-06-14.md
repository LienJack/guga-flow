# Media Metadata Derivative Worker Boundary

Date: 2026-06-14
Status: accepted

## Context

CEX-18 needs stable original/display/thumbnail metadata and at least one
worker-first media processing chain for video/audio assets. The project already
has ImageNode refinement for image edit return paths and a worker-claimable
generation job pipeline.

## Decision

- Keep ImageNode editing on the existing `image_refinement` path.
- Add typed `AssetMediaMetadata` and `AssetDerivativeMetadata` to Asset
  metadata.
- Queue media metadata work through `media_metadata` input/output carried inside
  the existing Prisma `asset_classification` generation operation.
- Let the mock worker produce deterministic media info, thumbnail requests, and
  edge-case strategies for short videos and no-audio streams.
- Complete jobs by updating source Asset metadata and creating placeholder
  thumbnail derivative Assets when requested.

## Consequences

- No Prisma enum migration is required for this slice.
- Future ffmpeg integration can replace the mock executor while preserving the
  public job and metadata contracts.
- Asset metadata remains portable: it stores asset ids, storage keys, mime
  types, dimensions, and rebuild strategy, not server absolute paths.
- Huge files are rejected before queueing; retry failure uses normal generation
  job failure/retry behavior.

## Verification

- Shared type tests cover derivative constants and `media_metadata` job input.
- Backend tests cover queue validation, completion, derivative metadata merge,
  and thumbnail Asset creation.
- Worker tests cover deterministic metadata output and runner success routing.
- Frontend API tests cover the `media-metadata` queue endpoint.
