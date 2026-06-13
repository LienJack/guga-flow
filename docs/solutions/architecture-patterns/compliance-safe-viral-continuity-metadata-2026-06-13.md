---
title: "Represent Viral, Continuity, and Talking-Photo Intent as Metadata First"
date: 2026-06-13
category: architecture-patterns
module: phase-17-viral-continuity-marketing
problem_type: architecture_pattern
component: generation
severity: medium
applies_when:
  - "Adding viral-remake references without platform crawling"
  - "Adding continuity strategy before provider-specific multi-shot generation"
  - "Capturing talking-photo or marketing intent before dedicated providers exist"
related_components:
  - generation_settings
  - prompt_composer
  - editor_export_package
  - canvas_inspector
tags:
  - viral-reference
  - continuity
  - talking-photo
  - marketing
  - compliance
---

# Represent Viral, Continuity, and Talking-Photo Intent as Metadata First

## Context

Phase 17 covers viral-reference, continuity, digital-human or talking-photo, and marketing-material needs without crawling external platforms or adding provider integrations. The safe MVP is to let creators enter structured intent manually and carry that intent through prompt debug output and export manifests.

## Guidance

Use project/Shot generation settings JSON for viral references, continuity strategy, talking-photo briefs, and marketing references. Require creator-supplied summary and compliance notes rather than fetching or parsing external platform links. For talking-photo intent, store explicit consent confirmation with the portrait/source brief.

Resolve these settings through the same project-plus-Shot inheritance path as Phase 15. Prompt debug output should expose viral hook, continuity mode, adjacent-shot prompt, talking-photo brief, and marketing notes so creators can audit what downstream providers will receive later.

For export packaging, keep cover, poster, and promo references in manifest metadata. Missing marketing Assets should become `requested_unresolved` references, not package failures.

## Why This Matters

Viral remake and talking-photo features carry product, legal, and provider risk. Capturing manual, consent-aware metadata lets the product support planning workflows now while avoiding implicit scraping, unauthorized portrait generation, or fake provider guarantees.

## When to Apply

- Adding provider-specific continuity or multi-image video generation.
- Adding a real digital-human or talking-photo flow.
- Adding marketing-cover or promo renderers.
- Reviewing any feature that starts from external viral content or portrait assets.

## Related

- [Resolve Creative Generation Settings at Backend Boundaries](./generation-settings-export-trace-2026-06-13.md)
- [Treat Editor Export Packages as Backend-Owned Generation Side Effects](./editor-export-package-worker-boundary-2026-06-13.md)
