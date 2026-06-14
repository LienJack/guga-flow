---
title: "Use Generation Settings as the Manual and Style Contract"
date: 2026-06-14
category: architecture-patterns
module: cex-11-project-manual-style-library
problem_type: architecture_pattern
component: project-settings
severity: medium
applies_when:
  - "Editing project visual or director manuals"
  - "Carrying style-pack metadata into prompt or export flows"
  - "Avoiding provider-specific prompt template clones"
related_components:
  - settings_center
  - prompt_composer
  - editor_export_manifest
  - generation_settings
tags:
  - project-manual
  - style-library
  - prompt-debug
  - editor-export
---

# Use Generation Settings as the Manual and Style Contract

## Context

CEX-11 completes the product loop for project visual manuals, director manuals,
and style-pack guidance. The typed settings contract already existed from
earlier work; the missing piece was making it editable from Settings Center and
verifying export handoff.

## Guidance

Keep visual manual, director manual, and style-pack data inside
`GenerationCreativeSettings`:

- project defaults live on `Project.generationSettings`;
- Shot overrides live on Shot node `generationSettings`;
- prompt composer resolves field-level project/shot sources and emits distinct
  `visual_manual` and `director_manual` debug parts;
- editor export job input carries resolved generation settings and packaging
  references.

This avoids a second style-library schema before the product needs richer CRUD.
The current style pack is a reference object, so it can point at an Asset, an
unresolved request, or a labeled style brief.

## Reuse Guidance

When a richer art-style library is added later, keep it as a producer of
`stylePack` references or visual manual fields. Do not bypass prompt composer or
editor export by adding a parallel prompt string path.

## Verification

CEX-11 verifies this with Settings Center render tests, prompt composer coverage
from the existing manual trace tests, and editor export assertions for manual
fields inside queued export input.

## Related

- [Project Visual Director Manual Prompt Trace](./project-visual-director-manual-prompt-trace-2026-06-13.md)
- [Generation Settings Export Trace](./generation-settings-export-trace-2026-06-13.md)
- [CEX-11 plan](../../plans/2026-06-14-048-feat-cex-11-project-manual-style-library-plan.md)
