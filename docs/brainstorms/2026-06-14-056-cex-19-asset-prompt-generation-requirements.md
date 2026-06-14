# CEX-19 Asset Prompt Polish And Generation Requirements

Date: 2026-06-14

## Source

- Checklist item: CEX-19
- Reference module: TFR-17

## Product Need

Asset production should not depend on manual prompt writing. Users need to
select one or more assets, ask the system to polish asset prompts, then use the
polished prompt as input for asset-level image generation. These jobs must stay
inside the existing GenerationJob lifecycle so cancel/retry/status behavior is
consistent with other generation work.

## Required Outcomes

- Users can queue prompt polish for selected assets in the asset library.
- Users can queue asset-level image generation for selected assets.
- Prompt polish writes prompt metadata back to the source Asset.
- Asset image generation creates generated Asset records and records lineage on
  the source Asset.
- Jobs appear in the normal generation job list and can use existing
  cancel/retry endpoints.

## Non-Goals

- No browser-side LLM calls.
- No independent asset-generation task system.
- No new Prisma enum in this module.
- No advanced prompt editor UI.

## Acceptance Gates

- Batch selection in asset library can queue prompt polish.
- Failed/cancelled asset jobs remain visible through GenerationJob status.
- Successful polished prompts can seed asset image generation.
