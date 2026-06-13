---
date: 2026-06-13
topic: phase-17-viral-continuity-marketing
---

# Phase 17 Viral Reference, Continuity, and Marketing Requirements

## Summary

Phase 17 covers XQ-08 through XQ-11 with compliance-safe planning modules instead of platform crawling or new provider commitments. Creators can manually enter viral-structure references, continuity strategy, talking-photo briefs with consent markers, and marketing material references. These settings flow through prompt composition and editor export manifests without blocking the novel-to-edit-package MVP.

## Requirements

- R1. A creator can enter a manual viral reference summary, hook, pacing, theme, style, transformation note, and compliance note.
- R2. The product does not fetch, scrape, or parse external platform links in this phase.
- R3. A creator can set continuity strategy at project or Shot level, including one-take and adjacent-Shot prompts.
- R4. Shot-level continuity settings override project-level continuity settings in resolved prompt context.
- R5. A creator can record talking-photo/digital-human briefs with an explicit consent confirmation field.
- R6. A creator can describe cover, poster, promo-cut, CTA, and layout needs as marketing material settings.
- R7. Marketing cover/poster/promo references are validated against project Assets when editor export packages are created.
- R8. Prompt composer debug output includes viral, continuity, talking-photo, and marketing settings.
- R9. Existing generation settings, storyboard creation, media generation, and editor export flows remain backward-compatible.

## Acceptance Examples

- AE1. Given a manually entered viral hook and compliance note, when a Shot prompt is composed, the Generation settings part includes those details.
- AE2. Given project continuity mode `match_cut` and Shot continuity mode `one_take`, when a Shot prompt is composed, the effective continuity mode is `one_take`.
- AE3. Given a talking-photo source Asset ID and confirmed consent, when settings are saved, the normalized project settings preserve both fields.
- AE4. Given a marketing poster reference with a missing Asset ID, when an editor export job is created, the manifest marks that poster as `requested_unresolved` instead of failing the whole export.

## Scope Boundaries

- Do not crawl, scrape, or enrich platform links.
- Do not create a real digital-human or talking-photo provider integration.
- Do not generate cover/poster/promo media automatically.
- Do not add collaborative editing or export-format presets; those are Phase 18.
- Do not add new database tables; use existing project/Shot generation settings JSON and editor export metadata.

## Key Decisions

- Treat viral remake support as a manual research/import workflow with explicit compliance notes.
- Represent continuity as prompt metadata first, so future video providers can consume it without changing canvas graph contracts.
- Keep talking-photo support as a consent-aware brief until provider capability and portrait authorization rules are designed.
- Reuse `GenerationPackagingReference` for cover, poster, and promo references so missing marketing assets can be surfaced without breaking export creation.
