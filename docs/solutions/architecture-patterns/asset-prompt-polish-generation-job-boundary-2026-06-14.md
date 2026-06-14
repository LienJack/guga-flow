# Asset Prompt Polish Generation Job Boundary

Date: 2026-06-14
Status: accepted

## Context

CEX-19 needs batch asset prompt polish and asset-level image generation without
introducing a second task system or browser-side LLM/provider calls. Existing
GenerationJob lifecycle already supplies queueing, worker execution, cancel,
retry, status, and failure visibility.

## Decision

- Represent prompt polish as typed `asset_prompt_polish` input/output carried by
  the existing Prisma `asset_caption` operation.
- Represent asset image generation as typed `asset_image_generation`
  input/output carried by the existing Prisma `shot_to_image` operation.
- Build per-asset prompt items server-side from explicit prompt input,
  polished prompt metadata, asset prompt metadata, caption metadata, or filename
  fallback.
- Complete prompt polish by writing prompt metadata back to source Assets.
- Complete asset image generation by creating generated image Assets and
  recording generated asset lineage on the source Asset metadata.
- Expose batch Polish/Generate controls and recent asset generation jobs in the
  asset library, using the existing cancel/retry APIs.

## Consequences

- No Prisma enum migration is required.
- Jobs remain visible in the normal generation queue and SSE/polling surfaces.
- Successful polish output becomes a durable prompt source for later image/video
  generation.
- Future real provider adapters can replace the mock worker while preserving the
  public contracts.

## Verification

- Shared type tests cover prompt polish and asset image generation contracts.
- Backend tests cover queue operation mapping, prompt metadata writes, generated
  Asset creation, and source lineage metadata.
- Worker tests cover deterministic mock outputs and runner/client routing.
- Frontend tests cover API endpoints and asset library batch controls.
