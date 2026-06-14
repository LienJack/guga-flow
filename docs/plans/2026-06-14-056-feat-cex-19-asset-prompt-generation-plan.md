# CEX-19 Asset Prompt Polish And Generation Plan

Date: 2026-06-14
Status: completed

## Goal

Add batch asset prompt polish and asset-level image generation through the
existing GenerationJob worker pipeline.

## Implementation Units

### U1 Shared Contracts

- Add typed `asset_prompt_polish` input/output contracts.
- Add typed `asset_image_generation` input/output contracts.
- Add create-job result types and worker success body fields.

### U2 Backend

- Add public queue endpoints for asset prompt polish and asset image generation.
- Store prompt polish jobs under Prisma `asset_caption`.
- Store asset image generation jobs under Prisma `shot_to_image`.
- Complete prompt polish by updating source Asset prompt metadata.
- Complete asset image generation by creating generated image Assets and
  recording lineage metadata.

### U3 Worker

- Add mock prompt polish executor.
- Add mock asset image generation executor.
- Route both outputs through the worker client success API.

### U4 Frontend

- Add typed API helpers.
- Add asset library batch buttons for polish/generate.
- Show recent asset generation jobs with cancel/retry controls.

### U5 Verification

- Add shared/backend/worker/frontend tests.
- Run repository-wide lint/test/build checks.
- Commit the completed module.

## Scope Boundaries

- Do not add a Prisma enum or migration.
- Do not call LLM/image providers directly from the browser.
- Do not build a full prompt editor in this module.
